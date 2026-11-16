# 6. Full demo guide

One story, about 24 minutes: **a delivery of 50 new products arrives (batch upload + photos + stock) → a customer orders online → staff verify and dispatch → stock moves by FEFO and expiry rules → counter sale and void → audit log and reports.**
Two browsers: **Chrome = staff**, **Edge (or Incognito) = customer**. Two tabs of one browser share one login.
All products, prices, batch numbers and expiry dates come from the branch's price list (**PRICELIST APRIL – SEND TO CUSTOMER**, sheets GENERICS and MEDICAL). Stock quantities are demo amounts.

---

## 6.1 Where the site stands now (checked after the clear on Nov 16, 2026)

| Item | Now |
| --- | --- |
| Products, stock, orders, sales, chats, logs | **Empty** (Clear Test Data) |
| Categories | Branded, Drugstore (Per Piece), Generics, Medical Supplies. The import uses **Generics** and **Medical Supplies** |
| Suppliers | **Supplier Sample** (Active) |
| Accounts | Branch Manager, Technical Staff, Sales Staff, 12 customers (11 verified) |
| Product numbering | Reset: the first imported product gets **MED-0001** |
| SI numbering | Counter at 59: the next sale gets SI **00000060** |
| Clear Test Data | Works until **Dec 1, 2026** (`firestore.rules:333`) |

## 6.2 The state the site must be in when the panel watches

| ✔ | Must be true | How to check |
| --- | --- | --- |
| ☐ | **50 base products** (MED-0001 to MED-0050), Active, with stock | Products page shows 50; shop lists them |
| ☐ | The **50 live products do NOT exist yet** (e.g. search "NAHALGESIC", "LAGUNDI": not found) | Products search |
| ☐ | **Near-expiry:** ACETYLCYSTEINE 200 MG SACHET ACYDEN (MED-0001), batch 240639, exp 05/01/2027 → **Wholesale Only** | Inventory → Near Expiry |
| ☐ | **Low stock:** DICLOFENAC 50 MG TABLET TRIFOCID (MED-0005), 5 units | Inventory → Low Stock |
| ☐ | Supplier **Supplier Sample** Active | Suppliers |
| ☐ | Demo accounts: Branch Manager, Technical Staff, Sales Staff, one **verified** customer with a saved address | Log in to each |
| ☐ | Every demo account logged in once **on the defense laptop, in the browser it will use** (new-device code is ON) | No code asked on the next login |
| ☐ | Dashboard: 0 orders and 0 sales today | Dashboard tiles |
| ☐ | Store announcement off; payment QR is the branch's | Shop home; payment page |

## 6.3 Prep

### Files (`study/defense-day/demo-files/`, also in Drive → **Defense demo files**)

| File | What it is | When |
| --- | --- | --- |
| `1-base-catalog-50.xlsx` | 50 products from the price list (8 shop sections; 19 marked Rx). Sheet 2 shows each item's price-list row | Before the demo |
| `2-base-stock.xlsx` | 50 stock lines for MED-0001 to MED-0050, with the real batch no. and expiry | Before the demo |
| `3-live-products-50.xlsx` | The 50 products added **live** (42 have photos) | During the demo |
| `4-live-stock.xlsx` | 32 stock lines for MED-0051 to MED-0100 (31 products; Acetylphil has two batches for the FEFO point) | During the demo |
| `photo-and-stock-notes.txt` | Which photo goes with which product; which live products have no stock line and why | Reference |
| Drive → AMSON TEST KIT → `3 - Product images` | Copy the **42 photos listed in the notes** into a desktop folder `DEMO-LIVE-PHOTOS` | Before the demo |
| Drive → AMSON TEST KIT → `2 - Test images` | `payment-proof-TEST1001.png`, `payment-proof-TEST1002.png`, `prescription-SAMPLE.png`, `TOO-BIG-over-10MB.png` | Desktop |

**Check before importing:** the Rx flags were set from the generic names (antibiotics, blood-pressure, cholesterol and diabetes drugs, salbutamol/ipratropium, pantoprazole). Have someone who knows the branch confirm column `rxRequired`.

