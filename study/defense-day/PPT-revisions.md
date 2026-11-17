# Presentation revisions (final defense)

Compared: the current deck (29 slides, proposal version) vs the paper (PRINTED MANUSCRIPT DEFENSE NOV 12). Page numbers = printed pages of the paper.
Order follows the required format: **Introduction → Methodology → Results and Discussions → Conclusion → References.**

**Biggest gaps, fix first:**
1. **Results and Discussions slides are missing entirely.**
2. **Conclusion and Recommendations slides are missing entirely.**
3. **Theoretical Framework is still the old AS-IS / TO-BE table.** It must be TAM + ISO/IEC 25010 (panel revision #3).
4. **Objectives show 3; the paper has 4.** The evaluation objective is missing (panel revision #2).
5. **Limitations say "RX items in-store only".** The paper and system now allow Rx pre-order online with pick-up (panel revision #7).

---

## INTRODUCTION

### Slide 1: Title (keep)
Add below the title: the 4 names, adviser **Hans Brent Z. Binag** (p.iii), STI College Las Piñas, November 2026, "Final Defense".

### Slides 2–3: Background of the problem (keep, small updates)
- Keep: Las Piñas branch, est. Sept 2023, 3 staff, third branch in Sta. Cruz (p.1–2).
- Change "50–100 customers weekly" source-check: the client said about 50–100 a week (Interview 4, p.192). OK as is.
- Pain points: rename "No systemic expiry tracking" to **"Expiry checked by hand (pull-out at 6 months, Bad Order at 2)"** (Interview 1, p.148). Add **"No record of who voided a sale or changed a price"** (pp.1–2).

### Slide 4: Purpose & Description (merge or drop)
Not in the required format. Either merge its 4 boxes into the background slide as "Proposed solution", or delete it. If kept, add **"Prescription pre-order (pick-up)"** and **"AI chat support"** to the E-Commerce box.

### Slide 5: Objectives (UPDATE, panel revision #2)
Copy the paper's wording exactly (pp.5–6); the panel holds the paper.
- **General:** design and develop a web-based Sales and Inventory Management System that improves the **operational efficiency, customer reach, and inventory accuracy** of Amson Pharmaceuticals (p.5).
- **1.** Customer-facing e-commerce platform: browse, order online, **AI-powered chat support**, **pre-order prescription medicines for in-store pick-up** (p.5).
- **2.** Sales and inventory module: transaction records, FEFO, real-time monitoring with expiry and low-stock alerts, auto-removal of near-expiry products (p.5).
- **3.** Administrative portal: role-based product and price management, online and walk-in transactions, exportable daily and monthly reports with batch numbers and expiry for the main office (p.5).
- **4. (missing now)** Evaluate user acceptance with the **Technology Acceptance Model** and technical quality with **ISO/IEC 25010** (p.6).
- Remove "wholesale order management module" from objective 1. In the paper wholesale is part of scope (p.6), not objective 1.

### Slides 6–7: Scope and Limitations (UPDATE, panel revision #7)
**Scope, add:**
- Prescription pre-order online: upload a doctor's prescription photo, full payment by QR Ph, **pick-up only** (p.6; REQ021–027 pp.48–49).
- AI-powered live chat with hand-off to staff (p.5).
- Purchase orders with discrepancy reporting (REQ053–058 p.53).
- Audit log of sensitive actions (REQ122–124 pp.61–62).

**Limitations, replace with the paper's list (pp.7–8):**
- Single branch; multi-branch is out of scope.
- **Prescription pre-orders are never delivered**; the original prescription must be shown at pick-up. *(Replaces "RX items in-store only".)*
- Wholesale pricing and documents are handled by staff, not shown on the retail site.
- Payment by direct QR Ph only; no gateways (client policy); staff verify manually.
- Delivery limited to the courier's service areas.
- Orders on hold up to 7 days; unresolved orders close without refund, verified payment kept as store credit.
- No self-service exchanges, cancellations or refunds; wrong-item cases handled through live chat by staff.
- Usefulness is judged on internal processes, not on outside economic conditions.

### Slide 8: Synthesis (UPDATE)
The paper groups the review into **four themes** (pp.9–17; synthesis pp.20–21). The slide has three. Add the fourth column:
- **Digital transformation of pharmacy sales, inventory and reporting**, e.g. manual processes cause stockouts and expired products (TGP Sumulong case study, 2024; p.10); web-based POS and sales recording (Amalia et al., 2026; Siregar & Yuniarto, 2025; p.14).
- Add a one-line takeaway under the columns, from p.21: "An effective pharmacy system must combine FEFO inventory, secure RBAC administration and an accessible e-commerce interface in one platform."
- Format asks for synthesis **from RRL and RRS**: label the columns' sources as literature (RRL) and studies (RRS).

### Slide 9: Comparative Analysis (keep, as the RRS part of the synthesis)
Matches the paper (Fig 1.1, p.18). Keep it right after the synthesis slide and title it "Synthesis of Related Studies", or merge both into one slide.

### Slide 10: Theoretical Framework (REPLACE, panel revision #3)
Replace the AS-IS / TO-BE table with the paper's framework (pp.21–24):
- **TAM** (Davis, 1989; Fig 1.2 p.22): Perceived Ease of Use + Perceived Usefulness → user acceptance.
- **ISO/IEC 25010** (Yenduri & Gadekallu, 2023; Fig 1.3 p.23): software quality characteristics.
- Add one line linking them to the evaluation: "Measured with five ISO/IEC 25010 characteristics (functional suitability, performance efficiency, usability, reliability, security) and overall satisfaction (p.102)." This pre-answers the objective-4 question.
- The AS-IS / TO-BE table can move to the background slide as "Current vs proposed process", or be dropped.

### Slide 11: Conceptual Framework (UPDATE to Fig 1.4, p.24)
Add the items the slide is missing:
- **Input:** Doctor's Prescriptions; Live Chat Messages; Supplier Purchase Orders (expected products, quantities, delivery date).
- **Process:** Prescription Verification; AI-Powered Chat Support; Purchase Order Verification and Discrepancy Reporting.
- **Output:** Prescription Pre-Order Status Updates; Automated Live Chat Responses; Discrepancy Reports.

---

## METHODOLOGY

### Slide 12: Type of methodology (keep)
Agile (Fig 2.1, p.28). Add: "6 phases of 2–3 weeks, client feedback after each phase; four client interviews and a walkthrough before deployment (pp.142–218)."

### Slide 13: Phases (small update, pp.30–35)
- Phase 4: "Checkout, Payment, **Prescription Pre-Order**, My Orders".
- Phase 6: add "**AI-Powered Live Chat**".

### Slide 14: Resources (delete, or fix if kept)
Not in the required format. If kept, two items are **wrong**:
- **Netlify → Firebase Hosting** (the site is hosted on Firebase, pp.35–37).
- **Tawk.to → Google Gemini through Firebase AI Logic** (the chat assistant, pp.34–37).
- Add **Cloudinary** (images, pp.35, 38) and **Bootstrap**.

### Slides 15–16: Modules (UPDATE, pp.38–46)
- **Customer side, add:** Home, Product View, **Prescription Pre-Order**, Customer Notifications, Account Settings.
- **Admin side, add:** **Walk-in Orders (POS)**, **Stock Count**, **Purchase Orders**, Price Management, Live Chat Management, Customer Accounts, **Staff User Management**.

### Slide 17: Use case diagram (keep: overall only, as the format asks)
Fig 2.2 (p.67). It shows "Manage Live Chat" on Sales Staff. Answer if asked: "Drawn on the wrong actor. The client said the encoder (Technical Staff) handles the messages (Interview 1 p.158) and Sales Staff are POS only (Interview 2 p.161); REQ121 and Fig 2.7 are correct."

### Slides 18–22: Activity diagrams (main features only)
Format says main functions only. Recommended set (all from the paper):
- **Keep:** Purchasing (Fig 2.10, p.79), Payment Verification and Order Processing (Fig 2.11, p.81), Inventory Management (Fig 2.12, p.83), Wholesale Order Processing (Fig 2.13, p.85).
- **Replace Login (Fig 2.8)** with **Walk-in Order Processing / POS (Fig 2.14, p.87)**. The POS is a main feature; login is not.
- Keep the diagrams identical to the paper (the panel compares). Be ready for Figs 2.10 and 2.11: the discussion under each figure and the system have the final flow; show it live.

### Slides 23–26: Wireframes (DELETE)
Not in the required format. Remove all four.

---

## RESULTS AND DISCUSSIONS (NEW, 3–4 slides)

### New slide: Deployment and evaluation
- Deployed to the Las Piñas branch on **October 22, 2026** (p.102).
- Survey **October 27–28, 2026**, **53 respondents**: Branch Manager, Technical Staff, Sales Staff (1 each) + **50 customers** (pp.101–103).
- 5-point Likert scale (5 Excellent … 1 Unacceptable), questions grouped under 5 ISO/IEC 25010 characteristics + overall satisfaction (TAM) (p.102).

### New slide: Summary of results (table, Chart 4.1, p.118)

| Characteristic | Branch Manager | Technical Staff | Sales Staff | Customers (50) |
| --- | --- | --- | --- | --- |
| Functional Suitability | 4.60 | 4.40 | 4.40 | 4.64 |
| Performance Efficiency | 4.00 | 4.33 | 4.00 | 4.60 |
| Usability | 4.67 | 5.00 | 4.33 | 4.66 |
| Reliability | 4.00 | 5.00 | 4.00 | **4.82** |
| Security | 4.00 | 4.50 | 4.00 | 4.62 |
| Overall Satisfaction | 4.00 | 5.00 | 5.00 | 4.75 |

*(Copy the numbers from Chart 4.1 in the printed paper to be safe.)*

### New slide: Discussion
- Every group rated every characteristic **4.00 or higher** (p.118).
- Customers rated **Reliability highest (4.82)**; **40 of 50** rated overall satisfaction Excellent; **48 of 50** would use it again (p.118).
- Lowest ratings (Fair): account safety (Branch Manager), finding a product at the POS and catalog changes showing quickly (Sales Staff), and the chat assistant (customers) (p.119). These feed the recommendations.
- Optional: one slide per group with its bar chart (Charts 2.x and 3.x, pp.104–118).

---

## CONCLUSION (NEW, 2 slides)

### New slide: Conclusion (pp.119–120)
- The system resolved the branch's problems: handwritten invoices, Excel re-encoding, ordering through messaging apps, manual expiry monitoring.
- **All four objectives were achieved:**
  1. Online store with AI chat and prescription pre-order for pick-up.
  2. Transaction records, FEFO, real-time expiry and low-stock alerts, near-expiry stock removed from sale.
  3. Role-based admin portal with exportable reports with batch and expiry, plus an audit log.
  4. Users accept it as useful and easy to use, and it meets the ISO/IEC 25010 characteristics.

### New slide: Recommendations (p.120)
- **From the survey:** POS search by barcode or generic name; faster catalog updates on all screens *(already done since the survey)*; extra login verification for staff; better AI chat answers.
- **Future work:** BIR registration for official receipts with VAT; multi-branch support (Sta. Cruz, main office); integration with the branch's existing POS; payment gateway and courier API; offline support; paid cloud plan as transactions grow.

---

## REFERENCES (slides 27–28: update)
- **Missing:** the two framework sources. Add them (copied from the paper's References, p.121 onward):
  - Davis, F. (1989). Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology. *MIS Quarterly, 13*(3), 319–340. doi:10.2307/249008
  - Yenduri, G., & Gadekallu, T. R. (2023). A review on soft computing approaches for predicting maintainability of software: State-of-the-art, technical challenges, and future directions. *Expert Systems, 40*(7). https://doi.org/10.1111/exsy.13250
- Safest: replace both slides with the paper's full References list (p.121 onward), so every source on the slides is in the paper and vice versa.

### Slide 29: Thank you (keep)
Change "3rd Year" to **4th Year** if the defense is this school year. [UNSURE: check your current year level.]

---

## Final slide order (about 24 slides)

1 Title · 2–3 Background · 4 Objectives · 5 Scope · 6 Limitations · 7 Synthesis (RRL) · 8 Synthesis (RRS / comparative) · 9 Theoretical Framework · 10 Conceptual Framework · 11 Methodology · 12 Phases · 13–14 Modules · 15 Use Case · 16–20 Activity diagrams (Purchasing, Payment Verification, Inventory, POS, Wholesale) · 21 Deployment & evaluation · 22 Results table · 23 Discussion · 24 Conclusion · 25 Recommendations · 26–27 References · 28 Thank you
