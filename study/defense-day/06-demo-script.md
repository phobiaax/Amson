# 6. Demo script: one story in 18 minutes

**The story:** a customer orders online → staff verify the payment and dispatch → stock moves by FEFO and expiry rules → a walk-in sale and a void → the manager reads the reports and audit log.
Two browsers: **Chrome = staff**, **Edge (or Incognito) = customer**. One person drives, one person talks.
Test files: Drive → **AMSON TEST KIT**, downloaded to the desktop the day before.

## 6.1 Pre-demo checklist (day before, on the defense laptop)

| ✔ | Check | Why |
| --- | --- | --- |
| ☐ | **Catalog is loaded.** On Nov 16 the live `products` collection was empty. Products → Upload Batch File with the real catalog (or `A1 products-import-GOOD.xlsx` for TEST items), then Upload Photos | Nothing to sell otherwise |
| ☐ | Stock received for the demo products (Inventory → Receive Stock). For a near-expiry example use **`B4 receive-stock-EXPIRING-SOON.xlsx`** | Steps 9–10 |
| ☐ | One product marked **Rx** with stock | Optional Rx step |
| ☐ | Log in once with every demo account on this laptop, in both browsers (new-device email code) | `js/device-trust.js:4` (code is ON) |
| ☐ | Accounts on paper: Branch Manager, Technical Staff, Sales Staff, one verified customer | |
| ☐ | Desktop: `payment-proof-TEST1001.png`, `payment-proof-TEST1002.png`, `prescription-SAMPLE.png`, `TOO-BIG-over-10MB.png`, `C1 purchase-order.xlsx` | Uploads |
| ☐ | Lalamove link in Notepad: `https://share.lalamove.com/demo123` | Must start with share.lalamove.com (`js/admin-online-orders.js:177`) |
| ☐ | Phone hotspot tested; both addresses work: amsonpharma.web.app and amson-web-app.web.app | Backup network / reCAPTCHA domain |
| ☐ | Screen recording of the whole script saved offline | If the internet dies |
| ☐ | **Nobody** runs `deploy.bat` or Clear Test Data | `deploy.bat:12` pulls the old `webapp` branch; Clear Test Data deletes records |

## 6.2 The script

