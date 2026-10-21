/**
 * EmailJS configuration.
 */
const EMAILJS_PUBLIC_KEY = "4ViMsdUv4UZhGxe6P";
const EMAILJS_SERVICE_ID = "service_wqp7tp9";
const EMAILJS_OTP_TEMPLATE_ID = "template_qi8p3ni";
// Order update emails (REQ039). Create the template in EmailJS (see README)
// and paste its ID here; until then no order emails are sent.
const EMAILJS_ORDER_TEMPLATE_ID = "template_megjlhh";

if (
  typeof emailjs !== "undefined" &&
  EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY"
) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}
