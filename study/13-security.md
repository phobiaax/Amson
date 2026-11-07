# 13 - Security

This file lists **every security measure** in the system, what attack each one stops, and, honestly, the **known gaps**
found in our security review and pre-defense testing, with what was fixed and what's accepted.

> **The one idea to remember:** our JavaScript runs on the user's computer, so **anything in the browser can be changed**.
> The browser checks are for convenience and clear messages. The **real** security is what runs on Google's servers:
> Firebase Authentication, the **Firestore security rules**, App Check (for the AI), and Hosting headers.

---

## 1. Security measures, layer by layer

### 1.1 Identity: who are you?

| Measure | Where | Attack it prevents |
| --- | --- | --- |
| Firebase Authentication (email + password, hashed by Google) | `auth.js:139`, `register.js:195` | Stolen password databases: we never store passwords. |
| Strong password rule (6+ chars, letter + digit + symbol) | `PASSWORD_PATTERN`, `validators.js:4` | Easy-to-guess passwords. |
| Login lockout: 5 wrong → 2 minutes, enforced as count-up-only in rules | `auth.js:56-95`, `firestore.rules:353-374` | **Brute force** password guessing; resetting the counter from the console. |
| Same message for "no account" and "wrong password" | `auth.js:45-48` | **Account enumeration** (finding which emails exist). |
| reCAPTCHA checkbox on login/register | `login.html:138`, `auth.js:119` | Simple **bots** (mass sign-ups, guessing). |
| Email code (OTP), 10-minute expiry | `register.js:193`, `verify-email.js:63` | Accounts with fake or mistyped emails. *(Can be bypassed by a skilled user; see gaps.)* |
| Disposable email block list | `validators.js:20-36` | Throwaway fake accounts. |
| Remember Me off → login ends when the browser closes | `firebase-config.js:33-86` | Someone using a shared computer after you leave. |
| Safe `?next=` redirect (shop pages only) | `loginNextPage`, `auth.js:111` | **Open redirect** phishing links. |
| Password change needs the current password (re-authentication) | `setupChangePasswordForm`, `validators.js` (`reauthenticateWithCredential`) | Someone at an unlocked computer changing your password. |
| New-device code (built, **off** by team decision) | `device-trust.js:4` | Stolen-password logins from new devices (when turned on). |

### 1.2 Authorization: what may you do? (RBAC)

| Measure | Where | Attack it prevents |
| --- | --- | --- |
| Role stored in `users/{uid}.role`, read by the rules on every request | `myRole()`, `firestore.rules:14-16` | Faking a role in the browser. |
| Users can't change their own `role` or `accountStatus`, or raise their credit | `firestore.rules:51-54` | **Privilege escalation** ("make me a manager"), self-reactivation, free money. |
| Sign-up only as `customer` with 0 credit | `firestore.rules:42-44` | Registering as staff. |
| Deactivated staff are cut off on every request | `isStaff()`, `firestore.rules:19-23` | Former employees using an old login. |
| Page gate on every admin page + hidden menu items | `admin-header.js:13-71`, `ADMIN_PAGE_ACCESS` | Staff wandering into pages they shouldn't use (UI layer). |
| Only Branch Manager sets prices (rules) | `priceFieldsUnchanged`, `firestore.rules:77-99`, `105-110` | Staff changing prices. |
| Sales Staff limited to POS and read-only catalog | `isOpsStaff()` everywhere except POS | Cashiers voiding sales, reading orders, adjusting stock records. |
| Void approval: Technical Staff need the BM's password | `verifyVoidApprover`, `products-data.js:1561` | "Void and pocket the cash" fraud *(page-level; see gaps)*. |
| Default deny: everything not listed is refused | `firestore.rules:376-378` | Any collection we forgot to protect. |

### 1.3 Data protection: who can see what?

