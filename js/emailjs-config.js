/**
 * EmailJS configuration.
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
