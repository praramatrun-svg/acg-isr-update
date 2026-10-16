# คู่มือการติดตั้งระบบแบบสำรวจรถยนต์พนักงาน (AutoCorp) บน Vercel + Google Sheets

ระบบนี้ถูกออกแบบมาเพื่อรันบน **Vercel** เป็น Frontend + Serverless API โดยใช้ **Google Sheets** เป็นฐานข้อมูลจัดเก็บผ่าน **Google Apps Script (Web App)**

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

```
[ ผู้ใช้งาน (มือถือ / คอมพิวเตอร์) ]
                 │
                 ▼
[ Vercel Web App (Frontend + Serverless) ]
  ├── public/index.html   (หน้าฟอร์มแบบสำรวจ Responsive สวยงาม)
  ├── /api/verify         (Serverless Function ตรวจสอบรหัสพนักงาน)
  └── /api/submit         (Serverless Function บันทึกข้อมูลแบบสำรวจ)
                 │
                 ▼ (HTTPS JSON API)
[ Google Apps Script (Web App API) ]
                 │
                 ▼
[ Google Sheets Database ]
  ├── ชีต 'Employees'        (ฐานข้อมูลรหัส, ชื่อ, เบอร์โทร, แผนก, สาขา)
  └── ชีต 'VehicleResponses' (บันทึกผลการสำรวจ 1 แถวต่อ 1 คัน)
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```
vercel-app/
├── public/
│   └── index.html      # หน้าแบบสำรวจหลัก (มี Logo Base64 ในตัว ไม่ต้องโฮสต์รูปแยก)
├── api/
│   ├── verify.js       # Vercel Serverless: ตรวจสอบรหัสพนักงาน
│   └── submit.js       # Vercel Serverless: บันทึกข้อมูลลง Google Sheet
├── Code.gs             # โค้ด Apps Script สำหรับวางใน Google Sheets
├── package.json        # กำหนดชื่อโปรเจกต์และ script
├── vercel.json         # กำหนด Routing และความปลอดภัยของ Vercel
├── .env.example        # ตัวอย่าง Environment Variable
└── README.md           # คู่มือฉบับนี้
```

---

## 🚀 ขั้นตอนการติดตั้งและ Deploy (4 ขั้นตอนง่ายๆ)

### ขั้นตอนที่ 1: เตรียม Google Sheets และ Apps Script

1. เปิด [Google Sheets](https://sheets.new) ตั้งชื่อไฟล์ว่า **"ระบบสำรวจรถยนต์พนักงาน AutoCorp"**
2. ตั้งชื่อแท็บที่ 1 ว่า: `Employees`
3. กำหนดหัวตาราง (Row 1):
   - คอลัมน์ A: `รหัสพนักงาน`
   - คอลัมน์ B: `ชื่อ-นามสกุล`
   - คอลัมน์ C: `เบอร์โทรศัพท์`
   - คอลัมน์ D: `ฝ่าย/แผนก`
   - คอลัมน์ E: `สาขา`
4. กรอกข้อมูลพนักงานตัวอย่าง เช่น:
   ```
   ACG-001 | นายสมชาย ใจดี | 0812345678 | ฝ่ายขาย | สำนักงานใหญ่
   ACG-002 | นางสาวสุนีย์ รักดี | 0898765432 | ฝ่ายบุคคล | สำนักงานใหญ่
   ```
5. คลิกเมนู **ส่วนขยาย (Extensions) > Apps Script**
6. ลบโค้ดเดิมทั้งหมด แล้วนำโค้ดในไฟล์ [`Code.gs`](./Code.gs) ไปวาง
7. กด **บันทึก (Ctrl + S)**

---

### ขั้นตอนที่ 2: เผยแพร่ Apps Script เป็น Web App (Deploy)

1. คลิกปุ่มสีน้ำเงิน **การทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ (New deployment)**
2. คลิกรูปฟันเฟือง ⚙️ ด้านซ้าย เลือก **เว็บแอป (Web app)**
3. ตั้งค่า:
   - **คำอธิบาย:** AutoCorp Survey API
   - **ดำเนินการในฐานะ (Execute as):** **ฉัน (Me)**
   - **ผู้ที่มีสิทธิ์เข้าถึง (Who has access):** **ทุกคน (Anyone)** *(เพื่อให้ Vercel Serverless ยิง API เข้ามาได้)*
4. คลิก **การทำให้ใช้งานได้ (Deploy)**
5. กด **ตรวจสอบสิทธิ์ (Review permissions)** > เลือกบัญชี Google > **Advanced (ขั้นสูง)** > **Go to ... (unsafe)** > **Allow (อนุญาต)**
6. **คัดลอก URL เว็บแอป (Web App URL)** ที่ลงท้ายด้วย `/exec` เก็บไว้ เช่น:
   `https://script.google.com/macros/s/AKfycbx.../exec`