**19 live products have no stock line.** The price list gives them no batch or expiry, or the expiry has already passed (e.g. NOVACEE syrup 11/2025, KURT cream 09/2026). They import fine but show **Out of Stock** in the shop. To stock them, add their real batch and expiry from the boxes to `4-live-stock.xlsx`.

### Before the demo (Branch Manager, Chrome)

1. **Products → Upload Batch File → `1-base-catalog-50.xlsx` → Import 50 Products.** Then search **MED-0001** (must be ACYDEN) and **MED-0050** (must be MUPIROCIN … BACTROMED). If the numbers differ, tell the programmer before step 2: the stock files must match.
2. **Inventory → Receive Stock → Upload Batch File → `2-base-stock.xlsx` → Confirm Import.** 50 lines received.
3. Open the **Dashboard** once (applies the expiry rules: ACYDEN becomes Wholesale Only). Check Inventory → Near Expiry and Low Stock (6.2).
4. Accounts: log each demo account in on the defense laptop (Chrome = staff, Edge = customer); give the customer a saved address; write emails and passwords on paper.
5. **Do not import `3-live-products-50.xlsx` or `4-live-stock.xlsx` before the demo.** If someone does: delete those products (Products page), and the live SKUs will no longer start at MED-0051; fix `4-live-stock.xlsx` to match.

### Demo morning
6. Products: **MED-0050** exists, **MED-0051** doesn't. Dashboard at 0.
7. Desktop: `3-live-products-50.xlsx`, `4-live-stock.xlsx`, folder `DEMO-LIVE-PHOTOS` (42 photos), the 4 test images, Lalamove link `https://share.lalamove.com/demo123` in Notepad.
8. Both browsers logged in (Chrome = Branch Manager, Edge = customer). Hotspot ready. Recording of a full rehearsal saved offline.
9. Nobody deploys or runs Clear Test Data.

## 6.4 The script

