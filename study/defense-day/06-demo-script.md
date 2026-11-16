# 6. Full demo guide

One story, about 22 minutes: **new stock arrives (batch upload + photos) → a customer orders online → staff verify and dispatch → stock moves by FEFO and expiry rules → counter sale and void → audit log and reports.**
Two browsers: **Chrome = staff**, **Edge (or Incognito) = customer**. Two tabs of one browser share one login.

---

## 6.1 Where the site stands now (checked Nov 16, 2026)

| Item | Now | Why it matters |
| --- | --- | --- |
| Products | **None.** Cleared on Nov 15 (audit log: write-offs "clear test data", then products deleted) | The whole catalog must be loaded before the demo |
| Categories | 5 kept: Branded, Drugstore (Per Piece), Generics, Medical Supplies, Baby & Mom Care | The import matches these names |
| Stock batches | 5 left, all from deleted test products | Clear them (6.3 step 1) |
| Product SKU counter | at 10, so the next products get **MED-0011, MED-0012, …** in file order | The stock files below use these SKUs |
| SI counter | 59 | Set the go-live start number in Clear Test Data if wanted |
| Last backup | Downloaded by Dhane on Nov 15, 14:55 (194 records) | Test data only, not a catalog |
| Clear Test Data | Works until **Dec 1, 2026** (`firestore.rules:333`) | Only way to reset; after Dec 1, plan for no reset |

## 6.2 The state the site must be in when the panel watches

| ✔ | Must be true | How to check |
| --- | --- | --- |
| ☐ | **25 base products** with prices, photos, Active, online | Products page; shop home shows photos |
| ☐ | The **3 live-demo products do NOT exist yet** (Lagundi syrup, Face mask, Digital thermometer) | Search them in Products: none found |
| ☐ | Stock received for the 25 base products; **one low-stock item** (Paracetamol 250 mg susp., 5 units); **one near-expiry batch** (Ascorbic syrup, exp. 03/31/2027 → Wholesale Only); **two batches of Paracetamol 500 mg** (early one 12/31/2027) for the FEFO point | Inventory tabs Low Stock / Near Expiry |
| ☐ | Supplier **"Supplier Sample"** exists and is Active | Suppliers page |
| ☐ | Accounts: Branch Manager, Technical Staff, Sales Staff, one **verified** customer with a saved address | Log in to each |
| ☐ | Every demo account logged in once **on the defense laptop, in the browser it will use** (new-device email code is ON) | No code asked on the next login |
| ☐ | No old test orders or sales left (clean dashboard, reports start empty) | Dashboard tiles at 0 |
| ☐ | Store announcement off; QR on the payment page is the branch's | Shop home; payment page |
| ☐ | Optional: one wholesale buyer with valid LTO and Permit (for wholesale questions) | Wholesale Accounts |

## 6.3 Prep timeline

### Files you need (all in `study/defense-day/demo-files/`, plus the Drive test kit)

| File | What it is | You must fill in |
| --- | --- | --- |
| `1-base-catalog.xlsx` | 25 products, names **identical to the photo file names** so photo matching works; category, section, Rx flags set | **Prices (yellow cells)** from the branch's price list. Retail must be > 0. Don't invent; ask the client or use last known prices |
| `2-base-stock.xlsx` | 26 stock lines for SKUs MED-0011 to MED-0035 (one low, one near-expiry, a second early Paracetamol batch) | Unit cost (optional). Check SKUs after step 4 |
| `3-live-new-products.xlsx` | The 3 products added **live** in the demo | **Prices** |
| `4-live-new-stock.xlsx` | Stock for the 3 live products, SKUs MED-0036 to 0038 | Check SKUs on demo morning (step 9) |
| `photo-list.txt` | Which photo files go with which upload | — |
| Drive → AMSON TEST KIT → `3 - Product images` | The product photos | Copy the 25 base photos into one desktop folder, the 3 live ones into another (`DEMO-LIVE-PHOTOS`) |
| Drive → AMSON TEST KIT → `2 - Test images` | `payment-proof-TEST1001.png`, `payment-proof-TEST1002.png`, `prescription-SAMPLE.png`, `TOO-BIG-over-10MB.png` | — |

Photos left out because their file names are brand-only (telmisartan, medpro, SYMDEX, Medbron, AMECIRON, ALCO-AID, e-nova, Mucolief, Novaflora, AZIMED, aplinc, lozemed, Acetyphil, I-Laxx, Ibufen, DIPHENHYDRAMINE…): add them only if you know the full product name and price.

### 2–3 days before (Branch Manager, Chrome)

