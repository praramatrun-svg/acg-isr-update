import { callGas } from './_proxy.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      typeof payload.empId !== 'string' || !payload.empId.trim() ||
      payload.pdpaConsent !== true ||
      typeof payload.hasCar !== 'boolean' ||
      !Array.isArray(payload.cars) ||
      (payload.hasCar && (payload.cars.length < 1 || payload.cars.length > 20)) ||
      (!payload.hasCar && payload.cars.length !== 0)) {
    return res.status(400).json({ success: false, message: 'ข้อมูลแบบสำรวจไม่ถูกต้อง' });
  }

  try {
    const result = await callGas({ ...payload, action: 'submit' });
    return res.status(200).json(result);
  } catch (error) {
    console.error('AutoCorp submit failed:', error.message);
    return res.status(502).json({ success: false, message: 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่' });
  }
}
