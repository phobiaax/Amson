# Cheat sheet: morning of the defense

**The system in one paragraph.** A web-based sales and inventory system for Amson Pharmaceuticals' Las Piñas branch (p.i, p.1). Customers browse, order and pay by QR Ph online, pre-order prescription medicines for pick-up, and chat with an assistant. Staff verify payments by hand, dispatch through Lalamove, sell at the POS, receive stock by batch and expiry, and export reports for the main office. Every sale takes the **earliest-expiring batch first (FEFO)**; at **6 months** before expiry a batch leaves retail, at **2 months** it becomes Bad Order. Roles are enforced by the **database rules**, and sensitive actions go to an audit log nobody can edit. Built on Firebase, deployed **Oct 22, 2026** (p.102).

**Objectives (pp.5–6)**
- General: improve **operational efficiency, customer reach, inventory accuracy** (p.5).
1. Customer e-commerce with AI chat and Rx pre-order for pick-up (p.5).
2. Sales and inventory module: transaction records, FEFO, expiry and low-stock alerts, auto-removal of near-expiry stock (p.5).
3. Admin portal: role-based product/price management, online and walk-in transactions, daily/monthly reports with batch and expiry (p.5).
4. Evaluate with **TAM** and **ISO/IEC 25010 ("security, reliability, compliance")** (p.6) ⚠ results used five other characteristics (p.102): see answer #5.

**Top 15 panel questions**

| # | Question | One-line answer | Source |
| --- | --- | --- | --- |
| 1 | What problem? | Handwritten invoices re-typed in Excel, orders over Messenger/Viber, no record of voids or price changes, expiry caught by hand. | pp.1–2 |
| 2 | Why FEFO, not FIFO? | A later delivery can expire sooner; for medicine the expiry date is what matters. | REQ065 p.54 |
| 3 | Why 6 and 2 months? | The branch's own rule: pulled out at 6, Bad Order at 2. | Interview 1 p.148 |
| 4 | Is it really real-time? | Selling is checked live; labels and holds update when the page opens; no timer on the free plan. | `products-data.js:697` |
| 5 | Objective 4 vs results? | Set at proposal; we evaluated five ISO characteristics incl. security and reliability; compliance was one question; wording should have been updated. | p.6 vs p.102 |
| 6 | Where are TAM scores? | Ease of use is in Usability, usefulness in Functional Suitability, acceptance in satisfaction; 48 of 50 would use it again. | p.118 |
| 7 | Why no payment gateway? | The owner forbids third parties in payment. | Interview 3 p.179 |
| 8 | Fake screenshot? | Staff check the real account; repeated reference numbers are flagged. | Interview 3 p.178 |
| 9 | Why no refunds? | Branch policy: paid means confirmed; only swaps; verified money on a closed hold becomes store credit. | Interview 3 pp.183–184 |
| 10 | Rx online? | Never delivered: pre-order, full payment, photo, pick up with the original. | REQ021–026 pp.48–49 |
| 11 | Where do the roles come from, and how are they enforced? | Client confirmed Sales = POS only and the encoder (Technical) handles messages; manager controls prices. Enforced by page checks plus database rules. | Interview 2 p.161; Interview 1 p.158; `firestore.rules` |
| 12 | Who changes prices? | Branch Manager only, with a reason, logged. | REQ071–073 p.55; Interview 1 p.150 |
| 13 | Diagram doesn't match? | Drawn at design; the description and requirements were updated and the system follows them. | 05-diagram-walkthrough |
| 14 | Do they still use the old POS? | Yes, by the client's choice during transition; integration is recommended. | pp.208–209, p.120 |
| 15 | Biggest limitation? | No server code on the free plan: a few checks run in the browser and timed jobs run on page load. | study/13 §2.3 |

**Key numbers**

| | | | |
| --- | --- | --- | --- |
| Requirements | 124 functional + 29 non-functional (pp.46–66) | Respondents | 53 = BM, Tech, Sales + 50 customers (p.102) |
| Survey dates | Oct 27–28, 2026 (p.103) | Highest | Customers' Reliability **4.82** (p.118) |
| All averages | ≥ 4.00 / 5 (p.118) | Interviews | 4 (Mar 29, Apr 8, Apr 15, May 12) + walkthrough (p.204) |
| Method | Agile, 6 phases of 2–3 weeks (pp.28–35) | Deployed | Oct 22, 2026 (p.102) |
| Lockout | 5 tries → 2 min (REQ004 p.47) | Hold | 7 days → closed, credit (REQ100 p.59) |
| Auto-delivered | 3 days after dispatch (REQ106 p.60) | AI cap | 400 replies/day (`chat-config.js:7`) |
| Upload limit | 10 MB (`payment.js:3`) | SI number | 8 digits |
| Expiry | 6 mo wholesale-only · 2 mo Bad Order (REQ066–067 p.54) | Free plan | ~50,000 reads/day, ~200 emails/month (p.98) |

**Panel revisions (last defense):** 1 intro ✔ · 2 objectives ◐ · 3 theoretical framework ◐ · 4 conceptual framework + methodology ✔ · 5 diagram discussions ◐ · 6 chat ✔ (still lowest rated) · 7 Rx pre-order pick-up ✔ (Fig 2.10 lacks upload) · 8 thematic RRL ✔. Details: `04-gaps-and-answers.md` §4.1.

**Before you walk in:** base catalog (25 products), photos and stock loaded; the 3 live-demo products NOT yet created; every demo account logged in on this laptop; demo files on the desktop; hotspot ready; nobody runs `deploy.bat` or Clear Test Data. Full checklist: `06-demo-script.md` §6.2–6.3.
