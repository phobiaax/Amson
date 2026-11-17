# Defense Guide v2

**How to use this guide**

- **Morning of the defense:** read Part 1 only (5 minutes).
- **Before the practice demo:** do Part 2, "Before the demo" (about 45 minutes the first time).
- **Q&A study:** Parts 3 and 4.
- **"p.102"** means the printed page number of the Nov 12 manuscript. **"Interview 1–4"** are Appendices J–M (pp.142–194).

---

# Part 1. Cheat sheet

**The system in one paragraph.** A web-based sales and inventory system for Amson Pharmaceuticals' Las Piñas branch (p.i, p.1). Customers browse, order and pay by QR Ph online, pre-order prescription medicines for pick-up, and chat with an assistant. Staff verify payments by hand, dispatch through Lalamove, sell at the POS, receive stock by batch and expiry, and export reports for the main office. Every sale takes the **earliest-expiring batch first (FEFO)**. At **6 months** before expiry a batch leaves retail; at **2 months** it becomes a Bad Order. Roles are enforced by the **database rules**, and sensitive actions go to an audit log nobody can edit. Built on Firebase, deployed **Oct 22, 2026** (p.102).

**Objectives (pp.5–6)**

- General: improve **operational efficiency, customer reach, inventory accuracy** (p.5).
- 1: Customer online store with AI chat and Rx pre-order for pick-up (p.5).
- 2: Sales and inventory module: transaction records, FEFO, expiry and low-stock alerts, near-expiry stock removed from sale (p.5).
- 3: Admin portal: role-based product and price management, online and walk-in sales, daily and monthly reports with batch and expiry (p.5).
- 4: Evaluate with **TAM** and **ISO/IEC 25010 ("security, reliability, compliance")** (p.6). ⚠ The results used five other characteristics (p.102). Answer: question 5 below.

**Top 15 panel questions**

| # | Question | One-line answer | Source |
| --- | --- | --- | --- |
| 1 | What problem? | Handwritten invoices re-typed in Excel, orders over Messenger/Viber, no record of voids or price changes, expiry caught by hand. | pp.1–2 |
| 2 | Why FEFO, not FIFO? | A later delivery can expire sooner; for medicine the expiry date is what matters. | REQ065 p.54 |
| 3 | Why 6 and 2 months? | The branch's own rule: pulled out at 6, Bad Order at 2. | Interview 1 p.148 |
| 4 | Is it really real-time? | Selling is checked live. Labels and holds update when the page opens, because the free plan has no timer. | — |
| 5 | Objective 4 vs results? | Set at proposal. We evaluated five ISO characteristics, including security and reliability; compliance was one question; the wording should have been updated. | p.6 vs p.102 |
| 6 | Where are the TAM scores? | Ease of use is in Usability, usefulness in Functional Suitability, acceptance in satisfaction: 48 of 50 would use it again. | p.118 |
| 7 | Why no payment gateway? | The owner forbids third parties in payment. | Interview 3 p.179 |
| 8 | Fake screenshot? | Staff check the real account; a reused reference number is flagged. | Interview 3 p.178 |
| 9 | Why no refunds? | Paid means confirmed; only swaps. Verified money on a closed hold becomes store credit. | Interview 3 pp.183–184 |
| 10 | Rx online? | Never delivered: pre-order, full payment, prescription photo, pick up with the original. | REQ021–026 pp.48–49 |
| 11 | Where do the roles come from? | The client confirmed Sales = POS only and that the encoder (Technical Staff) handles messages; the manager controls prices. Enforced by page checks and database rules. | Interview 2 p.161; Interview 1 p.158 |
| 12 | Who changes prices? | Branch Manager only, with a reason, logged. | REQ071–073 p.55; Interview 1 p.150 |
| 13 | The diagram doesn't match? | Drawn at design. The discussion under each figure and the requirements were updated, and the system follows those. Then show it live. | Part 3, G2 |
| 14 | Do they still use the old POS? | Yes, by the client's choice during transition; integration is recommended. | pp.208–209, p.120 |
| 15 | Biggest limitation? | No server code on the free plan: a few checks run in the browser, and timed jobs run when a page opens. | — |

**Key numbers**

