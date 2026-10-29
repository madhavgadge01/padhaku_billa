import crypto from 'crypto';

const SENDER_EMAIL = process.env.APP_SENDER_EMAIL || 'madhvagadge03@gmail.com';
const SENDER_NAME = 'Padhaku Billa RPG';

/**
 * Generates a cryptographically strong 6-digit numeric OTP code.
 */
export const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Builds a responsive, arcade/game-inspired HTML email template for Padhaku Billa.
 */
const buildOTPEmailHTML = (otp, purpose = 'Verification') => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Padhaku Billa OTP Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1411; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f2f7f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1411; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #162420; border-radius: 24px; border: 1px solid #253d35; padding: 36px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 14px; background: #1b3b2f; font-size: 24px; text-align: center; margin-bottom: 12px;">
                🌱
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #f2f7f4;">
                Padhaku Billa <span style="color: #a3d9c9;">RPG</span>
              </h1>
              <p style="margin: 4px 0 0; font-size: 13px; font-weight: 500; color: #8ba398;">
                Honest with yourself. I track your time, not your lies.👀
              </p>
            </td>
          </tr>

          <!-- Message Card -->
          <tr>
            <td align="center" style="background-color: #0f1a16; border-radius: 16px; border: 1px solid #253d35; padding: 24px 20px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #dcefe3; font-weight: 600;">
                Your One-Time Passcode for ${purpose}:
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #162420; border: 2px dashed #3b82f6; border-radius: 12px; padding: 14px 24px; display: inline-block; margin: 8px 0;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #f59e0b; display: block; text-shadow: 0 0 12px rgba(245, 158, 11, 0.3);">
                  ${otp}
                </span>
              </div>

              <p style="margin: 16px 0 0; font-size: 12px; color: #8ba398; line-height: 1.5;">
                ⏱️ Valid for <strong>10 minutes</strong>. Never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 11px; color: #576560;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #576560;">
                Sent by Padhaku Billa Application (${SENDER_EMAIL})
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Sends a real transactional OTP email via Brevo REST API v3.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - 'Account Registration' | 'Account Login' | 'Verification'
 * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean, error?: string }>}
 */
export const sendOTPEmail = async (toEmail, otp, purpose = 'Verification') => {
  const cleanEmail = toEmail.toLowerCase().trim();
  const brevoApiKey = process.env.BREVO;

  // Masked console logging for audit
  console.log(`\n======================================================`);
  console.log(`📧 [OTP DISPATCH] Destination: ${cleanEmail}`);
  console.log(`🎯 Purpose:     ${purpose}`);
  console.log(`⏱️  Validity:    10 Minutes`);
  console.log(`======================================================\n`);

  if (!brevoApiKey) {
    console.warn('[EmailService Warning] No BREVO key configured in environment.');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 [DEV CONSOLE OTP]: >>> ${otp} <<< for ${cleanEmail}`);
    }
    return {
      success: false,
      simulated: true,
      error: 'Brevo integration key is not configured in environment variables.',
    };
  }

  try {
    const htmlContent = buildOTPEmailHTML(otp, purpose);
    const payload = {
      sender: {
        name: SENDER_NAME,
        email: SENDER_EMAIL,
      },
      to: [
        {
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
        },
      ],
      subject: `Your Padhaku Billa Verification Code: ${otp}`,
      htmlContent,
    };

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resData = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`[EmailService] OTP successfully dispatched via Brevo! MessageId: ${resData.messageId}`);
      return {
        success: true,
        messageId: resData.messageId,
      };
    }

    // Brevo API Error Handler
    console.error(
      `[EmailService Error] Brevo rejected email dispatch with HTTP status ${res.status}:`,
      resData
    );

    if (res.status === 401 && resData.code === 'unauthorized') {
      console.error('\n⚠️  [Brevo Security Restriction]: Brevo detected an unrecognised IP address.');
      console.error('👉 Authorize this IP at: https://app.brevo.com/security/authorised_ips\n');
    }

    // In development mode, provide console OTP so testing is not blocked
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 [DEV CONSOLE OTP FALLBACK]: >>> ${otp} <<< for ${cleanEmail}`);
    }

    return {
      success: false,
      error: resData.message || `Brevo API returned status ${res.status}`,
      code: resData.code || 'BREVO_API_ERROR',
    };
  } catch (err) {
    console.error('[EmailService Network Exception] Failed to reach Brevo API:', err.message);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 [DEV CONSOLE OTP FALLBACK]: >>> ${otp} <<< for ${cleanEmail}`);
    }

    return {
      success: false,
      error: `Network failure contacting Brevo: ${err.message}`,
    };
  }
};
