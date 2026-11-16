# DEFENSE GUIDE v2: Amson Sales and Inventory System

> v2 keeps the original guide and fixes what changed. New sections are in the other files of this folder (see `../17-setup-and-services.md`).

Read this once from top to bottom. On the day, reread only the cheat sheet.

---

## Cheat sheet (reread 10 minutes before)

| # | Know this cold | Where it's written |
| --- | --- | --- |
| 1 | **Title:** A Web-Based Sales and Inventory Management System with Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals. **Client:** the Las Piñas branch, managed by Mr. Arman Tuboran. Company established **September 2023**. | p.i, p.iv, p.1 |
| 2 | **Problem:** handwritten invoices re-typed into Excel; orders through Messenger, Viber and WhatsApp; **no record of who voided a sale or changed a price**; expired stock caught only when staff notice it. | pp.1–2 |
| 3 | **General objective:** improve **operational efficiency, customer reach, and inventory accuracy**. | p.5 |
| 4 | **Four specific objectives:** (1) customer **online store** with AI chat and prescription pre-order; (2) **sales and inventory** module with FEFO and expiry alerts; (3) **admin portal** with roles and exportable reports; (4) **evaluate** it with TAM and ISO/IEC 25010. | pp.5–6 |
| 5 | **Five kinds of users:** Guest, Registered Customer, Sales Staff, Technical Staff, Branch Manager. | p.67 |
| 6 | **Sales Staff** = counter sales and viewing the catalog only. **Technical Staff** = daily operations, but **no prices and no staff accounts**. **Branch Manager** = everything. | p.46; `js/admin-roles.js:12-30` |
| 7 | **FEFO** (First Expired, First Out): every sale takes from the **batch that expires soonest**. | REQ065 p.54; `js/products-data.js:1806` |
| 8 | **6 months** before expiry: the batch leaves retail and is **wholesale-only**. **2 months** before: it becomes a **Bad Order** and is written off. This is the branch's own practice. | REQ066–067 p.54; Interview 1 p.148; `js/products-data.js:247`, `:694` |
| 9 | **Login:** **5** wrong passwords lock the account for **2 minutes**. New accounts verify by email code. A **new device** also needs an emailed code. | REQ004–005 p.47; `js/auth.js:56-57`; `js/device-trust.js:4` |
| 10 | **Payment:** **QR Ph only**. The customer uploads a screenshot and **staff verify it by hand**. No payment gateway, because the owner refuses third parties. | p.8; Interview 3 pp.177–179 |
| 11 | **No refunds, no cancelling a paid order.** A problem order is **On Hold up to 7 days**, then closes; verified money becomes **store credit**. | p.8; REQ100 p.59; Interview 3 pp.182–184 |
| 12 | **Prescription medicines:** pre-order online, upload the prescription photo, **pick up in person** with the original prescription. Never delivered. | p.7; REQ021–026 pp.48–49 |
| 13 | **Delivery:** Lalamove, booked by staff by hand; the customer pays the rider. An order is marked Delivered automatically **3 days** after dispatch. | REQ020 p.48; REQ106 p.60; `js/orders.js:93` |
| 14 | **Wholesale buyers never log in.** Staff record their orders, at a separate wholesale price, with their License to Operate and Business Permit on file. | p.44; Interview 2 pp.162–163 |
| 15 | **Built with:** HTML, CSS, JavaScript, Bootstrap; Firebase (login, database, hosting); Cloudinary (images); EmailJS (emails); Chart.js, jsPDF, SheetJS; Gemini (chat). | pp.35–38 |
| 16 | **Method:** Agile, **6 phases** of **2–3 weeks**, 2–4 features per sprint, client feedback each sprint. **Four client interviews** plus one walkthrough before deployment. | pp.28–35; pp.142, 160, 176, 186, 204 |
| 17 | **Evaluation:** **53 respondents** = Branch Manager, Technical Staff, Sales Staff (1 each) + **50 customers**. 5-point scale. Every average is **4.00 or higher**. Customers' highest: **Reliability 4.82**. Surveyed October 27–28, 2026. | pp.101–103; p.118 |
| 18 | **Requirements:** **124 functional** (REQ001–124) and **29 non-functional** (REQNF001–029). | pp.46–66 |
| 19 | **Deployed** to the branch on **October 22, 2026**, at amsonpharma.web.app. | p.102 |
| 20 | **Security in one line:** the pages hide buttons, but the **database rules** on Google's servers decide who may read or write. | `firestore.rules`; Q25 |

**If you blank, say one of these:**
1. "It puts online orders, the counter, stock and reports in **one database**, so staff stop re-typing."
2. "Every sale takes the **earliest-expiring batch first**, and stock near expiry is **kept out of retail**."
3. "**Who can do what is enforced by the database**, not just by hiding buttons."

**The five weak spots the panel is most likely to find** (answers are in section 5):
objective 4 wording vs the results (Q41) · no separate TAM scores (Q42) · "real-time" (Q21) · the client still uses its old POS (Q52) · diagrams drawn before the final design (Q55).

---

## Contents

| # | Section | Priority | Reading time |
| --- | --- | --- | --- |
| — | Cheat sheet (above) | **Must know** | 5 min |
| 1 | Words to know | **Must know** | 6 min |
| 2 | The system at a glance | **Must know** | 5 min |
| 3 | Demo script | **Must know** | 12 min |
| 4 | If the demo breaks | **Must know** | 4 min |
| 5 | Questions and answers (Q1–Q62) | **Must know** A–E · Should know F–I | 40 min |
| 6 | What the system can and can't do | Should know | 6 min |
| 7 | Where the paper and the system differ | Should know | 12 min |
| 8 | Live debugging | **Must know** 8.1–8.4 · Should know 8.5–8.7 | 20 min |
| 9 | Study plan, quiz, checklists | Nice to know | 8 min |
| 10 | Things to settle with the team before the defense | **Must do** | 3 min |

**How to read the references**

| You see | It means |
| --- | --- |
| **p.102** | Printed page number at the bottom of the manuscript (PRINTED MANUSCRIPT DEFENSE NOV 12). The whole manuscript was read, pages i–x and 1–226. |
| **Interview 1–4** | Appendix J (pp.142–160), K (pp.160–176), L (pp.176–186), M (pp.186–194). **Demo transcript** = Appendix P (pp.204–218), the walkthrough with the client before deployment. They are in Taglish; this guide paraphrases them. |
| `js/auth.js:56` | File and line number in the code, on branch `amson` (the live version). Every line number here was rechecked on November 16, after the group-test fixes moved some code. |
| `study/07` | The longer code guide already in the repo's `study/` folder. This guide points to it and does not repeat it. |
| **Ask** | Not in the manuscript or the code. Section 10 says who to ask. |

---

## 1. Words to know  ·  Must know

One line each. Use these exact meanings when you answer.

| Word | Plain meaning in our system |
| --- | --- |
| **Batch** | One delivery of a product with its own batch number and expiry date. Stock is tracked per batch. |
| **FEFO** | First Expired, First Out: sell the batch that expires soonest. |
| **Near-expiry / wholesale-only** | A batch within 6 months of expiry. Not sold at retail; only wholesale buyers can get it. |
| **Bad Order (BO)** | A batch within 2 months of expiry. Its quantity is set to zero and recorded as a write-off. |
| **Write-off** | Removing stock that can't be sold (expired, damaged), with a reason. |
| **POS** | Point of sale: the counter screen for walk-in sales. |
| **SI number** | Sales Invoice number: the running 8-digit number every completed sale gets, e.g. `00000123`. |
| **Void** | Cancelling a completed walk-in sale. The stock goes back to its batch. |
| **Rx / OTC** | Rx = needs a doctor's prescription. OTC = over the counter, no prescription. |
| **QR Ph** | The national QR code standard for paying from any bank or e-wallet. |
| **On Hold** | An online order waiting for the customer to fix a payment or prescription problem. |
| **Store credit** | Money the branch keeps for a customer (overpayment or a closed order) and takes off their next order. |
| **Purchase order (PO)** | What the branch tells a supplier it expects to receive. **Discrepancy** = what arrived differs from the PO. |
| **Stock count** | The month-end physical count. Staff type what they counted; the system shows the difference. |
| **LTO** | License to Operate, the FDA licence a wholesale buyer must show. |
| **RBAC** | Role-based access control: what you can do depends on your role. |
| **Firebase** | Google's cloud service we use instead of our own server. |
| **Firestore** | Firebase's database. Data is kept as **documents** (records) grouped in **collections** (like tables). |
| **Security rules** | Conditions stored on Google's servers that decide who may read or write each record. File: `firestore.rules`. |
| **Transaction** | A group of database changes that all succeed or all fail together. |
| **Audit log** | A history of sensitive actions (who, what, when, why). Entries can be added but never changed. |
| **OTP** | One-time password: the 6-digit code sent by email. |
| **TAM** | Technology Acceptance Model: people accept a system if they find it useful and easy to use. |
| **ISO/IEC 25010** | An international list of software quality characteristics (e.g. usability, reliability, security). |
| **Likert scale** | A rating scale; ours is 5 Excellent to 1 Unacceptable. |
| **Agile / sprint** | Building in short cycles (sprints) and showing the client each time. |
| **Spark plan** | Firebase's free plan. It cannot run our own server code. |
| **Console** | Two meanings: the **browser console** (press F12) shows errors; the **Firebase console** is Google's website for our database. |

