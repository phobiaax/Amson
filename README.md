# Amson Pharmaceuticals — Web-Based Sales & Inventory Management System

Capstone project: Web-Based Sales and Inventory Management System with
Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals.

Plain HTML/CSS/JS + Bootstrap 5, built for static hosting on Netlify with
Firebase as the backend (Auth, Firestore, Storage).

## Project structure

```
index.html          redirects to login.html
login.html           login page (customer + admin, RBAC-based redirect)
register.html         placeholder, built next
admin/dashboard.html   placeholder landing page for admin role
shop/index.html        placeholder landing page for customer role
css/style.css          global styles (brand colors, Roboto font)
js/firebase-config.js  Firebase project config (fill in your own keys)
js/auth.js             login logic: Firebase Auth + Firestore role lookup
```

## Setup

1. **Firebase project**
   - Create a project at https://console.firebase.google.com
   - Enable **Authentication > Email/Password**
   - Enable **Firestore Database**
   - Copy your web app config into `js/firebase-config.js`

2. **Firestore schema (RBAC)**
   Create a `users` collection, one document per Auth `uid`:
   ```
   users/{uid}
     role: "admin" | "customer"
     firstName: string
     lastName: string
     email: string
   ```
   The login page reads this document after sign-in to decide whether to
   redirect to `admin/dashboard.html` or `shop/index.html`.

3. **Demo admin account** (for the "Log in as Admin" button on the login page)
   - Create a user in Firebase Auth with email `admin@amson.ph` and password
     `AmsonAdmin123!` (or update the constants at the top of `js/auth.js`)
   - Add a matching `users/{uid}` doc with `role: "admin"`

4. **Google reCAPTCHA**
   - Register a reCAPTCHA v2 ("I'm not a robot") site at
     https://www.google.com/recaptcha/admin
   - Replace `YOUR_RECAPTCHA_SITE_KEY` in `login.html` with your site key

5. **Run locally**
   Any static file server works, e.g.:
   ```
   npx serve .
   ```
   Then open `http://localhost:3000/login.html`

6. **Deploy to Netlify**
   - Connect this repository to Netlify
   - Build command: none (static site)
   - Publish directory: `.`
