# Amson Pharmaceuticals Web System

Online store, point-of-sale, inventory and order management for the Amson
Pharmaceuticals Las Piñas branch. Plain HTML, CSS and JavaScript with
Bootstrap 5, backed by Firebase (Authentication + Cloud Firestore) on the
free Spark plan. There is no build step.

## Running it locally

1. Install [Node.js](https://nodejs.org/) (any current LTS).
2. On Windows, double-click `start-server.bat`. It starts `http-server` on
   port 8080 and opens `http://localhost:8080/shop/index.html`.
   On other systems run `npx http-server -p 8080` in this folder.
3. Staff sign in at `login.html` and land on their role's home page
   (Sales Staff go straight to the POS).

`pull-latest.bat` pulls the newest code from GitHub.

## Folder layout

| Folder / file | What it holds |
| --- | --- |
| `shop/` | Customer pages: catalog, cart, checkout, payment, My Orders, account |
| `admin/` | Staff pages: dashboard, POS, online orders, products, inventory, suppliers, wholesale, customers, staff, audit log, settings |
| `js/products-data.js` | Shared core: catalog cache, FEFO stock deduction, SI numbering, receipts, voids, dialogs, exports, audit log |
| `js/orders.js` | Shared order helpers: statuses, holds, store credit, customer notifications, order receipt PDF |
| `js/admin-roles.js` | Which pages each staff role may open |
| `js/store-info.js` | Store name, contact details and FDA LTO number shown in every footer |
| `js/legal-content.js` | Terms and Conditions + Privacy Policy text |
| `js/*-config.js` | Firebase, Cloudinary and EmailJS settings |
| `firestore.rules` | Database security rules |
| `docs/AMSON-Deviation-Register.xlsx` | Paper-vs-system register and to-do list |

## Services and their settings

| Service | Used for | Where it's configured |
| --- | --- | --- |
| Firebase Authentication | Customer and staff accounts | `js/firebase-config.js` |
| Cloud Firestore | All data | `js/firebase-config.js`, rules in `firestore.rules` |
| Cloudinary | Product photos, payment screenshots, prescriptions, documents | `js/cloudinary-config.js` (unsigned upload preset) |
| Firebase AI Logic (Gemini) | Live chat assistant | `js/chat-config.js` |
| EmailJS | Sign-up and new-device codes, order update emails | `js/emailjs-config.js` |
| jsPDF, SheetJS, Chart.js, Choices.js | PDFs, Excel import/export, charts, searchable selects | loaded from CDN in each page |

These keys are public browser keys by design; access is controlled by
`firestore.rules`.

## After changing `firestore.rules`

The rules file in this repo does nothing until it is published:
Firebase console → Firestore Database → Rules → paste the file → Publish.

Publish the current file before the branch uses the system: it is what
stops a customer from writing their own orders, holds or store credit
straight to the database, and what cuts off a deactivated staff account.

## Clearing test data before go-live (temporary)

The Branch Manager can open Admin → Settings → Clear Test Data
(`admin/clear-test-data.html`) to delete the orders, sales, stock, chats,
logs and test accounts made while testing, and to set the next SI number.
It needs the latest `firestore.rules` published, and both the page and its
delete rule switch off on November 15, 2026. Logins of deleted accounts
must still be removed in Firebase console → Authentication → Users. After
go-live, delete the page, `js/admin-clear-test-data.js`, its Settings card
and the "TEMPORARY" block in `firestore.rules`.

## Live chat setup (AI assistant)

The chat works without any setup: common questions get built-in answers
and everything else goes to staff in Admin → Live Chat. To turn on AI
replies (Google Gemini, free tier, no API key in the code):

1. Firebase console → **AI Logic** → Get started → choose the
   **Gemini Developer API** (no-cost tier, works on the Spark plan).
2. Publish the latest `firestore.rules` (the chat collections are in it).
3. Settings are in `js/chat-config.js`: the model, and `dailyAiLimit`, the
   branch's own cap on AI replies per day. When the cap is reached (or the
   AI is unavailable), new questions are handed to staff. Today's count is
   shown at the top of Admin → Live Chat.

Set `aiProvider: "none"` in `js/chat-config.js` to run the chat with
built-in answers and staff only.

## Order update emails (EmailJS)

Customers get an email for each order update (placed, payment confirmed,
on hold, prescription result, dispatched with the tracking link, ready for
pick-up, store credit). They can turn emails off in Account Settings; the
in-site bell always shows them.

1. EmailJS dashboard → Email Templates → Create New Template.
2. Set **To Email** to `{{to_email}}` and **Subject** to `{{subject}}`.
3. Body: paste `docs/email-templates/order-update.html` into the template's
   HTML/code editor (same look as the verification code email). It uses
   `{{to_name}}`, `{{subject}}`, `{{message}}` and `{{link}}`.
4. Save, then paste the template ID into `EMAILJS_ORDER_TEMPLATE_ID` in
   `js/emailjs-config.js`. Until then no order emails are sent.

The free EmailJS plan allows 200 emails a month (OTP codes included); a
typical order sends 2 to 3 emails.

## Login code on a new device

When someone logs in from a browser their account hasn't used before,
a 6-digit code is emailed to them (the same EmailJS template as the sign-up
code). They have to enter it before they can continue. Customers and staff
both get this. Each person gets one code per device, and Account Settings
lists their recognized devices. Every account therefore needs a real inbox.
While testing with made-up emails, set `REQUIRE_DEVICE_CODE = false` in
`js/device-trust.js`.

## First-time store setup

1. Create the first Branch Manager account in Firebase Authentication, then
   set `role: "branch_manager"` on their `users/{uid}` document.
2. In Admin → Products → Manage Categories, add the branch's categories
   (Generics, Branded, Drugstore (Per Piece), Medical Supplies, Grocery).
3. Fill in the store contact details and FDA LTO number in `js/store-info.js`.
4. Put the branch's QR Ph image at `assets/payment-qr.png`.

## Staff roles

| Role | Access |
| --- | --- |
| Branch Manager | Everything; the only role that sets prices and finalizes stock counts |
| Technical Staff | Everything except Staff Management; prices are view-only and stock counts are saved for the Branch Manager to finalize |
| Sales Staff | POS (with today's sales) and a read-only product catalog |

## Deployment

The site is static and is meant to be hosted on Netlify: publish this folder
as-is (no build command). Add the Netlify domain to Firebase Authentication →
Settings → Authorized domains.