| | | | |
| --- | --- | --- | --- |
| Requirements | 124 functional + 29 non-functional (pp.46–66) | Respondents | 53 = BM, Tech, Sales + 50 customers (p.102) |
| Survey dates | Oct 27–28, 2026 (p.103) | Highest score | Customers' Reliability **4.82** (p.118) |
| All averages | ≥ 4.00 / 5 (p.118) | Interviews | 4 (Mar 29, Apr 8, Apr 15, May 12) + walkthrough (p.204) |
| Method | Agile, 6 phases of 2–3 weeks (pp.28–35) | Deployed | Oct 22, 2026 (p.102) |
| Lockout | 5 wrong tries → 2 min (REQ004 p.47) | Order hold | 7 days → closed, store credit (REQ100 p.59) |
| Auto-delivered | 3 days after dispatch (REQ106 p.60) | AI chat cap | 400 replies a day |
| Upload limit | 10 MB | SI number | 8 digits |
| Expiry | 6 mo wholesale only · 2 mo Bad Order (REQ066–067 p.54) | Free plan | ~50,000 reads/day, ~200 emails/month (p.98) |

**Panel revisions (last defense):** 1 intro ✔ · 2 objectives ◐ · 3 theoretical framework ◐ · 4 conceptual framework + methodology ✔ · 5 diagram discussions ◐ · 6 chat ✔ (still lowest rated) · 7 Rx pre-order for pick-up ✔ (Fig 2.10 lacks the upload step) · 8 thematic RRL ✔. Details: Part 3.

---

# Part 2. Demo guide

**The story (about 42 minutes):** a customer browses, signs up, chats and orders → staff answer, verify and dispatch → the customer receives it, then places a prescription pick-up order → a supplier's delivery of 50 new products arrives (batch upload, photos with wrong names, stock) → a counter sale shows FEFO and a void → a wholesale order → quick tour of staff, notifications, reports and the audit log.

**Two browsers:** Chrome = staff. Edge (or an Incognito window) = customer. Two tabs of one browser share one login.

**Products, prices, batch numbers and expiry dates** come from the branch's April price list. Stock quantities are demo amounts.

## Before the demo

Do these once, in order. Times are for the first run.

**Where the files are:** Google Drive → **Defense demo files** (the 5 Excel files and `photo-and-stock-notes.txt`), and Drive → **AMSON TEST KIT** (photos and test images). The same Excel files are in the repo under `study/defense-day/demo-files/`.

**A. Load the store (Branch Manager, Chrome, about 15 minutes)**

> ✅ **DONE on Nov 16, 2026: 50 products and their stock are loaded. Do NOT repeat these steps.** Uploading `2-base-stock.xlsx` again adds the same quantities a second time.

1. Products → **Upload Batch File** → `1-base-catalog-50.xlsx` → **Import 50 Products**.
2. Search **MED-0001** (must be ACYDEN) and **MED-0050** (must be MUPIROCIN … BACTROMED). If either differs, stop: the stock file numbers must be fixed first.
3. Inventory → Receive Stock → **Upload Batch File** → `2-base-stock.xlsx` → **Confirm Import** (50 lines).
4. Open the **Dashboard** once. This applies the expiry rules.
5. Check: Inventory → Near Expiry shows **ACYDEN** (Wholesale Only); Low Stock shows **TRIFOCID** (5 units).

**B. Prepare the laptop (about 20 minutes)**

1. Copy the **50 product photos** (one per live product) from Drive → AMSON TEST KIT → 3 - Product images into a desktop folder **DEMO-LIVE-PHOTOS**. Leave out photos of products that aren't in `3-live-products-50.xlsx` (e.g. `lemzinc.webp`).
2. In that folder, rename **only** `Ibufen.png` → **`IMG_2041.png`**. Leave `SYMDEX.jpg` and `Acetyphil.webp` as they are. These three are the "wrong names" for Act 7; everything else matches by itself.
3. Put on the desktop: `3-live-products-50.xlsx`, `4-live-stock.xlsx`, `payment-proof-TEST1001.png`, `payment-proof-TEST1002.png`, `prescription-SAMPLE.png`, `TOO-BIG-over-10MB.png`.
4. In Notepad: the Lalamove link `https://share.lalamove.com/demo123`, and the **new customer's details** for Act 1 (name, an email inbox you can open on your phone, phone number, password).
5. Log in once on this laptop with the Branch Manager, Technical Staff and Sales Staff accounts (Chrome), and with the backup customer (Edge). Each needs the emailed device code the first time only.
   **Backup customer:** ______________________ (an already verified customer account with a saved address; fill in the email, keep the password off this document).

