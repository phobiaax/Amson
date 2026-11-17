# Code guide, short version

The 17 long guides in this folder, in about 8 pages. One section per flow: **what happens**, **where it is**, **what to say**.
Need detail? The number in brackets after each heading is the long guide to open (e.g. [07] = `07-inventory-and-fefo.md`).

---

## 1. The whole system in 5 lines [01]

1. Plain HTML, CSS and JavaScript with Bootstrap. No build step, no server of our own.
2. The browser talks straight to **Firebase**: Authentication (logins), Firestore (database), Hosting (the website), AI Logic (Gemini chat).
3. **Cloudinary** stores photos (products, payment screenshots, prescriptions). **EmailJS** sends emails (codes, order updates).
4. Two sides on one database: the **shop** (`shop/`) for customers and the **admin portal** (`admin/`) for staff.
5. **The real security is `firestore.rules`**, checked on Google's servers for every read and write. The browser is never trusted.

**Say:** "There's no server to hack or maintain. Every write is checked by the database rules, and the free plan covers one branch."

## 2. Where things are [00, 16]

| Folder / file | What's in it |
| --- | --- |
| `shop/*.html` + `js/cart.js`, `checkout.js`, `payment.js`, `orders.js` | Customer side |
| `admin/*.html` + `js/admin-*.js` | Staff side, one script per page (e.g. `admin/pos.html` → `js/admin-pos.js`) |
| `js/products-data.js` | **Shared core**: catalog, FEFO, SI numbers, receipts, voids, exchanges, audit log, `escapeHtml` |
| `js/firebase-config.js` | Connects to Firebase; creates `auth` and `db` |
| `js/admin-roles.js` + `js/admin-header.js` | Which role opens which page; the gate on every admin page |
| `firestore.rules` | Who may read and write what |
| `firebase.json` | What gets published; security headers |

## 3. The data (Firestore collections) [01 §4]

| Group | Collections |
| --- | --- |
| People | `users` (role, status, cart, address, store credit, trusted devices), `loginAttempts` |
| Catalog | `products` (public), `productPrices` (cost/wholesale, staff only), `categories`, `storeSettings` |
| Stock | `stockBatches` (one per batch: qty, batch no., expiry, status), `batchCosts` (staff only), `writeOffs`, `reconciliations` (stock counts), `suppliers`, `purchaseOrders` |
| Sales | `orders` (online), `posSales` (walk-in), `wholesaleAccounts`, `wholesaleOrders`, `wholesaleExchanges` |
| Other | `counters` (order, SI, SKU numbers), `auditLog`, `notifications`, `customerNotifications`, `chatThreads` + `messages` |

**Key idea:** stock is **per batch**, not per product. A product's stock = the sum of its sellable batches. Every sold line remembers which batches it came from, so voids and returns put units back in the right batch.

## 4. Roles [01 §5, 02]

| Role | Can | Can't |
| --- | --- | --- |
| Customer | Shop, pay, own orders, fix holds, chat | See anyone else's data |
| Sales Staff | POS, view catalog, own settings | Inventory, reports, online orders, chat, voids |
| Technical Staff | Everything else | Prices, staff accounts; voids need the manager's login; counts wait for the manager |
| Branch Manager | Everything | — |

**Two layers:** the page checks the role and redirects (`ADMIN_PAGE_ACCESS`, `admin-roles.js:12`); the rules refuse the data anyway (`isStaff()`, `isOpsStaff()`, `isManager()`).

## 5. Login, sign-up, codes [02]

**Login** (`performLogin`, `auth.js:116`):
1. reCAPTCHA ticked? → is this email locked?
2. Firebase checks the password.
3. Read the `users` doc: deactivated → signed out.
4. Browser not trusted → emailed 6-digit code first (`device-trust.js`, `REQUIRE_DEVICE_CODE = true`).
5. Redirect by role: Sales → POS, other staff → Dashboard, customer → shop.

**Lockout:** 5 wrong passwords → locked 2 minutes (`recordFailedLogin`, `auth.js:81`). The rules only let the counter go **up**, so nobody can reset it.

**Sign-up** (`createCustomerAccount`, `register.js:193`): checks (PH phone, password with letter+number+symbol, no throwaway email domain) → Terms (scroll to accept) → Firebase account + `users` doc with role `customer` → 6-digit code by EmailJS (10 minutes) → verified. The sign-up code also trusts that browser.

