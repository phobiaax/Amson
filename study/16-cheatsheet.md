# 16 - Cheat Sheet (the night before)

## The system in 30 seconds
Amson Pharmaceuticals (Las Piñas branch) web system: an **online store**, **POS**, **inventory with FEFO and expiry
control**, **online order verification**, **wholesale**, **reports**, **audit log**, and a **live chat with an AI assistant**.
It's plain **HTML/CSS/JavaScript + Bootstrap 5**, with no build step. It talks directly to **Firebase** (Auth, Firestore,
Hosting, App Check, AI Logic → Gemini) on the **free Spark plan**, plus **Cloudinary** (images), **EmailJS** (emails),
**reCAPTCHA**, **Chart.js**, **jsPDF**, **SheetJS** and **Choices.js**.
Live at **https://amsonpharma.web.app**. **Security = Firestore rules on Google's servers.** The browser is never trusted.

## Key numbers
| What | Value | Where |
| --- | --- | --- |
| Login lockout | 5 wrong → 2 min | `auth.js:56-57` |
| Email code | 6 digits, 10 min | `otp.js:3-6` |
| Near expiry (retail stops, wholesale only) | 6 months | `NEAR_EXPIRY_MONTHS`, `products-data.js:247` |
| Bad Order (auto write-off) | 2 months / expired | `BAD_ORDER_MONTHS`, `products-data.js:694` |
| Order hold | 7 days → closed, verified money → store credit | `HOLD_DURATION_MS`, `admin-online-orders.js:4` |
| Auto-delivered after dispatch | 3 days | `DISPATCH_AUTO_DELIVER_MS`, `orders.js:93` |
| Low stock | ≤ reorder point (default 20) | `DEFAULT_REORDER_POINT` |
| Shop catalog cache | 5 minutes (shop pages only) | `CATALOG_CACHE_MS` |
| Upload limit | 10 MB (resized first) | `payment.js:3`, `cloudinary.js` |
| AI daily cap | 400 (free tier ~500) | `chat-config.js` |
| Chat | 500 chars, 1 msg / 1.5 s, last 8 messages to AI | `live-chat.js:4-6` |
| Order no. / SI no. / SKU / Exchange no. | `AMP-2026-0001` / `00000123` / `MED-0001` / `EX-00001` | counters |
| Clear Test Data switches off | 15 Nov 2026 | `firestore.rules:328`, `admin-roles.js:33` |

## Roles
| Role | Can |
| --- | --- |
| Customer | Shop, cart, checkout (QR Ph), own orders, resubmit hold fixes, account, chat |
| Sales Staff | **POS** + read-only catalog + own settings. No voids, no orders, no inventory. |
| Technical Staff | Everything except Staff Management; **no prices** (new products = price pending); voids need **BM password**; stock counts saved for BM |
| Branch Manager (= Admin) | Everything: **prices**, finalize counts, staff, categories, Clear Test Data |
Enforced twice: **page gate** (`admin-header.js` + `ADMIN_PAGE_ACCESS`) and **rules** (`isStaff`, `isOpsStaff`, `isManager`).

## The big flows in one line each
- **Register:** form checks → Firebase Auth account → `users/{uid}` role customer + code → EmailJS → verify page → login.
- **Login:** reCAPTCHA → lock check → sign in → profile (deactivated?) → clear attempts → role redirect.
- **Shop:** catalog from products + **retail-sellable batches only** → filter/search → cart `{id, qty}` (browser + account).
- **Checkout:** logged in → Rx? pick-up : address → **re-check stock/prices live** → Cloudinary → order no. (transaction + retry) → **order + credit in one transaction** → status `placed`. **No stock deducted yet.**
- **Verify:** live queue → price + reused-ref warnings → Approve = **one transaction: FEFO deduct + SI no. + status + "already processed?" check** → notify → Lalamove link → Dispatched → Delivered → customer Received. Problems → **7-day hold** → credit.
- **POS:** search → whole qty ≤ stock → preview → Confirm = **FEFO + SI no. + sale in one transaction (retry on clash)** → print 58 mm.
- **Void:** items + reason (+ **BM password** for Technical) → transaction returns units **to their batches** → `voided`/`partialVoids` kept.
- **Exchange:** no refunds; replacement ≥ returned value; back to stock or set aside (write-off).
- **Receive stock:** whole qty, **no past expiry**, warn < 2 months → new batch or top-up → transaction → `batchCosts` private.
- **Expiry:** on Dashboard/Inventory load: ≤ 6 months → wholesale only; ≤ 2 months/expired → **Bad Order** (qty 0, auto write-off) → dispose.
- **Wholesale:** staff-only; LTO/Permit expired = blocked; agreed/standard price; free items need a reason; FEFO incl. near-expiry; same SI series; release list.
- **Chat:** staff? → others' data? → complaint? → my orders? → health (safe templates)? → FAQ? → **Gemini** (App Check, cap, product list, **dose filter**) → else hand off.

