# 00 - The Basics You Need First

This file explains the building blocks of the Amson web system using **our own code** as the examples.
Read this one first. Every later file assumes you know what is in here.

> How to read the references: `js/cart.js:111` means "the file `js/cart.js`, line 111".
> Open the file in VS Code and press `Ctrl+G` to jump to a line.

---

## 1. How the site is put together

### 1.1 Three kinds of files

| Kind | What it does | Where ours are |
| --- | --- | --- |
| **HTML** (`.html`) | The *skeleton* of a page: headings, buttons, forms, tables. | `index.html`, `login.html`, `shop/*.html` (customer pages), `admin/*.html` (staff pages) |
| **CSS** (`.css`) | The *look*: colours, spacing, fonts, layout on phones vs laptops. | One file: `css/style.css` (about 2,970 lines) plus Bootstrap 5 |
| **JavaScript** (`.js`) | The *behaviour*: what happens when you click, reading and saving data. | `js/` folder, about 50 files |

There is **no build step**. We do not use React, Angular or a bundler. The browser opens the
HTML file, and that file directly lists every CSS and JS file it needs. This keeps the system simple
to run (just open it with a small web server) and simple to host (Firebase Hosting serves the files as they are).

### 1.2 The folders

```
Amson/
├─ index.html, login.html, register.html, verify-email.html, forgot-password.html, legal.html
├─ shop/      customer pages: index (home), products, product-details, cart, checkout, payment,
│             orders, order-details, account-settings
├─ admin/     staff pages: dashboard, pos, online-orders, inventory, products, suppliers,
│             customer-accounts, wholesale-accounts, staff-management, live-chat,
│             notifications, reports, audit-log, settings, clear-test-data
├─ js/        all the JavaScript
├─ css/       style.css
├─ assets/    logo, QR Ph image, pictures
├─ firestore.rules   database security rules
└─ firebase.json     hosting settings (what to publish, security headers)
```

### 1.3 How a page loads its scripts, in order

Browsers run `<script>` tags **from top to bottom**. A script can only use things that an
earlier script already created. So the order matters. Here is the end of `admin/pos.html` (lines 273-295):

```html
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/choices.js@10.2.0/public/assets/scripts/choices.min.js"></script>

<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check-compat.js"></script>

<script src="../js/firebase-config.js"></script>
<script src="../js/shop-sections.js"></script>
<script src="../js/products-data.js"></script>
<script src="../js/admin-sidebar.js"></script>
<script src="../js/validators.js"></script>
<script src="../js/admin-pos.js"></script>
<script src="../js/admin-roles.js"></script>
<script src="../js/device-trust.js"></script>
<script src="../js/admin-header.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
```

Line by line, in plain words:

1. **Bootstrap JS** loads first, so pop-ups (modals) and dropdowns work.
2. **Choices.js** gives us searchable dropdowns (the POS product search box).
3. **Firebase libraries** (app, auth, firestore, app-check) load next. They create the global `firebase` object.
4. **`firebase-config.js`** connects to *our* Firebase project and creates `auth` and `db`. Everything after this uses `db`.
5. **`products-data.js`** is the shared core (catalog, stock deduction, receipts, dialogs). Most pages load it.
6. **`admin-pos.js`** is the page's own logic.
7. **`admin-roles.js`, `device-trust.js`, `admin-header.js`**: the header checks *who is logged in* and *whether their role may open this page*. When it's happy it fires an event called `admin:ready`, and `admin-pos.js` waits for that event before loading anything.
8. **jsPDF** loads last because it's only needed when someone prints an exchange slip.

> Why does `admin-pos.js` load *before* `admin-header.js` if it needs the user?
> Because `admin-pos.js` doesn't do its work immediately. It only *listens*: `document.addEventListener("admin:ready", ...)` (`js/admin-pos.js:48`).
> The header fires that event later, once the login and role checks pass (`js/admin-header.js:62`).

### 1.4 Shared files vs page files

- **Shared** (used by many pages): `firebase-config.js`, `products-data.js`, `validators.js`, `orders.js`, `cart.js`, `admin-header.js`, `admin-roles.js`, `device-trust.js`, `cloudinary.js`.
- **Page files** (one page each): `admin-pos.js` → `admin/pos.html`, `checkout.js` → `shop/checkout.html`, and so on.
- `CODE_MAP.md` in the repo root lists the sections inside `products-data.js`.