**Remember me off** = logged out when the browser closes (`authGate`, `firebase-config.js`).

## 6. Shop and cart [03]

1. `loadCatalogCache` (`products-data.js:964`) reads products, categories and batches **live** (since Nov 16; no browser copy).
2. Stock shown = only **retail-sellable** batches: active, quantity > 0, **more than 6 months** to expiry (`isRetailSellableBatch`, `:256`).
3. Cart: guests in the browser; logged-in customers also on their `users` doc, so it follows them to another device. Guest cart merges in at login.
4. `addToCart` (`cart.js:111`) caps quantity at stock.

## 7. Checkout and payment [04]

1. Checkout: name, phone, address (saved to the account), delivery schedule. **Rx item in cart** → no address, pick-up notice.
2. Payment page shows the branch's **QR Ph**; customer uploads the screenshot (≤ 10 MB, to Cloudinary) + reference number (+ prescription photo if Rx).
3. `stockAndPricesStillOk` (`payment.js:235`) re-checks stock and prices **live** before saving.
4. `generateOrderNumber` (`orders.js:313`): `AMP-2026-0001` from a counter in a transaction, retried if two orders clash.
5. `createOrderWithCreditRedemption` (`orders.js:280`): saves the order with status `placed` and takes store credit off **in the same write**; the rules check both.

**Stock is NOT deducted yet.** That happens when staff approve.

## 8. Online order verification [05]

1. Staff see the queue live (Rx / regular filter). Warnings: prices don't match the catalog; reference number already used.
2. **Approve** → `confirmOrderSale` (`admin-online-orders.js:656`), one transaction: "already processed?" check → FEFO deduction → next SI number. Rx order → Ready for Pick-up; regular → dispatch pop-up.
3. **Hold** (invalid, underpayment, not received, out of stock, Rx rejected) → customer notified; **7 days** to fix (`HOLD_DURATION_MS`).
4. Customer re-uploads → back to the staff queue as "Resubmitted".
5. Overpayment → approved + **store credit**. Hold not fixed in 7 days → closed; verified money → store credit (`enforceOrderDeadline`, `orders.js:175`).
6. Dispatch: paste a `share.lalamove.com` link → Dispatched. Not confirmed by the customer in 3 days → Delivered automatically.

**"Automatically"** means when a page next loads that order; the free plan has no timers.

## 9. FEFO: the heart of the system [07]

`deductStockFEFOOnce` (`products-data.js:1806`), inside **one Firestore transaction**:
1. Read every batch of the products being sold.
2. Keep the sellable ones (retail: > 6 months left; wholesale may also use near-expiry).
3. Sort by expiry, earliest first.
4. Take from the first batch until the quantity is covered, then the next.
5. Not enough → the whole sale is refused ("Not enough stock"). Nothing is half-saved.
6. Save the new quantities, the SI number and the sale together.

**Two cashiers sell the last unit at the same time?** Firestore re-runs the second transaction; it sees 0 left and refuses. `deductStockFEFOMultiple` (`:1792`) retries when two sales clash on the SI counter. Tested: 16 of 16 simultaneous sales, no duplicate SI.

## 10. Expiry and Bad Order [08]

| Time to expiry | What happens | Code |
| --- | --- | --- |
| > 6 months | Normal | — |
| ≤ 6 months | Leaves retail; **Wholesale Only** | `NEAR_EXPIRY_MONTHS = 6` (`products-data.js:247`) |
| ≤ 2 months | **Bad Order**: quantity 0, automatic write-off, disposal alert | `BAD_ORDER_MONTHS = 2` (`:694`), `markBatchBadOrder` (`:732`) |

`enforceExpiryStatus` (`:697`) applies the labels when the Dashboard or Inventory opens. The retail check itself is live on every sale. Receiving refuses expired dates and warns within 2 months.

## 11. Inventory [07]

- **Receive stock** (`applyStockReceipt`, `admin-inventory.js:537`): new batch, or "top-up" if the same batch no. and expiry already exist. Excel upload supported; a review table catches bad rows first.
- **Purchase orders:** receive against a PO → received ≠ ordered → status **Discrepancy** + report; staff acknowledge.
- **Write-off** (`saveWriteOff`, `:1260`): reason required; batch and write-off record saved together.
- **Stock count** (`finalizeCount`, `:1675`): staff enter counts; the **Branch Manager** finalizes; difference applied, logged.

## 12. POS, voids, exchanges [06]