## Files to know cold
`firebase-config.js` (connect, authGate) · `products-data.js` (catalog, FEFO `deductStockFEFOOnce`, SI numbers, receipts,
voids, exchanges, `logAuditEvent`, `escapeHtml`) · `orders.js` (statuses, holds, credit, order numbers, emails) ·
`admin-header.js` + `admin-roles.js` (staff gate) · `auth.js` (login, lockout) · `payment.js` (submit) ·
`admin-online-orders.js` (verify) · `admin-pos.js` · `admin-inventory.js` · `live-chat.js` · `firestore.rules`.

## Security: say these
1. Rules run on Google's servers. Customers read **only their own** data (`customerId == myUid()`).
2. You **can't change your own role/status or raise your credit** (`rules 51-54`).
3. **Only the Branch Manager sets prices**; cost/wholesale prices are in staff-only `productPrices`.
4. **Transactions** stop double-selling, double-approving and duplicate SI numbers.
5. **No deletes** of orders/sales/audit log; audit log is **append-only**.
6. **XSS**: `escapeHtml` + `textContent`. **Clickjacking**: `X-Frame-Options: DENY`.
7. **Lockout** count-up-only in rules; **App Check** guards the AI; **no secret keys** in code.
8. Deactivated staff lose access on the **next request** (`isStaff()` reads `accountStatus`).

## Known limitations: say these honestly
- Email code can be skipped from the console (needs Firebase link verification or a paid-plan Cloud Function).
- Order prices come from the browser → staff get a mismatch warning + "Approve anyway".
- BM void approval, count finalize and expired-document block are page-level, not rules.
- Expiry moves and hold closures run when staff pages load (no scheduled jobs on the free plan).
- Two people editing the same product form: last save wins.
- Public stock records show some back-office fields; anyone can use up the daily AI counter.
**Why:** most fixes need Cloud Functions (paid **Blaze** plan). Everything rules can enforce, they do.

## Testing in numbers
Firebase **Emulator** (never live data) + **Playwright** browser automation + **119 rules checks** (117 as intended,
1 fixed, 1 accepted) + **147 page screenshots** at 375/768/1440 px, **0 script errors**. **24 bugs** found (1 critical:
write-off from the wrong batch); 23 fixed, #9 documented. The race tests found 2 more (SI counter, order counter) →
retries → **16/16** simultaneous sales and **10/10** simultaneous orders. Real emails, reCAPTCHA, AI, printer and
phones → **live-site checklist**.

## Ten answers to have ready
1. **Why Firebase?** Free, no server to maintain, live updates, strong rules. Fits one branch's budget.
2. **Why QR Ph?** No fees/contracts, familiar, money goes straight to the branch; staff verify.
3. **What is FEFO?** First Expiry First Out: sell the earliest-expiring batch first (`deductStockFEFOOnce`).
4. **When is stock deducted online?** On payment approval, with the SI number, in one transaction.
5. **How do you prevent overselling?** Transactions re-read batches and refuse if short.
6. **No refunds?** Amson policy: exchanges for equal/higher value; unresolved verified payments become store credit.
7. **How are expired medicines blocked?** Retail needs > 6 months; ≤ 2 months → Bad Order, qty 0, write-off.
8. **Can the AI give doses?** No: health questions use fixed templates; caution topics → pharmacist; dose filter on AI output.
9. **Can the audit log be changed?** No updates/deletes in the rules; server timestamps.
10. **Biggest weakness?** Checks that need a server (email code, prices, void approval) are mitigated, not enforced. The fix is Cloud Functions.

## Before you present
- Open the live site and log in as each role once; make sure the photos are uploaded.
- Check the AI answers on the live site (App Check domain); otherwise show the staff hand-off.
- Have one placed order ready to verify, one POS sale to void, one near-expiry batch to show.
- If something fails live: explain what the code *would* do (this guide), and show the audit log.