---

## 2. The system at a glance  ·  Must know

**What it is:** one website with two sides. The **shop** (`shop/` folder) is for customers. The **admin portal** (`admin/` folder) is for staff. Both use the same database, so there is one stock count (p.41).

**Who can do what**

| User | Can do | How it's enforced |
| --- | --- | --- |
| **Guest** | Browse products, use the chat (p.67) | Products are public to read |
| **Registered Customer** | Cart, checkout, pay, pre-order Rx, track orders, download receipt (p.68) | Rules: only their **own** orders and profile |
| **Sales Staff** | Counter sales, view the catalog (REQ121 p.61) | `js/admin-roles.js:15-16`, plus the rules |
| **Technical Staff** | Stock, online orders, prescriptions, wholesale, customers, reports, chat, audit log. **Not** prices, **not** staff accounts (REQ120 p.61) | `js/admin-roles.js:14-27`; rules block price changes (`firestore.rules:78`) |
| **Branch Manager** | Everything, plus prices, staff accounts, finalizing the stock count (p.46) | Rules: `isManager()` (`firestore.rules:26`) |

**The modules** (pp.38–46)

| Side | Modules |
| --- | --- |
| Customer | Register and login · Home · Browse · Product page · Cart · Checkout · Payment · Rx pre-order · My Orders · Chat · Notifications · Account settings |
| Staff | Dashboard · POS · Online Orders (payment check, delivery) · Inventory (receive stock, purchase orders, write-offs, stock count) · Products and prices · Suppliers · Wholesale · Customers · Staff · Reports · Live chat · Notifications · Audit log · Settings |

**How data moves (say this while pointing at the screen)**

```
Supplier delivers ──► Receive Stock (batch no. + expiry) ──► STOCK BATCHES
                                                                 │
Customer orders online ► pays QR Ph ► uploads screenshot         │
            ► staff approve the payment ─────────────────────────┤
Walk-in customer ► POS sale ─────────────────────────────────────┼─► take earliest-expiring batch (FEFO)
Wholesale order typed in by staff ───────────────────────────────┘        ► SI number ► receipt

Every sensitive action ► AUDIT LOG          All sales ► REPORTS (PDF / Excel) ► main office
Expiry check: 6 months ► wholesale-only     2 months ► Bad Order (written off)
```

**The database:** 24 collections. The ones worth naming: `users`, `products`, `stockBatches`, `orders`, `posSales`, `wholesaleOrders`, `purchaseOrders`, `auditLog`. Full list with fields: `study/01-architecture.md` §4.

---

## 3. Demo script  ·  Must know

> **Replaced by `06-demo-script.md`** (full demo guide with the live batch and photo uploads and the current site state). Kept here for reference only.

About 20 minutes. One person drives, one person talks.

### 3.1 Before the day

| # | Do this | Why |
| --- | --- | --- |
| 1 | Use **two different browsers**: Chrome for staff, Edge (or an Incognito window) for the customer. | Two tabs of one browser share one login. |
| 2 | **Log in to every demo account on the defense laptop the day before.** | A new device asks for an emailed code (`js/device-trust.js:4`). Doing it early avoids waiting for email in front of the panel. |
| 3 | Have 4 accounts ready: Branch Manager, Technical Staff, Sales Staff, one verified customer. Write the emails and passwords on paper. | **Ask** the lead programmer for them (section 10). |
| 4 | **The live database had no products on Nov 16** (the `products` collection was empty; only 5 batches left). Reload the catalog first, then check that products have stock, one is **low on stock**, and one batch is **near expiry**. | Steps 14–15 need them. If missing, upload `B1 receive-stock-GOOD.xlsx` and `B4 receive-stock-EXPIRING-SOON.xlsx` (see row 5) through Inventory → Receive Stock → Upload Batch File. |
| 5 | Download the **AMSON TEST KIT** folder from the team Google Drive to the desktop. | Folder `2 - Test images` has `payment-proof-TEST1001.png`, `prescription-SAMPLE.png`, `wholesale-LTO-SAMPLE.png`. Folder `1 - Upload files` has `B1`, `B4` and `C1 purchase-order.xlsx`. |
| 6 | Keep a Lalamove link ready: `https://share.lalamove.com/?demo123` | The link must start with `share.lalamove.com` (`js/admin-online-orders.js:177` (`trackingLinkValidationError`)). |
| 7 | Record a 5-minute screen video of steps 6–15. | Your backup if the internet fails. |

**Never during the demo:** press Settings → **Clear Test Data** (it deletes orders and stock) · deploy · register a brand-new account (the email can be slow; the free email plan allows about 200 a month, p.98).

### 3.2 The script

| Step | Browser | Do (one action) | Say (one line) |
| --- | --- | --- | --- |
| 1 | Customer | Open the home page, not logged in. | "Guests can browse and chat without an account." (p.67) |
| 2 | Customer | Open the Register page. Point at the Terms checkbox. Don't submit. | "Customers accept the Terms and verify their email before the account works." (REQ002, REQ006 pp.46–47) |
| 3 | Customer | Log in with the customer account. | "Five wrong passwords lock the account for two minutes, and a new device needs an emailed code." (REQ004–005 p.47) |
| 4 | Customer | Products → pick a category, choose **In stock only**, search a name. | "Prices and stock come from the same inventory the counter uses." (REQ009–011 p.47) |
| 5 | Customer | Open one product that has a red **Rx** tag. | "Prescription items are marked everywhere and can only be picked up." (REQ023 p.49) |
| 6 | Customer | Open the chat. Type "how to pay?". Then tap **Talk to staff**. | "The assistant answers common questions, never gives medical advice, and hands over to staff." (p.35; REQ036–037 p.50) |
| 7 | Customer | Add 2 non-Rx products to the cart. Change one quantity. | "The cart is saved to the account and the total updates." (REQ014–016 p.48) |
| 8 | Customer | Proceed to Checkout. Fill the address and delivery schedule. | "The delivery fee is paid to the Lalamove rider, not through the site." (REQ020 p.48) |
| 9 | Customer | On Payment: upload `payment-proof-TEST1001.png`, type a reference number, Submit. | "Payment is QR Ph only. Nothing is confirmed until staff check it." (REQ028–030 pp.49–50) |
| 10 | Staff | Show the Dashboard. The new order is already there. | "It appeared without refreshing." (REQ047 p.52; REQNF005 p.63) |
| 11 | Staff | Online Orders → Payment Verification → open the order → **Approve Payment**. | "Approving deducts stock, earliest expiry first, and gives the sale its invoice number in one step." (REQ076 p.55; REQ101 p.59) |
| 12 | Staff | Book Delivery → paste the Lalamove link → mark **Dispatched**. | "Staff book Lalamove themselves because the branch won't prepay a courier wallet." (REQ104 p.59; Interview 4 p.193) |
| 13 | Customer | Open the order in My Orders. Show the status and tracking link. | "The customer sees every status change and the tracking link." (REQ034 p.50) |
| 14 | Staff | Inventory. Show the **Low Stock** and **Near-Expiry** tabs. Open one product's batches. | "Stock is kept per batch. Six months before expiry a batch leaves retail; at two months it is written off." (REQ066–067 p.54) |
| 15 | Staff | POS → add 2 products → Cash → type the amount → **Complete Sale**. Show the receipt and SI number. | "The counter and the online store share one stock count." (REQ082 p.56) |
| 16 | Staff | In POS, choose **G-Cash / QR Ph** and leave the reference number empty → try to complete. | "Non-cash sales need a reference number." (REQ082 p.56) |
| 17 | Staff | Today's Sales → View → **Void** → type a reason. | "A void needs a reason, the stock goes back to its batch, and it's logged." (REQ083 p.56) |
| 18 | Staff | Products → change one price → type a reason → save. | "Only the Branch Manager can change prices." (REQ071–073 p.55) |
| 19 | Staff | Audit Log. Find the price change and the void. | "It shows old and new value, who, when and why. Nobody can edit it." (REQ122–124 pp.61–62) |
| 20 | Staff | Reports → Daily Sales Report → today → export PDF, then Excel. | "Reports carry batch numbers and expiry dates, which the main office asked for." (REQ111–115 pp.60–61; Interview 1 p.151) |
| 21 | Staff | Log out. Log in as **Sales Staff**. Show that only POS and Products appear. | "Sales Staff are limited to the counter." (REQ121 p.61) |
| 22 | Staff | Type `/admin/dashboard.html` in the address bar. | "Typing the address doesn't help; the page and the database both refuse." |

