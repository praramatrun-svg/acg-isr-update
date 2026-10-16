
export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    service: "AutoCorp Vercel API",
    gasConfigured: Boolean(process.env.APPS_SCRIPT_URL),
    timestamp: new Date().toISOString()
  });
}
