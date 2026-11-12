# 16 - Cheat Sheet (the night before)

**The system in one breath:** an online store, POS, FEFO inventory with expiry control, online order verification,
wholesale, reports, an audit log and a live chat with an AI assistant for Amson's Las Piñas branch. It's plain
HTML/CSS/JavaScript with Bootstrap and no build step. It talks directly to Firebase (Auth, Firestore, Hosting, App Check,
Gemini) on the free plan, plus Cloudinary for images and EmailJS for emails. **The real security is the Firestore rules on
Google's servers; the browser is never trusted.** Live at https://amsonpharma.web.app.

---

## Key files

| File | What it holds |
| --- | --- |
| `js/firebase-config.js` | Connects to Firebase, creates `auth` and `db`, Remember Me (`authGate`) |
| `js/products-data.js` | Shared core: catalog, FEFO stock deduction, SI numbers, receipts, voids, exchanges, audit log, `escapeHtml` |
| `js/orders.js` | Order statuses, holds, store credit, order numbers, customer notices and emails |
| `js/admin-header.js` + `js/admin-roles.js` | Staff gate on every admin page; which role opens which page |
| `js/auth.js`, `js/register.js`, `js/verify-email.js`, `js/otp.js` | Login + lockout, sign-up, email code |
| `js/cart.js`, `js/checkout.js`, `js/payment.js` | Cart, checkout form, payment + placing the order |
| `js/admin-online-orders.js` | Payment verification, holds, dispatch |
| `js/admin-pos.js` | Walk-in sales |
| `js/admin-inventory.js` | Receive stock, write-offs, stock counts, purchase orders |
| `js/admin-products.js` | Products, prices, categories, Excel import |
| `js/admin-wholesale-accounts.js` | Wholesale buyers, orders, release |
| `js/admin-reports.js`, `js/admin-dashboard.js` | 7 reports, dashboard charts |
| `js/live-chat.js`, `js/chat-config.js` | Chat widget and AI assistant |
| `firestore.rules` | Who may read/write what (the real security) |
| `firebase.json` | What's published, security headers |

## Key functions

| Function | File:line | One-line job |
| --- | --- | --- |
| `performLogin` | `auth.js:116` | reCAPTCHA → lock check → sign in → deactivated? → role redirect |
| `recordFailedLogin` | `auth.js:81` | +1 failed try; at 5 locks for 2 minutes |
| `createCustomerAccount` | `register.js:193` | Firebase login + `users` doc (role customer) + email code |
| `loadCatalogCache` | `products-data.js:1001` | Builds the product list with stock from sellable batches |
| `isRetailSellableBatch` | `products-data.js:256` | Active, has units, more than 6 months to expiry |
| `addToCart` | `cart.js:111` | Adds `{id, qty}`, capped at stock |
| `stockAndPricesStillOk` | `payment.js:235` | Live re-check of stock and prices before ordering |
| `generateOrderNumber` | `orders.js:313` | `AMP-YYYY-NNNN` via transaction, retries on clash |
| `createOrderWithCreditRedemption` | `orders.js:280` | Saves the order and subtracts store credit together |
| `confirmOrderSale` | `admin-online-orders.js:656` | Approval: FEFO + SI no. + "already processed?" check |
| `enforceOrderDeadline` | `orders.js:175` | Closes 7-day holds (credit) and auto-delivers after 3 days |
| `deductStockFEFOOnce` | `products-data.js:1851` | The FEFO transaction: earliest expiry first, all or nothing |
| `deductStockFEFOMultiple` | `products-data.js:1837` | Retries the above when two sales clash on the SI counter |
| `voidPosSale` | `products-data.js:1591` | Full/partial void, units back to their batches |
| `verifyVoidApprover` | `products-data.js:1567` | Signs the Branch Manager in on a temporary app; the void is saved as the manager |
| `roundPeso` | `products-data.js:1282` | Rounds totals to the centavo before saving (avoids 37.050000000000004) |
| `processWalkinExchange` | `products-data.js:2084` | No-refund exchange, replacement ≥ returned value |
| `planStockReceipt` / `applyStockReceipt` | `admin-inventory.js:488` / `:537` | New batch or top-up, saved in one transaction |
| `saveWriteOff` | `admin-inventory.js:1260` | Subtract from a batch + write-off record together |
| `finalizeCount` | `admin-inventory.js:1675` | Applies counted − system to current stock |
| `enforceExpiryStatus` | `products-data.js:697` | ≤ 6 months → wholesale only; ≤ 2 months → Bad Order |
| `markBatchBadOrder` | `products-data.js:732` | Qty 0 + automatic write-off, in a transaction |
| `saveWholesaleOrder` | `admin-wholesale-accounts.js:699` | FEFO including near-expiry, same SI series |
| `generateReport` / `loadSalesInRange` | `admin-reports.js:919` / `:48` | Builds the branch-format reports |
| `logAuditEvent` | `products-data.js:2394` | Adds an append-only history entry |
| `escapeHtml` | `products-data.js:1290` | Stops XSS when building HTML |
| `respond` / `chatAiReply` | `live-chat.js:1118` / `:569` | Chat answer order; the Gemini call |
| `chatLooksLikeDosage` | `live-chat.js:24` | Blocks AI replies that look like a dose |

