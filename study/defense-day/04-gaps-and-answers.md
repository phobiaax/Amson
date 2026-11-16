# 4. Gaps and prepared answers

Everything a panel could catch, with a short honest answer. The full text-by-text list of paper vs system differences (25 items) is in `01-defense-guide.md` §7.1; drawings in §7.2 and `05-diagram-walkthrough.md`.

## 4.1 Last defense's panel revisions: are they done?

Source: the panel's handwritten revisions list (8 items). Page numbers are where the change shows in the Nov 12 paper.

| # | Panel asked | In the paper | In the system | Status | If asked |
| --- | --- | --- | --- | --- | --- |
| 1 | Improve introduction | Background, problem and client context pp.1–4 (handwritten invoices, Excel re-encoding, messaging apps, expiry caught by hand) | — | Done in paper [UNSURE how much changed: the pre-revision version isn't in Drive] | "We rewrote it around the branch's actual problems from the interviews." |
| 2 | Revise objectives | General + 4 specific objectives, pp.5–6 | Objectives 1–3 built (02-traceability §2.1) | **Partly.** Objective 4 still says ISO "security, reliability, and compliance" (p.6), but the evaluation used five other characteristics (p.102) | G1 below. |
| 3 | Revise theoretical framework | TAM + ISO/IEC 25010, pp.21–24 (Figs 1.2, 1.3) | — | **Partly.** p.22–23 tie TAM ease of use to usability/accessibility/cultural and usefulness to performance/scalability/maintainability/adaptability; pp.23–24 name security, reliability, compliance. The results (p.118) use Functional Suitability, Performance Efficiency, Usability, Reliability, Security. The two don't line up | G1. |
| 4 | Revise discussion of conceptual framework and methodology | IPO framework p.24–27 (Fig 1.4); Agile pp.28–35 (Fig 2.1, 6 phases) | Agile sprints match the git history | Done | "The IPO shows inputs (users, products, stock, orders), the processes (FEFO, verification, RBAC) and outputs (reports, alerts, records)." |
| 5 | Revise diagrams' discussions | Every figure has a paragraph, pp.67–90 | — | **Partly.** The paragraphs match the system, but several drawings don't match their own paragraphs (Figs 2.2, 2.10, 2.11, 2.12, 2.14, 2.15) | Q55 in 01; 05-diagram-walkthrough. |
| 6 | Improve chat support | Chat: p.35, REQ035–038 p.50, REQ108–110 p.60, REQNF012 p.63 | Built-in answers + Gemini + "Talk to staff"; safety filters; Taglish | Done in system; **but** customers still rated the chat lowest (most Fair ratings, p.115, p.120) | "It's much stronger than at proposal: instant answers, live order cards, staff hand-off. Customers still rated it lowest, so it's first in our recommendations." |
| 7 | Include doctor's prescription (pre-order only, for pick-up) | Scope p.6; objective 1 p.5; REQ021–027 pp.48–49 (REQ022: full payment through QR Ph) | Upload required; pick-up only; staff approve/reject | **Done** in text and system; **Fig 2.10 (p.79) still has no prescription-upload step** | "The requirement and the system have it; the drawing missed the upload box." |
| 8 | RRL thematic format | Lit review grouped by theme pp.9–17: Digital Transformation in Pharmacy Sales…, FEFO-Based Inventory Monitoring…, E-Commerce…, System Security/RBAC…; synthesis pp.20–21 | — | Done (the word "thematic" isn't used) | "Both the literature and the studies are grouped under the same four themes, then synthesized on p.20." |

Revisions you mentioned that aren't on this sheet: **ISO/IEC 25010 alignment** (it's revisions 2–3 → partly), **PO verification with discrepancy reporting** → REQ053–058 p.53, built (`js/admin-inventory.js`, `js/admin-reports.js` po_discrepancy): **done**.

## 4.2 The serious gaps (ranked)

| # | Gap | Evidence | Prepared answer |
| --- | --- | --- | --- |
| G0 | **Demo risk: the live database had no products on Nov 16** | Firestore `products` collection empty; 5 batches, 5 categories left | Not a paper issue: reload the catalog before the defense (06-demo-script, checklist). |
| G1 | Objective 4 / theoretical framework vs evaluation: ISO "security, reliability, compliance" + TAM PU/PEOU (p.6, pp.21–24) vs five ISO characteristics and no PU/PEOU scores (p.102, p.118) | Paper only | "The framework was set at proposal. We evaluated five ISO characteristics, which include security and reliability; compliance was one question (p.106). Usefulness is reflected in Functional Suitability and ease of use in Usability; acceptance in overall satisfaction (48 of 50 would use it again). We should have updated the objective's wording." |
| G2 | Activity diagrams that don't match the real flow: Figs 2.10, 2.11 (H), 2.12, 2.14, 2.15 (M) | 05-diagram-walkthrough | "The drawings are from design; the description under each figure and the requirements were updated, and the system follows those." Then show the real flow. |
| G3 | "Real-time" / "automatically" (title; REQ066–067, REQ100, REQ106) | `js/products-data.js:697`; `js/orders.js:175` | "Selling is checked live every time. Labels, holds and auto-delivery are applied when staff or the customer open the page, because the free plan can't run timed server jobs." |
| G4 | Overall use case Fig 2.2 gives Live Chat to Sales Staff | p.67 vs REQ121 p.61, Fig 2.7 p.74 | "Drawn to the wrong actor; requirement 121 and Fig 2.7 are correct and enforced." |
| G5 | The branch still uses its old POS; p.100/p.102 imply replacement | Demo transcript pp.208–209; p.120 | "The client chose a transition period; integration is our first recommendation." |
| G6 | Chat support was a panel revision, yet scored lowest | p.115, p.120 | See 4.1 #6. |
| G7 | Client-side checks: email verification, reCAPTCHA, order prices | REQ002–003 marked partly; `study/13` §2.1 #3, #4, #16 | "They stop normal users. The database rules still protect other people's data, stock and prices. A server would need the paid plan." |
| G8 | Technical Staff void: paper p.46 says they have void authorization | `js/products-data.js:1522`; Interview 4 p.191 | "We made it stricter on the client's request: a Branch Manager login is required." |
| G9 | No exchange for online orders though the client said swapping is the only option | p.184 | 03-client-voice. |
| G10 | Senior/PWD discount absent | Interview 2 p.174 | Client decision; don't argue legality. |
| G11 | Free-plan limits: ~50,000 reads/day, ~200 emails/month (p.98) | Since Nov 16 the shop reads the catalog live on every page load | "Fine for one branch; heavier traffic would need the Blaze plan or a short cache." |
| G12 | App Check is on for the AI only, not for the database | `js/chat-config.js:11`, `js/firebase-config.js:14` | "It protects our AI quota. The database is protected by the rules, which check every request regardless." |

## 4.3 Outdated statements in the paper

| Statement | Page | Reality | Answer |
| --- | --- | --- | --- |
| Firebase Storage for files | — | [NOT FOUND IN PAPER]: the paper consistently says Cloudinary (pp.35, 38, 63, 99, 101, 103) | No issue. |
| Paid Firebase plan and domain in the budget; total ₱31,790.08 | p.98 | Free plan, free web.app address; rows add to ₱31,590.08 | Q58 in 01. |
| "Robust encryption mechanisms" | p.24 | HTTPS + Firebase hashing; no custom encryption | Q24 in 01. |
| "Instantaneous push notifications" | p.23 | In-app bell, optional browser alerts, email | 01 §7.1 #19. |
| Weekly reports | p.44; REQ111 p.60 | Date-range Daily Sales Report | 01 §7.1 #6. |
| Technical Staff "void authorization" | p.46 | Needs Branch Manager login | G8. |
| Date of completion June 2027 | p.v | Title page says November 2026 | Ask the adviser (01 §10). |
| New products/prices "should appear more quickly" (recommendation) | p.120 | **Already improved Nov 16**: the shop now reads the catalog live | "We acted on this one after the survey." |

## 4.4 Known limitations (test report and security review)

From `study/14-testing.md` §4 and `study/13-security.md` §2. Say these before the panel finds them.

| Limitation | Source | Status | One-line answer |
| --- | --- | --- | --- |
| Two staff editing the same product: last save wins | study/14 bug #9 | Not fixed | "Rare with three staff; a version check is the fix." |
| Order prices come from the browser | study/13 #3 | Partly fixed (staff warning) | Q33 in 01. |
| Same screenshot/reference reused | study/13 #5 | Warning only | Q35 in 01. |
| Cloudinary unsigned uploads; type/size checked in the browser | study/13 #6 | Owner action (preset limits) | "The preset can restrict size and type; links must be our Cloudinary (rule `photoLinkOk`)." |
| Whoever can deploy can swap the QR image | study/13 #12 | Process control | "Few people can deploy, with 2-step verification, and staff confirm money reached Amson's own account." |
| Firebase browser key not restricted to our domains | study/13 #11 | Owner action | Q31 in 01. |
| Stock-count finalize, category add, wholesale expired-document block are page-only checks | study/13 §2.2 | Accepted | "Insider risk with three staff; every action is logged." |
| Audit-log user name written by the browser | study/13 §2.2 | Accepted | "Entries can't be edited or deleted; storing the uid is the fix." |
| Deleting a profile doesn't delete the login | study/13 §2.2 | Manual step | "Removed in Firebase Authentication by the manager." |
| Clear Test Data rule active until Dec 1, 2026 | `firestore.rules:333` | Temporary | "Manager-only and switches itself off." |
| Group-test failures fixed Nov 16 (SHOP-06, PAY-04, PAY-18, PROD-13, LOG-30, DEV-02) | `study/14-testing.md` §4 | Fixed, needs retest | "Found by our group test on the live site and fixed the same week." |