**C. Rules until the demo**

1. **Don't import `3-live-products-50.xlsx` or `4-live-stock.xlsx`.** They are for the demo itself. If someone does, delete those products; the stock file will then need new numbers.
2. **Don't register the Act 1 email.** It must be new on the day.
3. Nobody deploys or runs Clear Test Data.

**D. Demo morning (5 minutes)**

1. Products: **MED-0050** exists, **MED-0051** doesn't. Dashboard shows 0 orders and 0 sales.
2. Chrome on the staff login page (staff log in during Act 4). Edge on the shop home page, **logged out**.
3. Phone hotspot ready. A recording of a full practice run saved offline.

## The script

One customer (Edge) and one staff login (Chrome, **Branch Manager** for every staff step, so nobody logs out mid-demo). Each act says which browser.

### Act 1. Customer: browse and sign up (Edge, 5 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 1 | Shop home page, logged out. Scroll the banner and "Shop by Need". Open a product. | "Guests can browse and chat without an account." | Fig 2.3 p.68 |
| 2 | Register with a `@mailinator.com` email → refused. | "Throwaway emails are blocked before anything is sent." | REQ001 p.46 |
| 3 | Real details from Notepad → tick "I agree" → read the Terms to the bottom → Accept → reCAPTCHA → Register. | "Customers read the Terms, including the no-refund policy, before agreeing." | REQ003, REQ006 pp.46–47 |
| 4 | Open the email on your phone → type the 6-digit code → log in. | "The account only works after the email is confirmed. New devices need a code too." | REQ002, REQ004–005 pp.46–47 |

**Code slow (over 1 min):** "email can be slow on the free plan" → log in with the backup customer.

### Act 2. Customer: chat with the assistant, then staff (Edge, 4 min)

| Step | Type in the chat | What appears | Say | Proves |
| --- | --- | --- | --- | --- |
| 5 | `What are your store hours?` | Built-in answer with hours and hotline. | "Common questions are answered instantly." | REQ035–036 p.50 |
| 6 | `cough meds?` | Cough products we carry, as cards. | "It lists what we carry. It never picks a medicine or a dose." | p.35; REQNF012 p.63 |
| 7 | `ano ang gamot sa sakit ng tiyan?` | Stomach products, in Filipino. | "Filipino or English, whichever the customer uses." | REQ036 p.50 |
| 8 | `how many paracetamol can I give my 3 year old?` | "Please ask our pharmacist or a doctor." | "Doses, children and pregnancy always go to the pharmacist." | p.35; REQNF012 p.63 |
| 9 | `talk to staff` → `Hi, is COUXIN available?` | "A staff member will reply." | "Anything the assistant can't settle goes to a person." | REQ037–038 pp.50–51 |

### Act 3. Customer: order (non-Rx, delivery) (Edge, 4 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 10 | Add **AMBROXOL 30 MG TABLET COUXIN 30** (₱60) and **LOPERAMIDE 2MG HARVIMIDE** (₱100). | "Prices and stock come from the same database as the counter." | REQ009–013 pp.47–48 |
| 11 | Cart → Checkout → address → delivery date and time slot → Proceed. | "Same Day Delivery has a 4 PM cut-off. The fee goes to the Lalamove rider." | REQ014–020 p.48 |
| 12 | Upload `TOO-BIG-over-10MB.png` (refused) → `payment-proof-TEST1001.png`, ref **TEST1001** → Confirm. | "QR Ph straight to the branch, as the owner required. Staff check it first." | REQ028–030 pp.49–50 |
| 13 | My Orders: **Pending Verification**. | "The customer sees every status." | REQ031 p.50 |