| Min | Step | Account / browser | Click exactly | Test file | Say (one line) | Proves |
| --- | --- | --- | --- | --- | --- | --- |
| 0:00 | 1 | Guest / Edge | Open amsonpharma.web.app. Scroll banner, categories. Search "paracetamol" | — | "Guests can browse and chat without an account." | REQ008–012 p.47; Fig 2.3 p.68 |
| 1:00 | 2 | Guest / Edge | Chat → quick question "How do I pay?" → type "ano ang gamot sa lagnat?" | — | "Instant answers; for medicines it lists what we carry and sends you to the pharmacist, never a dose." | REQ035–037 p.50; panel revision #6 |
| 2:30 | 3 | Customer / Edge | Log in → add 2 non-Rx products → cart → change a quantity | — | "The cart is saved to the account and follows you to another device." | REQ014–016 p.48 |
| 3:30 | 4 | Customer / Edge | Checkout: address is pre-filled → Delivery schedule → pick a date → Proceed | — | "Delivery fee goes to the Lalamove rider; past dates are refused." | REQ017–020 p.48 |
| 4:30 | 5 | Customer / Edge | Payment: show the QR → upload `TOO-BIG` first (refused) → upload `payment-proof-TEST1001.png`, ref **TEST1001** → Submit | `TOO-BIG-over-10MB.png`, `payment-proof-TEST1001.png` | "QR Ph straight to the branch account, as the owner required. Nothing is confirmed until staff check it." | REQ028–030 pp.49–50; Interview 3 p.179 |
| 6:00 | 6 | Technical / Chrome | Dashboard: the order and bell count appear without refresh → Online Orders → Payment Verification → open it | — | "It arrived live." | REQ047–048 p.52; REQNF005 p.63 |
| 7:00 | 7 | Technical / Chrome | **Approve Payment** → dispatch pop-up → paste the Lalamove link, fee 80 → Mark Dispatched | Lalamove link | "Approval deducts stock earliest-expiry first and assigns the SI number in one step." | REQ076, REQ101–104 pp.55–59; Fig 2.11 p.81 |
| 8:00 | 8 | Customer / Edge | My Orders → status Dispatched + tracking link → Download Receipt | — | "The customer sees each step; the receipt has the SI number." | REQ031–034 p.50; REQ093 p.58 |
| 9:00 | 9 | Technical / Chrome | Inventory → open the product sold → batches sorted by expiry; show the quantity that went down | — | "That's FEFO: the batch expiring first was used." | REQ065 p.54 |
| 10:00 | 10 | Technical / Chrome | Inventory tiles: Near Expiry / Bad Order; open the B4 batch → Bad Order, qty 0, auto write-off | (`B4` loaded the day before) | "Six months before expiry it leaves retail; two months, Bad Order. The branch's own rule." | REQ066–067 p.54; Interview 1 p.148 |
| 11:00 | 11 | Sales / Chrome | Log in as Sales: menu shows only POS, Products, Settings → POS: 2 items → G-Cash with no reference (refused) → Cash → Complete → receipt | — | "Sales Staff only see the counter. Non-cash needs a reference." | REQ082, REQ121 pp.56–61 |
| 12:30 | 12 | Sales / Chrome | Type `/admin/dashboard.html` | — | "Typing the address doesn't help; the page and the database both refuse." | REQNF011 p.63 |
| 13:00 | 13 | Branch Manager / Chrome | POS → Today's Sales → open the sale → Void one item → reason | — | "Voids need a reason and a manager; stock goes back to its batch." | REQ083 p.56; Interview 4 p.191 |
| 14:00 | 14 | Branch Manager / Chrome | Products → change a price → reason → save | — | "Only the manager changes prices, with a reason." | REQ071–073 p.55; Interview 1 p.150 |
| 15:00 | 15 | Branch Manager / Chrome | Audit Log → search "Void" and "Price" → show before/after, who, when, why | — | "Nobody can edit or delete these entries." | REQ122–124 pp.61–62 |
| 16:00 | 16 | Branch Manager / Chrome | Reports → Daily Sales (today) → preview → PDF → Excel | — | "Batch and expiry in every report, as the main office asked." | REQ111–115 pp.60–61; Interview 1 p.151 |
| 17:00 | 17 | Branch Manager / Chrome | Dashboard → Today/Week chart; one sentence wrap-up | — | "Online, counter, stock and reports in one database." | Objectives p.5 |

**If time allows (pick one):** Rx pre-order with `prescription-SAMPLE.png` → staff approve → Ready for Pick-up (REQ021–027, panel revision #7) · PO from `C1 purchase-order.xlsx` received one short → Discrepancy (REQ053–058 p.53) · Underpayment hold with `payment-proof-TEST1002.png` (REQ097 p.58).

## 6.3 Backup plan per failure

| Problem | At step | Do | Say |
| --- | --- | --- | --- |
| Slow or no internet | Any | Phone hotspot. Still down → play the recording from the same step | "It's a cloud system; offline support is in our recommendations (p.120)." |
| Products don't load | 1, 3 | Wait 10 s → refresh once → open the second address | "It reads live from the cloud database." |
| Email code needed (new device) / slow | 3, 6, 11 | Check inbox + spam; meanwhile continue with the other browser. Never register a new account live (email quota ~200/month, p.98) | "A new device must confirm by email." |
| AI chat down or quota reached | 2 | Use the quick-question buttons (built-in, no AI) → "Talk to staff" | "Common questions don't need the AI; when it's unavailable, chat goes to staff." (`js/chat-config.js` dailyAiLimit 400) |
| Upload error | 5, Rx | Try `payment-proof-TEST1002.png`; check file size; refresh payment page (draft is kept in the session) | "Uploads go to Cloudinary; files over 10 MB are refused on purpose." |
| "Check before approving" warning | 7 | Approve anyway | "A safety check: a price changed since the order." (`js/admin-online-orders.js:506`) |
| Product shows Out of Stock | 3, 11 | Pick another product | "Its stock is near expiry, so it's held back from retail." |
| Wrong person logged in | Any | You used two tabs of one browser; switch browser | — |
| Anything else | — | Skip to the next step; come back in Q&A | "Let me show that from the recording." |
