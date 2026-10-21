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
| EmailJS | One-time verification codes | `js/emailjs-config.js` |
| jsPDF, SheetJS, Chart.js, Choices.js | PDFs, Excel import/export, charts, searchable selects | loaded from CDN in each page |

These keys are public browser keys by design; access is controlled by
`firestore.rules`.

## After changing `firestore.rules`

The rules file in this repo does nothing until it is published:
Firebase console → Firestore Database → Rules → paste the file → Publish.

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