## Key numbers and constants

| Constant | Value | Where |
| --- | --- | --- |
| `LOGIN_LOCKOUT_THRESHOLD` / `LOGIN_LOCKOUT_MS` | 5 tries / 2 minutes | `auth.js:56-57` |
| `OTP_CODE_TTL_MS` | email code valid 10 minutes | `otp.js:3` |
| `NEAR_EXPIRY_MONTHS` | 6: retail stops, wholesale only | `products-data.js:247` |
| `BAD_ORDER_MONTHS` | 2: automatic write-off | `products-data.js:694` |
| `HOLD_DURATION_MS` | 7 days, then closed + credit | `admin-online-orders.js:4` |
| `DISPATCH_AUTO_DELIVER_MS` | 3 days after dispatch → Delivered | `orders.js:93` |
| `DEFAULT_REORDER_POINT` | 20 (low stock) | `products-data.js:245` |
| `CATALOG_CACHE_MS` | 5-minute shop copy | `products-data.js:893` |
| `MAX_PROOF_FILE_SIZE_BYTES` | 10 MB | `payment.js:3` |
| `dailyAiLimit` / `historyMessages` | 400 AI replies a day / last 8 messages | `chat-config.js` |
| `CHAT_MAX_LENGTH` / `CHAT_MIN_GAP_MS` | 500 characters / 1.5 s between messages | `live-chat.js:4-6` |
| `REQUIRE_DEVICE_CODE` | `false` (new-device code off) | `device-trust.js:4` |
| `APP_CHECK_SITE_KEY` | empty: off for the database (on for the AI) | `firebase-config.js:14` |
| Number formats | Order `AMP-2026-0001`, SI `00000123`, SKU `MED-0001`, exchange `EX-00001` | counters |
| Clear Test Data ends | 1 Dec 2026 | `firestore.rules:333`, `admin-roles.js:33` |

## Roles

| Role | Can do | Enforced by |
| --- | --- | --- |
| **Customer** | Shop, cart, checkout (QR Ph), own orders, fix holds, account, chat | rules: own data only (`customerId == myUid()`) |
| **Sales Staff** | POS + read-only catalog + own settings | page access list + `isOpsStaff()` excludes them |
| **Technical Staff** | Everything except Staff Management; no prices; voids need the BM's password; counts are saved for the BM | page checks + rules (`priceFieldsUnchanged`; voids need `isManager()`) |
| **Branch Manager** (= Admin) | Everything: prices, finalize counts, staff, categories | `isManager()` in rules |

