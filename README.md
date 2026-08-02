# Amson Pharmaceuticals — Web-Based Sales & Inventory Management System

Capstone project: Web-Based Sales and Inventory Management System with
Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals.

Plain HTML/CSS/JS + Bootstrap 5, built for static hosting on Netlify with
Firebase as the backend (Auth, Firestore, Storage) and EmailJS for
transactional emails (OTP codes, password reset notices).

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
   - Enable **Firestore Database**
   - Copy your web app config into `js/firebase-config.js`

3. **Firestore schema (RBAC + email verification)**
   Create a `users` collection, one document per Auth `uid`:
   ```
   users/{uid}
     role: "admin" | "customer"
     firstName: string
     lastName: string
     email: string
     contactNumber: string
     emailVerified: boolean
     emailVerificationCode: string   (deleted once verified)
     emailVerificationExpiresAt: number (deleted once verified)
   ```
   - The login page reads this document after sign-in: `admin` role goes to
     `admin/dashboard.html`; an unverified `customer` is sent to
     `verify-email.html`; a verified `customer` goes to `shop/index.html`.
   - Admin accounts aren't created through the public registration form —
     create them directly in Firebase Auth + Firestore with `role: "admin"`
     and `emailVerified: true`.

4. **EmailJS** (sends the OTP code on registration / resend)
   - Sign up at https://www.emailjs.com, create an email service and a
     template with a `{{otp_code}}` variable
   - Fill in `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, and
     `EMAILJS_OTP_TEMPLATE_ID` in `js/emailjs-config.js`
   - Until this is configured, registering still works, but the OTP code
     is only logged to the browser console (`js/otp.js` skips the send
     instead of erroring) — useful for testing the verify-email page
     before EmailJS is wired up.

5. **Google reCAPTCHA**
   - Register a reCAPTCHA v2 ("I'm not a robot") site at
     https://www.google.com/recaptcha/admin
   - Replace `YOUR_RECAPTCHA_SITE_KEY` in `login.html` and `register.html`
     with your site key

6. **Run locally**
   Any static file server works, e.g.:
   ```
   npx serve .
   ```
   Then open `http://localhost:3000/login.html`

7. **Deploy to Netlify**
   - Connect this repository to Netlify
   - Build command: none (static site)
   - Publish directory: `.`
