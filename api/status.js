import {callGas} from './_proxy.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return res.status(405).json({success:false,message:'Method not allowed'});
  const {submissionId,empId} = req.body || {};
  if(typeof submissionId !== 'string' || !/^[a-zA-Z0-9_-]{12,80}$/.test(submissionId) || typeof empId !== 'string' || !empId.trim())
    return res.status(400).json({success:false,message:'ข้อมูลไม่ถูกต้อง'});
  try {return res.status(200).json(await callGas({action:'status',submissionId,empId}, 12000));}
  catch(e){console.error('status:',e.message);return res.status(504).json({success:false,uncertain:true,message:'ยังตรวจสอบสถานะไม่ได้'});}
}