### Act 4. Staff: chat, verify, dispatch (Chrome, Branch Manager, 4 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 14 | Log in → Dashboard and bell already show the order and the chat (Live Chat has a red badge). | "Everything the customer did is already here, live." | REQ047–048 p.52; REQNF005 p.63 |
| 15 | Live Chat → open the chat → reply `Yes, it's available. We're checking your order now.` → Resolve. | "Staff see the whole conversation, including the assistant's answers." | REQ108–110 p.60 |
| 16 | Online Orders → Payment Verification → open the order → check screenshot and ref → **Approve Payment**. | "Approval deducts stock, earliest expiry first, and gives the SI number." | REQ076, REQ101–104 pp.55–59 |
| 17 | Lalamove link `https://share.lalamove.com/demo123`, fee 80 → **Mark Dispatched**. | "The customer gets the tracking link and the fee." | REQ104 p.59 |

### Act 5. Customer checks, staff delivers, customer receives (4 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 18 | **Edge:** order details → Dispatched, Track with Lalamove + delivery fee → Download Receipt. | "Status, tracking and the receipt with the SI number." | REQ031–034 p.50; REQ093 p.58 |
| 19 | **Chrome:** Online Orders → the order → **Mark as Delivered**. | "Staff mark it delivered once the rider drops it off; the customer sees it at once." | REQ105 p.59 |
| 20 | **Edge:** order → **Mark as Received**. | "Only the customer can confirm they got it. If they forget, it closes by itself later." | REQ034 p.50; REQ106 p.60 |

### Act 6. Customer: prescription order (pick-up) (Edge → Chrome, 4 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 21 | **Edge:** search `eroxime` → **CEFUROXIME 500MG EROXIME-500** (red **Rx** tag) → Checkout: the address section disappears, "In-Store Pick-up Only". | "Prescription items can't be delivered, only picked up." | REQ021–023 pp.48–49; REQ080 p.56; panel revision #7 |
| 22 | Upload `prescription-SAMPLE.png` → pay with `payment-proof-TEST1002.png`, ref **TEST1002** → Confirm. | "The pharmacist checks the prescription before anything is prepared." | REQ022, REQ024 p.49 |
| 23 | **Chrome:** Online Orders → the order → view the prescription → **Approve Prescription & Payment** → status **Ready for Pick-up**. | "Stock is deducted now, so it's set aside for this customer. The customer is notified." | REQ025, REQ027 p.49 |
| 24 | Customer "arrives" with the original prescription and ID → **Mark as Picked Up**. | "They must bring the original prescription; staff hand it over and close it." | REQ026 p.49 |

**If asked "what if they never pick it up?"** See the answer under "If something goes wrong".

### Act 7. Staff: a delivery of 50 new products (Chrome, 6 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 25 | Products → **Upload Batch File** → `3-live-products-50.xlsx` → review table (name, price, Rx) → **Import 50 Products**. | "Our supplier's delivery came with this price list. Staff add the whole delivery from Excel; duplicates and bad rows are caught before saving." | REQ064, REQ068 p.54 |
| 26 | **Upload Photos** → select all in DEMO-LIVE-PHOTOS → **Next: Check Matches**. Filter to the red rows: `SYMDEX.jpg` (two SYMDEX products), `Acetyphil.webp` (typo), `IMG_2041.png` (camera name) → "No matches found". Pick the right product in each → **Save**. | "Photos match by file name. If the name is wrong or could be two products, it doesn't guess; staff pick." | REQ068 p.54 |
| 27 | Inventory → Receive Stock → **Upload Batch File** → `4-live-stock.xlsx` → point at supplier and DR no. → **Confirm Import**. | "Each batch is recorded with its supplier, delivery receipt and expiry. FEFO and expiry alerts run on this." | REQ062–064 p.54 |

### Act 8. Counter sale, FEFO, void (Chrome, 4 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 28 | POS → **ACETYLPHIL** ×5 → Cash → Complete. | "The counter sells from the same stock." | REQ082 p.56 |
| 29 | Inventory → search ACETYLPHIL → two batches: **2510011 (exp 10/2028)** 20 → **15**; **251157 (exp 11/2028)** still 30. | "FEFO: the batch that expires first is sold first." | REQ065 p.54 |
| 30 | POS → Today's Sales → that sale → **Void** → reason. | "Voids need the manager and a reason." | REQ083 p.56; Interview 4 p.191 |
| 31 | Inventory → ACETYLPHIL → batch 2510011 back to **20**. | "The stock goes back to the batch it came from." | REQ083 p.56 |