Two layers: the **page gate** (`admin-header.js:13-71`, `ADMIN_PAGE_ACCESS` in `admin-roles.js:12`) and the **rules**.

## Top 20 panel questions: one-line answers

1. **Why Firebase, no server?** Free plan, nothing to maintain, live updates, and server-side rules. Right for one branch's budget.
2. **Where's the real security?** In `firestore.rules`, checked on Google's servers for every read and write; the page checks are just convenience.
3. **Where are passwords stored?** Not in our database. Firebase Authentication keeps them hashed.
4. **How does the lockout work?** 5 wrong tries → `loginAttempts/{email}` locked for 2 minutes; the rules only let the count go up (`auth.js:81`, rules 357-379).
5. **Can a customer make themselves staff?** No. Sign-up must be role "customer", and you can't change your own role, status or credit (rules 42-55).
6. **What is FEFO?** First Expiry, First Out: every sale takes from the earliest-expiring batch (`deductStockFEFOOnce`).
7. **How do you stop overselling?** A Firestore transaction re-reads every batch and refuses if there isn't enough.
8. **When is stock deducted for online orders?** When staff approve the payment, together with the SI number, in one transaction.
9. **Why QR Ph?** No gateway fees or contracts, customers already use GCash/Maya, money goes straight to the branch; staff verify.
10. **How do you verify a payment is real?** Staff check the bank/GCash app; the system warns about price mismatches and reused reference numbers.
11. **What if two staff approve the same order?** The transaction's check stops the second: "already processed by someone else."
12. **How are SI numbers kept unique?** One counter, +1 only in the rules, updated inside the sale's transaction, with a retry on clashes.
13. **What happens to unresolved orders?** After a 7-day hold they close, and verified money becomes store credit (no refunds).
14. **How is expired medicine blocked?** Retail needs more than 6 months left; within 2 months it becomes a Bad Order with quantity 0.
15. **Who can change prices?** Only the Branch Manager. The page disables the boxes and the rules refuse anyone else.
16. **How is the cost price hidden?** It's in `productPrices` / `batchCosts`, which only staff can read.
17. **How are voids controlled?** A reason is required; Technical Staff need the Branch Manager's login, and the void is saved as the manager, so the rules (`isManager()`) enforce it too; voided sales are marked, never deleted.
18. **Can the audit log be changed?** No. The rules allow create only, and the time is the server's.
19. **Can the AI give medical advice?** No: fixed safe health replies, caution topics go to the pharmacist, and AI replies that look like a dose are replaced.
20. **What's your biggest weakness?** Checks that need a server (email code, order prices) are only mitigated. The fix is Cloud Functions on the paid plan.

## Say these honestly if asked about limits
- The email code can be skipped from the browser console.
- Order prices come from the browser; staff get a warning.
- Count finalizing and the expired-document block are page-level only.
- Expiry moves and hold closures run when staff pages load.
- Two people editing the same form: the last save wins.

## Questions the guide didn't cover, so prepare an answer
- **"Where's the senior citizen / PWD discount?"** Philippine law (RA 9994, RA 10754) requires 20% off plus VAT exemption on medicine for seniors and PWDs. The system has none. Have an honest answer ready: out of scope for this version, or handled manually, and what adding it would take (an ID field on the sale, a discount line, and the receipt and reports showing it).
- **"Why not a backend server?"** The free Spark plan has no Cloud Functions, so the browser does the work and the rules guard every write. Know which checks are browser-only (the list above).
- **"Why is an approved prescription order 'delivered'?"** In the code `delivered` also means "ready for pick-up" for Rx orders. Say so before they ask.

## Testing in one breath
Firebase Emulator (never live data), Playwright, 119 rules checks, 147 screenshots with 0 script errors. 24 bugs found, 23 fixed (#9 documented).
2 race bugs fixed: 16/16 simultaneous sales, 10/10 simultaneous orders.
