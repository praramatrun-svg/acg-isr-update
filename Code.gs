/**
 * AutoCorp - แบบสำรวจรถยนต์พนักงาน (Google Apps Script Backend)
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheets ที่ต้องการใช้เก็บข้อมูล
 * 2. ไปที่ Extensions (ส่วนขยาย) > Apps Script
 * 3. วางโค้ดนี้ลงในไฟล์ Code.gs
 * 4. สร้างไฟล์ HTML ชื่อ "Index" แล้วนำโค้ดใน index_gas.html ไปวาง
 * 5. กด Deploy (การทำให้ใช้งานได้) > New deployment > Web app
 *    - Execute as: Me (ฉัน)
 *    - Who has access: Anyone (ทุกคน) หรือ Anyone with Google Account
 */

// ชื่อชีตสำหรับตรวจสอบรหัสพนักงาน และ ชีตสำหรับบันทึกผล
const SHEET_EMPLOYEES = 'ข้อมูลพนักงาน';
const SHEET_RESPONSES = 'VehicleResponses';

/**
 * ฟังก์ชันหลักเปิด Web App
 */
function doGet(e) {
  // หากเรียกเป็น API (จาก Vercel เช่น ?action=verify&empId=ACG-001)
  if (e && e.parameter && e.parameter.action) {
    let result = {};
    if (e.parameter.action === 'verify') {
      result = verifyEmployeeId(e.parameter.empId);
    } else {
      result = { success: false, message: 'Invalid GET action' };
    }
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // หากเปิดตรงบนเบราว์เซอร์ (Google Apps Script Web App)
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('แบบสำรวจรถยนต์พนักงาน - AutoCorp')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * รองรับ POST request จาก Vercel
 */
function doPost(e) {
  try {
    let data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    }

    const action = data.action;
    let result = {};

    if (action === 'submit') {
      result = submitSurvey(data.payload || data);
    } else if (action === 'verify') {
      result = verifyEmployeeId(data.empId);
    } else {
      result = { success: false, message: 'Invalid POST action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Server Error: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * รวมไฟล์ HTML ย่อย (ถ้าต้องการแยกไฟล์ CSS/JS)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 1. ตรวจสอบรหัสพนักงานจากชีต 'ข้อมูลพนักงาน' (หรือ 'Employees')
 * รูปแบบชีต:
 * Column: รหัสพนักงาน (Employee ID) เช่น ACG-001
 * Column: ชื่อ-นามสกุล (Name)
 * Column: เบอร์โทรศัพท์ (Phone)
 * Column: ฝ่าย/แผนก (Department)
 * Column: สาขา (Branch)
 */
function verifyEmployeeId(empId) {
  try {
    if (!empId) {
      return { success: false, message: 'กรุณากรอกรหัสพนักงาน' };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // ค้นหาชีต 'ข้อมูลพนักงาน' หรือ 'Employees'
    let sheet = ss.getSheetByName(SHEET_EMPLOYEES) || ss.getSheetByName('Employees');

    if (!sheet) {
      const allSheets = ss.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        const sName = allSheets[i].getName().trim();
        if (sName === 'ข้อมูลพนักงาน' || sName.toLowerCase() === 'employees') {
          sheet = allSheets[i];
          break;
        }
      }
    }

    // หากไม่พบชีต ให้สร้างชีตเริ่มต้น
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_EMPLOYEES);
      sheet.appendRow(['รหัสพนักงาน', 'ชื่อ-นามสกุล', 'เบอร์โทรศัพท์', 'ฝ่าย/แผนก', 'สาขา']);
      sheet.appendRow(['ACG-001', 'นายสมชาย ใจดี', '0812345678', 'ฝ่ายขาย', 'สำนักงานใหญ่']);
      sheet.appendRow(['ACG-002', 'นางสาวสุนีย์ รักดี', '0898765432', 'ฝ่ายบุคคล', 'สำนักงานใหญ่']);
      sheet.appendRow(['ACG-003', 'นายวิชัย เก่งมาก', '0865551234', 'ฝ่าย IT', 'สาขาเชียงใหม่']);
      sheet.appendRow(['ACG-004', 'นางพรทิพย์ มั่นใจ', '0823339876', 'บัญชี', 'สาขาขอนแก่น']);
      sheet.appendRow(['ACG-005', 'นายธนา สุขสม', '0857778899', 'การตลาด', 'สำนักงานใหญ่']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#E2E8F0');
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: false, message: 'ชีต ' + sheet.getName() + ' ไม่มีข้อมูลพนักงาน' };
    }

    // ตรวจหา index ของคอลัมน์อัตโนมัติตามชื่อ Header (Flexible Mapping)
    const headers = data[0].map(h => String(h).trim());
    let idCol = 0, nameCol = 1, phoneCol = -1, deptCol = -1, branchCol = -1;

    for (let c = 0; c < headers.length; c++) {
      const h = headers[c];
      if (/รหัส/i.test(h)) idCol = c;
      else if (/ชื่อ/i.test(h)) nameCol = c;
      else if (/โทร|เบอร์|tel|phone/i.test(h)) phoneCol = c;
      else if (/ฝ่าย|แผนก|dept/i.test(h)) deptCol = c;
      else if (/สาขา|branch/i.test(h)) branchCol = c;
    }

    // กรณีคอลัมน์ C ไม่ได้เขียนหัวตารางว่าโทรศัพท์แต่เป็นตำแหน่งเบอร์โทร
    if (phoneCol === -1 && headers.length > 2 && deptCol !== 2 && branchCol !== 2) {
      phoneCol = 2;
    }

    const cleanId = String(empId).trim().toUpperCase();

    // ค้นหาแถวที่ตรงกับรหัสพนักงาน (ข้าม header แถวที่ 1)
    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][idCol]).trim().toUpperCase();
      if (rowId === cleanId) {
        let phoneVal = phoneCol >= 0 && data[i][phoneCol] ? String(data[i][phoneCol]).trim() : '';
        // หากเบอร์โทร 9 หลักถูกตัดเลข 0 นำหน้า (Google Sheet ปรับเป็นตัวเลข) ให้เติมเลข 0
        if (/^[1-9]\d{8}$/.test(phoneVal)) {
          phoneVal = '0' + phoneVal;
        }

        return {
          success: true,
          data: {
            empId: cleanId,
            name: nameCol >= 0 ? data[i][nameCol] : '',
            phone: phoneVal,
            dept: deptCol >= 0 ? data[i][deptCol] : '',
            branch: branchCol >= 0 ? data[i][branchCol] : ''
          }
        };
      }
    }

    return {
      success: false,
      message: 'ไม่พบรหัสพนักงาน "' + cleanId + '" ในฐานข้อมูล'
    };

  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ: ' + error.toString()
    };
  }
}

