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
  const values = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (String(r[0] || '').trim().toUpperCase() === id) {
      return {
        id: r[0],
        name: [r[1], r[2], r[3]].filter(Boolean).join(' '),
        division: r[4] || '',
        dept: r[5] || '',
        branch: r[6] || '',
        position: r[7] || ''
      };
    }
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

function submitSurvey(p) {
  if (!p || typeof p !== 'object') return {success: false, message: 'ข้อมูลแบบสำรวจไม่ถูกต้อง'};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return {success: false, message: 'ระบบกำลังรับข้อมูลจำนวนมาก กรุณาลองอีกครั้ง'};
  }
  try {
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
    const ref = 'ACG-' + Utilities.formatDate(now, TZ, 'yyyyMMdd-HHmmss') + '-' + Utilities.getUuid().slice(0, 6).toUpperCase();

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
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, RESPONSE_COLUMNS).setValues(rows);
    return {success: true, message: 'บันทึกสำเร็จ', refCode: ref, timestamp: stamp};
  } catch (err) {
    console.error(err);
    const messages = ['ข้อมูลยานพาหนะไม่ถูกต้อง', 'กรุณาเลือกประเภทยานพาหนะให้ครบทุกคัน',
      'กรุณากรอกข้อมูลยานพาหนะและประกันภัยให้ครบ'];
    return {success: false, message: messages.indexOf(err.message) !== -1 ? err.message : 'ไม่สามารถบันทึกข้อมูลได้'};
  } finally {
    lock.releaseLock();
  }
}