---

## 2. JavaScript basics, as used in our code

### 2.1 Variables: `const` and `let`

A variable is a named box that holds a value.

```js
const CART_STORAGE_KEY = "amsonCart";   // js/cart.js:3
let posCart = [];                       // js/admin-pos.js:1
```

- `const` = the box can't be pointed at something new. We use it for fixed settings and for things we never reassign.
- `let` = the box *can* be given a new value later. `posCart` changes every time the cashier adds an item.
- We never use the old `var`.
- ALL_CAPS names (like `CART_STORAGE_KEY`, `OTP_CODE_TTL_MS`) are our convention for "fixed setting".

### 2.2 Functions

A function is a named set of steps you can run again and again.

```js
// js/products-data.js:1286
function formatPeso(amount) {
  return `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
```

- `amount` is the **parameter** (the input).
- `amount || 0` means "use amount, but if it's empty/undefined use 0" so we never print `₱NaN`.
- `` `₱${...}` `` is a **template string**: backticks let you put values inside `${ }`.
- `return` sends the answer back. `formatPeso(1500)` gives `"₱1,500.00"`.

**Arrow functions** are a shorter way to write a function, used a lot for small steps:

```js
(p) => p.status === "active" && p.availableInOnlineStore     // js/products-data.js:209
```
Read it as: "given a product `p`, answer *true* if it's active and available online".

### 2.3 if / else

```js
// js/admin-pos.js:252
if (isCash && cash < total) {
  posAlert.textContent = "Cash received is less than the total.";
  posAlert.classList.remove("d-none");
  return;
}
```
If both conditions are true (`&&` means AND), show the error and `return` (stop the function early).
This "check, show error, return" pattern is everywhere in our forms. It's called a **guard clause**.

The short form `condition ? a : b` (the **ternary**) picks one of two values:
```js
const customerName = posCustomerNameInput.value.trim() || "Walk-in";   // js/admin-pos.js:281
passwordInput.type = isHidden ? "text" : "password";                   // js/auth.js:17
```

### 2.4 Loops

```js
// js/cart.js:163
function cartCount(cart = getCart()) {
  let sum = 0;
  for (const item of cart) {
    sum += item.qty;
  }
  return sum;
}
```
`for (const item of cart)` means "for each item in the cart list, run the block once". It adds up all quantities.

We also use array methods that loop for you:

| Method | Meaning | Our example |
| --- | --- | --- |
| `.filter(fn)` | keep only items where fn is true | `getCart().filter((i) => i.id !== productId)`: remove one product (`js/cart.js:150`) |
| `.map(fn)` | turn each item into something else | `pageItems.map(renderProductCard)`: products → HTML cards (`js/products.js:109`) |
| `.find(fn)` | the first item where fn is true | `CATALOG_PRODUCTS.find((p) => String(p.id) === String(id))` (`js/products-data.js:204`) |
| `.some(fn)` | is fn true for at least one? | `cart.some((item) => product.rxRequired)`: does the cart need a prescription? (`js/checkout.js:58`) |
| `.reduce(fn, start)` | combine everything into one value | adding up sale totals (`js/admin-pos.js:227`) |
| `.forEach(fn)` | do something for each item | wiring each cart row (`js/cart-page.js:69`) |

### 2.5 Arrays and objects

- **Array** = an ordered list, in square brackets: `["placed", "payment_confirmed", "dispatched", "delivered", "received"]` (`js/orders.js:3`).
- **Object** = a group of named values, in curly brackets. A cart item is `{ id: "p04", qty: 2 }`.
- You read object values with a dot: `item.qty`, `order.items`.
- A list of objects is very common: the cart is an array of `{ id, qty }` objects.

`...` (the **spread** operator) copies everything from one object into another:
```js
return { id: doc.id, ...data, price: data.retailPrice, totalStock, inStock: ... };   // js/products-data.js:1041
```
"Make a new object with the document id, *all* its saved fields, plus a few computed ones."

### 2.6 async / await (waiting for the internet)

Talking to the database takes time (milliseconds to seconds). JavaScript doesn't freeze while it waits.
An `async` function can use `await` to say "pause *this function* here until the answer comes back".

```js
// js/auth.js:139-140
const credential = await auth.signInWithEmailAndPassword(email, password);
const userDoc = await db.collection("users").doc(credential.user.uid).get();
```
1. Ask Firebase to log in, and wait for the answer.
2. Then read that user's profile from the database, and wait.

If something fails (wrong password, no internet), it **throws an error**. We catch errors with `try / catch / finally`:

```js
// js/auth.js:127-178 (shortened)
setLoading(true);
try {
  ...                      // the steps that might fail
} catch (error) {
  showAlert(mapAuthError(error));   // turn the error into a friendly message
} finally {
  setLoading(false);       // always runs, success or failure: the button comes back
}
```

A **Promise** is the "I'll answer later" object that `await` waits on. `Promise.all([...])` waits for several things at once,
for example loading categories, products and stock at the same time (`js/products-data.js:1016`).

### 2.7 Events (reacting to clicks and typing)

```js
// js/auth.js:328
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();          // stop the browser's default "reload the page"
  ...
  performLogin(emailInput.value.trim(), passwordInput.value);
});
```
`addEventListener("submit", fn)` = "when this form is submitted, run fn".
Other events we use: `"click"`, `"input"` (every keystroke), `"change"` (value finished changing), `"keydown"`.

**Event delegation**: instead of wiring every "Add to Cart" button one by one, we listen once on the whole page:
```js
// js/cart.js:235
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if (!btn) return;
  const result = addToCart(btn.dataset.id, 1);
  ...
});
```
`closest(".btn-add-cart")` finds the button that was clicked (even if you clicked the text inside it).
`btn.dataset.id` reads the `data-id="..."` attribute we put on the button. This works even for buttons added later.

We also make **our own events**: `admin-header.js` fires `admin:ready` (`js/admin-header.js:62`) and `cart.js` fires `cart:synced` (`js/cart.js:104`).

### 2.8 The DOM (changing the page)

The **DOM** is the browser's live copy of the HTML that JavaScript can change.

- `document.getElementById("loginForm")` grabs one element by its `id` (`js/auth.js:3`).
- `document.querySelector(".toggle-password")` grabs the first element matching a CSS selector (`js/auth.js:11`).
- `document.querySelectorAll(".admin-nav-link")` grabs all matches (`js/admin-header.js:53`).
- `element.classList.add("d-none")` / `.remove("d-none")`: Bootstrap's `d-none` class hides an element. This is how we show and hide things.

#### `textContent` vs `innerHTML`: this matters for security

```js
loginAlert.textContent = message;            // js/auth.js:25  → shown as plain text, always safe
productsGrid.innerHTML = pageItems.map(renderProductCard).join("");   // js/products.js:108 → parsed as HTML
```
- `textContent` puts text on the page **as text**. If the text is `<script>`, it shows the characters `<script>`.
- `innerHTML` **builds HTML** from a string. If that string contains something a user typed, a hacker could
  sneak in HTML or a script (this attack is called **XSS**, cross-site scripting).
- So whenever we build HTML with `innerHTML`, any user-typed value goes through `escapeHtml()` first:

```js
// js/products-data.js:1290
function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
```
It swaps the five dangerous characters for safe codes. Example: product cards use `${escapeHtml(product.name)}` (`js/products-data.js:2451`).

### 2.9 Browser storage

- **`localStorage`**: survives closing the browser. We keep the guest cart (`amsonCart`), a 5-minute catalog copy, and the device id.
- **`sessionStorage`**: cleared when the tab closes. We keep the order being checked out (`amsonPendingOrder`) and one-time messages for the login page.
- We always wrap these in `try { } catch { }` because private browsing can block them.

---

## 3. Firebase: our "backend"

Firebase is a Google service that gives us a login system and a database **without writing our own server**.
We use the free **Spark plan**. Our project id is `amson-web-app` (`js/firebase-config.js:5`).

```js
// js/firebase-config.js:11, 21-22
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
```
After these lines, every page has `auth` (logins) and `db` (database).

### 3.1 Firebase Authentication (Auth)

Handles accounts with email + password.
- `auth.createUserWithEmailAndPassword(email, password)`: sign up (`js/register.js:195`)
- `auth.signInWithEmailAndPassword(email, password)`: log in (`js/auth.js:139`)
- `auth.sendPasswordResetEmail(email)`: forgot password (`js/forgot-password.js:49`)
- `auth.onAuthStateChanged(fn)`: "tell me when the logged-in user is known or changes" (`js/admin-header.js:13`)
- Passwords are **never** stored in our database. Firebase keeps them (hashed) on Google's side.

Each account gets a **uid** (user id), a long random string. We use it to link the login to the person's profile in the database.

### 3.2 Cloud Firestore (the database)

Firestore is a **NoSQL document database**. Think of it like a filing cabinet:

| Firestore word | Filing cabinet | Our example |
| --- | --- | --- |
| **Collection** | a drawer | `orders`, `products`, `users`, `stockBatches` |
| **Document** | one folder in the drawer, with its own id | one order, id like `Xy7aB...` |
| **Field** | one line written inside the folder | `status: "placed"`, `total: 350` |
| **Subcollection** | a smaller drawer inside a folder | each chat thread has a `messages` subcollection |

There are no tables or SQL joins. A document can hold lists and nested objects (an order holds its `items` list).

### 3.3 Reads, writes, transactions and listeners

**Read once** with `.get()`:
```js
const userDoc = await db.collection("users").doc(uid).get();     // js/auth.js:140
```
**Write**:
- `.set(data)`: create or overwrite a document (`js/register.js:203`)
- `.update({ field: value })`: change some fields (`js/device-trust.js:45`)
- `.add(data)`: create with an automatic id (`js/orders.js:139`)
- `.delete()`: remove (`js/auth.js:94`)

**Special values**:
- `firebase.firestore.FieldValue.serverTimestamp()`: "use Google's clock", so a wrong phone clock can't fake the time.
- `FieldValue.increment(-50)`: add or subtract safely, even if two people do it at once.
- `FieldValue.delete()`: remove a field.

**Transaction** = a group of reads and writes that happen **all together or not at all**.
If someone else changes the same document in the middle, Firestore **re-runs** the whole thing with fresh data.
We use transactions whenever two people could clash: order numbers, SI numbers, stock deduction.

```js
// js/orders.js:322-327 (generateOrderNumber)
nextCount = await db.runTransaction(async (transaction) => {
  const counterDoc = await transaction.get(counterRef);                   // read the current number
  const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1; // add 1
  transaction.set(counterRef, { count: next }, { merge: true });          // save it
  return next;
});
```
Rule of transactions: **all reads must come before any writes** (see the comment at `js/products-data.js:1904`).

**Batch write** (`db.batch()`): several writes that save together, but without reading first. Used when saving a product and its private prices (`js/admin-products.js:509`).

**Listener** (`onSnapshot`) = "keep watching this and tell me every time it changes". This is what makes pages update **live** without refreshing:
```js
// js/admin-header.js:198-210
query.onSnapshot((snap) => { live[name] = snap.docs; merge(); }, (error) => { ... });
watch("orders", db.collection("orders").where("status", "==", "placed"));
```
When a customer places an order, the staff bell updates by itself.

**Query** = a filtered read: `.where("status", "==", "placed")`, `.orderBy("createdAt", "desc")`, `.limit(1)`.

### 3.4 Security rules (`firestore.rules`)

Our JavaScript runs in the customer's browser, so a clever user can change it or type commands in the
browser console. **We can't trust the browser.** The real protection is the **security rules**: a file that
Google checks on *its* servers before every read and write.

```
// firestore.rules:132-134
match /orders/{orderId} {
  allow read: if isSignedIn() && resource.data.customerId == myUid();
  allow read: if isOpsStaff();
```
"Someone may read an order only if they're logged in **and** it's their own order, **or** they're operations staff."

- `request.auth` = who is making the request.
- `resource.data` = the document **as it is now** in the database.
- `request.resource.data` = the document **as it would be after** this write.
- The last rule, `match /{document=**} { allow read, write: if false; }` (`firestore.rules:381-383`), blocks everything not explicitly allowed.

The rules file does nothing until it's **published** (`npx firebase-tools deploy --only firestore:rules`).

### 3.5 App Check

App Check proves a request really came **from our website**, not from someone who copied our Firebase settings into their own script.
It uses reCAPTCHA in the background to get a token.
- For the **database**, App Check is currently **off**: `APP_CHECK_SITE_KEY = ""` (`js/firebase-config.js:14`). The rules protect the database.
- For the **Gemini chat assistant**, App Check is **on and enforced** (`js/chat-config.js:11`, `js/live-chat.js:461-467`). This stops strangers from spending our free AI quota.
- On `localhost`, App Check needs a **debug token** registered in the Firebase console (`js/live-chat.js:464`).

### 3.6 Firebase Hosting

Serves our files at https://amsonpharma.web.app (and https://amson-web-app.web.app).
`firebase.json` decides what gets published (it **ignores** `docs/`, `study/`, `README.md`, the rules file, etc.)
and adds **security headers** to every page: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.

---

## 4. The outside services and libraries

| Service | What it does for us | Why we chose it | Where in our code |
| --- | --- | --- | --- |
| **EmailJS** | Sends emails straight from the browser: the 6-digit sign-up code and order-update emails | No server needed (we're on the free Firebase plan, which can't run our own email server). Free plan: 200 emails a month | `js/emailjs-config.js`, `sendOtpEmail` in `js/otp.js:9`, `sendOrderEmail` in `js/orders.js:147` |
| **Cloudinary** | Stores images: product photos, payment screenshots, prescriptions, wholesale documents, profile photos | Firebase Storage needs the paid plan for our case; Cloudinary has a free tier, resizes images, and serves them fast | `js/cloudinary.js:37` `uploadToCloudinary`, settings in `js/cloudinary-config.js` |
| **Google Gemini** (through Firebase AI Logic) | The chat assistant that answers questions the built-in answers can't | Free tier, no secret API key in our code (Firebase handles it), protected by App Check | `js/live-chat.js:478` `loadGeminiModel`, settings `js/chat-config.js` |
| **reCAPTCHA** | The "I'm not a robot" checkbox on login and register | Slows down bots that try many passwords or fake sign-ups | `login.html:138`, check in `js/auth.js:119-124` |
| **Chart.js** | Draws the sales line chart and category doughnut on the dashboard | Simple, free, looks good | `js/admin-dashboard.js:286` and `:363` |
| **jsPDF** | Makes PDF files in the browser: receipts, reports, invoices | No server needed | `createPdf` in `js/products-data.js:1320`, `downloadOrderReceipt` in `js/orders.js:340` |
| **SheetJS (xlsx)** | Reads and writes Excel files: report exports, backups, batch uploads | Staff already use Excel; no server needed | `exportTable` in `js/products-data.js:1768-1777`, `downloadReportExcel` in `js/admin-reports.js:833` |
| **Bootstrap 5** | Ready-made layout, buttons, pop-ups (modals) and phone-friendly grid | Fast to build, works on phones | linked in every HTML page |
| **Choices.js** | Searchable dropdowns (type to find a product) | Hundreds of products are too many for a normal dropdown | `makeSearchableSelect` in `js/products-data.js:1186` |

All of these load from a **CDN** (a fast public file server) with a fixed version number, for example `chart.js@4.4.4`.

> **Are the keys in our code a security problem?** The Firebase, EmailJS and Cloudinary keys you can see in
> `js/*-config.js` are **public browser keys by design**: every website that uses these services shows them.
> The protection comes from the security rules (Firebase), the upload preset settings (Cloudinary) and
> domain/rate limits (EmailJS). There are **no secret keys** in the code; the Gemini key stays inside Firebase.

---

## 5. Glossary

Every technical word used anywhere in this study guide, in alphabetical order.

| Term | Plain meaning |
| --- | --- |
| **Admin / Administrator** | The old name for the top staff role. Treated the same as Branch Manager in the code. |
| **`admin:ready`** | Our custom event, fired by `admin-header.js` once a staff member's login and role are checked. |
| **API** | A way for one program to ask another program to do something (e.g. Cloudinary's upload API). |
| **App Check** | Firebase feature that proves a request came from our real website. |
| **Array** | An ordered list of values, `[a, b, c]`. |
| **Arrow function** | A short way to write a function: `(x) => x * 2`. |
| **async / await** | Lets a function pause while waiting for the internet without freezing the page. |
| **Atomic** | "All or nothing": either every change saves, or none do. Transactions are atomic. |
| **Audit log** | The `auditLog` collection: a permanent record of who did what and when. |
| **Auth / Authentication** | Proving who you are (logging in). |
| **Authorization** | Deciding what you're allowed to do once logged in. |
| **Bad Order** | A batch that expired or is within 2 months of expiry; its stock is written off automatically. |
| **Batch (stock batch)** | One delivery lot of a product with one batch number and one expiry date (`stockBatches`). |
| **Batch write** | Several Firestore writes saved together (no reads). |
| **Bootstrap** | A CSS/JS toolkit for layout, buttons and pop-ups. |
| **Branch Manager (BM)** | Top staff role: sets prices, finalizes stock counts, manages staff. |
| **Brute force** | Trying many passwords quickly to guess one. Lockout and reCAPTCHA slow it down. |
| **Cache** | A saved copy kept to avoid reading again. Our shop keeps the catalog for 5 minutes. |
| **CDN** | A fast public server that hosts library files like Bootstrap. |
| **Chart.js** | Library that draws charts. |
| **Choices.js** | Library for searchable dropdowns. |
| **Clickjacking** | Tricking someone by loading our site invisibly inside another site. Blocked by `X-Frame-Options: DENY`. |
| **Cloudinary** | Image hosting service we upload pictures to. |
| **Collection** | A group of documents in Firestore, like a drawer. |
| **Compat SDK** | The older "namespaced" style of the Firebase library (`firebase.auth()`), which works with plain `<script>` tags. |
| **Console (browser)** | The developer panel (F12) where anyone can type JavaScript. Why we can't trust the browser. |
| **`const` / `let`** | Ways to create a variable; `const` can't be reassigned. |
| **Counter** | A document holding a running number (order numbers, SI numbers). |
| **CSS** | The file that controls how pages look. |
| **Customer notification** | A message in the customer's bell (`customerNotifications`). |
| **`d-none`** | Bootstrap class that hides an element. |
| **Debug token** | A special App Check pass for testing on `localhost`. |
| **Deploy** | Publishing files to Firebase Hosting or rules to Firestore. |
| **Document** | One record in Firestore, with fields. |
| **DOM** | The live page structure JavaScript can change. |
| **EmailJS** | Service that sends emails from the browser. |
| **Emulator (Firebase Emulator Suite)** | A fake local Firebase used for testing, so real data is never touched. |
| **Escape / escaping** | Turning `<` into `&lt;` etc. so text can't become HTML. |
| **Event** | Something that happens (click, typing) that code can react to. |
| **Event delegation** | Listening once on a parent instead of on every button. |
| **Event listener** | Code that runs when an event happens (`addEventListener`). |
| **Exchange** | Swapping a returned item for another of equal or higher value (no cash refunds). |
| **FEFO** | First Expiry, First Out: always sell the batch that expires soonest. |
| **Field** | One named value inside a document. |
| **`FieldValue`** | Special Firestore values: `serverTimestamp()`, `increment()`, `delete()`, `arrayUnion()`. |
| **Firebase** | Google's backend service: Auth, Firestore, Hosting, App Check, AI Logic. |
| **Firestore** | Firebase's document database. |
| **Function** | A named, reusable set of steps. |
| **Gemini** | Google's AI model used by the chat assistant. |
| **Guard clause** | An `if` at the start of a function that stops early when something's wrong. |
| **Hand-off** | The chat passing the conversation from the assistant to a human staff member. |
| **Hold (order hold)** | An order paused for up to 7 days because of a payment, prescription or stock problem. |
| **Hosting** | Firebase Hosting, which serves our website files. |
| **HTML** | The structure of a page. |
| **`innerHTML`** | Sets an element's content as HTML (needs escaping for user text). |
| **Invoice No. / SI No.** | Sales Invoice number: one running 8-digit number for walk-in, online and wholesale sales. |
| **JSON** | A text format for data that looks like JS objects. |
| **jsPDF** | Library that makes PDFs. |
| **Listener / `onSnapshot`** | Keeps watching data and runs again whenever it changes. |
| **`localStorage`** | Browser storage that survives closing the browser. |
| **Lockout** | Blocking logins for 2 minutes after 5 wrong passwords. |
| **LTO** | License to Operate (from the FDA). Wholesale buyers must have a valid one. |
| **Mermaid** | A text format for diagrams used in these study files. |
| **Modal** | A pop-up window (Bootstrap). |
| **Near expiry** | Within 6 months of expiry: not sold in retail, wholesale only. |
| **NoSQL** | A database that isn't made of SQL tables (Firestore is one). |
| **Object** | A set of named values, `{ name: "x", qty: 2 }`. |
| **OTP** | One-Time Password: the 6-digit code sent by email. |
| **Ops staff (`isOpsStaff`)** | Rules helper: any active staff except Sales Staff. |
| **OTC** | Over the counter: medicine that doesn't need a prescription. |
| **Parameter** | An input a function receives. |
| **Persistence** | Whether a login is remembered after the browser closes. |
| **POS** | Point of Sale: the counter screen for walk-in sales. |
| **`productPrices`** | Staff-only collection holding cost and wholesale prices. |
| **Promise** | An object that represents an answer that will come later. |
| **Purchase order (PO)** | A record of what we ordered from a supplier; receiving checks it. |
| **QR Ph** | The Philippine QR payment standard; customers pay by scanning our QR and upload a screenshot. |
| **Query** | A filtered read (`where`, `orderBy`, `limit`). |
| **Race condition** | A bug where two people acting at the same moment cause a wrong result. Transactions prevent it. |
| **RBAC** | Role-Based Access Control: what you can do depends on your role. |
| **reCAPTCHA** | Google's "I'm not a robot" check. |
| **Reconciliation / stock count** | Counting shelves and fixing the system quantity (`reconciliations`). |
| **Reference number** | The transaction number on a GCash/bank payment. |
| **Regex (regular expression)** | A text pattern, like `/^\d{4}$/` = exactly 4 digits. |
| **`request.auth`** | In rules: who is asking. |
| **`request.resource.data`** | In rules: the document as it would be after the write. |
| **`resource.data`** | In rules: the document as it is now. |
| **Role** | `customer`, `sales_staff`, `technical_staff`, `branch_manager` (or legacy `admin`). |
| **Rules (security rules)** | `firestore.rules`: server-side checks for every read/write. |
| **Rx / prescription item** | A product with `rxRequired: true`; needs a prescription and is pick-up only online. |
| **SDK** | Software Development Kit, a library for using a service (Firebase SDK). |
| **Server timestamp** | Time set by Google's server, not the user's device. |
| **`sessionStorage`** | Browser storage that clears when the tab closes. |
| **SheetJS / XLSX** | Library for Excel files. |
| **SKU** | Stock-keeping code for a product, like `MED-0001`. |
| **Spark plan** | Firebase's free plan (no Cloud Functions). |
| **Spread (`...`)** | Copies all values of an array/object into another. |
| **Store credit** | Money kept on a customer's account (`creditBalance`) instead of a refund. |
| **Subcollection** | A collection inside a document (chat `messages`). |
| **Template string** | A string in backticks with `${values}` inside. |
| **Ternary** | `condition ? a : b`. |
| **`textContent`** | Sets an element's text safely (never becomes HTML). |
| **Token** | A short-lived digital pass (login token, App Check token). |
| **Transaction** | All-or-nothing group of reads and writes that retries on conflict. |
| **`try / catch / finally`** | Run code, handle errors, always clean up. |
| **uid** | The unique id Firebase Auth gives each account. |
| **Validation** | Checking input is correct before saving (e.g. phone format). |
| **Void** | Cancelling all or part of a walk-in sale and returning the stock. |
| **Wholesale only** | Batch status for near-expiry stock: can be sold to wholesale buyers, not retail. |
| **Write-off** | Removing stock that can't be sold (damaged, expired), with a reason (`writeOffs`). |
| **XSS** | Cross-site scripting: sneaking a script into a page through user text. Prevented by escaping. |
