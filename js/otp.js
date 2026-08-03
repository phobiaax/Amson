/**
 * Shared OTP helpers used by the register and email verification pages.
 */

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(toEmail, code, toName = "") {
  if (
    typeof emailjs === "undefined" ||
    EMAILJS_SERVICE_ID === "YOUR_EMAILJS_SERVICE_ID"
  ) {
    console.warn("EmailJS is not configured yet — OTP email was not sent.", {
      toEmail,
      code,
    });
    return false;
  }

  // Sent under a few common EmailJS variable name conventions so this
  // works regardless of which one the template actually uses.
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_OTP_TEMPLATE_ID, {
    to_email: toEmail,
    otp_code: code,
    to_name: toName,
    name: toName,
    first_name: toName,
  });
  return true;
}
