/**
 * EmailJS configuration.
 */
const EMAILJS_PUBLIC_KEY = "4ViMsdUv4UZhGxe6P";
const EMAILJS_SERVICE_ID = "service_wqp7tp9";
const EMAILJS_OTP_TEMPLATE_ID = "template_qi8p3ni";
// A separate EmailJS template needs to be created on the EmailJS dashboard
// for this one (same account/service as the OTP template above), using the
// variable names sendDispatchReceiptEmail() passes in admin-online-orders.js
// - see the comment on that function for the full list.
const EMAILJS_DISPATCH_RECEIPT_TEMPLATE_ID = "YOUR_EMAILJS_DISPATCH_RECEIPT_TEMPLATE_ID";

if (
  typeof emailjs !== "undefined" &&
  EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY"
) {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}