### Act 9. Dashboard and wholesale (Chrome, 4 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 32 | Dashboard: sales, orders, low stock, near expiry. | "One look at the branch today." | REQ047–048 p.52 |
| 33 | "A pharmacy calls for a wholesale order." Wholesale Accounts → **Add** → name, contact, LTO and permit valid-until dates → Save. | "Wholesale buyers need a valid LTO and business permit; the system warns 30 days before they expire." | REQ085–086 p.57 |
| 34 | **Process Order** → pick **ACYDEN** (shows its stock) and another product → quantities → Record. | "Wholesale can take near-expiry stock that retail can't sell. Each product shows how much is in stock." | REQ066 p.54; REQ087–088 p.57 |
| 35 | "Waiting for release" → **Mark released**. | "Stock is deducted at once; release is when it leaves the store. Every order stays in the buyer's history." | REQ089 p.57 |

### Act 10. Quick tour and finish (Chrome, 3 min)

| Step | Do | Say | Proves |
| --- | --- | --- | --- |
| 36 | **Staff Management**: the four roles. | "Sales Staff only see POS, Products and Settings. Typing another page's address doesn't help; the page and the database both refuse." | REQ121 p.61 |
| 37 | **Notifications**. | "Low stock, expiry, orders and chats in one place." | REQ048 p.52 |
| 38 | **Reports** → Daily Sales (today) → PDF. | "Online and counter sales with batch and expiry, in the main office's format." | REQ111–115 pp.60–61 |
| 39 | **Audit Log** → search "Void". | "Every change: before, after, who, when and why. Nobody can edit it." | REQ122–124 pp.61–62 |

**Only if the panel asks (2 minutes each):**

- **Price change:** Products → LAGUNDI → change retail price → reason → Audit Log (REQ071–073 p.55).
- **Purchase order batch upload:** Inventory → Purchase Orders → Create → **Upload** `5-purchase-order.xlsx` (COUXIN 20, HARVIMIDE 20, ACYDEN 10; Supplier Sample) → Save. Then receive it with one item short → discrepancy report. Note: the PO file has its own columns (`sku, expectedQty, supplierName, expectedDeliveryDate`); it is **not** the stock file. The stock file needs batch and expiry because it records what actually arrived (REQ053–058 p.53).
- **Chat after the delivery:** ask `cough meds?` again; the new cough products now appear.

## If something goes wrong

| Problem | Do | Say |
| --- | --- | --- |
| Sign-up code is slow | Log in with the backup customer | "Email can be slow on the free plan." |
| Import shows rows "already in the catalog" | Remove duplicates, carry on | "Duplicates are caught before saving." |
| A photo isn't matched or is matched wrong | Pick the right product in that row's dropdown | "That's why staff confirm each match." |
| Stock import says "unknown SKU" | Type the right SKU (from the Products page) into the red row | "Staff can fix a row before saving." |
| Product shows Out of Stock | Pick another product (19 delivery items have no batch in the price list) | "It hasn't been received yet." |
| "Check before approving" | Approve anyway | "A safety check: a price changed after the order." |
| AI chat doesn't answer | Use the quick-question buttons → Talk to staff | "Common questions don't need the AI." |
| `cough meds?` shows no products | Carry on to `how many paracetamol…` | "It only lists products we have in stock online; otherwise it sends the customer to the pharmacist." |
| Staff reply doesn't appear in Edge | Wait 3 seconds; close and reopen the chat | "Messages are delivered live." |
| No internet | Phone hotspot. Still down: play the recording | "It's a cloud system; offline support is in our recommendations (p.120)." |
| Panel asks "what if a prescription order is never picked up?" | — | "It stays Ready for Pick-up in Online Orders, already paid and with the stock set aside, so the medicine isn't sold to someone else. The customer is notified when it's ready and can ask in the chat. There's no automatic cancel: paid orders aren't refunded under the branch policy, so staff follow up by the phone number on the account. An automatic reminder and a holding limit would be our next improvement." |
| Wrong person logged in | You used two tabs of one browser: switch browser | — |

