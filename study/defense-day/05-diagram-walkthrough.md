# 5. Diagram walkthrough (ranked by how likely the panel asks)

How to use: open the printed paper to the page, trace the drawing with your finger, and say the "Real system" column. Where they differ, use the one line at the bottom of each diagram.
Figs 2.2, 2.10 and 2.11 were rechecked as images on Nov 16; the others follow the v1 image check (01 §7.2) and the paper's own descriptions.

---

## 1. Fig 2.11 Admin Payment Verification and Order Processing (p.81) · Likelihood **High**

| Step in the drawing | Real system | Code |
| --- | --- | --- |
| System displays the verification queue | Same: Online Orders → Payment Verification, live, with Rx/regular filter | `js/admin-online-orders.js` verificationQueue |
| Admin validates the screenshot → Valid → "Order Confirmed" | Approve Payment: price check, FEFO deduction, SI number in one transaction | `:656` (confirmOrderSale) |
| Not valid → On Hold + reason → notify customer | Same, with 5 hold types (invalid, underpayment, not received, out of stock, Rx rejected) | `js/orders.js:44-45` |
| Customer re-uploads → **straight to "Notify Customer Order is Confirmed"** | **Different:** every fix returns to the staff queue as "Customer Resubmitted" (REQ101 p.59) | group test ORD-11 |
| Confirmed → FEFO deduction → receipt → **copy delivery details and book courier → then "Is order a prescription pre-order?"** | **Different:** Rx orders never get a courier; they go to Ready for Pick-up. Non-Rx: dispatch pop-up with the Lalamove link | `:177` (trackingLinkValidationError) |
| Resolution period expired → **admin marks Unresolved** | **Different:** the system closes it after 7 days when the order is next loaded; verified money becomes store credit | `js/orders.js:175` (enforceOrderDeadline) |

**Say:** "The description on p.81–82 and REQ094–101 are what we built; the drawing short-cuts the re-check and draws the courier before the Rx check."

## 2. Fig 2.10 Registered Customer Purchasing (p.79) · **High** (ties to panel revision #7)

| Drawing | Real system |
| --- | --- |
| Catalog → cart → checkout | Same |
| Default address? → enter or pre-fill | Same, **but only for non-Rx carts**; an Rx cart hides the address and shows a pick-up notice (`js/checkout.js` requiresPrescription) |
| Display payment details → upload proof | Same: QR Ph, screenshot, reference number |
| **"Is item Rx?" after the upload; no prescription upload** | **Different:** Rx is known at checkout; payment page requires the prescription photo too (`js/payment.js` prescriptionFile) |
| Record as Pending Payment Verification | Non-Rx: "Order Pending Verification"; Rx: "Pending Prescription Verification" (REQ024) |

**Say:** "The drawing is missing the prescription upload; REQ021–022 (pp.48–49) and the description on p.80 have it, and the system requires it."

## 3. Fig 2.2 Overall Use Case (p.67) · **High**

Five actors: Guest, Registered User (= Registered Customer), Sales Staff, Technical Staff, Branch Manager (Branch Manager inherits Technical Staff).
**Difference:** Sales Staff is linked to "Manage Live Chat"; Technical Staff isn't. The system gives live chat to Technical Staff and Branch Manager only (`js/admin-roles.js`; REQ121 p.61; Fig 2.7 p.74).
**Say:** "The line is on the wrong actor. The client told us the encoder (Technical Staff) handles customer messages and the counter can't keep up (Interview 1 p.158), and confirmed Sales Staff are POS only (Interview 2 p.161)." Full quotes: 03-client-voice, Basis for the roles.

## 4. Fig 2.12 Admin Inventory Management (p.83) · **Medium**

| Drawing | Real system |
| --- | --- |
| Receive delivery; PO exists? | Same: link to a PO or receive without one (`js/admin-inventory.js:537` applyStockReceipt) |
| Quantities mismatch → "Verify quantities" loop | PO marked **Discrepancy**, listed in the PO Discrepancy report; staff acknowledge (REQ055–058) |
| 6 months → admin chooses action | Automatic: Wholesale Only when Dashboard/Inventory opens (`js/products-data.js:697`) |
| 2 months → "FEFO stock deduction" | Bad Order: quantity to 0, automatic write-off, disposal alert (`:732` markBatchBadOrder) |
| Write-off with reason; month-end count | Same (REQ051–052, REQ059–061) |

## 5. Fig 2.14 Walk-in POS (p.87) · **Medium**

