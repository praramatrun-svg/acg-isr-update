/**
 * AutoCorp - แบบสำรวจประกันภัยรถยนต์และรถจักรยานยนต์
 * Google Apps Script (ผูกกับไฟล์ Google Sheets เดิม)
 * Employee: A-H ตามโครงสร้างปัจจุบัน
 * VehicleResponses: A-S เดิม + T = ประเภทยานพาหนะ
 * Deploy เป็น Web App และใช้ URL /exec ผ่าน Vercel API proxy
 */
const EMPLOYEE_TAB = 'ข้อมูลพนักงาน';
const RESPONSE_TAB = 'VehicleResponses';
const TZ = 'Asia/Bangkok';
const RESPONSE_COLUMNS = 20;

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return json_({success: true, message: 'AutoCorp survey API is online'});
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({success: false, message: 'ไม่มีข้อมูลคำขอ'});
    }
    const p = JSON.parse(e.postData.contents);
    if (p.action === 'verify') return json_(verifyEmployeeId(p.empId));
    if (p.action === 'submit') return json_(submitSurvey(p));
    if (p.action === 'status') return json_(submissionStatus_(p));
    return json_({success: false, message: 'Invalid action'});
  } catch (err) {
    console.error(err);
    return json_({success: false, message: 'ไม่สามารถประมวลผลคำขอได้'});
  }
}

function employee_(empId) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EMPLOYEE_TAB);
  if (!sh) throw new Error('ไม่พบแท็บ ' + EMPLOYEE_TAB);
  const id = String(empId || '').trim().toUpperCase();
  if (!id) return null;
  // อ่านเฉพาะคอลัมน์รหัสพนักงาน แล้วอ่าน A:H เพียงแถวที่พบ
  const last = sh.getLastRow();
  if (last < 2) return null;
  const finder = sh.getRange(2, 1, last - 1, 1)
    .createTextFinder(id).matchEntireCell(true).matchCase(false);
  const cell = finder.findNext();
  if (cell) {
    const r = sh.getRange(cell.getRow(), 1, 1, 8).getDisplayValues()[0];
    if (String(r[0]).trim().toUpperCase() === id) return {
      id: r[0], name: [r[1], r[2], r[3]].filter(Boolean).join(' '),
      division: r[4] || '', dept: r[5] || '', branch: r[6] || '', position: r[7] || ''
    };
  }
  return null;
}

function verifyEmployeeId(empId) {
  try {
    const emp = employee_(empId);
    return emp
      ? {success: true, data: emp}
      : {success: false, message: 'ไม่พบรหัสพนักงานในระบบ'};
  } catch (err) {
    console.error(err);
    return {success: false, message: 'ตรวจสอบพนักงานไม่สำเร็จ'};
  }
}

// ป้องกัน Spreadsheet Formula Injection โดยไม่แก้ไขข้อความทั่วไป
function safe_(v) {
  const s = String(v == null ? '' : v).trim().slice(0, 300);
  return /^[=+@\-\t\r]/.test(s) ? "'" + s : s;
}

function vehicleType_(raw) {
  const value = String(raw == null ? '' : raw).trim().toLowerCase();
  if (['car', 'auto', 'รถยนต์'].indexOf(value) !== -1) return 'รถยนต์';
  if (['motorcycle', 'motorbike', 'bike', 'รถจักรยานยนต์', 'มอเตอร์ไซค์'].indexOf(value) !== -1) return 'รถจักรยานยนต์';
  return '';
}

function yearPair_(yearValue) {
  const year = String(yearValue == null ? '' : yearValue).trim();
  const num = Number(year);
  if (!year || !Number.isInteger(num)) return ['', ''];
  const ce = num > 2400 && num < 2700 ? num - 543 : (num >= 1900 && num <= 2200 ? num : null);
  return ce === null ? ['', ''] : [String(ce), String(ce + 543)];
}

// ID ที่ลูกค้าส่งมาต้องใช้ซ้ำเมื่อกดส่งอีกครั้งหลังเกิด timeout
function submissionRef_(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{12,80}$/.test(id)) {
    throw new Error('รหัสคำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ');
  }
  return 'ACG-' + id;
}
function findSubmission_(sh, ref, empId) {
  const last = sh.getLastRow();
  if (last < 2) return null;
  const found = sh.getRange(2, 2, last - 1, 1)
    .createTextFinder(ref).matchEntireCell(true).matchCase(true).findNext();
  if (!found) return null;
  const row = found.getRow();
  const storedEmp = String(sh.getRange(row, 3).getDisplayValue()).trim().toUpperCase();
  if (storedEmp !== String(empId).trim().toUpperCase()) {
    throw new Error('รหัสคำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว');
  }
  return {success: true, saved: true, duplicate: true, refCode: ref,
    message: 'ข้อมูลนี้บันทึกไว้แล้ว', timestamp: sh.getRange(row,1).getDisplayValue()};
}
function submissionStatus_(p) {
  try {
    const ref = submissionRef_(p.submissionId);
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESPONSE_TAB);
    if (!sh) throw new Error('ไม่พบแท็บ '+RESPONSE_TAB);
    return findSubmission_(sh,ref,p.empId) ||
      {success:true,saved:false,message:'ยังไม่พบข้อมูลของคำขอนี้'};
  } catch(err) { console.error(err);return {success:false,message:'ตรวจสอบสถานะไม่ได้'}; }
}

