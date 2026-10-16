import {callGas} from './_proxy.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({success:false,message:'Method not allowed'});
  const payload=req.body;
  if(!payload || typeof payload!=='object'|| !Array.isArray(payload.cars)||payload.cars.length<1||payload.cars.length>20) return res.status(400).json({success:false,message:'ข้อมูลแบบสำรวจไม่ถูกต้อง'});
  try { const result=await callGas({...payload,action:'submit'}); return res.status(200).json(result); }
  catch(e){ console.error(e.message); return res.status(502).json({success:false,message:'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่'}); }
}