1. POS: search → quantity (whole numbers) → Rx item needs **RX Verified** ticked → payment method (non-cash needs a reference) → FEFO + SI number → receipt.
2. **Void** (`voidPosSale`, `products-data.js:1546`): full or one item, reason required, units back to their batches. Sales Staff can't. Technical Staff type the **Branch Manager's** email and password (`verifyVoidApprover`, `:1522`), so the void is saved **as the manager** and the rules (`isManager()`) allow it.
3. **Exchange** (`processWalkinExchange`, `:2039`): no refunds; replacement must be **equal or higher** value; returned item back to stock or set aside (Pull-Out report); EX number.

## 13. Products and prices [09]

- New SKU `MED-0001…` from a counter (`generateProductSku`).
- **Prices: Branch Manager only.** The page disables the boxes; the rules (`priceFieldsUnchanged`) refuse anyone else. A **reason** is required and logged.
- Technical Staff can add products: saved **inactive, price pending** until the manager prices them.
- Cost and wholesale prices live in `productPrices` (staff only), never in the public `products` doc.
- Excel import: review table; duplicates and bad rows marked before saving. Photo upload matches file names to products.

## 14. Wholesale [10]

Buyers never log in. Staff record the buyer + LTO + Business Permit (expiry dates tracked; expired blocks orders). Order: agreed or wholesale price, free items need a reason, FEFO **including near-expiry stock**, same SI series (`saveWholesaleOrder`, `admin-wholesale-accounts.js:699`). Exchanges: equal or higher value, EX number.

## 15. Reports, dashboard, audit log [11]

- **7 reports** (Daily Sales, Customer File, Monthly Inventory, Supplier Purchases, Pull-Out, Return/Exchange, PO Discrepancy), preview + PDF (jsPDF) + Excel (SheetJS). Voided sales are excluded.
- Dashboard: today's tiles, chart by period, alerts (low stock, near expiry, Bad Order, pending payments).
- **Audit log** (`logAuditEvent`, `products-data.js:2349`): who, what, when (server time), before/after, reason. Rules: **create only**, never edit or delete.

## 16. Live chat and AI [12]

Answer order (`respond`, `live-chat.js:1118`):
1. Built-in answers (hours, payment, delivery…), no AI needed.
2. Safety: dose questions → "ask the pharmacist"; requests for others' data → refused; complaints → "Talk to staff".
3. "Where is my order?" → cards of the customer's own orders.
4. Otherwise **Gemini** (`chatAiReply`, `:569`): gets the question, last 8 messages and a short product list; never prescriptions or addresses. Replies that look like a dose are blocked (`chatLooksLikeDosage`).
5. Limit 400 AI replies a day; App Check protects the AI quota. Over the limit or AI down → staff.

Staff (Technical, Branch Manager) reply from Admin → Live Chat; "Hand back to assistant", "Resolve".

## 17. Security in one table [13]

| Threat | Stopped by |
| --- | --- |
| Customer reads others' orders | Rules: `customerId == myUid()` |
| Customer makes themselves staff / raises own credit | Rules on `users` |
| Non-manager changes a price | Rules: `priceFieldsUnchanged` |
| Editing the audit log | Rules: create only |
| Password guessing | 5-try lockout (rules count up only) + reCAPTCHA |
| XSS | `escapeHtml` on everything typed by users |
| Fake photo links | Rules: links must be our Cloudinary (`photoLinkOk`) |
| Clickjacking / sniffing | Headers in `firebase.json` + HTTPS |

**Weak spots (say them first):** email code and reCAPTCHA are checked in the browser; order prices come from the browser (staff get a warning); stock-count finalize and expired-document block are page-only; two people editing one form, last save wins. Fix for all: server code (Cloud Functions) on the paid plan.

## 18. Testing [14]

Firebase Emulator (never live data) + Playwright: 119 rules checks, 147 screenshots, 0 script errors. 24 bugs found, 23 fixed (#9 documented). Race tests: 16/16 simultaneous sales, 10/10 simultaneous orders. Group test on the live site (Nov 2026): 6 failures, all fixed Nov 16.

## 19. Numbers to know

5 tries / 2 min lockout · code valid 10 min · 6 months wholesale only · 2 months Bad Order · 7-day hold · 3 days auto-delivered · reorder point 20 · 10 MB upload · 400 AI replies/day · order `AMP-2026-0001` · SI `00000123` · SKU `MED-0001` · exchange `EX-00001`.