## Emails the site refuses

**Format:** must look like `name@domain.com`. **Already registered:** "An account with this email already exists."

**39 throwaway domains** are refused with "Please use a permanent email address, not a temporary/disposable one." (`js/validators.js`, also checked on Change Email):

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

**If asked about other throwaway services:** "We block the common ones. Others get through, but every account still has to enter the 6-digit code sent to that inbox. A full blocklist service would cover the rest."

---

# Part 3. Gaps and prepared answers

## 3.1 Last defense's panel revisions

| # | Panel asked | In the paper | Status | If asked |
| --- | --- | --- | --- | --- |
| 1 | Improve introduction | Background and problem, pp.1–4 | Done | "We rewrote it around the branch's actual problems from the interviews." |
| 2 | Revise objectives | 4 specific objectives, pp.5–6 | **Partly.** Objective 4 still says "security, reliability, and compliance" (p.6); the evaluation used five other characteristics (p.102) | G1 below |
| 3 | Revise theoretical framework | TAM + ISO/IEC 25010, pp.21–24 | **Partly.** The framework's characteristics don't line up with the results (p.118) | G1 below |
| 4 | Revise conceptual framework discussion and methodology | IPO pp.24–27; Agile pp.28–35 | Done | "Inputs are users, products, stock and orders; the processes are FEFO, verification and roles; the outputs are reports, alerts and records." |
| 5 | Revise diagrams' discussions | A paragraph under every figure, pp.67–90 | **Partly.** The paragraphs match the system, but some drawings don't (Figs 2.2, 2.10, 2.11, 2.12, 2.14, 2.15) | G2 below |
| 6 | Improve chat support | p.35; REQ035–038 p.50; REQ108–110 p.60 | Done in the system, but customers still rated it lowest (p.115, p.120) | "It's much stronger than at proposal: instant answers, live order cards, staff hand-off. It's still first in our recommendations." |
| 7 | Prescription pre-order for pick-up | Scope p.6; REQ021–027 pp.48–49 | Done in text and system; Fig 2.10 (p.79) has no upload step | "The requirement and the system have it; the drawing missed the upload box." |
| 8 | Thematic RRL | Grouped by four themes, pp.9–17; synthesis pp.20–21 | Done | "Both the literature and the studies are grouped under the same four themes, then synthesized on p.20." |

## 3.2 The serious gaps (most likely first)

| # | Gap | Prepared answer |
| --- | --- | --- |
| G1 | Objective 4 and the framework (p.6, pp.21–24) don't match the evaluation (p.102, p.118) | "The framework was set at proposal. We evaluated five ISO characteristics, including security and reliability; compliance was one survey question (p.106). Usefulness shows in Functional Suitability and ease of use in Usability; 48 of 50 would use it again. We should have updated the objective's wording." |
| G2 | Activity diagrams don't match the real flow: Figs 2.10 and 2.11 most visibly | "The drawings are from design. The discussion under each figure and the requirements were updated, and the system follows those." Then show the flow live. |
| G3 | "Real-time" and "automatically" (title; REQ066–067, REQ100, REQ106) | "Selling is checked live every time. Labels, holds and auto-delivery are applied when a page opens, because the free plan can't run timed jobs." |
| G4 | Fig 2.2 (p.67) gives live chat to Sales Staff | "Drawn on the wrong actor. The client said the encoder handles messages (Interview 1 p.158) and Sales are POS only (Interview 2 p.161). REQ121 and Fig 2.7 are correct, and the system enforces them." |
| G5 | The branch still uses its old POS, but pp.100 and 102 suggest replacement | "The client chose a transition period (pp.208–209); integration is our first recommendation." |
| G6 | Chat was a panel revision yet scored lowest | See 3.1 #6. |
| G7 | Email verification, reCAPTCHA and order prices are checked in the browser | "They stop normal users. The database rules still protect other people's data, stock and prices. A server check needs the paid plan." |
| G8 | p.46 says Technical Staff can void | "We made it stricter on the client's request: a Branch Manager login is required (Interview 4 p.191)." |
| G9 | No exchange for online orders, though the client said swapping is the only option (p.184) | "Online buyers exchange at the counter like walk-in customers; adding it online is a small next step." |
| G10 | No senior/PWD discount | "The client said the branch gives none because prices are already wholesale level (Interview 2 p.174)." Report the decision; don't argue it. |
| G11 | Free-plan limits: ~50,000 reads a day, ~200 emails a month (p.98) | "Enough for one branch; more traffic would need the paid plan." |
| G12 | App Check protects the AI only, not the database | "It protects our AI quota. The database rules check every request regardless." |

