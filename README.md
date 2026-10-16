# AutoCorp Survey – Easy deployment (Google Apps Script + GitHub + Vercel)

This project keeps your original `pp8.html` UI, uses the existing spreadsheet tabs `ข้อมูลพนักงาน` and `VehicleResponses`, and **does not require Google Cloud Service Account**.

## Setup once
1. Open the ORIGINAL Google Sheet in Google Sheets. Select **Extensions > Apps Script**.
2. Create/replace `Code.gs` with `gas/Code.gs`. IMPORTANT: if an older Code.gs already defines `doGet`/`doPost`, use a separate Apps Script project or merge carefully; do not leave duplicate handlers.
3. Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone** (required for this simple API without OAuth). Authorize. Copy its **/exec** deployment URL. This makes the API URL publicly callable; this is convenient but NOT strong access control. Use only for approved internal pilot testing with non-sensitive records until stronger protection is implemented.
4. Upload this folder to a **private** GitHub repository (do NOT upload actual survey data). In Vercel: Add New Project > Import Git Repository > Deploy.
5. In Vercel Project > Settings > Environment Variables add `APPS_SCRIPT_URL` = your Apps Script /exec URL (NOT as a frontend constant). Redeploy.
6. Test a dummy employee ID and one dummy car; verify that `VehicleResponses` has one newly created row per car.

## Architecture
Browser -> Vercel `/api/verify` or `/api/submit` -> Apps Script `doPost` -> existing spreadsheet.
This server-side proxy avoids browser-to-Google-Apps-Script CORS problems and does not require a separate service account.

## Security notes
- Employee number alone is not secure authentication. Restrict access via Vercel authentication/SSO and verify access server side before using sensitive real records.
- Anonymous Apps Script endpoint can still be called outside your Vercel app if known. Put authorization/abuse protections in front of real production use.
- Respect notice/consent/retention and avoid exposing phone/name through a publicly guessable employee ID. Add rate limiting and audit logs.
- Do not put `APPS_SCRIPT_URL`, secret tokens, or personal data into browser code or GitHub. The URL alone is not an authentication credential.
- Apps Script deployments may have quotas and concurrency limits; Google Sheets is suited for modest survey traffic.