/**
 * 2. บันทึกข้อมูลแบบสำรวจลงชีต 'VehicleResponses'
 * รองรับการบันทึกรถยนต์หลายคัน (แยก 1 แถวต่อ 1 คัน หรือรวมในแถวเดียว)
 */
function submitSurvey(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_RESPONSES);

    // หากยังไม่มี Sheet เก็บข้อมูล ให้สร้าง Header
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_RESPONSES);
      sheet.appendRow([
        'วัน-เวลาที่ส่ง',
        'รหัสอ้างอิง',
        'รหัสพนักงาน',
        'ชื่อ-นามสกุล',
        'เบอร์โทรศัพท์',
        'เคยลงทะเบียน HR หรือไม่',
        'ลำดับคันที่',
        'ยี่ห้อรถยนต์',
        'รุ่นรถยนต์',
        'ปีจดทะเบียน (ค.ศ.)',
        'ปีจดทะเบียน (พ.ศ.)',
        'ทะเบียนรถ',
        'จังหวัด',
        'ประเภทประกันภัย',
        'บริษัทประกันภัย',
        'เดือนที่หมดอายุ',
        'ปีที่หมดอายุ (พ.ศ.)',
        'สนใจรับสิทธิพิเศษสำหรับพนักงานในเครือ ACG',
        'ความยินยอม PDPA'
      ]);
      sheet.getRange(1, 1, 1, 19).setFontWeight('bold').setBackground('#DCE7FE');
      sheet.setFrozenRows(1);
    }

    const timestamp = new Date();
    const refCode = 'ACG-' + Utilities.formatDate(timestamp, 'GMT+7', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);

    const empId = formData.empId || '';
    const name = formData.name || '';
    const phone = formData.phone || '';
    const cars = formData.cars || [];
    const pdpaConsent = formData.pdpaConsent ? 'ยินยอม' : 'ไม่ยินยอม';

    // บันทึกข้อมูลลงชีต (1 แถวต่อ 1 คัน เพื่อความสะดวกในการ Filter/Pivot Table)
    cars.forEach((car, index) => {
      const yearCE = car.year || '';
      const yearBE = yearCE ? parseInt(yearCE) + 543 : '';
      const carHrReg = car.hrReg === 'yes' ? 'เคย' : 'ไม่เคย';

      sheet.appendRow([
        timestamp,
        refCode,
        empId,
        name,
        "'" + phone, // ใส่ single quote ป้องกัน Google Sheet ตัดเลข 0 หน้าเบอร์
        carHrReg,
        index + 1,
        car.brand || '',
        car.model || '',
        yearCE,
        yearBE,
        car.plate || '',
        car.province || '',
        car.insTier || '',
        car.insCompany || '',
        car.insMonth || '',
        car.insYear || '',
        car.insWelfare || '',
        pdpaConsent
      ]);
    });

    return {
      success: true,
      refCode: refCode,
      message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
    };

  } catch (error) {
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการบันทึก: ' + error.toString()
    };
  }
}