## 3.3 Outdated statements in the paper

| Statement | Page | Answer |
| --- | --- | --- |
| Budget lists a paid Firebase plan and a domain; total ₱31,790.08 | p.98 | "Planned costs at proposal. We stayed on the free plan and free address. The rows actually add to ₱31,590.08." |
| "Robust encryption mechanisms" | p.24 | "Firebase hashes passwords and everything travels over HTTPS; we wrote no encryption of our own." |
| "Instantaneous push notifications" | p.23 | "In-app bell, optional browser alerts and email, not phone push." |
| Weekly reports | p.44; REQ111 p.60 | "The Daily Sales Report takes any date range, including a week." |
| Technical Staff "void authorization" | p.46 | G8 above. |
| Date of completion June 2027 (title page says November 2026) | p.v | Ask the adviser. |
| New products and prices "should appear more quickly" (recommendation) | p.120 | "Already done: the shop now reads the catalog live." |

## 3.4 Known limitations (say them before the panel finds them)

| Limitation | One-line answer |
| --- | --- |
| Two staff editing the same product: the last save wins | "Rare with three staff; a version check is the fix." |
| Order prices come from the browser | "Staff get a warning when prices don't match the catalog, and they check the amount received." |
| The same screenshot or reference can be reused | "Staff get a warning, and they check the real account." |
| Photo uploads are checked for type and size in the browser only | "The upload settings can restrict them; order photo links must point to our own Cloudinary." |
| Whoever can deploy could swap the QR image | "Few people can deploy, with 2-step verification, and staff confirm the money reached Amson's account." |
| Stock-count finalizing and category adding are checked by the page, not the rules | "An insider risk with three staff; every action is logged." |
| The audit-log user name is written by the browser | "Entries can't be edited or deleted; storing the account ID is the fix." |
| Deleting a profile doesn't delete the login | "The manager removes it in Firebase Authentication." |
| Group-test failures (SHOP-06, PAY-04, PAY-18, PROD-13, LOG-30, DEV-02) | "Found by our group test on the live site and fixed the same week." |

---

# Part 4. Security Q&A

Answer in two or three sentences, name the source, stop. If something is a known limit, say so and give the fix.

## A. Roles and database rules

**S1. How are roles enforced?** Two layers. Each admin page checks the role and redirects (`js/admin-roles.js`). The Firestore rules on Google's servers check every read and write (`firestore.rules`). The rules are what really protect the data. (REQ119–121 p.61; REQNF011 p.63)

**S2. Can a customer make themselves a manager?** No. A new account can only be created as a customer with zero credit, and nobody can change their own role or status, or raise their own store credit (`firestore.rules`, users).

**S3. What if Sales Staff open the dashboard URL?** The page sends them back to the POS, and the rules refuse the data even if they got past the page. Shown in the demo, step 15.

**S4. Who can change prices?** Only the Branch Manager: the rules keep price fields unchanged for everyone else. Every change needs a reason and is logged. (REQ071–073 p.55)

**S5. Are there checks only the page enforces?** Yes, a few: finalizing the stock count, adding a category, blocking wholesale orders with expired documents. A staff member with technical skills could bypass them, but every action is still logged. The fix is tighter rules per role.

**S6. Can the audit log be faked or erased?** Entries can be added but never edited or deleted. Limitation: the user name is written by the browser, so a technical user could add an entry under another name; they still can't change existing ones. (REQ124 p.62)

## B. Payments and the QR

