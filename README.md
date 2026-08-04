# Amson Pharmaceuticals — Web-Based Sales & Inventory Management System

Capstone project: Web-Based Sales and Inventory Management System with
Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals.

Plain HTML/CSS/JS + Bootstrap 5, built for static hosting on Netlify with
Firebase as the backend (Auth, Firestore), Cloudinary for image uploads
(payment proofs, and later prescriptions / product photos), and EmailJS
for transactional emails (OTP codes, password reset notices).

## Project structure

```
index.html               redirects to login.html
login.html                login page (customer + admin, RBAC-based redirect)
register.html              registration page (creates a customer account)
forgot-password.html        standalone password reset request page
verify-email.html           6-digit OTP email verification page
admin/dashboard.html         placeholder landing page for admin role
shop/index.html               placeholder landing page for customer role
assets/logo.png                brand logo (add this file yourself, see below)
css/style.css                  global styles (brand colors, Roboto font)
js/firebase-config.js          Firebase project config (fill in your own keys)
js/emailjs-config.js           EmailJS config (fill in your own keys)
js/cloudinary-config.js        Cloudinary config (fill in your own cloud name + preset)
js/cloudinary.js               shared Cloudinary upload helper
js/orders.js                   shared order status/date/receipt-PDF helpers
js/otp.js                      shared OTP generation/sending helpers
js/auth.js                     login logic
js/register.js                 registration logic
js/forgot-password.js          password reset logic
js/verify-email.js             OTP verification logic
```

## Setup

1. **Logo**
   Drop the official logo file into `assets/logo.png` (create the `assets`
   folder if it isn't there yet). Every page references it as
   `assets/logo.png`, so as long as the filename matches it'll show up
   everywhere automatically.

2. **Firebase project**
   - Create a project at https://console.firebase.google.com
   - Enable **Authentication > Email/Password**
   - Enable **Firestore Database** (test mode)
   - Copy your web app config into `js/firebase-config.js`
   - **Before any real launch:** Firestore "test mode" allows anyone to
     read and write anything. Replace the default rules with real
     security rules before this goes live with real customer data.
   - Firebase Storage is intentionally not used — as of late 2024, Cloud
     Storage requires the Blaze (pay-as-you-go) plan, which needs a
     billing card on file even to stay within the free quota. Image
     uploads use Cloudinary instead (next step).

3. **Cloudinary** (image uploads — payment proofs now, product photos /
   prescription uploads later)
   - Sign up free at https://cloudinary.com (no card required)
   - Go to **Settings > Upload > Upload presets > Add upload preset**,
     set **Signing Mode** to **Unsigned**, and save
   - Fill in `CLOUDINARY_CLOUD_NAME` (shown on your dashboard) and
     `CLOUDINARY_UPLOAD_PRESET` (the preset name you just created) in
     `js/cloudinary-config.js`
   - Note: files uploaded this way get a public URL — anyone with the
     link can view them. Fine for now, but worth revisiting (e.g.
     migrating to Firebase Storage with real security rules) once the
     business has revenue, since payment proofs and prescriptions are
     sensitive.

4. **Firestore schema**
   ```
   users/{uid}
     role: "admin" | "customer"
     firstName, lastName, email, contactNumber: string
     emailVerified: boolean
     emailVerificationCode, emailVerificationExpiresAt   (deleted once verified)
     shippingAddress: { streetAddress, city, province, zipCode, deliveryNotes }
                                                          (saved after first checkout)

   orders/{orderId}
     orderNumber: string        e.g. "AMP-2026-0001"
     customerId: string | null  (null for guest checkout)
     contact: { firstName, lastName, email, contactNumber }
     shipping: { streetAddress, city, province, zipCode, deliveryNotes }
     deliverySchedule: { date, slot } | null
     items: [{ id, name, price, qty }]   snapshot at order time
     total: number
     deliveryFeeEstimate: number
     proofOfPaymentUrl: string  (Cloudinary secure_url)
     status: "placed" | "payment_confirmed" | "dispatched" | "delivered" | "received"
     statusTimestamps: { placed, payment_confirmed, dispatched, delivered, received }
     paymentReferenceNumber: string             (set by admin on Approve Payment)
     paymentIssue: { reason, reasonLabel, flaggedAt, holdUntil } | null
                                                 (set by admin when flagging a payment problem)
     trackingLink: string                       (set by admin on Mark as Dispatched)
     createdAt: Firestore timestamp

   counters/orders-{year}
     count: number   (used to generate sequential order numbers, don't edit by hand)
   ```
   - The login page reads the `users` doc after sign-in: `admin` role goes
     to `admin/dashboard.html`; an unverified `customer` is sent to
     `verify-email.html`; a verified `customer` goes to `shop/index.html`.
   - Admin accounts aren't created through the public registration form —
     create them directly in Firebase Auth + Firestore with `role: "admin"`
     and `emailVerified: true`.
   - `placed` is set automatically when a customer pays. From there,
     `admin/online-orders.html` (Payment Verification tab) moves an order to
     `payment_confirmed` on Approve Payment, and to `dispatched` on Mark as
     Dispatched. `delivered` and `received` still have no admin/customer
     action wired up yet.
   - The "Payment Issue" dropdown on the verification review panel
     currently uses placeholder reason options — swap in the real list once
     it's finalized.
   - **First time you load `shop/orders.html`**, Firestore will likely
     show an error in the browser console with a link to create a
     composite index (it needs one for the `customerId` + `createdAt`
     query). Just click that link and confirm — takes a minute to build,
     then the page works.

5. **EmailJS** (sends the OTP code on registration / resend)
   - Sign up at https://www.emailjs.com, create an email service and a
     template with a `{{otp_code}}` variable
   - Fill in `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, and
     `EMAILJS_OTP_TEMPLATE_ID` in `js/emailjs-config.js`
   - Until this is configured, registering still works, but the OTP code
     is only logged to the browser console (`js/otp.js` skips the send
     instead of erroring) — useful for testing the verify-email page
     before EmailJS is wired up.

6. **Google reCAPTCHA**
   - Register a reCAPTCHA v2 ("I'm not a robot") site at
     https://www.google.com/recaptcha/admin
   - Replace `YOUR_RECAPTCHA_SITE_KEY` in `login.html` and `register.html`
     with your site key

7. **Run locally**
   Any static file server works, e.g.:
   ```
   npx serve .
   ```
   Then open `http://localhost:3000/login.html`

8. **Deploy to Netlify**
   - Connect this repository to Netlify
   - Build command: none (static site)
   - Publish directory: `.`