1. **Reset:** Settings → Clear Test Data → tick orders/sales, stock, chat, logs, notifications and test customer accounts (keep your demo customer) → set the starting SI number → Delete. *(Only until Dec 1.)*
2. Check **Categories** still has the 5 names and **Suppliers** has "Supplier Sample" (add it with that exact name if not).
3. Fill the prices in `1-base-catalog.xlsx` and `3-live-new-products.xlsx`.
4. **Products → Upload Batch File → `1-base-catalog.xlsx` → Import.** Then search the Products page for **MED-0011** (it must be the file's first product, Paracetamol 500 mg) and **MED-0035** (the last, BP monitor). If the numbers start elsewhere, change the `sku` column of `2-base-stock.xlsx` to match (same order), and shift `4-live-new-stock.xlsx` to continue after the last one.
5. **Products → Upload Photos →** select all 25 base photos → check every match in the review list (fix wrong ones with the dropdown) → Save. Open the shop: every product has a photo.
6. **Inventory → Receive Stock → Upload Batch File → `2-base-stock.xlsx` → Confirm Import.** 26 lines received.
7. Open the **Dashboard** once (this applies the expiry rules: the Ascorbic syrup batch becomes Wholesale Only). Check Inventory → Low Stock shows Paracetamol 250 mg susp.
8. Accounts: make sure the 4 demo accounts exist and work; write emails and passwords on paper. Log each one in on the defense laptop (Chrome for staff, Edge for the customer) to clear the new-device code. Give the customer a saved address (Account Settings).

**Do not rehearse steps 4–6 of the demo script on the live site after this point.** Importing the live products would use up MED-0036 to 0038. If someone does, delete those 3 products and their photos, and shift `4-live-new-stock.xlsx` to the next free numbers.

### Demo morning

9. Products → search **MED-0035** (BP monitor) and **MED-0036** (must not exist yet). If not, edit `4-live-new-stock.xlsx` so its SKUs continue from it.
10. Dashboard tiles show 0 orders and 0 sales today. Nothing pending in Online Orders.
11. Desktop: `3-live-new-products.xlsx`, `4-live-new-stock.xlsx`, folder `DEMO-LIVE-PHOTOS` (3 photos), the 4 test images, Lalamove link `https://share.lalamove.com/demo123` in Notepad.
12. Both browsers open and logged in: Chrome = Branch Manager, Edge = customer. Phone hotspot ready. Screen recording of a full rehearsal (done before step 4 or on another day) saved offline.
13. Nobody runs `deploy.bat` (it pulls the old `webapp` branch, `deploy.bat:12`) or Clear Test Data.

## 6.4 The script

| Min | Step | Account / browser | Click exactly | File | Say | Proves |
| --- | --- | --- | --- | --- | --- | --- |
| **Act 1: new stock arrives** |||||||
| 0:00 | 1 | Branch Manager / Chrome | Products → **Upload Batch File** → `3-live-new-products.xlsx` → review table (point at the columns) → **Import 3 Products** | `3-live-new-products.xlsx` | "Staff add many products at once from Excel. Duplicates and bad rows are caught before anything is saved." | REQ068 p.54; REQ064 p.54 (batch upload) |
| 1:30 | 2 | BM / Chrome | Products → **Upload Photos** → select the 3 photos in `DEMO-LIVE-PHOTOS` → review: each photo already matched to its product → **Save** | 3 photos | "The system matches photos to products by name; staff just confirm." | REQ068 p.54 |
| 2:30 | 3 | BM / Chrome | Inventory → Receive Stock → **Upload Batch File** → `4-live-new-stock.xlsx` → review (supplier, batch, expiry) → **Confirm Import** | `4-live-new-stock.xlsx` | "Every delivery is recorded per batch with its expiry date. That's what FEFO and expiry alerts run on." | REQ062–064 p.54 |
| 3:30 | 4 | Guest / Edge | Refresh the shop → the 3 new products are there with photos and stock | — | "The shop reads the same database, so new stock is online at once." | REQNF005 p.63; recommendation p.120 |
| **Act 2: the customer orders** |||||||
| 4:00 | 5 | Guest / Edge | Chat → quick question "How do I pay?" → type "ano ang gamot sa lagnat?" | — | "Instant answers; for medicine it lists what we carry and sends you to the pharmacist, never a dose." | REQ035–037 p.50; panel revision #6 |
| 5:00 | 6 | Customer / Edge | Log in → add **Lagundi syrup** (new) + **Paracetamol 500 mg** to cart → change a quantity | — | "The cart is saved to the account." | REQ014–016 p.48 |
| 5:45 | 7 | Customer / Edge | Checkout → address pre-filled → Delivery schedule → a date → Proceed | — | "The delivery fee goes to the Lalamove rider." | REQ017–020 p.48 |
| 6:30 | 8 | Customer / Edge | Payment: QR → upload `TOO-BIG` (refused) → upload `payment-proof-TEST1001.png`, ref **TEST1001** → Submit | 2 images | "QR Ph straight to the branch account, as the owner required. Staff check it before anything is confirmed." | REQ028–030 pp.49–50; Interview 3 p.179 |
| **Act 3: staff verify and dispatch** |||||||
| 7:30 | 9 | Technical Staff / Chrome (log out BM, log in Tech) | Dashboard: new order and bell count, no refresh → Online Orders → open the order → **Approve Payment** → paste Lalamove link, fee 80 → **Mark Dispatched** | Lalamove link | "Approval deducts stock earliest-expiry first and gives the SI number in one step." | REQ076, REQ101–104 pp.55–59; Fig 2.11 p.81 |
| 9:30 | 10 | Customer / Edge | My Orders → Dispatched + tracking link → **Download Receipt** | — | "The customer sees each status; the receipt has the SI number." | REQ031–034 p.50; REQ093 p.58 |
| **Act 4: inventory, counter, control** |||||||
| 10:15 | 11 | Tech / Chrome | Inventory → Paracetamol 500 mg → batches: the **early batch (12/31/2027)** went down, the later one didn't | — | "That's FEFO: the batch that expires first is sold first." | REQ065 p.54 |
| 11:00 | 12 | Tech / Chrome | Inventory tiles → Near Expiry: Ascorbic syrup = **Wholesale Only**; Low Stock: Paracetamol susp. | — | "Six months before expiry it leaves retail; at two months it's a Bad Order. The branch's own rule." | REQ066–067 p.54; Interview 1 p.148 |
| 12:00 | 13 | Sales Staff / Chrome | Log in as Sales: menu = POS, Products, Settings → POS: Face mask + Thermometer (new) → G-Cash, no reference (refused) → Cash → Complete → receipt | — | "The counter only sees what it needs, and shares one stock count with the shop." | REQ082, REQ121 pp.56–61; Interview 2 p.161 |
| 13:30 | 14 | Sales / Chrome | Type `/admin/dashboard.html` | — | "Typing the address doesn't help; the page and the database both refuse." | REQNF011 p.63 |
| 14:00 | 15 | Branch Manager / Chrome | POS → Today's Sales → open the sale → **Void** one item → reason | — | "Voids need a reason and the manager; stock goes back to its batch." | REQ083 p.56; Interview 4 p.191 |
| 15:00 | 16 | BM / Chrome | Products → Lagundi → change retail price → reason → Save | — | "Only the manager changes prices, always with a reason." | REQ071–073 p.55; Interview 1 p.150 |
| 16:00 | 17 | BM / Chrome | Audit Log → search "Price" and "Void" → before/after, who, when, why | — | "Nobody can edit or delete these entries." | REQ122–124 pp.61–62 |
| **Act 5: reports** |||||||
| 17:00 | 18 | BM / Chrome | Reports → Daily Sales (today) → preview → PDF → Excel | — | "Online and counter sales, with batch and expiry, as the main office asked." | REQ111–115 pp.60–61; Interview 1 p.151 |
| 18:00 | 19 | BM / Chrome | Reports → Supplier Purchases (this month) → shows the deliveries from Act 1 | — | "Every delivery we received this morning is already in the supplier report." | REQ112 p.60 |
| 18:45 | 20 | BM / Chrome | Dashboard → today's sales tiles and chart; one-sentence wrap-up | — | "Stock, online orders, the counter and reports in one database." | Objectives p.5 |

**Extras if asked (about 2 minutes each):** Rx pre-order: add Amoxicillin → address disappears → upload `prescription-SAMPLE.png` + `payment-proof-TEST1002.png` → staff approve → Ready for Pick-up (REQ021–027; panel revision #7) · Purchase order: Inventory → Purchase Orders → create for 2 items → receive one short → Discrepancy (REQ053–058 p.53) · Underpayment hold (REQ097 p.58) · Bad import rows: upload `A2 products-import-ERRORS.xlsx` from the test kit → rows turn red, nothing saved (don't import).

## 6.5 If something goes wrong

| Problem | Step | Do | Say |
| --- | --- | --- | --- |
| Import shows a row "already in the catalog" | 1 | Someone rehearsed it. Click Remove duplicates, carry on; the products already exist | "Duplicates are caught before saving." |
| Photo matched to the wrong product | 2 | Pick the right product in that row's dropdown, then Save | "That's why staff confirm each match." |
| Photo upload slow / fails | 2 | Wait; retry once; otherwise skip (the products still work without photos) | "Photos go to Cloudinary; the shop shows a placeholder until then." |
| Stock import: "unknown SKU" | 3 | Type the right SKU (Products page) into the red row's SKU box, then Confirm; or receive one product by hand (Receive Stock form) | "The review table lets staff fix a row before saving." |
| New products don't show in the shop | 4 | Refresh once; check they're Active and "online" | — |
| No internet | Any | Phone hotspot → still down: play the recording from that step | "It's a cloud system; offline support is a recommendation (p.120)." |
| New-device email code asked | Any | Check inbox/spam; continue in the other browser meanwhile. Never register an account live | "A new device must confirm by email." |
| AI chat down / limit | 5 | Use the quick-question buttons (built-in) → Talk to staff | "Common questions don't need the AI; otherwise chat goes to staff." |
| Payment upload error | 8 | Try `payment-proof-TEST1002.png`; refresh the payment page (the order draft is kept) | "Files over 10 MB are refused on purpose." |
| "Check before approving" | 9 | Approve anyway | "A safety check: a price changed after the order." |
| Product shows Out of Stock | 6, 13 | Pick another product | "Its stock is near expiry, so it's held back from retail." |
| Wrong person logged in | Any | Two tabs of one browser: switch browser | — |

## 6.6 After the demo
Leave everything as is until the panel is done (they may ask to see records). Afterwards, decide with the client whether to keep the demo catalog as the real one or clear it (Clear Test Data works until Dec 1, 2026).