function submitSurvey(p) {
  if (!p || typeof p !== 'object') return {success: false, message: 'ข้อมูลแบบสำรวจไม่ถูกต้อง'};
  let lock = null;
  let locked = false;
  try {
    const ref = submissionRef_(p.submissionId);
    const emp = employee_(p.empId);
    if (!emp) return {success: false, message: 'ไม่พบรหัสพนักงาน'};
    if (p.pdpaConsent !== true) {
      return {success: false, message: 'กรุณายืนยันการรับทราบ/ความยินยอมตามแบบฟอร์ม'};
    }

    // hasCar คงชื่อฟิลด์เดิมเพื่อให้ frontend เก่ายังใช้งานได้
    // แต่หมายถึง “มียานพาหนะ” ไม่จำกัดเฉพาะรถยนต์
    const noVehicle = p.hasCar === false;
    if (!Array.isArray(p.cars) || (noVehicle ? p.cars.length !== 0 : (p.cars.length < 1 || p.cars.length > 20))) {
      return {success: false, message: 'จำนวนยานพาหนะไม่ถูกต้อง'};
    }

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RESPONSE_TAB);
    if (!sh) return {success: false, message: 'ไม่พบแท็บ ' + RESPONSE_TAB};
    if (sh.getMaxColumns() < RESPONSE_COLUMNS) {
      return {success: false, message: 'กรุณาเพิ่มคอลัมน์ T ใน VehicleResponses ก่อนใช้งาน'};
    }
    const header = sh.getRange(1, RESPONSE_COLUMNS).getDisplayValue().trim();
    if (header !== 'ประเภทยานพาหนะ') {
      return {success: false, message: 'กรุณากำหนด VehicleResponses!T1 เป็น ประเภทยานพาหนะ'};
    }

    const now = new Date();
    const stamp = Utilities.formatDate(now, TZ, 'dd/MM/yyyy HH:mm:ss');
    // เลขอ้างอิงคงเดิมทุกครั้งที่ส่ง submissionId เดิม

    // A-S รักษาลำดับเดิม; T บันทึกประเภทยานพาหนะ
    const noVehicleRow = [stamp, ref, safe_(emp.id), safe_(emp.name), safe_(p.phone), '', 0,
      'ไม่มียานพาหนะ', '', '', '', '', '', '', '', '', '', '', 'ยินยอม', 'ไม่มียานพาหนะ'];

    const rows = noVehicle ? [noVehicleRow] : p.cars.map(function(c, i) {
      if (!c || typeof c !== 'object') throw new Error('ข้อมูลยานพาหนะไม่ถูกต้อง');
      const vehicleType = vehicleType_(c.vehicleType || c.type);
      if (!vehicleType) throw new Error('กรุณาเลือกประเภทยานพาหนะให้ครบทุกคัน');
      if (!String(c.brand || '').trim() || !String(c.model || '').trim() ||
          !String(c.plate || '').trim() || !String(c.insTier || '').trim()) {
        throw new Error('กรุณากรอกข้อมูลยานพาหนะและประกันภัยให้ครบ');
      }
      const years = yearPair_(c.year);
      return [
        stamp, ref, safe_(emp.id), safe_(emp.name), safe_(p.phone), safe_(c.hrReg),
        i + 1, safe_(c.brand), safe_(c.model), years[0], years[1],
        safe_(c.plate), safe_(c.province), safe_(c.insTier), safe_(c.insCompany),
        safe_(c.insMonth), safe_(c.insYear), safe_(c.insWelfare), 'ยินยอม', vehicleType
      ];
    });

    if (rows.some(function(row) {return row.length !== RESPONSE_COLUMNS;})) {
      throw new Error('โครงสร้างข้อมูลไม่ครบ 20 คอลัมน์');
    }
    // ล็อกช่วงตรวจรายการซ้ำ + เขียนข้อมูล (atomic check-and-insert)
    lock = LockService.getScriptLock();
    locked = lock.tryLock(5000);
    if (!locked) return {success:false,message:'ระบบกำลังรับข้อมูลจำนวนมาก กรุณาลองอีกครั้ง'};
    const existing = findSubmission_(sh, ref, emp.id);
    if (existing) return existing;
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, RESPONSE_COLUMNS).setValues(rows);
    SpreadsheetApp.flush();
    return {success: true, message: 'บันทึกสำเร็จ', refCode: ref, timestamp: stamp};
  } catch (err) {
    console.error(err);
    const messages = ['รหัสคำขอไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บ', 'ข้อมูลยานพาหนะไม่ถูกต้อง', 'กรุณาเลือกประเภทยานพาหนะให้ครบทุกคัน',
      'กรุณากรอกข้อมูลยานพาหนะและประกันภัยให้ครบ'];
    return {success: false, message: messages.indexOf(err.message) !== -1 ? err.message : 'ไม่สามารถบันทึกข้อมูลได้'};
  } finally {
    if (locked && lock) lock.releaseLock();
  }
}