| Measure | Where | Attack it prevents |
| --- | --- | --- |
| Customers read only their own profile, orders, notifications, chat | `firestore.rules:38, 132, 194, 261-264` | Customers seeing other customers' addresses, orders, chats. |
| Cost and wholesale prices in staff-only `productPrices` | `firestore.rules:105-110` | Competitors/customers seeing Amson's costs and margins. |
| Batch costs in staff-only `batchCosts` | `firestore.rules:219-221` | Same, for purchase costs. |
| All back-office collections ops-staff only (suppliers, POs, write-offs, counts, wholesale, notifications) | `firestore.rules:226-232, 248` | Outsiders reading business records. |
| `loginAttempts` can be read one email at a time but only managers can list | `firestore.rules:359, 373` | Harvesting a list of user emails. |
| Chat: can't list threads; ids are your uid or a 24-char random id | `firestore.rules:261-268` | Reading other people's chats. |
| AI never shares other people's data (rule check before the AI) | `chatAsksOthersData`, `live-chat.js:117` | Social-engineering the chatbot. |

### 1.4 Data integrity: can records be tampered with?

| Measure | Where | Attack it prevents |
| --- | --- | --- |
| Orders: create only as yourself, status `placed`, no staff fields, total ≥ 0 | `firestore.rules:136-140` | Creating "already paid" orders or fake SI numbers. |
| Store credit must come off your balance in the same write | `firestore.rules:143-147` | Spending credit without losing it. |
| Customers can only make 3 tiny order changes (receive, auto-deliver after 3 days, resubmit hold fix) | `firestore.rules:150-174` | Customers approving or changing their own orders. |
| Proof/prescription links must be on our Cloudinary account | `photoLinkOk`, `firestore.rules:126-129` | Pointing "proof" at a fake image hosted elsewhere. |
| SI counter only +1; order counter only +1 | `firestore.rules:311-321` | Duplicate or skipped invoice numbers. |
| No deletes of orders, sales, users, audit log | `firestore.rules:63, 177, 245` | Destroying evidence. |
| Audit log append-only; customers may only log 2 actions with server time | `firestore.rules:235-246` | Editing history; back-dating. |
| Transactions for stock, SI numbers, credit, voids, exchanges, write-offs, counts | `deductStockFEFOOnce` and others | **Race conditions**: double-selling, double-approving, double-crediting. |
| `check` inside approval transactions | `confirmOrderSale`, `admin-online-orders.js:671` | Two staff approving the same order. |
| Server timestamps | `FieldValue.serverTimestamp()` everywhere | Faking dates with a wrong device clock. |
| Price-mismatch warning + "Approve anyway" | `confirmPriceProblems`, `admin-online-orders.js:554` | Underpriced tampered orders slipping through. |
| Reused reference number warning | `warnIfReferenceReused`, `admin-online-orders.js:522` | Re-using an old payment screenshot. |

### 1.5 Input handling (XSS and bad data)

| Measure | Where | Attack it prevents |
| --- | --- | --- |
| `escapeHtml()` on every user/staff value placed in HTML | `products-data.js:1285` (used everywhere) | **XSS**: scripts hidden in names, addresses, chat, product names, SKUs. |
| `textContent` for messages | e.g. `auth.js:25` | Same. |
| `safeUrl()`: only `http(s)` links | `products-data.js:1291` | `javascript:` links in image/document URLs. |
| Patterns for names, phone, email, address (no `<` `>`), ZIP, reference no. | `validators.js` | Junk or script-like input; typos. |
| Whole-number quantities everywhere (`wholeQty`) | `products-data.js:1276` | "2.5", "-3", "1e2" quantities. |
| Length limits in rules for chat | `firestore.rules:252-259, 289-292` | Filling the database with huge text. |
| 10 MB image limit + resize before upload | `payment.js:3`, `cloudinary.js:12` | Huge uploads (browser-level only). |

### 1.6 Platform and transport