**Only if asked or if time allows**

| Ask | Do | Say |
| --- | --- | --- |
| Prescription order | Customer: order an Rx item, upload `prescription-SAMPLE.png`. Staff: approve → **Ready for Pick-up**. | "Staff check the photo online; the original is shown at pick-up." (REQ077–080 pp.55–56) |
| Technical Staff void | Log in as Technical Staff → void a sale. It asks for the Branch Manager's email and password. | "The client wanted a second person to see every void." (Interview 4 p.191) |
| Purchase order | Inventory → Purchase Orders → create one (or upload `C1 purchase-order.xlsx`) → receive it one item short. | "The system compares what arrived with what was ordered and marks a Discrepancy." (REQ053–057 p.53) |
| Wholesale | Wholesale Accounts → open a buyer → Process Wholesale Order → download the invoice. | "Wholesale buyers don't log in; staff record their orders at wholesale prices." (REQ085–092 pp.57–58) |
| Payment problem | Place a second order → in Payment Verification choose **Underpayment** → On Hold. | "The customer has seven days to fix it." (REQ097, REQ100 pp.58–59) |
| Stock count | Inventory → Stock Count → open the month → type a counted quantity. | "The month-end count stays; the system shows the difference." (REQ059–061 p.53) |

---

## 4. If the demo breaks  ·  Must know

