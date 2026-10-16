/** Paste this in Apps Script attached to your existing Google Spreadsheet. Deploy as Web app. */
const EMPLOYEE_TAB = 'ข้อมูลพนักงาน';
const RESPONSE_TAB = 'VehicleResponses';

function json_(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e){return json_({success:true,message:'AutoCorp survey API is online'});}
function doPost(e){
  try {
    const p=JSON.parse(e.postData.contents||'{}');
    if(p.action==='verify') return json_(verifyEmployeeId(p.empId));
    if(p.action==='submit') return json_(submitSurvey(p));
    return json_({success:false,message:'Invalid action'});
  }catch(err){console.error(err);return json_({success:false,message:'ไม่สามารถประมวลผลคำขอได้'});}
}
function employee_(empId){
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EMPLOYEE_TAB);
  if(!sh) throw new Error('Missing employee tab');
  const id=String(empId||'').trim().toUpperCase();
  if(!id) return null;
  const values=sh.getDataRange().getDisplayValues();
  for(let i=1;i<values.length;i++) if(String(values[i][0]||'').trim().toUpperCase()===id){
    const r=values[i];return {id:r[0],name:[r[1],r[2],r[3]].filter(Boolean).join(' '),position:r[4]||'',dept:r[5]||'',branch:r[6]||'',phone:r[7]||''};
  }
  return null;
}
function verifyEmployeeId(empId){
  try {const emp=employee_(empId);return emp?{success:true,data:emp}:{success:false,message:'ไม่พบรหัสพนักงานในระบบ'};}
  catch(err){console.error(err);return {success:false,message:'ตรวจสอบพนักงานไม่สำเร็จ'};}
}
function safe_(v){const s=String(v??'').trim().slice(0,300);return /^[=+@\-\t\r]/.test(s)?"'"+s:s;}
function submitSurvey(p){
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(15000)) return {success:false,message:'ระบบกำลังรับข้อมูลจำนวนมาก กรุณาลองอีกครั้ง'};
  try {
    const emp=employee_(p.empId);
    if(!emp) return {success:false,message:'ไม่พบรหัสพนักงาน'};
    if(p.pdpaConsent!==true) return {success:false,message:'กรุณายืนยันความยินยอมตามฟอร์ม'};
    if(!Array.isArray(p.cars)||p.cars.length<1||p.cars.length>20) return {success:false,message:'จำนวนรถไม่ถูกต้อง'};
    const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESPONSE_TAB);
    if(!sh) return {success:false,message:'ไม่พบแท็บ VehicleResponses'};
    const now=new Date(), stamp=Utilities.formatDate(now,'Asia/Bangkok','dd/MM/yyyy HH:mm:ss');
    const ref='ACG-'+Utilities.formatDate(now,'Asia/Bangkok','yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,6).toUpperCase();
    const rows=p.cars.map((c,i)=>{
      const year=String(c.year||'').trim();const num=Number(year);
      const ce=num>2400?String(num-543):(num>1900?String(num):'');
      const be=ce?String(Number(ce)+543):'';
      if(!c.brand||!c.model||!c.plate||!c.insTier) throw new Error('กรุณากรอกข้อมูลรถให้ครบ');
      return [stamp,ref,safe_(emp.id),safe_(emp.name),safe_(p.phone),safe_(c.hrReg),i+1,safe_(c.brand),safe_(c.model),ce,be,safe_(c.plate),safe_(c.province),safe_(c.insTier),safe_(c.insCompany),safe_(c.insMonth),safe_(c.insYear),safe_(c.insWelfare),'ยินยอม'];
    });
    sh.getRange(sh.getLastRow()+1,1,rows.length,19).setValues(rows);
    return {success:true,message:'บันทึกสำเร็จ',refCode:ref,timestamp:stamp};
  } catch(err){console.error(err);return {success:false,message:err.message==='กรุณากรอกข้อมูลรถให้ครบ'?err.message:'ไม่สามารถบันทึกข้อมูลได้'};}
  finally {lock.releaseLock();}
}
