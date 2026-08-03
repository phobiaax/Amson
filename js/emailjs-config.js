/**
 * EmailJS configuration for transactional emails (OTP codes, password reset
 * notices, order confirmations). Sign up at https://www.emailjs.com,
 * create an email service and a template, then fill these in.
 * The OTP template should include a variable named "otp_code".
 */
const EMAILJS_PUBLIC_KEY = "4ViMsdUv4UZhGxe6P";
const EMAILJS_SERVICE_ID = "service_wqp7tp9";
const EMAILJS_OTP_TEMPLATE_ID = "template_qi8p3ni";

if (
  typeof emailjs !== "undefined" &&
  EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY"
) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}