| What you see | Do | Say |
| --- | --- | --- |
| No internet | Turn on the phone hotspot. If that fails, play the recording. | "It's a cloud system and needs a connection. Offline support is in our recommendations." (p.120) |
| Products keep loading | Wait 10 seconds. Refresh once. Still empty: close all tabs and open one. Second address for the same system: `amson-web-app.web.app`. | "It's loading live data from the cloud database." |
| It asks for an emailed code | Check the inbox and spam. This happens only on a device that hasn't logged in before (see 3.1 row 2). | "A new device must confirm by email." |
| A registration code never arrives | Firebase console → Firestore → `users` → that account → field `emailVerificationCode` (`js/verify-email.js:147`). | "Email goes through a free service with a monthly limit." |
| Login says "Invalid domain for site key" | The reCAPTCHA key doesn't list this web address. It can't be fixed on the spot; use the other address above. Test both addresses on the defense laptop the day before. | — |
| A staff page shows only a spinner | Normal for a second (it's checking the role). If it stays, refresh. | — |
| A product says "Out of stock" | Pick another product. | "Its only stock is near expiry, so it isn't sold at retail." |
| Approve shows "Check before approving" | A price was changed after the order was placed. Approve anyway or place a new order. | "That's a safety check: the order's prices don't match the catalog." (`js/admin-online-orders.js:506`) |
| The wrong person is logged in | You used two tabs of one browser. Use two browsers. | — |
| Anything else | Skip to the next step. Come back in Q&A. | "Let me show that part from the recording." |

---

## 5. Questions and answers  ·  Must know (A–E), Should know (F–I)

Every answer is 2 to 4 sentences. Say it, then stop.

### A. Problem, objectives and scope

**Q1. What problem does your system solve?**
> "The branch wrote invoices by hand and re-typed every sale into Excel for the main office. Orders came through Messenger and Viber, and nobody could tell who voided a sale or changed a price. Expired stock was only caught when staff checked the shelves. Our system puts sales, stock and reports in one place, with roles and a history of every sensitive action."

Backing: pp.1–2; Interview 1 pp.143–151

**Q2. What are your objectives?**
> "The general objective is to improve the branch's operational efficiency, customer reach and inventory accuracy. The four specific ones are: a customer online store with chat and prescription pre-order; a sales and inventory module with FEFO and expiry alerts; an admin portal with roles and reports; and an evaluation using TAM and ISO 25010."

Backing: pp.5–6

**Q3. Did you meet them?**
> "Yes. All four parts were built and deployed to the branch on October 22, 2026. Fifty-three respondents rated every quality characteristic at an average of 4.00 or higher out of 5."

Backing: p.102; pp.118–120

**Q4. Why only one branch?**
> "Our client is the Las Piñas branch, and the manager told us in the first interview that the system is for this branch only. The other branch has its own manager and its own prices. Multi-branch support is in our recommendations."

Backing: p.7; Interview 1 pp.152, 156–157; p.120

**Q5. What makes it different from existing systems?**
> "We compared three: a sales and inventory system, a FEFO expiry system, and a pharmacy online store. Each covers one part. None combines expiry control, wholesale accounts, prescription pre-orders, chat support and checking deliveries against purchase orders, which is what this branch needs."

Backing: pp.18–19

**Q6. Who are the users, and why three staff roles?**
> "The branch has three people: the manager, a sales person at the counter, and a staff member who does the encoding and paperwork. Our three roles match them: Branch Manager, Sales Staff and Technical Staff. The client confirmed in the second interview that the sales person should only use the POS."

Backing: Interview 1 p.143; Interview 2 pp.161–162; p.46 (quotes: `03-client-voice.md`, Basis for the roles)

### B. How we built it

**Q7. Why Agile?**
> "The client's requirements changed as they saw the system. For example, after the walkthrough they asked for a printed receipt on every sale and for returns to be separate from voids. Agile let us build in short sprints and adjust after each client review."

Backing: p.28; Demo transcript pp.209–212, 216–217; p.103

**Q8. How many sprints, and what was built when?**
> "Six phases of two to three weeks each. Customer accounts and home page first, then browsing and cart, then admin login, dashboard and inventory, then checkout and payment, then products, POS and wholesale, and last payment verification, reports and the audit log."

Backing: pp.30–35

**Q9. How did you gather requirements?**
> "Four interviews with the branch manager and staff, on March 29, April 8, April 15 and May 12, 2026. The fourth one walked the client through our Figma designs. Before deployment we also demonstrated the finished system and took their change requests."

Backing: pp.142, 160, 176, 186, 204

**Q10. Why Firebase and not PHP with MySQL?**
> "With Firebase we have no server to maintain, the hosting is free with HTTPS, login is handled by Google, and screens update live without refreshing. The trade-off is that our logic runs in the browser, so we guard every read and write with database rules."

Backing: p.35; `firestore.rules`

**Q11. Where is your database design or ERD?**
> "Firestore is not a table-based database, so there is no ERD in the paper. Data is kept in 24 collections of documents, for example users, products, stock batches, orders and walk-in sales. Each sold item stores which batches it came from, which is how voids and returns put stock back in the right batch."

Backing: not in the manuscript (no ERD or data dictionary); `study/01-architecture.md` §4. **If they ask for a diagram, say it isn't in the paper and describe the collections.**

**Q12. How did you test it?**
> "We wrote test cases for every module, each linked to its requirement number. We tested each outside service, each page against each role, and the database rules. Testing on phones found pages stuck on loading, which we fixed before deployment."

Backing: pp.99–100; test plans in `study/reference/`

**Q13. What does each technology do?**
> "HTML, CSS, JavaScript and Bootstrap build the pages. Firebase handles login, the database and hosting. Cloudinary stores photos, EmailJS sends emails, Chart.js draws the dashboard charts, jsPDF and SheetJS make the PDF and Excel files, and Gemini answers chat questions."

Backing: pp.35–38

### C. FEFO and expiry monitoring

**Q14. What is FEFO, and why not FIFO?**
> "First Expired, First Out. We sell the batch that expires soonest, not the one that arrived first. A later delivery can have an earlier expiry date, and for medicine the expiry date is what matters."

Backing: REQ065 p.54; Interview 1 p.147

**Q15. How does the system choose the batch?**
> "When a sale is confirmed, it lists that product's sellable batches, sorts them by expiry date, and takes from the earliest until the quantity is filled. It runs as one transaction, so if there isn't enough stock nothing is saved."

Backing: `js/products-data.js:1806` (`deductStockFEFOOnce`); `study/07` §2

**Q16. What happens at six months and at two months?**
> "Six months before expiry, the batch is no longer sold at retail. Only wholesale buyers can get it, sold or free. Two months before expiry it becomes a Bad Order: the quantity goes to zero and a write-off is recorded."

Backing: REQ066–067 p.54; `js/products-data.js:247`, `:694`, `:732`

**Q17. Why six and two months?**
> "It's the branch's own rule. In the first interview the manager said they pull stock out six months before expiry and offer it to doctors as free goods, and at two months it goes out as Bad Order."

Backing: Interview 1 p.148; p.2

**Q18. What if two cashiers sell the last item at the same moment?**
> "Each sale is a database transaction. The second one re-reads the batch, sees there is no stock left, and is refused with 'Not enough stock'. So the same item can't be sold twice."

Backing: REQ050 p.52; `js/products-data.js:1806`; `study/07` §5

**Q19. How does stock get into the system?**
> "Staff record each delivery with the supplier, batch number, expiry date and quantity, one by one or by uploading an Excel file. If the delivery is linked to a purchase order, the system compares the two and marks a Discrepancy when they differ."

Backing: REQ053–057 p.53; REQ062–064 p.54

**Q20. Why keep the month-end count if the system tracks stock?**
> "The client insisted on it. Only an actual count shows the true quantity, because staff can hand out the wrong number by mistake. The branch closes for a day every month to count. Our Stock Count screen shows the system quantity beside the counted one and records the difference."

Backing: Interview 1 p.146; p.4; REQ059–061 p.53

**Q21. Is the expiry monitoring really "real-time"?**  *(weak spot)*
> "Selling is checked live: every time a product is shown or sold, the system compares each batch's expiry date with today, so near-expiry stock can't be sold at retail. The status label and the alerts are updated whenever staff open the Dashboard or Inventory. There is no midnight job, because the free plan can't run server code."

Backing: `js/products-data.js:256` (live check), `:696-697` (label update); `js/admin-dashboard.js:207`; `js/admin-inventory.js:154`

### D. Security and roles

**Q22. How do you enforce roles?**
> "In two layers. Each admin page checks your role and sends you away if you're not allowed. Then the database rules on Google's servers check every read and write. So even someone who gets past the page can't touch the data."

Backing: REQ119–121 p.61; `js/admin-header.js:13`; `js/admin-roles.js:12`; `firestore.rules`

**Q23. Can a customer make themselves a manager?**
> "No. The rules only allow a new account to be a customer. Nobody can change their own role or account status, or raise their own store credit."

Backing: `firestore.rules:51-55`

**Q24. How are passwords stored?**
> "We never store or see them. Firebase Authentication keeps them hashed, and everything travels over HTTPS. We did not write our own encryption."

Backing: REQNF009–010 p.63

**Q25. What is a security rule? Show me one.**
> "It's a condition stored on Google's servers that decides who may read or write a kind of record. For example, a customer may read an order only if the order's customer ID is their own. The browser cannot skip these checks."

Backing: `firestore.rules:132` (orders block); `firestore.rules:14-36` (role helpers)

**Q26. What stops someone guessing passwords?**
> "Five wrong tries lock that email for two minutes. There is a reCAPTCHA on login, and a login from a new device needs a code sent by email."

Backing: REQ003–005 pp.46–47; `js/auth.js:56-57`; `js/device-trust.js:4`

**Q27. Can the audit log be changed?**
> "No. The rules allow adding an entry but never editing or deleting one. Each entry has the action, who did it, the time, the old and new values, and the reason."

Backing: REQ122–124 pp.61–62; `firestore.rules:240`

**Q28. Who can change a price, and why so strict?**
> "Only the Branch Manager, and a reason is required. The client asked for this in the first interview: one person controls prices so staff aren't blamed for changes. They also asked for the reason and date on each change."

Backing: REQ071–073 p.55; Interview 1 pp.150–151; Interview 2 p.165

**Q29. What stops a dishonest staff member?**
> "Sales Staff can't void at all. Technical Staff can only void with the Branch Manager's own login, and the database refuses it otherwise. Prices are manager-only. Every action is written to a log nobody can edit."

Backing: `firestore.rules:225-229`; `js/products-data.js:1522`; Interview 4 p.191

**Q30. How do you protect customers' personal data?**
> "A customer can read only their own orders and profile. Cost and wholesale prices are kept in separate records that only staff can read. Prescription photos and personal details are not sent to the chat AI."

Backing: REQNF012 p.63; REQNF025 p.65 (Data Privacy Act); `study/13` §1.3

**Q31. Your keys are visible in the code. Isn't that a leak?**
> "Firebase browser keys are meant to be public. They only tell Google which project to talk to. What protects the data is the security rules, not hiding the key."

Backing: `study/17-setup-and-services.md` ("public browser keys by design")

**Q32. Can someone get around your email verification or reCAPTCHA?**  *(weak spot)*
> "A technical person using browser tools could, because those two checks run in the browser. What they still can't do is read other people's data or change stock or prices, because the database rules stop that. Moving those checks to a server needs the paid plan."

Backing: `js/auth.js:119-122`; `study/13` §2.1 items 4 and 16

**Q33. Can a customer change the price of their own order?**  *(weak spot)*
> "The order's prices are sent by the browser, so a technical person could alter them. The system compares every order with the catalog and shows staff a warning before they approve, and staff also check the amount actually received."

Backing: `js/admin-online-orders.js:506`, `:554`; `study/13` §2.1 item 3

### E. Payments and branch policies

**Q34. Why screenshots and not a payment gateway?**
> "The owner refuses third parties for payment. He wants the money to go straight to the branch's account with no holding and no fees, and the staff said they can confirm a payment on the spot. We proposed PayMongo twice and it was declined."

Backing: p.8; Interview 2 p.173; Interview 3 pp.177–179; Interview 4 p.193; Appendix H p.141

**Q35. How do you know a screenshot isn't fake?**
> "The system can't know, and we don't claim it can. Staff check the branch's actual account before approving. The system helps by warning when a reference number was already used on another order or sale."

Backing: Interview 3 p.178; `js/admin-online-orders.js:533`

**Q36. What if the customer pays too little or too much?**
> "Too little: staff put the order On Hold as an underpayment and the customer tops up. Too much: the order is approved and the extra becomes store credit for their next order. No cash is given back."

Backing: REQ095–098 pp.58–59; Interview 4 p.188

**Q37. What happens after seven days on hold?**
> "The order is closed without a refund. Any payment the staff had verified is kept as store credit for the customer's next order."

Backing: REQ100 p.59; `js/admin-online-orders.js:4`; `js/orders.js:175`

**Q38. Why no refunds or cancellations?**
> "It's the branch's standing policy. The cash is sent to the main office every day, so the branch has no money to pay back. The manager said once a customer pays, the order is confirmed; the only option is to change the item. It's in the Terms the customer accepts."

Backing: p.8; Interview 1 p.145; Interview 3 pp.182–184; REQ006 p.47

**Q39. When is stock deducted for an online order?**
> "When staff approve the payment, not when the customer checks out. That way an unpaid order doesn't lock stock that the counter could sell."

Backing: REQ076 p.55; `js/admin-online-orders.js:656`

**Q40. What is the difference between a void and a return?**
> "A void cancels a completed sale, usually the same day for a wrong item, and puts the stock back. A return or exchange happens later with the receipt number: the customer swaps for an item of equal or higher value and pays the difference. The client asked us to keep the two separate."

Backing: REQ083 p.56; Demo transcript pp.216–217; `js/products-data.js:1546`, `:2039`

### F. Evaluation and results

**Average scores (from Chart 4.1, p.118)**

| Characteristic | Branch Manager | Technical Staff | Sales Staff | Customers (50) |
| --- | --- | --- | --- | --- |
| Functional Suitability | 4.60 | 4.40 | 4.40 | 4.64 |
| Performance Efficiency | 4.00 | 4.33 | 4.00 | 4.60 |
| Usability | 4.67 | 5.00 | 4.33 | 4.66 |
| Reliability | 4.00 | 5.00 | 4.00 | **4.82** |
| Security | 4.00 | 4.50 | 4.00 | 4.62 |
| Overall Satisfaction | 4.00 | 5.00 | 5.00 | 4.75 |

**Q41. Your objective says "security, reliability and compliance". Your results show five other characteristics. Which is it?**  *(weak spot)*
> "The objective was written at proposal stage and named three focus areas. For the evaluation we used five ISO 25010 characteristics: functional suitability, performance efficiency, usability, reliability and security. Compliance was covered by one survey question on following rules for expiry, prescriptions and privacy. The objective's wording should have been updated."

Backing: p.6 and pp.23–24 vs p.102; the compliance question is on p.106

**Q42. Where are your TAM results?**  *(weak spot)*
> "We didn't report separate scores for perceived usefulness and ease of use. Ease of use is in our Usability questions, usefulness is in Functional Suitability, and acceptance is measured by overall satisfaction and whether customers would use it again. Forty-eight of fifty said they would."

Backing: pp.21–22; p.102; p.118

**Q43. Who answered, and how?**
> "Fifty-three people on October 27 and 28, 2026: the Branch Manager, the Technical Staff, the Sales Staff, and fifty customers. They rated each question from 5, Excellent, to 1, Unacceptable. Each staff member answered questions about their own modules."

Backing: pp.101–103

**Q44. Only three staff. Is that valid?**  *(weak spot)*
> "It isn't a statistical sample and we don't present it as one. The branch has three people, one per role, so that is all of the staff users. We report their individual ratings."

Backing: Interview 1 p.143; p.102

**Q45. How did you compute the averages?**
> "Each average is the sum of the ratings divided by the number of ratings. For example, the Branch Manager rated the five Functional Suitability questions 5, 5, 4, 5 and 4, which gives 4.60."

Backing: pp.104–105; p.118. **The sampling method is not stated in the paper: see section 10.**

**Q46. What scored lowest, and what will you do about it?**
> "Three ratings of 3, Fair. The Branch Manager on account safety; the Sales Staff on finding a product in the POS, and on new products and prices showing up quickly. The chat assistant also got the most Fair ratings from customers. Our recommendations answer each one: barcode or generic-name search, faster updates, stronger staff login, and better chat answers."

Backing: p.107; p.111; p.115; pp.119–120

**Q47. Sixty percent of your customer respondents are students. Are they Amson's customers?**  *(weak spot)*
> "**Ask** (section 10). Say only what really happened. The paper states 60% students and 40% employed, and that all of them shop online at least sometimes."

Backing: p.114; photos on pp.194–195

### G. Limits and future work

**Q48. What is your biggest limitation?**
> "Everything runs in the browser on a free cloud plan, so there is no server code of our own. That means a few checks rely on staff, and the expiry labels update when staff open the Dashboard or Inventory instead of on a timer."

Backing: `study/13` §2.3; p.120

**Q49. What happens when the internet is down?**
> "Sales can't be saved. The branch writes them down and encodes them when the connection is back. Offline support is one of our recommendations."

Backing: p.120

**Q50. What would you add next?**
> "Barcode or generic-name search at the POS, stronger login for staff, BIR-registered receipts with VAT, multi-branch support for the Sta. Cruz branch, a link to the branch's existing POS, a payment gateway and courier connection, and offline support."

Backing: p.120

**Q51. Are your receipts official?**
> "No. They are internal sales records, and the paper says so. The client specifically did not want the system connected to the BIR. The branch still issues its own BIR receipt when a customer asks for one."

Backing: pp.3–4; Interview 1 pp.153, 159; Interview 2 p.164

**Q52. Did your system replace their POS? Are they using it?**  *(weak spot)*
> "It was deployed on October 22, 2026. In the walkthrough before deployment, the client chose to keep its existing POS as the main record for now and enter stock in both. Our conclusion recommends linking the two so they stop double-encoding."

Backing: p.102; Demo transcript pp.208–209; p.120. **Whether they use it daily now: Ask (section 10).**

**Q53. Where is the senior citizen and PWD discount?**  *(weak spot)*
> "We asked the client directly in the second interview. They said the branch gives no senior or PWD discount because its prices are already at wholesale level, so it was not included. We know the law requires it for retail sales. Adding it would need an ID field and a discount line on the sale."

Backing: Interview 2 pp.174–175. **Report the client's decision; don't argue that it is correct.**

**Q54. The client said prescription medicine can't be sold online. Why do you?**
> "We don't deliver it. The customer pre-orders and uploads the prescription, staff check the photo, and the customer must come to the branch with the original prescription to collect it."

Backing: Interview 1 p.159; p.7; p.80

### H. Questions about the paper itself

**Q55. Your activity diagram doesn't match what you just showed.**  *(weak spot)*
> "That drawing is from the design stage. The description under it and the requirements were updated to match what we built, and the system follows those."

Backing: section 7 lists each drawing and what differs

**Q56. Your overall use case diagram gives live chat to Sales Staff.**
> "That line is drawn to the wrong actor in the overview. The client told us the encoder, our Technical Staff, handles the customer messages and the counter can't keep up (Interview 1 p.158), and confirmed Sales Staff use the POS only (Interview 2 p.161). Requirement 121 and Figure 2.7 show that, and the system enforces it."

Backing: Fig 2.2 p.67 vs REQ121 p.61 and Fig 2.7 p.74; `js/admin-roles.js:24`

**Q57. These aren't wireframes. They're finished designs.**
> "Correct. They are high-fidelity mockups made in Figma. We showed them to the client in the fourth interview to confirm the flow before we started building."

Backing: pp.91–94; p.38; Interview 4 pp.186–189

**Q58. Your budget lists a paid Firebase plan and a domain. Did you pay?**
> "No. Those were planned costs at proposal time. We stayed on the free plan and use the free web.app address. The total in the table also has an addition error: the rows add up to ₱31,590.08, not ₱31,790.08."

Backing: p.98; p.102

**Q59. Your sample reports show "DEMO" batches. Is that real data?**
> "Those samples were printed from test data during deployment week. The layout follows the format the main office uses, including the VAT and discount columns, which stay at zero because the receipts aren't BIR-registered."

Backing: pp.221–222; `js/admin-reports.js:229`

**Q60. Where did the product photos come from?**
> "For the demo catalogue of 50 products we used pictures found online. The branch can replace them with photos of its own boxes."

Backing: Demo transcript p.204

### I. The chat assistant

**Q61. Does the AI give medical advice? What do you send it?**
> "No. It's told never to give medical advice or doses, and a reply that looks like a dose is blocked. If you ask for a cough medicine it lists the cough products we carry and says it can't tell which is right for you. It receives the question, the last few chat messages and a short product list, never prescriptions."

Backing: p.35; REQNF012 p.63; `js/live-chat.js:24`, `:322`, `:432`, `:569`

**Q62. What does the AI cost, and what if it stops working?**
> "Nothing. It uses Gemini's free tier through Firebase, and we cap it at 400 replies a day. Common questions like how to pay have built-in answers that don't use the AI. If the limit is reached or the AI fails, the chat goes to staff."

Backing: `js/chat-config.js:7`; `study/17-setup-and-services.md` (Live chat setup); REQ037 p.50

---

## 6. What the system can and can't do  ·  Should know

**Can do** (each one checked in the code)

| Feature | Paper | Code |
| --- | --- | --- |
| Online ordering: cart, checkout, QR Ph screenshot | pp.48–50 | `js/cart.js`, `js/checkout.js`, `js/payment.js` |
| Prescription pre-order, pick-up only | p.49 | `js/payment.js:235` |
| FEFO for online, POS and wholesale sales | REQ065 p.54 | `js/products-data.js:1806` |
| 6-month and 2-month expiry rules | p.54 | `js/products-data.js:247`, `:694`, `:697` |
| Purchase orders and discrepancy report | p.53 | `js/admin-inventory.js`; `js/admin-reports.js:10` |
| Month-end stock count | REQ059–061 p.53 | `js/admin-inventory.js:1675` |
| POS with payment method, reference number, RX Verified, receipt | p.56 | `js/admin-pos.js:239` |
| Voids and walk-in exchanges | p.56 | `js/products-data.js:1546`, `:2039` |
| Wholesale accounts, documents, orders, free items, exchanges | p.57 | `js/admin-wholesale-accounts.js:699`; `js/products-data.js:1952` |
| Holds, store credit, overpayment credit | pp.58–59 | `js/orders.js:175`, `:280` |
| Seven report types, PDF and Excel | pp.60–61 | `js/admin-reports.js:3-10` |
| Audit log that can't be edited | REQ124 p.62 | `firestore.rules:240` |
| Backup download (Excel and JSON) | REQNF013 p.64 | `js/admin-backup.js:94` |
| Chat with AI answers and staff hand-off | p.50 | `js/live-chat.js:569` |

**Can't do**

| Can't | Why | Backing | Answer |
| --- | --- | --- | --- |
| More than one branch | Scope; client said this branch only | p.7; Interview 1 p.152 | Q4 |
| Payment gateway | **Client decision** | Interview 3 pp.177–179; p.141 | Q34 |
| Cash on delivery | **Client decision**: "payment first" | Interview 2 p.172; Interview 3 p.178 | "The branch releases medicine only after payment." |
| Refunds or cancelling a paid order | **Client policy** | Interview 3 pp.182–184 | Q38 |
| Delivering prescription medicine | Rules on Rx; client | p.7; REQ080 p.56 | Q54 |
| Automatic Lalamove booking | **Client decision**: needs a prepaid wallet | Interview 4 p.193; Appendix I p.141 | "The branch can't hold back sales money to top up a courier wallet, so staff book by hand." |
| Couriers other than Lalamove | **Client decision** | Interview 2 pp.171–172 | "Only Lalamove picks up at the branch." |
| Wholesale buyers ordering online | **Client decision** | Interview 2 pp.162–163 | "They must show an LTO and business permit and get special prices, so staff record their orders." |
| Official BIR receipts, VAT | **Client decision**; scope | Interview 1 pp.153, 159; pp.3–4 | Q51 |
| Senior / PWD discount | **Client decision** | Interview 2 pp.174–175 | Q53 |
| Replacing the branch's old POS | **Client decision** | Demo transcript pp.208–209 | Q52 |
| Working offline | Technical: cloud system | p.120 | Q49 |
| Timed background jobs | Technical: free plan has no server code | `js/products-data.js:696` | Q21 |
| Automatic backups | Technical: free plan | p.64; `js/admin-backup.js` | "The Branch Manager downloads a full backup on demand." |
| Barcode scanning | Not built | p.120 | Q46 |
| SMS or phone codes | Scope; listed as future | REQNF024 p.65 | "Verification is by email; SMS is a future integration." |
| Medical advice from the AI | On purpose | p.35 | Q61 |
| Different expiry rules per product | Not built | `study/08` §7 | "Six and two months is the branch's single rule." |

---

## 7. Where the paper and the system differ  ·  Should know

You can't change the printed paper. For each item, know the one-line answer.
**H** = the panel is likely to notice. **M** = possible. **L** = unlikely.

### 7.1 Text

| # | Lvl | The paper says | The system does | Say |
| --- | --- | --- | --- | --- |
| 1 | **H** | ISO 25010 assessed on "security, reliability, and compliance" (p.6, pp.23–24) | Evaluation used five other characteristics (p.102) | Q41 |
| 2 | **H** | Acceptance measured with TAM (p.6, pp.21–22) | No separate usefulness / ease-of-use scores (p.102) | Q42 |
| 3 | **H** | "Real-Time" expiry monitoring; batches "automatically" flagged (title; REQ066–067 p.54) | Sale check is live; labels update when Dashboard or Inventory opens (`js/products-data.js:696`) | Q21 |
| 4 | **H** | The prototype "replaces" manual processes; the branch's "actual" products were loaded (p.100, p.102) | Client keeps its old POS as main; 50 demo products (pp.204, 208–209) | Q52 |
| 5 | **M** | Technical Staff have "void authorization" (p.46) | Technical Staff need the Branch Manager's login to void (`js/admin-pos.js:473`; `firestore.rules:225-229`) | "The system is stricter. The client asked that a second person sees every void (p.191), and our testing section says so (p.100)." |
| 6 | **M** | Reports are daily, **weekly** and monthly (p.44; REQ111 p.60) | No report called "weekly"; Daily Sales Report takes any date range (`js/admin-reports.js:4`) | "Weekly is the Daily Sales Report with a seven-day range." |
| 7 | **M** | Holds are "automatically" closed after 7 days (REQ100 p.59) | Closed when a staff page next loads that order (`js/orders.js:175`) | "It closes the next time staff open the orders, which is daily." |
| 8 | **M** | reCAPTCHA "prevents" automated access (REQ003 p.46) | Checked in the browser only (`js/auth.js:119-122`) | Q32 |
| 9 | **M** | Account active "only after" email verification (REQ002 p.46) | True in normal use; a technical person could skip it | Q32 |
| 10 | **M** | Budget: paid Firebase plan, a domain, total ₱31,790.08 (p.98) | Free plan, free address; rows add to ₱31,590.08 | Q58 |
| 11 | **M** | Fig 2.11 text: prescription is verified "in person at the branch" (p.82) | Staff approve or reject the photo online (`js/admin-online-orders.js:799-809`), as REQ077–079 say (pp.55–56) | "The requirements and the system agree; the original is still shown at pick-up." |
| 12 | **M** | Sample reports show DEMO batches and "Supplier Sample" (pp.221–222) | Test data | Q59 |
| 13 | **M** | The AI gives no medical advice (p.35) | Asked for a cough medicine, it lists cough products (p.205) | Q61 |
| 14 | L | Fig 2.5 text: the Branch Manager opens the stock count and it applies on submit (p.72) | Staff count; the manager finalizes (`js/admin-inventory.js:1675`; REQ061 p.53). The manager-only step is checked by the page, not the rules. | "We follow requirement 61." |
| 15 | L | Fig 2.14 text: void "before the transaction is finalized", exchange in the same entry (p.88) | Voids are for completed sales (REQ083 p.56); exchanges are separate | Q40 |
| 16 | L | Three hold types (p.74, p.82) | Two more: out of stock, prescription rejected (`js/orders.js:44-45`) | "We added two during testing." |
| 17 | L | Near-expiry stock is for free distribution (p.72, p.84) | It can be sold or given free to wholesale buyers (`js/products-data.js:260`) | "Wholesale only, sold or free." |
| 18 | L | "Robust encryption" (p.24) | Firebase and HTTPS do it; we wrote none | Q24 |
| 19 | L | "Instantaneous push notifications" (p.23) | Bell in the app, optional browser alerts (`js/admin-header.js:225`), email | "In-app and browser alerts, not phone push." |
| 20 | L | New branches can be added later (REQNF016 p.64) | Single branch | "A design goal for future work." |
| 21 | L | Database "protected against accidental deletion" (REQNF013 p.64) | **True**: delete protection is switched on for the database (checked in the project settings, Nov 12). A temporary Clear Test Data tool for the manager ends **Dec 1, 2026** (`firestore.rules:333`). | "Delete protection is on, and the manager can download a backup." |
| 22 | L | Abstract: "Date of Completion: June 2027" (p.v); title page: November 2026 | — | **Ask** your adviser (section 10). |
| 23 | L | Approval sheet says "proposal", dated May 22, 2026 (p.iii) | — | "That is the proposal approval sheet." |
| 24 | L | Agreement letter has the shorter title, no "Real-Time Expiry Monitoring" (p.140) | — | "The letter has the working title." |
| 25 | L | Appendix P is titled "Transcript of Survey Testing" (p.204) | It is the walkthrough with the client before deployment | Know what it is. |

### 7.2 Drawings

All were checked as images. One answer covers them: **Q55**.

| Lvl | Figure | The drawing shows | The system does |
| --- | --- | --- | --- |
| **H** | **Fig 2.11** Payment verification (p.81) | After a hold, the customer's fix goes straight to "Order Confirmed" with no staff check. The courier is booked before the prescription check. The admin marks expired holds by hand. | Every fix goes back to staff (REQ101 p.59). Rx orders skip the courier. The system closes expired holds. |
| **H** | **Fig 2.10** Purchasing (p.79) | "Is item Rx?" comes after the delivery address and payment upload. No prescription upload. | Rx is detected at checkout; no address; a prescription photo is required (p.80). |
| **H** | **Fig 2.2** Overall use case (p.67) | Sales Staff is linked to "Manage Live Chat"; Technical Staff is not. | The reverse (Q56). |
| **M** | **Fig 2.12** Inventory (p.83) | The mismatch branch repeats "Verify quantities". The 2-month branch ends in "FEFO stock deduction". At 6 months the admin chooses what to do. | PO is marked Discrepancy; 2-month stock is written off; 6-month flag is automatic (pp.83–84). |
| **M** | **Fig 2.14** POS (p.87) | No void path. "Mark RX as Verified" is in the System lane. | Void exists (p.88); staff tick RX Verified. |
| **M** | **Fig 2.15** Wholesale exchange (p.89) | Ends in "Generate Sales Invoice"; no return-to-stock step. | Returns the item to its batch and makes an exchange document (p.90; `js/products-data.js:1952`). |
| **M** | **Fig 2.19** mockup (p.93) | Overpayment shown as a payment issue. | Overpayment is approved with store credit (REQ098 pp.58–59). |
| L | **Fig 2.8** Login (p.76) | A wrong OTP feeds the failed-password counter. | A wrong code lets you request a new one (p.77). |
| L | **Fig 2.9** Registration (p.77) | Duplicate-email check, then Terms. | Terms first; the duplicate check happens when the account is created. |
| L | **Figs 2.2, 2.5, 2.20** | Named "Stock Reconciliation". | Called Stock Count everywhere else. |
| L | **Figs 2.2–2.4** | Actor labelled "Registered User". | Text says "Registered Customer". |
| L | **Figs 2.16–2.21** mockups | No screens for Purchase Orders, Reports, Staff, Settings. | They exist; they follow the same layout. |
| L | **Gantt** (pp.95–97) | Deployment drawn in the same week as the final defense. | Deployed October 22 (p.102). "The chart was the plan." |

**Figures that match the system, good to point at:** Fig 2.6 (p.73) for order processing, Fig 2.7 (p.74) for roles, Fig 2.4 (p.70) for customer ordering, Fig 2.13 (p.85) for wholesale.

---

## 8. Live debugging  ·  Must know 8.1–8.4

### 8.1 Three warnings first

1. **The copy on your laptop uses the LIVE database.** There is no separate test database in the repo. Anything you save is real. Use a test product and a test order.
2. **Never open the Dashboard or Inventory after changing an expiry number** (requests 1 and 2 below). Those pages apply the expiry rules to real batches and can write stock off.
3. **Don't publish rules and don't deploy.** A change on your laptop is only on your laptop until someone deploys.

### 8.2 Start the project (do this before the defense, not during)

1. Install Node.js (once).
2. Open the project folder. Run `npx http-server -p 8080 -c-1` in the project folder.
3. The browser opens `http://localhost:8080/shop/index.html`.
4. Open the project folder in **VS Code**.
5. Log in once on localhost to make sure it works there. **Ask** the lead programmer if the login's reCAPTCHA is refused on localhost (section 10).

On a Mac or Linux laptop, step 2 is:
```bash
npx http-server -p 8080 -c-1
```

### 8.3 Procedure for "change this" (use it every time)

1. **Repeat the request** in your own words. "You want the low-stock alert at 10, not 20."
2. **Find the line.** Look in the table in 8.4. If it isn't there, press `Ctrl+Shift+F` in VS Code and search for the text or number you see on the screen.
3. **Say what the line does** before you touch it.
4. **Change one thing.** Press `Ctrl+S`.
5. **Go to the browser. Press `Ctrl+F5`.**
6. **Show the result** on the page named in the "How to show it" column.
7. **Undo it.** In VS Code press `Ctrl+Z` and save, or in the terminal (use the file you changed):
```bash
git checkout -- js/products-data.js
```

### 8.4 The most likely change requests

| # | Request | Open this file and line | Change | How to show it |
| --- | --- | --- | --- | --- |
| 1 | Expiry alert at 3 months, not 6 | `js/products-data.js:247` | `NEAR_EXPIRY_MONTHS = 6` → `3` | **Explain only** (warning 2). "This one number is used by the retail check on line 256 and the label on line 301." |
| 2 | Bad Order at 1 month, not 2 | `js/products-data.js:694` | `BAD_ORDER_MONTHS = 2` → `1` | **Explain only** (warning 2). |
| 3 | Low-stock alert at 10, not 20 | `js/products-data.js:245` | `DEFAULT_REORDER_POINT = 20` → `10` | Inventory → Low Stock tab lists fewer products. (A product can have its own number; line 286 uses it first.) |
| 4 | Lock after 3 wrong passwords | `js/auth.js:56` | `LOGIN_LOCKOUT_THRESHOLD = 5` → `3` | Login page: type a wrong password 3 times on a test account. |
| 5 | Lock for 3 minutes | `js/auth.js:57` and the message on `:168` | `2 * 60 * 1000` → `3 * 60 * 1000` | Same as 4. More than 3 minutes also needs `firestore.rules:361`, which you can't publish live. Say so. |
| 6 | Password at least 8 characters | `js/validators.js:4` | `{6,}` → `{8,}`. Update the text in `js/register.js:116`, `:172` and `register.html:113`. | Register page: type a 6-character password; the red hint stays. Don't submit. |
| 7 | Change the phone number rule | `js/validators.js:14` | Edit `PH_PHONE_PATTERN` (now: starts with 09 or +639, 11 digits) | Register page: type a number that should now fail. |
| 8 | Limit a customer to 10 of one item | `js/cart.js:115` | `product.totalStock` → `Math.min(product.totalStock, 10)` | Shop: add 11 of one product; the cart stops at 10. |
| 9 | Add a field to a form (example: supplier TIN) | `admin/suppliers.html:142`, then `js/admin-suppliers.js` near lines 20, 191, 216, 256 | Copy the address input with a new `id`; then read it, clear it, fill it, and save it in the same four places the address is handled | Suppliers → Add Supplier → save → reopen: the value is there. |
| 10 | Hold orders 5 days, not 7 | `js/admin-online-orders.js:4`; texts on `:161-162` and `js/orders.js:180` | `7 * 24 * …` → `5 * 24 * …` | Put a test order on hold; the "resolve by" date is 5 days away. |
| 11 | Smaller upload limit | `js/payment.js:3` | `10 * 1024 * 1024` → `5 * 1024 * 1024` | Payment page: choose a 6 MB image; it is refused. (The test kit has `TOO-BIG-over-10MB.png`.) |
| 12 | Change the store hours or hotline | `js/store-info.js:6-9` | Edit the text | Refresh any page; look at the footer. |
| 13 | Change how money or dates look | `js/products-data.js:1241` (money), `:1222` (dates) | Edit the format | Refresh any page with a price or date. |
| 14 | Let another role open a page | `js/admin-roles.js:12-30` | Add the role to that page's list | Log in as that role. **Say:** "The page now opens, but the database rules still decide what they can read." |
| 15 | Change a button's label or a message | Search the exact words with `Ctrl+Shift+F` | Edit the text | Refresh that page. |
| 16 | Change the colours | `css/style.css:3` (the `:root` block) | Edit a colour value | Refresh any page. |

**Other numbers, same steps:** auto-deliver days `js/orders.js:93` (also `firestore.rules:158`) · email code lifetime `js/otp.js:3` · AI replies per day `js/chat-config.js:7` · new-device code on or off `js/device-trust.js:4` · reference number rule `js/validators.js:88`.

### 8.5 Procedure for "find this bug"  ·  Should know

1. **Make it happen again.** Do the exact steps. Say what you expected and what happened.
2. **Press `F12`. Open the Console tab.** Read the **first** red line. Note the file name and line number, and click it.
3. **Match the page to its script.** `admin/pos.html` uses `js/admin-pos.js`. `shop/cart.html` uses `js/cart-page.js`. Shared code is in `js/products-data.js`.
4. **Find the button.** Right-click it → Inspect → copy its `id` → `Ctrl+Shift+F` for that `id`.
5. **Search for the message on the screen.** `Ctrl+Shift+F` the exact words. It lands on the check that printed it.
6. **Fix one thing. Save. `Ctrl+F5`. Test.**
7. **Still stuck after 3 minutes?** Say what you ruled out and what you would check next. A clear method scores better than silent guessing.
8. **Undo** before moving on (8.3 step 7).

**What the error is telling you**

| You see | It means | Look in |
| --- | --- | --- |
| `Missing or insufficient permissions` | The database rules refused it: wrong role, or a field that role may not change | `firestore.rules`; the account's role |
| `X is not defined` | A name is misspelled, or its script isn't loaded on this page | The `<script>` lines at the bottom of the HTML page |
| `Cannot read properties of null` | The code looked for an element `id` that isn't on the page | The `id` in the HTML vs the one in the JS |
| `auth/...` | A login problem (wrong password, too many tries) | `js/auth.js:116` |
| Nothing happens, no error | The click isn't connected | The button's `id` vs `getElementById("...")` in the JS |
| A red row in the Network tab | A file or request failed to load | The file path |
| It saved but looks wrong | Check what was really stored | Firebase console → Firestore → Data |

### 8.6 Likely "find the bug" setups and where to look  ·  Should know

| The panel does this | What you'll see | Where the fix is |
| --- | --- | --- |
| Renames a button's `id` in the HTML | Clicking does nothing; maybe a `null` error in the console | Put the `id` back to match the JS |
| Changes a number (e.g. lockout to 50) | The feature never triggers | The constant in 8.4 |
| Deletes a `<script>` line from a page | `X is not defined` | Compare with a similar page's script list |
| Breaks a validation pattern | Every input is rejected, or none is | `js/validators.js` |
| Misspells a collection name | `Missing or insufficient permissions` | The `db.collection("...")` line the console points to |
| Logs in with the wrong role | The page redirects, or a save is refused | `js/admin-roles.js:12-30`; the account's role in Staff Management |
| Asks "why is this product out of stock?" | Its batches are near expiry or empty | Inventory → that product's batches; `js/products-data.js:256` |
| Asks "why can't I complete this sale?" | The red message under the POS cart says why | `js/admin-pos.js:239` onward |

### 8.7 Code map  ·  Should know

| Feature | File | Function (line) |
| --- | --- | --- |
| Login and lockout | `js/auth.js` | `performLogin` (116), `recordFailedLogin` (81) |
| Registration and email code | `js/register.js`, `js/verify-email.js`, `js/otp.js` | `createCustomerAccount` (193) |
| New-device code | `js/device-trust.js` | switch on line 4 |
| Form rules (password, phone, ZIP, reference no.) | `js/validators.js` | lines 4, 14, 44, 88 |
| Which role opens which page | `js/admin-roles.js`, `js/admin-header.js` | `ADMIN_PAGE_ACCESS` (12); page check (13) |
| Product list and stock | `js/products-data.js` | `loadCatalogCache` (964), `isRetailSellableBatch` (256) |
| Cart | `js/cart.js` | `addToCart` (111) |
| Checkout and payment | `js/checkout.js`, `js/payment.js` | `stockAndPricesStillOk` (235) |
| Order number, store credit | `js/orders.js` | `generateOrderNumber` (313), `createOrderWithCreditRedemption` (280) |
| Holds and auto-deliver | `js/orders.js` | `enforceOrderDeadline` (175) |
| Payment verification | `js/admin-online-orders.js` | `confirmOrderSale` (656), `orderPriceProblems` (506) |
| **FEFO deduction** | `js/products-data.js` | `deductStockFEFOOnce` (1806) |
| POS | `js/admin-pos.js` | Complete Sale handler (239) |
| Void | `js/products-data.js` | `voidPosSale` (1546), `verifyVoidApprover` (1522) |
| Walk-in / wholesale exchange | `js/products-data.js` | `processWalkinExchange` (2039), `processWholesaleExchange` (1952) |
| **Expiry rules** | `js/products-data.js` | `enforceExpiryStatus` (697), `markBatchBadOrder` (732), `getExpiryStatus` (295) |
| Receive stock, write-off, count | `js/admin-inventory.js` | `applyStockReceipt` (537), `saveWriteOff` (1260), `finalizeCount` (1675) |
| Products and prices | `js/admin-products.js` | `productPriceProblem` (550) |
| Wholesale order | `js/admin-wholesale-accounts.js` | `saveWholesaleOrder` (699) |
| Reports | `js/admin-reports.js` | `REPORT_TYPES` (3), `generateReport` (919) |
| Audit log | `js/products-data.js` | `logAuditEvent` (2349) |
| Money and date format | `js/products-data.js` | `formatPeso` (1241), `formatDateMDY` (1222) |
| Chat | `js/live-chat.js`, `js/chat-config.js` | `chatAiReply` (569), `respond` (1118) |
| Store name, hours, address | `js/store-info.js` | `STORE_INFO` (2) |
| Who may read and write | `firestore.rules` | one `match` block per collection |

**The six code samples printed in Appendix Q (pp.218–220).** The panel can point at any of them.

| Sample in the paper | In the code | Say |
| --- | --- | --- |
| Near-expiry rule (six months) | `js/products-data.js:247-258` | "A batch is sold at retail only if it expires more than six months from today." |
| Expiry status enforcement | `js/products-data.js:697`, `:732` | "When staff open the Dashboard or Inventory, batches inside six months become wholesale-only and those inside two months are written off." |
| FEFO batch ordering | `js/products-data.js:1806` | "It sorts the batches by expiry date and takes from the earliest first, all in one save." |
| Role-based access rules | `firestore.rules:14-36` | "The database looks up the signed-in person's role before allowing anything." |
| Price restriction rules | `firestore.rules:78` and the products block at `:86` | "If you're not the manager, the price fields must be the same before and after your change." |
| Payment approval with FEFO and invoice number | `js/admin-online-orders.js:656` | "Approving checks the order wasn't already processed, deducts the stock, and takes the next invoice number together." |

More detail: `study/16-cheatsheet.md` (both now say the new-device code is on, `js/device-trust.js:4`).

---

## 9. Study plan, quiz and checklists  ·  Nice to know

### 9.1 Plan (about 9 hours)

| Day | Time | Do |
| --- | --- | --- |
| 1 | 30 min | Cheat sheet and section 1, out loud, twice. |
| 1 | 30 min | Section 2. Then read manuscript pp.1–8. |
| 1 | 90 min | Section 5, parts A to E. Cover the answer, say it, then check. |
| 1 | 30 min | Settle the open items in section 10 with the team. |
| 2 | 60 min | **Full demo run** (section 3) on the defense laptop, timed. Record it. |
| 2 | 60 min | Section 5, parts F to I, and all the answers marked *weak spot*. |
| 2 | 45 min | Section 8: do requests 3, 4, 6, 8 and 12 for real, then undo each. |
| 2 | 30 min | Section 7. Open the printed copy at Fig 2.2, 2.10 and 2.11 and find what differs. |
| 3 | 30 min | Section 8.5: have a groupmate break something; find it. |
| 3 | 30 min | Read manuscript pp.99–120 (testing, results, conclusion). |
| 3 | 30 min | Second demo run. Turn the Wi-Fi off once and practise section 4. |
| 3 | 20 min | Quiz below. Reread what you miss. |

### 9.2 Quiz (20 questions)

1. What is the full title?
2. What is the general objective?
3. Name the four specific objectives.
4. Name the five kinds of users.
5. What can Sales Staff do?
6. Name two things Technical Staff can't do.
7. What does FEFO mean?
8. What happens to a batch 6 months before expiry? 2 months?
9. How many wrong passwords lock an account, and for how long?
10. What is the only online payment method, and who verifies it?
11. How long can an order stay on hold, and what happens after?
12. Can a prescription order be delivered?
13. Who can change a price?
14. What method did you use, how many phases, how long each?
15. Which two frameworks did you evaluate with?
16. How many respondents, and who?
17. What did customers rate highest, and what score?
18. Where is access really enforced?
19. Which file and lines hold the expiry numbers?
20. Why is there no senior or PWD discount?

**Answers:** 1) A Web-Based Sales and Inventory Management System with Integrated Real-Time Expiry Monitoring for Amson Pharmaceuticals (p.i). 2) Improve operational efficiency, customer reach and inventory accuracy (p.5). 3) Online store; sales and inventory with FEFO; admin portal with roles and reports; evaluation with TAM and ISO 25010 (pp.5–6). 4) Guest, Registered Customer, Sales Staff, Technical Staff, Branch Manager (p.67). 5) Counter sales and viewing the catalog (p.46). 6) Change prices; manage staff accounts (p.46). 7) First Expired, First Out (p.54). 8) Wholesale-only; Bad Order, written off (p.54). 9) Five; two minutes (p.47). 10) QR Ph; staff, by hand (p.8). 11) Seven days; closed with no refund, verified payment kept as store credit (p.59). 12) No, pick-up only (p.7). 13) The Branch Manager only (p.55). 14) Agile; six; two to three weeks (pp.28–35). 15) TAM and ISO/IEC 25010 (p.21). 16) 53: Branch Manager, Technical Staff, Sales Staff, 50 customers (p.102). 17) Reliability, 4.82 (p.118). 18) In the database rules, `firestore.rules`. 19) `js/products-data.js` lines 247 and 694. 20) The client said the branch gives none because it sells at wholesale-level prices (pp.174–175).