| Min | Step | Account / browser | Click exactly | File | Say | Proves |
| --- | --- | --- | --- | --- | --- | --- |
| **Act 1: a delivery of 50 products arrives** |||||||
| 0:00 | 1 | Branch Manager / Chrome | Products → **Upload Batch File** → `3-live-products-50.xlsx` → review table (point at name, prices, Rx column) → **Import 50 Products**; progress bar runs | `3-live-products-50.xlsx` | "Staff add a whole delivery at once from the Excel price list. Duplicates and bad rows are caught before anything is saved." | REQ068, REQ064 p.54 |
| 2:00 | 2 | BM / Chrome | Products → **Upload Photos** → select all 42 photos in `DEMO-LIVE-PHOTOS` → review: each photo already matched by name; fix any wrong row with its dropdown → **Save** | 42 photos | "Photos are matched to products by their names; staff only confirm." | REQ068 p.54 |
| 4:00 | 3 | BM / Chrome | Inventory → Receive Stock → **Upload Batch File** → `4-live-stock.xlsx` → review supplier, batch, expiry → **Confirm Import** | `4-live-stock.xlsx` | "Each delivery is recorded per batch with the expiry from the box. FEFO and expiry alerts run on this." | REQ062–064 p.54 |
| 5:00 | 4 | Guest / Edge | Refresh the shop → new products with photos and stock; search "lagundi" | — | "The shop reads the same database, so the delivery is online at once." | REQNF005 p.63; recommendation p.120 |
| **Act 2: the customer orders** |||||||
| 5:30 | 5 | Guest / Edge | Chat → "How do I pay?" → "ano ang gamot sa lagnat?" | — | "Instant answers; for medicine it lists what we carry and points to the pharmacist, never a dose." | REQ035–037 p.50; panel revision #6 |
| 6:30 | 6 | Customer / Edge | Log in → add **LAGUNDI 300 MG SYRUP OFPLEMED** (₱80) and **PARACETAMOL 500 MG TABLET NAHALGESIC** (₱100) → change a quantity | — | "The cart is saved to the account." | REQ014–016 p.48 |
| 7:15 | 7 | Customer / Edge | Checkout → address pre-filled → Delivery schedule → date → Proceed | — | "The delivery fee goes to the Lalamove rider." | REQ017–020 p.48 |
| 8:00 | 8 | Customer / Edge | Payment: QR → upload `TOO-BIG` (refused) → `payment-proof-TEST1001.png`, ref **TEST1001** → Submit | 2 images | "QR Ph straight to the branch account, as the owner required. Staff check it first." | REQ028–030 pp.49–50; Interview 3 p.179 |
| **Act 3: staff verify and dispatch** |||||||
| 9:00 | 9 | Technical Staff / Chrome | Dashboard: order + bell, no refresh → Online Orders → open → **Approve Payment** → Lalamove link, fee 80 → **Mark Dispatched** | Lalamove link | "Approval deducts stock earliest-expiry first and gives the SI number in one step." | REQ076, REQ101–104 pp.55–59; Fig 2.11 p.81 |
| 11:00 | 10 | Customer / Edge | My Orders → Dispatched + tracking link → **Download Receipt** | — | "The customer sees each status; the receipt has the SI number." | REQ031–034 p.50; REQ093 p.58 |
| **Act 4: inventory, counter, control** |||||||
| 11:45 | 11 | Sales Staff / Chrome | Log in as Sales: menu = POS, Products, Settings → POS: **ACETYLCYSTEINE 600 MG POWDER ACETYLPHIL** ×5 + **GAUZE PAD 2 X 2 SURE-GUARD** → G-Cash, no reference (refused) → Cash → Complete → receipt | — | "The counter only sees what it needs and shares one stock count with the shop." | REQ082, REQ121 pp.56–61; Interview 2 p.161 |
| 13:15 | 12 | Sales / Chrome | Type `/admin/dashboard.html` | — | "Typing the address doesn't help; the page and the database both refuse." | REQNF011 p.63 |
| 13:45 | 13 | Technical / Chrome | Inventory → ACETYLPHIL → batches: **2510011 (exp 10/2028) went 20 → 15**; **251157 (exp 11/2028)** untouched | — | "FEFO: the batch that expires first is sold first." | REQ065 p.54 |
| 14:45 | 14 | Technical / Chrome | Near Expiry: **ACYDEN** (exp 05/2027) and **IBUFEN** (exp 05/2027, from this morning's delivery) = Wholesale Only; Low Stock: **TRIFOCID** | — | "Six months before expiry stock leaves retail; at two months it's a Bad Order. The branch's own rule." | REQ066–067 p.54; Interview 1 p.148 |
| 15:45 | 15 | Branch Manager / Chrome | POS → Today's Sales → open the Sales Staff sale → **Void** the gauze pad → reason | — | "Voids need a reason and the manager; stock returns to its batch." | REQ083 p.56; Interview 4 p.191 |
| 16:45 | 16 | BM / Chrome | Products → LAGUNDI → change retail price → reason → Save | — | "Only the manager changes prices, always with a reason." | REQ071–073 p.55; Interview 1 p.150 |
| 17:45 | 17 | BM / Chrome | Audit Log → search "Price" and "Void" | — | "Before/after, who, when, why. Nobody can edit or delete these." | REQ122–124 pp.61–62 |
| **Act 5: reports** |||||||
| 18:45 | 18 | BM / Chrome | Reports → Daily Sales (today) → preview → PDF → Excel | — | "Online and counter sales with batch and expiry, as the main office asked." | REQ111–115 pp.60–61; Interview 1 p.151 |
| 20:00 | 19 | BM / Chrome | Reports → Supplier Purchases (this month) | — | "This morning's delivery is already in the supplier report." | REQ112 p.60 |
| 21:00 | 20 | BM / Chrome | Dashboard → sales tiles and chart; wrap up | — | "Delivery, online orders, the counter and reports in one database." | Objectives p.5 |

**Extras if asked (about 2 minutes each):**
- Rx pre-order: add **AMOXICILLIN 500 MG CAPSULE BETAMOX** (₱180) → address disappears → upload `prescription-SAMPLE.png` + `payment-proof-TEST1002.png` → staff approve → Ready for Pick-up (REQ021–027; panel revision #7).
- Purchase order with discrepancy: Inventory → Purchase Orders → create for 2 items → receive one short (REQ053–058 p.53).
- Underpayment hold (REQ097 p.58).
- Bad import rows: upload `A2 products-import-ERRORS.xlsx` (test kit) → rows turn red, nothing saved; don't import.
- Disposable email refused: on the Register page type an address from 6.7 → message appears; don't submit.

## 6.5 If something goes wrong

| Problem | Step | Do | Say |
| --- | --- | --- | --- |
| Import shows rows "already in the catalog" | 1 | Someone imported early. Remove duplicates, carry on | "Duplicates are caught before saving." |
| Import is slow (50 rows) | 1 | Talk over it: explain the review table and validation | "Each product gets its own SKU as it's saved." |
| Photo matched to the wrong product, or unmatched | 2 | Choose the right product in that row's dropdown; leave unmatched rows unticked | "That's why staff confirm each match." |
| Photo upload slow / fails | 2 | Wait; retry once; otherwise skip (products still work) | "Photos go to Cloudinary; a placeholder shows until then." |
| Stock import: "unknown SKU" | 3 | Type the right SKU (from Products) into the red row, then Confirm; or receive that product by hand | "Staff can fix a row before saving." |
| New products not in the shop | 4 | Refresh; check they're Active | — |
| No internet | Any | Hotspot → still down: play the recording | "It's a cloud system; offline support is a recommendation (p.120)." |
| New-device email code | Any | Inbox/spam; continue in the other browser. Never register live | "A new device must confirm by email." |
| AI chat down / limit | 5 | Quick-question buttons (built-in) → Talk to staff | "Common questions don't need the AI; otherwise chat goes to staff." |
| Payment upload error | 8 | Try `payment-proof-TEST1002.png`; refresh the payment page (draft kept) | "Files over 10 MB are refused on purpose." |
| "Check before approving" | 9 | Approve anyway | "A safety check: a price changed after the order." |
| Product shows Out of Stock | 6, 11 | Pick another; it has no stock line (6.3) or is near expiry | "Its stock is near expiry, so it's held back from retail." |
| Wrong person logged in | Any | Two tabs of one browser: switch browser | — |

## 6.6 After the demo
Leave everything until the panel is done. Then decide with the client whether to keep the demo catalog or clear it (Clear Test Data works until Dec 1, 2026).

## 6.7 Email addresses the site refuses

**Format:** must look like `name@domain.tld` (`js/validators.js:10`, EMAIL_PATTERN).
**Throwaway domains (39):** registration and Change Email refuse these with "Please use a permanent email address, not a temporary/disposable one." (`js/validators.js:21`, `isDisposableEmail`; used in `js/register.js:49`, `:163` and `js/account-settings.js:209`). Group test LOG-01 confirmed it.

| | | | |
| --- | --- | --- | --- |
| mailinator.com | tempmail.com | temp-mail.org | guerrillamail.com |
| guerrillamail.info | guerrillamail.biz | guerrillamail.de | guerrillamail.net |
| guerrillamail.org | guerrillamailblock.com | sharklasers.com | throwawaymail.com |
| throwaway.email | yopmail.com | yopmail.fr | yopmail.net |
| 10minutemail.com | 10minutemail.net | trashmail.com | trashmail.net |
| dispostable.com | fakeinbox.com | fakemailgenerator.com | getairmail.com |
| getnada.com | mailnesia.com | mintemail.com | mohmal.com |
| spamgourmet.com | tempail.com | tempinbox.com | emailondeck.com |
| mailcatch.com | moakt.com | mytemp.email | tempmailo.com |
| discard.email | maildrop.cc | inboxbear.com | burnermail.io |

**Limit to know:** only these exact domains are blocked; other throwaway services (or subdomains of these) get through. Answer if asked: "We block the common ones; a full blocklist service or Firebase's email-link verification would cover the rest. Every account still has to enter the 6-digit code sent to the inbox."
**Also refused:** an email that already has an account ("An account with this email already exists.", group test LOG-06).
