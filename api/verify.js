import {callGas} from './_proxy.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({success:false,message:'Method not allowed'});
  const empId = String(req.query.empId || '').trim();
  if (!empId || empId.length > 60) return res.status(400).json({success:false,message:'รหัสพนักงานไม่ถูกต้อง'});
  try { return res.status(200).json(await callGas({action:'verify',empId}, 12000)); }
  catch (err) { console.error('verify:',err.message); return res.status(502).json({success:false,uncertain:true,message:'ระบบตรวจสอบพนักงานตอบกลับช้า กรุณาลองอีกครั้ง'}); }
}