### 9.3 The night before

- [ ] Every demo account logged in on the defense laptop (no email code tomorrow).
- [ ] Products have stock; one is low; one batch is near expiry.
- [ ] Test kit files on the desktop; Lalamove link ready.
- [ ] Full demo run done and recorded.
- [ ] Both web addresses tested on the defense laptop.
- [ ] Phone hotspot tested with the laptop.
- [ ] The local server (`npx http-server -p 8080 -c-1`) works; login on localhost tested; VS Code opens the project.
- [ ] Account emails and passwords on paper.
- [ ] Laptop charged; charger and a spare laptop packed.
- [ ] Printed manuscript tabbed: objectives (p.5), scope (p.6), requirements (p.46), use cases (p.67), activity diagrams (p.76), budget (p.98), results (p.103), summary chart (p.118), conclusion (p.119), senior/PWD (p.174), payment (p.177), void (p.191), old POS (p.208).
- [ ] Nobody deploys or runs Clear Test Data.
- [ ] Reread the cheat sheet. Sleep.

### 9.4 On the day

- [ ] Arrive early. Connect to the Wi-Fi. Open the site in both browsers and log in.
- [ ] Hotspot on standby. Recording open in a tab.
- [ ] Close every other tab and turn off notifications.
- [ ] Reread the cheat sheet.
- [ ] In Q&A: two or three sentences, name the page, stop. If you don't know: "I'd have to check that. What I can confirm is…"

---

## 10. Settle these with the team before the defense  ·  Must do

These are not in the manuscript or the code. Agree on one answer each.

| # | Open item | Who to ask | Why it matters |
| --- | --- | --- | --- |
| 1 | Emails and passwords of the four demo accounts | Lead programmer | Demo, section 3.1 |
| 2 | Does login work on `localhost:8080`, or does reCAPTCHA refuse it? | Lead programmer | Live debugging, section 8.2 |
| 3 | Is `AMSON-Demo-Stock-43-Products.xlsx` (named in the old demo guide, now deleted) still needed? It isn't in the repo or the test kit. | Lead programmer | Only if products have no stock |
| 4 | Is the branch using the system day to day right now? | Whoever talks to the client | Q52 |
| 5 | Who were the 50 customer respondents, and how were they chosen? | Whoever ran the survey | Q45, Q47. The paper doesn't state a sampling method. |
| 6 | Is "Date of Completion: June 2027" in the abstract correct? | Adviser | Section 7.1 item 22 |
| 7 | Who built which part of the system | Whole team | "Who wrote this?" Each member should be able to name their part and still explain the basics. |
| 8 | One agreed answer on the senior / PWD discount | Whole team | Q53 is the most sensitive question |