| Measure | Where | Attack it prevents |
| --- | --- | --- |
| HTTPS everywhere (Firebase Hosting) | Hosting | Eavesdropping, tampering in transit. |
| `X-Frame-Options: DENY` | `firebase.json` | **Clickjacking** (our site hidden in someone else's page). |
| `X-Content-Type-Options: nosniff` | `firebase.json` | Browsers running uploaded files as scripts. |
| `Referrer-Policy: strict-origin-when-cross-origin` | `firebase.json` | Leaking full page addresses (with ids) to other sites. |
| App Check (reCAPTCHA Enterprise) on Gemini | `chat-config.js:11`, `live-chat.js:455-475` | Strangers using our AI quota with our config. |
| No secret keys in code; Gemini key stays in Firebase | `js/*-config.js` | Key theft. (Firebase/EmailJS/Cloudinary keys are public by design.) |
| `docs/`, `study/`, rules, README not published | `firebase.json` ignore list | Leaking internal documents. |
| Daily AI cap | `claimChatAiQuota`, `firestore.rules:298-304` | Runaway AI usage. |

---

## 2. Known gaps (honest list)

### 2.1 From the security review: what was done

| # | Finding | Status |
| --- | --- | --- |
| 1-2 | EmailJS template can be used to send any email from Amson's account; no per-address limit | **Owner action in the EmailJS dashboard**: restrict allowed origins, turn on rate limiting, and put the shop link inside the template. (A dashboard setting, not code.) |
| 3 | Order prices/totals come from the browser | **Partly fixed**: staff must confirm "Approve anyway" when prices don't match. Database-level price checking is not done. |
| 4 | Email verification (and the device code) can be skipped from the console | **Accepted** as a known limitation (needs Firebase's link verification or a paid-plan Cloud Function). |
| 5 | Same reference number / screenshot can be reused | **Partly fixed**: staff see a warning. Staff must still check the bank/GCash app. |
| 6 | Cloudinary accepts unsigned uploads; size/type checked in the browser only | **Owner action**: limit formats, size and folder in the Cloudinary upload preset. |
| 7 | Temporary "clear test data" delete rule | **Active until 15 Nov 2026**, Branch Manager only, then switches itself off. Remove the page and rule block after go-live. |
| 8 | Proof/prescription links could point anywhere | **Fixed in rules** (`photoLinkOk`). |
| 9 | Public stock records show some back-office fields | **Accepted** (costs already moved to `batchCosts`). |
| 10a | AI reply not checked for doses | **Fixed** (`chatLooksLikeDosage`). |
| 10b | Anyone can use up the daily AI counter | **Accepted**: only availability; the chat falls back to staff. |
| 10c | Customers can post "assistant"/"system" messages in their own chat | **Accepted**: staff are told; only affects their own chat. |
| 11 | Firebase browser key not restricted to our domains | **Owner action** in Google Cloud Console (API key restrictions). |
| 12 | Whoever can deploy can swap the QR image | **Process**: few deployers, 2-step verification, staff confirm money actually reached Amson's account. |
| 13 | A few staff-typed fields weren't escaped | **Fixed** (`escapeHtml` added). |
| 14 | Login lockout could be reset by anyone | **Fixed in rules** (count-up only, owner/expired/manager delete). |
| 15 | No security headers | **Fixed** (`firebase.json`). |
| 16 | reCAPTCHA only checked in the browser | **Accepted** (needs a server). Firebase's own throttling still applies. |
| 17 | Staff permissions are broad (any staff can edit any stock-batch field; any staff can write any audit text) | **Accepted** as an insider risk; every action still leaves a record. |

### 2.2 Other gaps found while testing or reading the code

| Gap | Risk | How we'd fix it |
| --- | --- | --- |
| BM approval for voids is checked in the page only | A Technical Staff member using the console could void without approval (still recorded under their name). | Cloud Function or a rule-checked approval record. |
| Stock-count finalize and category add are BM-only in the page, not in the rules | Technical Staff with console skills could do them. | Tighter rules per role. |
| Wholesale expired-document block is page-only | An ops staff console write could still record an order. | A rule reading the account's dates. |
| Audit log `user` name is written by the browser | A console user could write an entry under a fake name (can't edit existing ones). | Store and rule-check the uid. |
| A deactivated **customer** is signed out by the shop pages, but the rules don't check customer status | A deactivated customer with an open session and console skills could still write their own data. | Add `accountStatus` to the customer rules. |
| Deleting a profile doesn't delete the login | The email stays "taken" until removed in Firebase Authentication. | Cloud Function to delete both. |
| Two staff editing the same product/supplier form | Last save wins silently (test bug #9, not fixed). | Compare `updatedAt` before saving. |
| Forgot Password may reveal whether an email exists | Depends on Firebase's email-enumeration setting. | Turn on email enumeration protection. |

### 2.3 Why some gaps remain

Most remaining gaps need **server-side code** (Cloud Functions), which needs Firebase's **paid Blaze plan**. The client
chose the free plan. We closed everything that **security rules** can enforce, added warnings where rules can't, and
documented the rest. No remaining gap lets a customer or outsider read another customer's private data or change stock.

---

## 3. Mapping attacks to defenses (quick reference)

| Attack | Our defense |
| --- | --- |
| Password guessing | Lockout + reCAPTCHA + Firebase throttling |
| Making yourself staff | Rules: role fixed at "customer", can't change own role |
| Reading other customers' orders | Rules: `customerId == myUid()` |
| Changing prices | Rules: only `isPriceManager()` |
| Seeing cost prices | `productPrices`/`batchCosts` staff-only |
| XSS through names/chat | `escapeHtml`, `textContent` |
| Clickjacking | `X-Frame-Options: DENY` |
| Fake "paid" order | Rules: status must be `placed`, no staff fields; staff verification |
| Underpriced order | Price-mismatch warning + Approve anyway |
| Reused screenshot | Reused-reference warning + bank check |
| Double approval / double selling | Transactions with re-read and `check` |
| Duplicate SI numbers | Counter +1 rule + transaction + retry |
| Deleting evidence | No deletes on orders, sales, audit log |
| Using our AI quota | App Check + daily cap |
| AI giving doses | Rule-based health answers + dose filter on AI output |
| Former employee | `accountStatus` checked on every request |

---

## 4. Likely panel questions on security

1. **"Your Firebase API key is in the page source. Isn't that a leak?"** No. Firebase web keys are public identifiers, like a project name; every Firebase website shows one. Access is controlled by security rules. (We recommend also restricting the key to our domains.)
2. **"What if I open the console and write to the database directly?"** The rules run on Google's servers and check who you are and what you're writing. As a customer you can only create your own orders in "placed" status, read your own data, and make a few allowed changes.
3. **"Can you show a rule that blocks privilege escalation?"** `firestore.rules:51-54`: on your own doc, `role` and `accountStatus` must stay the same and `creditBalance` can't go up.
4. **"How do you stop XSS?"** All dynamic text goes through `escapeHtml` before `innerHTML`, or uses `textContent`. We tested names, addresses, chat and the store banner with `<script>` and they show as text.
5. **"How do you handle concurrent sales?"** Firestore transactions re-read stock and the SI counter; one wins, the other retries or fails cleanly.
6. **"What's your biggest remaining risk?"** Browser-side checks that need a server: email-code verification, order prices, void approval. We mitigated with rules where possible and staff warnings, and documented them. The fix is Cloud Functions on the paid plan.
7. **"Is the audit log tamper-proof?"** Entries can't be edited or deleted (rules). The weakness is that the name is written by the browser; we'd add a uid check.
8. **"What does App Check protect?"** Our Gemini AI usage: requests must carry a token proving they came from our website.
9. **"Is the website HTTPS?"** Yes, Firebase Hosting serves only HTTPS, with security headers.
10. **"What happens on 15 November?"** The temporary Clear Test Data rule and page stop working automatically; after go-live we delete them.