---

### ขั้นตอนที่ 3: Deploy ขึ้น Vercel

คุณสามารถ Deploy ได้ 2 วิธีตามสะดวก:

#### วิธีที่ A: ผ่าน Vercel CLI (เร็วที่สุด ไม่ต้องใช้ GitHub)
1. เปิด Terminal ในโฟลเดอร์ `vercel-app`
2. พิมพ์คำสั่ง:
   ```bash
   npx vercel
   ```
3. ล็อกอินบัญชี Vercel และตอบคำถาม (กด Enter ใช้ค่า Default ได้เลย)
4. เมื่อ Deploy เสร็จ จะได้ URL สำหรับพรีวิวทันที!
5. Deploy ขึ้น Production:
   ```bash
   npx vercel --prod
   ```

#### วิธีที่ B: ผ่าน GitHub + Vercel Dashboard
1. นำโฟลเดอร์ `vercel-app` ขึ้น GitHub Repository ของคุณ
2. เข้าไปที่ [Vercel Dashboard](https://vercel.com/dashboard)
3. คลิก **"Add New..." > "Project"**
4. เลือก GitHub Repository นั้น แล้วกด **Import**

---

### ขั้นตอนที่ 4: ตั้งค่า Environment Variable บน Vercel

เพื่อให้ Vercel ส่งข้อมูลไปบันทึกลง Google Sheet ของคุณ:

1. ใน Vercel Dashboard ไปที่โปรเจกต์ของคุณ > เมนู **Settings > Environment Variables**
2. เพิ่มตัวแปรใหม่:
   - **Key:** `GOOGLE_SCRIPT_URL`
   - **Value:** `วาง URL ที่ได้จากขั้นตอนที่ 2` (เช่น `https://script.google.com/macros/s/AKfycb.../exec`)
3. ติ๊กถูกเลือกทั้ง `Production`, `Preview`, `Development`
4. คลิก **Save**
5. ไปที่แท็บ **Deployments** > กดปุ่ม 3 จุด `...` ข้างรายการล่าสุด > เลือก **Redeploy** (เพื่อให้ Vercel ดึงตัวแปรใหม่ไปใช้งาน)

---

## ✅ การทดสอบการใช้งาน

1. เปิด URL เว็บไซต์ที่ได้จาก Vercel (เช่น `https://your-app.vercel.app`)
2. ทดสอบกรอกรหัสพนักงาน: `ACG-001`
3. ระบบจะติดต่อ `/api/verify` ไปดึงชื่อ-นามสกุล และเบอร์โทรศัพท์จาก Google Sheets มาแสดงให้อัตโนมัติ
4. กดยอมรับ PDPA > กรอกข้อมูลรถยนต์ > กดส่งข้อมูล
5. ระบบจะติดต่อ `/api/submit` นำข้อมูลไปเขียนลงชีต `VehicleResponses` พร้อมออกรหัสอ้างอิง `ACG-YYYYMMDD-XXXX` ทันที!
