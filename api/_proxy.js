const URL = process.env.APPS_SCRIPT_URL;
export async function callGas(payload) {
  if (!URL || !/^https:\/\/script\.google\.com\/macros\/s\//.test(URL)) throw new Error('ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL บน Vercel');
  const response = await fetch(URL, {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),redirect:'follow',signal:AbortSignal.timeout(20000)});
  const body = await response.text();
  if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);
  try { return JSON.parse(body); } catch { throw new Error('Apps Script ไม่ได้ตอบ JSON: ตรวจสอบสิทธิ์ Web App และ Deployment URL'); }
}