Search product → quantity → Rx? → staff check the paper prescription and tick **RX Verified** (drawn in the System lane; it's the staff's action) → FEFO deduction → receipt with SI number → print.
**Missing in drawing:** the void path (manager approval, reason, stock back to its batch; `js/products-data.js:1546`) and walk-in exchange (`:2039`).

## 6. Fig 2.15 Wholesale Exchange (p.89) · **Medium**

Request via usual channel → find buyer and PO → choose returned and replacement item → reason → system returns the item to its batch and deducts the replacement by FEFO → exchange document (EX number).
**Difference:** the drawing ends in "Generate Sales Invoice" and has no return-to-stock step; the system does both (`js/products-data.js:1952`). Cheaper replacements are refused (equal or higher only).

## 7. Fig 2.8 Login (p.76) · **Low**

Email + password → wrong: counted; 5 → locked 2 minutes (`js/auth.js:56-57`) → right: recognized device? yes → redirect by role; no → emailed 6-digit code.
**Difference:** the drawing sends a wrong code back into the password counter; the system gives codes their own limit (5 wrong → login cancelled; resend once a minute).

## 8. Fig 2.9 Registration (p.77) · **Low**

Fill fields → format checks (`js/validators.js`) → Terms pop-up (scroll to accept) → reCAPTCHA → account created (duplicate email refused here) → 6-digit email code → verified → log in.
**Difference:** order of the duplicate check and Terms.

## 9. Fig 2.13 Wholesale Order Processing (p.85) · **Low**, matches

Buyer sends PO by usual channel → find or create account (LTO, Business Permit) → documents current? (expired blocks the order) → record PO, pick items (agreed or wholesale price; free items need a reason) → FEFO deduction including Wholesale Only stock → SI number and invoice → Mark Released.
Code: `js/admin-wholesale-accounts.js:699` (saveWholesaleOrder).

## 10. Use cases Figs 2.3–2.7 (pp.68–75) · **Low**

| Fig | Actors | Point at |
| --- | --- | --- |
| 2.3 Platform access (p.68) | Guest, Registered Customer | Register, login, chat, account settings |
| 2.4 Ordering (p.70) | Registered Customer | Cart → checkout → payment → Rx pre-order → My Orders |
| 2.5 Inventory (p.71) | Technical Staff, Branch Manager | Receive, PO, write-off, count ("Stock Reconciliation" = Stock Count) |
| 2.6 Order processing (p.73) | Sales, Technical, Branch Manager | POS, online orders, wholesale |
| 2.7 Admin controls (p.74) | Technical Staff, Branch Manager | Staff, prices (manager), reports, audit log. **Best figure to show roles.** |

---

## Nov 18 recheck of all 14 use-case and activity drawings (new findings only)

| Fig | Difference in the drawing | Say |
| --- | --- | --- |
| 2.2 (p.67) | Sales Staff linked to Manage Live Chat; Technical Staff not. Fig 2.7 (p.74) has it right | "Line on the wrong actor; 2.7 and the system give chat to Technical Staff" |
| 2.6 (p.73) | Generate Reports and Process Wholesale linked only to Branch Manager; system lets Technical Staff do both | "Technical Staff is the encoder who makes the reports (p.143)" |
| 2.6 | Void linked to Technical Staff with no approval step | "Technical Staff start it, the Branch Manager approves (p.191)" |
| 2.8 (p.76) | No reCAPTCHA; a wrong OTP goes to the password counter | "reCAPTCHA is on login (REQ003); codes have their own limit" |
| 2.9 (p.77) | No reCAPTCHA step; duplicate check drawn before the Terms | "reCAPTCHA is on the form; order of checks differs" |
| 2.12 (p.83) | Under 2 months: "Apply FEFO-Based Stock Deduction" | "It's written off as Bad Order and can't be sold" |
| 2.12 | Mismatch branch repeats "Verify quantities" instead of "PO marked Discrepancy + report" | "Discrepancy report, staff acknowledge (REQ055-058)" |
| 2.12 | Receiving always links a PO | "Receiving works with or without a PO" |
| 2.12 | 6 months: admin picks Write Off or Free-of-Cost | "Automatic Wholesale Only; free-of-cost is chosen on the wholesale order" |
| 2.13 (p.85) | No "Mark Released" step; free-of-cost only for near-expiry | "Release step added; any free item needs a reason" |
| 2.14 (p.87) | No payment method / reference number step | "Non-cash needs a reference number (client, p.207)" |
| 2.3, 2.4, 2.5, 2.7 | Match the system | — |
