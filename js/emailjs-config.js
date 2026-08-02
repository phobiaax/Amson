/**
 * EmailJS configuration for transactional emails (OTP codes, password reset
 * notices, order confirmations). Sign up at https://www.emailjs.com,
 * create an email service and a template, then fill these in.
 * The OTP template should include a variable named "otp_code".
 */
const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_EMAILJS_SERVICE_ID";
const EMAILJS_OTP_TEMPLATE_ID = "YOUR_EMAILJS_OTP_TEMPLATE_ID";

if (
  typeof emailjs !== "undefined" &&
  EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY"
) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}
