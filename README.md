# Amson Pharmaceuticals — Web-Based Sales & Inventory Management System

Capstone project: Web-Based Sales and Inventory Management System with
Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals.

Plain HTML/CSS/JS + Bootstrap 5, built for static hosting on Netlify with
Firebase as the backend (Auth, Firestore), Cloudinary for image uploads
(payment proofs, and later prescriptions / product photos), EmailJS
for transactional emails (OTP codes, password reset notices), and
Choices.js for searchable select dropdowns on the admin side (product,
supplier, batch, and category pickers — plain `<select>` elements get
unusable to scroll through once the catalog/supplier list grows).

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
     paymentIssue: { type, note, flaggedAt, holdUntil, ...type-specific fields } | null
                                                 (set by admin via the Payment Issue flow — "invalid_payment"
                                                 adds reason/reasonLabel, "underpayment" adds
                                                 amountReceived/outstandingBalance; both put the order on a
                                                 7-day hold. "overpayment" doesn't hold — it approves the
                                                 order instead and is recorded in paymentOverage below)
     paymentOverage: { amountReceived, excessAmount, note } | null
                                                 (set by admin when approving an order flagged as overpayment)
     trackingLink: string                       (set by admin on Mark as Dispatched)
     createdAt: Firestore timestamp

   products/{productId}
     sku: string                e.g. "MED-0001" (auto-generated, sequential)
     name, genericName, brand: string
     category: string           category id, references categories/{id}
     description: string
     costingPrice: number       admin-only, never shown to customers
     retailPrice: number        the price customers see and pay
     wholesalePrice: number     admin-only for now (wholesale module isn't built yet)
     imageUrl: string | null    Cloudinary secure_url
     availableInPOS: boolean
     availableInOnlineStore: boolean
     rxRequired: boolean
     reorderPoint: number       a batch at or below this quantity shows as
                                 Low Stock in Inventory (defaults to 20)
     status: "active" | "inactive"   inactive products are hidden from the
                                      storefront entirely, not just greyed out
     createdAt: Firestore timestamp

   categories/{categoryId}
     name: string
     (admin/products.html seeds 4 starter categories — otc, vitamins,
     personal-care, health-wellness — the first time it's opened if the
     collection is empty; add/rename/delete more via "Manage Categories")

   suppliers/{supplierId}
     name: string                company name
     contactPerson, phone, email, address: string
     productIds: string[]        products this supplier can fulfill —
                                  used later by Inventory's Purchase
                                  Order flow to suggest a supplier
     status: "active" | "inactive"
     createdAt: Firestore timestamp

   stockBatches/{batchId}
     productId: string
     batchNo: string
     expirationDate: string      ISO date "YYYY-MM-DD"
     quantity: number            current remaining quantity in this batch
     initialQuantity: number     quantity as originally received (for reporting)
     supplierId: string | null
     dateReceived: string        ISO date
     status: "active"            (batches aren't deleted, just drained to 0
                                  by write-offs/sales — keeps history intact)
     createdAt: Firestore timestamp
     (a batch's Normal/Low Stock/Out of Stock/Near-Expiry status is computed
     client-side per batch, not stored — see getBatchStatus() in
     js/products-data.js, shared by admin/inventory.html and the dashboard's
     alert counts. Near-Expiry means within 6 months of its expirationDate.)

   writeOffs/{writeOffId}
     batchId, productId, batchNo: string
     quantity: number            quantity written off
     reason: string
     createdAt: Firestore timestamp

   reconciliations/{reconciliationId}
     date: string                 ISO date of the physical count
     adjustments: [{ batchId, productId, batchNo, systemQty, countedQty, diff }]
     locked: true
     submittedAt: Firestore timestamp

   purchaseOrders/{poId}
     poNumber: string             e.g. "PO-2026-0001" (auto-generated, sequential)
     supplierId: string
     expectedDeliveryDate: string ISO date
     items: [{ productId, expectedQty }]      what was ordered
     status: "pending" | "received" | "discrepancy" | "closed"
     receivingRecord: {
       items: [{ productId, expectedQty, receivedQty, batchNo, expirationDate }],
       discrepancies: [{ productId, expectedQty, receivedQty, diff }],
     } | null                     set once the delivery is received against this PO
     receivedAt, acknowledgedAt: Firestore timestamp | null
     createdAt: Firestore timestamp

   counters/orders-{year}
     count: number   (used to generate sequential order numbers, don't edit by hand)

   counters/products
     count: number   (used to generate sequential product SKUs, don't edit by hand)

   counters/purchaseOrders-{year}
     count: number   (used to generate sequential PO numbers, don't edit by hand)
   ```
   - **Inventory Management** (`admin/inventory.html`) has two tabs: **Stock**
     (Receive Stock — including CSV batch upload, same column-format idea
     as Products' — Write Off Stock, FEFO near-expiry flagging, Stock
     Reconciliation) and **Purchase Orders** (create a PO ahead of
     delivery, receive against it later with the actual quantities/batch
     details, automatic discrepancy detection if received ≠ expected,
     and an acknowledge-to-close step for discrepancies). Receiving
     against a PO adds real stock either way — partial or mismatched
     deliveries still get added to inventory, only the PO's own status
     reflects the variance. The Export Report PDF includes a Purchase
     Order Discrepancies section built from this.
   - Not wired up: automatic FEFO-based stock deduction when an online
     order is approved/dispatched — `deductStockFEFO()` in
     `js/admin-inventory.js` is ready for that, it just isn't called from
     `admin/online-orders.html` yet.
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
   - The Online Orders table also has a manual status dropdown per row —
     an admin can move an order to any status directly, independent of
     the Payment Verification approve/dispatch flows.
   - **The whole storefront now reads from `products`/`categories`** via
     `admin/products.html` instead of the old hardcoded `SAMPLE_PRODUCTS`
     array — add your real catalog there before publishing, or the
     storefront will just show an empty catalog.
   - **CSV batch upload** (the "Upload Batch File" button in Add/Edit
     Product) expects a header row with these exact column names:
     `name,genericName,brand,category,costingPrice,retailPrice,wholesalePrice,description,rxRequired,availableInPOS,availableInOnlineStore,status`.
     `category` should be the category's display name (e.g. "OTC
     Medicines") — unrecognized names get created as new categories
     automatically. `rxRequired`/`availableInPOS`/`availableInOnlineStore`
     accept yes/no or true/false. Commas inside a field (e.g. in
     `description`) aren't supported yet — keep those comma-free, or add
     that product individually instead.
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
