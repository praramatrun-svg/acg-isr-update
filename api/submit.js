import {callGas} from './_proxy.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({success:false,message:'Method not allowed'});
  const p = req.body;
  if (!p || typeof p !== 'object' || Array.isArray(p) ||
      typeof p.empId !== 'string' || !p.empId.trim() ||
      p.pdpaConsent !== true || typeof p.hasCar !== 'boolean' ||
      !Array.isArray(p.cars) || (p.hasCar && (p.cars.length < 1 || p.cars.length > 20)) ||
      (!p.hasCar && p.cars.length !== 0) ||
      typeof p.submissionId !== 'string' || !/^[a-zA-Z0-9_-]{12,80}$/.test(p.submissionId)) {
    return res.status(400).json({success:false,message:'ข้อมูลแบบสำรวจไม่ถูกต้อง'});
  }
  try { return res.status(200).json(await callGas({...p,action:'submit'}, 14000)); }
  catch (err) {
    console.error('submit:',err.message);
    return res.status(504).json({success:false,uncertain:true,message:'ยังไม่ได้รับผลยืนยันจากระบบ กรุณากดตรวจสอบ/ส่งซ้ำด้วยคำขอเดิมเพื่อป้องกันข้อมูลซ้ำ'});
  }
}