**S7. How do you know a payment screenshot isn't fake?** The system doesn't claim to. Staff check the branch's actual GCash or bank account before approving, and the system warns when a reference number was already used. (Interview 3 p.178)

**S8. Could someone replace the QR code with their own?** Only someone who can deploy the site. That's limited to the team, with 2-step verification, and staff confirm the money reached Amson's own account before approving.

**S9. Can a customer change the price in their order?** Prices are sent by the browser, so a technical user could alter them. Staff see a "check before approving" warning when prices don't match the catalog, and they check the amount received.

**S10. Can a customer give themselves store credit?** No. The rules only let credit go down, and only together with an order that uses it.

**S11. Why not a payment gateway, which would be more secure?** The owner forbids third parties in payment (Interview 3 p.179); PayMongo was proposed and declined (p.141). Manual verification is the client's control.

## C. Passwords, login, codes

**S12. How are passwords stored?** By Firebase Authentication, hashed. We never store or see them. (REQNF009 p.63)

**S13. Password rules?** At least 6 characters, with a letter, a number and a symbol. Same for staff accounts.

**S14. Brute force?** 5 wrong passwords lock the email for 2 minutes, enforced in the rules too, plus reCAPTCHA. (REQ004, REQ045 pp.47–51)

**S15. How does the email code work, and can it be skipped?** A 6-digit code, valid 10 minutes, sent by EmailJS. The check runs in the browser, so a technical user could mark their own account verified, but they still can't touch anyone else's data. The fix is Firebase's built-in email link or a server check (paid plan).

**S16. Can someone register with a throwaway email?** Not with the 39 common throwaway domains (list in Part 2). Other services aren't blocked, but every account still needs the code sent to that inbox.

**S17. New-device code?** On. A browser not on the account's trusted list must enter an emailed code; 5 wrong codes cancel the login. "Forget all other devices" sends every other browser back to verify. (REQ005, REQ044)

**S18. How random are the codes?** Six digits from `Math.random`. Fine against guessing with the 5-try limit; `crypto.getRandomValues` would be stronger. Say it if asked.

**S19. reCAPTCHA?** On login and registration, checked in the browser only, so bots that skip the page skip it. Firebase's own throttling still applies. (REQ003 p.46)

**S20. Deactivated accounts?** Staff and customers are signed out on their next page load and can't log in again. The customer rules don't check status yet; that's a known gap.

## D. App Check, keys, transport

**S21. Do you use App Check?** Yes, for the AI chat only: Gemini requests must carry a token proving they came from our site. It isn't on for the database; the rules protect the database instead.

**S22. Your Firebase key is visible.** Firebase web keys are public by design; they identify the project. The data is protected by the rules. Restricting the key to our domains is a setting still to do.

**S23. Is data encrypted in transit?** Yes: HTTPS on Firebase Hosting, plus security headers (X-Frame-Options DENY, nosniff, Referrer-Policy). (REQNF010 p.63)

## E. Uploads and privacy

**S24. What stops someone uploading a virus or a huge file?** Images only, up to 10 MB, checked in the browser; Cloudinary stores them. Order photo links must point to our own Cloudinary account (checked by the rules). Limitation: the Cloudinary upload settings should also restrict size and type.

**S25. Who can see prescription photos?** The customer who uploaded it and the staff, through the order. Other customers can't read the order (group test SEC-01).

**S26. Does the AI see personal data?** No. It receives the question, the last 8 chat messages and a short product list; never prescriptions, addresses or order details. (REQNF012 p.63)

**S27. Can the AI give medical advice?** It's instructed not to, and any reply that looks like a dose is blocked before it's shown. For symptoms it lists products we carry and points to the pharmacist. (p.35; group tests CHAT-03, CHAT-04)

**S28. Data Privacy Act?** REQNF025 (p.65) requires it. The Terms and Privacy page states processing under RA 10173; customers accept it at sign-up; the rules limit each customer to their own data; cost prices are kept in staff-only records. [UNSURE] The paper doesn't describe a privacy impact assessment or DPO registration.

**S29. Cross-site scripting?** Text typed by users is escaped before it's shown. In the group test, typing `<b>` and `<script>` displayed them as plain text (SHOP-03, CHAT-12).
