export type WelcomeCredentialsEmailParams = {
  userName: string;
  loginEmail: string;
  loginPassword: string;
  loginUrl: string;
  role: string;
  phone?: string | null;
  fullAddress?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildWelcomeCredentialsEmail(
  params: WelcomeCredentialsEmailParams,
) {
  const userName = escapeHtml(params.userName);
  const loginEmail = escapeHtml(params.loginEmail);
  const loginPassword = escapeHtml(params.loginPassword);
  const loginUrl = escapeHtml(params.loginUrl);
  const role = escapeHtml(params.role);
  const phone = params.phone ? escapeHtml(params.phone) : "Not provided";
  const fullAddress = params.fullAddress
    ? escapeHtml(params.fullAddress)
    : "Not provided";

  return `
<table align="center" width="100%" cellpadding="0" cellspacing="0"
style="
max-width:600px;
margin:30px auto;
border-radius:16px;
overflow:hidden;
font-family:Arial,Helvetica,sans-serif;
background:
radial-gradient(900px 420px at 15% 0%, rgba(255,0,102,0.16), transparent 60%),
radial-gradient(760px 380px at 95% 18%, rgba(0,102,255,0.15), transparent 55%),
radial-gradient(920px 520px at 80% 110%, rgba(255,170,0,0.16), transparent 60%),
radial-gradient(820px 420px at 52% 105%, rgba(163,0,255,0.12), transparent 65%),
linear-gradient(145deg,#fbfcff,#f2f6ff,#ffffff);
box-shadow:
0 24px 60px rgba(17,24,39,0.24),
0 10px 24px rgba(17,24,39,0.12);
">
  <tbody>
    <tr>
      <td style="
        background:
          radial-gradient(900px 260px at 18% 0%, rgba(255,220,160,0.18), transparent 55%),
          linear-gradient(135deg,#3b0000,#6a0000,#9a0000,#a100ff,#ff0066,#ff7a00);
        padding:22px 24px;
        color:#ffffff;
        position:relative;
        box-shadow:
          inset 0 -10px 20px rgba(0,0,0,0.30),
          0 10px 22px rgba(0,0,0,0.18);
      ">
        <div style="
          height:4px;
          background:linear-gradient(90deg,
            rgba(255,255,255,0.06),
            rgba(255,232,190,0.58),
            rgba(255,255,255,0.10)
          );
          border-radius:999px;
          margin-bottom:14px;
          box-shadow:0 2px 10px rgba(0,0,0,0.25);
        "></div>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tbody>
            <tr>
              <td width="100" valign="middle">
                <img src="https://www.stareng.co.in/brand/logo.jpg"
                     alt="STAR ENGINEERING"
                     style="
                       max-width:80px;
                       display:block;
                       border-radius:10px;
                       box-shadow:0 14px 26px rgba(0,0,0,0.35);
                       border:1px solid rgba(255,232,190,0.45);
                     ">
              </td>
              <td valign="middle" style="padding-left:12px;">
                <h1 style="
                  margin:0;
                  font-size:20px;
                  letter-spacing:1px;
                  color:#ffffff;
                  font-weight:bold;
                  text-shadow:0 4px 14px rgba(0,0,0,0.50);
                ">
                  STAR ENGINEERING
                </h1>
                <p style="
                  margin:6px 0 0 0;
                  font-size:14px;
                  color:#fff1f7;
                  font-weight:bold;
                  text-shadow:0 3px 12px rgba(0,0,0,0.45);
                ">
                  Welcome to Your Account
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0;">
        <div style="
          padding:22px 20px 18px 20px;
          color:#111827;
          background:
            radial-gradient(900px 260px at 12% 0%, rgba(255,170,0,0.12), transparent 60%),
            radial-gradient(820px 240px at 88% 0%, rgba(163,0,255,0.10), transparent 60%),
            linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82));
          border-top:1px solid rgba(255,232,190,0.35);
        ">
          <p style="font-size:15px; margin-top:0; margin-bottom:12px;">
            Dear <b>${userName}</b>,
          </p>

          <p style="font-size:14px; line-height:1.75; margin:0 0 18px 0; color:#1f2937;">
            Greetings from <b>STAR ENGINEERING</b>.
          </p>

          <p style="font-size:14px;line-height:1.75;margin:0 0 18px 0;color:#1f2937;">
            Your account has been created successfully. Please find your login credentials below.
            You can use these details to access your account and manage your dashboard activities.
          </p>
<div style="
  margin:0 0 18px 0;
  padding:14px 16px;
  border-radius:12px;
  background:
    radial-gradient(700px 180px at 15% 0%, rgba(255,0,102,0.08), transparent 55%),
    radial-gradient(760px 200px at 95% 0%, rgba(0,102,255,0.08), transparent 60%),
    linear-gradient(180deg,#ffffff,#fff7fb);
  border:1px dashed rgba(255,170,0,0.70);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
">
  <p style="font-size:13px;line-height:1.7;margin:0;color:#1f2937;">
    For security reasons, please login to your account and change your password after your first sign-in.
  </p>
</div>
          <div style="
            border-radius:12px;
            overflow:hidden;
            border:1px solid rgba(255,232,190,0.55);
            box-shadow:
              0 16px 30px rgba(17,24,39,0.14),
              inset 0 1px 0 rgba(255,255,255,0.78);
            background:linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.88));
          ">
            <table width="100%" cellpadding="10" cellspacing="0"
              style="font-size:14px;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;">
              <tbody>
                <tr style="background:linear-gradient(90deg,#fff0f0,#ffffff);">
                  <td width="45%" style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);color:#111827;">
                    <b>Name</b>
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);color:#111827;">
                    ${userName}
                  </td>
                </tr>

                <tr style="background:#ffffff;">
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    <b>Email</b>
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    ${loginEmail}
                  </td>
                </tr>

                <tr style="background:linear-gradient(90deg,#fff0f0,#ffffff);">
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    <b>Phone</b>
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    ${phone}
                  </td>
                </tr>

                <tr style="background:#ffffff;">
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    <b>Role</b>
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    ${role}
                  </td>
                </tr>

                <tr style="background:linear-gradient(90deg,#fff0f0,#ffffff);">
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    <b>Password</b>
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(17,24,39,0.08);">
                    <span style="font-weight:bold;color:#7a0000;">${loginPassword}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top:20px;text-align:center;">
            <a href="${loginUrl}"
               target="_blank"
               style="
                 display:inline-block;
                 padding:14px 26px;
                 font-family: Arial, Helvetica, sans-serif;
                 border-radius:999px;
                 font-size:14px;
                 font-weight:700;
                 letter-spacing:0.8px;
                 text-decoration:none;
                 color:#ffffff;
                 background:linear-gradient(135deg,#3b0000,#a100ff,#ff0066,#ff7a00);
                 box-shadow:0 20px 40px rgba(17,24,39,0.25), inset 0 1px 0 rgba(255,255,255,0.25);
                 border:1px solid rgba(255,232,190,0.45);
               ">
               LOGIN NOW
            </a>

            <div style="margin-top:8px;font-size:12px;color:#6b7280;">
              Access your dashboard, transactions, reports & account details
            </div>
          </div>

          <div style="
            margin-top:18px;
            padding:16px;
            border-radius:12px;
            background:
              radial-gradient(700px 180px at 15% 0%, rgba(255,0,102,0.12), transparent 55%),
              radial-gradient(760px 200px at 95% 0%, rgba(0,102,255,0.10), transparent 60%),
              linear-gradient(180deg,#ffffff,#fff7fb);
            border:1px dashed rgba(255,170,0,0.70);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
          ">
            <p style="font-size:14px;line-height:1.65;margin:0;color:#1f2937;">
              For any login-related assistance, please contact our support team at
              <a href="mailto:starengineering13@gmail.com" style="color:#a100ff;text-decoration:none;" target="_blank">
                starengineering13@gmail.com
              </a>
            </p>

            <p style="font-size:14px;margin:16px 0 0 0;color:#1f2937;">
              Warm Regards,<br>
              <b>STAR ENGINEERING</b><br>
              📧 <a target="_blank" href="mailto:corporate@stareng.co.in" style="color:#a100ff;text-decoration:none;">
                corporate@stareng.co.in
              </a><br>
              🌐 <a href="https://www.stareng.co.in" style="color:#a100ff;text-decoration:none;" target="_blank">
                www.stareng.co.in
              </a>
            </p>
          </div>
        </div>
      </td>
    </tr>

    <tr>
      <td style="
        background:
          radial-gradient(900px 220px at 20% 0%, rgba(255,0,102,0.10), transparent 60%),
          radial-gradient(900px 220px at 80% 0%, rgba(0,102,255,0.10), transparent 60%),
          linear-gradient(180deg,#f4f4f6,#efeff2);
        padding:16px;
        text-align:center;
        font-size:12px;
        color:#6b7280;
        border-top:1px solid rgba(17,24,39,0.08);
      ">
        <div style="font-weight:bold; color:#111827; margin-bottom:6px;">
          This is a system-generated email. Please do not reply to this email. For support or assistance, contact our team below.
        </div>

        <div style="
          height:2px;
          width:160px;
          margin:10px auto;
          border-radius:999px;
          background:linear-gradient(90deg, rgba(161,0,255,0.25), rgba(255,122,0,0.35), rgba(0,102,255,0.25));
        "></div>

        <div style="line-height:1.7;">
          📧
          <a target="_blank" href="mailto:corporate@stareng.co.in"
             style="color:#a100ff;text-decoration:none;font-weight:bold;">
            corporate@stareng.co.in
          </a><br>

          📞
          <a href="tel:+919702485922"
             style="color:#111827;text-decoration:none;font-weight:bold;">
            Call Now: +91-9702485922
          </a><br>

          💬
          <a target="_blank" href="https://wa.me/917045276723"
             style="color:#111827;text-decoration:none;font-weight:bold;">
            WhatsApp: +91-7045276723
          </a>
        </div>
      </td>
    </tr>
  </tbody>
</table>
  `;
}