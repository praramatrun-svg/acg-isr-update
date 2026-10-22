const GAS_URL = (process.env.APPS_SCRIPT_URL || '').trim();
export async function callGas(payload, timeoutMs = 14000) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(GAS_URL)) {
    throw new Error('กรุณาตั้งค่า APPS_SCRIPT_URL ให้เป็น URL /exec ของ Apps Script');
  }
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: {'Content-Type': 'text/plain;charset=utf-8'},
    body: JSON.stringify(payload), redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  });
  const body = await response.text();
  if (!response.ok) throw new Error('Apps Script HTTP ' + response.status);
  let result;
  try { result = JSON.parse(body); }
  catch { throw new Error('Apps Script ไม่ได้ส่ง JSON กลับมา (ตรวจ Deployment /exec และสิทธิ์ Web App)'); }
  if (!result || typeof result.success !== 'boolean') throw new Error('รูปแบบ JSON จาก Apps Script ไม่ถูกต้อง');
  return result;
}
