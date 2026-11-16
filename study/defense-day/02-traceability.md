# 2. Traceability: paper vs system

Paper = PRINTED MANUSCRIPT DEFENSE NOV 12 (printed page numbers). Code = branch `amson`, checked Nov 16, 2026.
Status: **matches** · **partly** (works, but not exactly as written) · **different** (works another way) · **missing** · **extra** (in the system, not in the paper).
Each "Where" cell points at a file and line found by searching the code for that feature; open it to show the panel.

## 2.1 Objectives (Paper pp.5–6, "Objectives")

| Objective | Paper | Where in the system | Status | Notes |
| --- | --- | --- | --- | --- |
| General: improve operational efficiency, customer reach, inventory accuracy | p.5 | Whole system | matches | Conclusion p.119 claims it; evaluation p.118. |
| 1. Customer e-commerce: browse, order online, AI chat, Rx pre-order for pick-up | p.5 | `shop/*.html`; `js/live-chat.js`; `js/payment.js` | matches | Panel revisions #6 (chat) and #7 (Rx pre-order) live here. |
| 2. Sales and inventory module: transaction records, FEFO, real-time monitoring, expiry and low-stock alerts, auto-removal of near-expiry | p.5 | `js/products-data.js:1806` (deductStockFEFOOnce), `:256` (isRetailSellableBatch), `:697` (enforceExpiryStatus) | partly | "Real-time"/"auto" status labels update when Dashboard or Inventory opens; retail exclusion is live. See Gap G3. |
| 3. Admin portal: product data and pricing by role, online and walk-in transactions, exportable daily/monthly reports with batch and expiry for the main office | p.5 | `admin/*.html`; `js/admin-roles.js`; `js/admin-reports.js` | matches | |
| 4. Evaluate with TAM (perceived usefulness, ease of use) and ISO/IEC 25010 "security, reliability, and compliance" | p.6 | Survey, pp.101–118 | **different** | Evaluation used Functional Suitability, Performance Efficiency, Usability, Reliability, Security + overall satisfaction (p.102). No separate PU/PEOU scores; compliance not a reported characteristic. See Gap G1. |

## 2.2 Functional and non-functional requirements (Paper pp.46–66)

| ID | Requirement (short) | Paper page | Where in the system | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| REQ001 | Require new customers to register using their full name, email address, contact number, and password before ac… | p.46 | `js/register.js:193` (createCustomerAccount) | matches |  |
| REQ002 | Send an email verification code during registration and activate the account only after successful verificatio… | p.46 | `js/verify-email.js:92` | partly | Works in normal use; the check runs in the browser, so a technical user could skip it (study/13 §2.1 #4). |
| REQ003 | Implement reCAPTCHA validation during registration and login to prevent automated access attempts. | p.46 | `js/auth.js:120` | partly | reCAPTCHA is checked in the browser only (study/13 §2.1 #16). |
| REQ004 | Lock a customer account for 2 minutes after 5 consecutive failed login attempts, preventing further attempts d… | p.47 | `js/auth.js:56`; `firestore.rules:358` (loginLockValid) | matches | Rules also enforce it (count-up only). |
| REQ005 | Require customers to complete email OTP verification when logging in from an unrecognized device. | p.47 | `js/device-trust.js:4`; `js/auth.js:159` | matches | Was off Oct 25–Nov 9, back on now. |
| REQ006 | Display the platform's Terms and Conditions during customer registration and require the user to confirm accep… | p.47 | `js/terms-gate.js` | matches | Accept stays disabled until scrolled to the bottom (group test LOG-31). |
| REQ007 | Provide a password recovery feature that sends a time-limited reset link to the customer's registered email ad… | p.47 | `js/forgot-password.js:49` | matches |  |
| REQ008 | Display a home page accessible to guests and logged-in customers featuring products, store announcements, prom… | p.47 | `js/store-info.js:74`; `js/shop-sections.js` | matches |  |
| REQ009 | Display a catalog of available OTC products organized by category and showing product name, unit price, and st… | p.47 | `js/products-data.js:208` (storefrontCatalog) | matches | Rx items also listed (with Rx tag); paper says "OTC products" here but REQ021 allows Rx pre-order. |
| REQ010 | Allow customers to filter products by category, price range, and stock status. | p.47 | `js/products.js:76` | matches |  |
| REQ011 | Return relevant product results when a customer searches by keyword or product name. | p.47 | `js/products.js:24` | matches |  |
| REQ012 | Display a message informing the customer that no products were found when a search query or filter combination… | p.47 | `js/products.js:110` | matches |  |
| REQ013 | Display a dedicated product page showing the product name, description, unit price, stock availability, dosage… | p.48 | `js/product-details.js:40` | matches |  |
| REQ014 | Maintain a persistent cart for each logged-in customer until checkout or manual removal of items. | p.48 | `js/cart.js:44` | matches | Saved to the account; follows the customer across devices. |
| REQ015 | Allow customers to adjust item quantities and remove items from the cart before checkout. | p.48 | `js/cart-page.js:151` | matches |  |
| REQ016 | Display a running cart total that updates whenever item quantities are changed. | p.48 | `js/cart-page.js:11` | matches |  |
| REQ017 | Collect the customer's delivery address before order submission. | p.48 | `js/checkout.js:128` | matches |  |
| REQ018 | Allow customers to save a default delivery address to their account for use in future checkouts. | p.48 | `js/checkout.js:189` | matches |  |
| REQ019 | Prevent order submission if the delivery address has not been provided. | p.48 | `js/checkout.js:114` (checkoutFormIsValid) | matches |  |
| REQ020 | Display a notice informing the customer that the delivery fee is to be paid directly to the Lalamove rider upo… | p.48 | `shop/checkout.html:176` | matches |  |
| REQ021 | Allow registered customers to select eligible prescription-only medicines for pre-order and shall require them… | p.48 | `js/payment.js:184` | matches |  |
| REQ022 | Require registered customers to complete full payment through QR Ph and upload a payment screenshot as proof b… | p.49 | `js/payment.js:212` | matches | Panel revision #7 (pre-order only, pick-up). |
| REQ023 | Automatically designate all prescription pre- orders as in-store pick-up only and shall prevent delivery from … | p.49 | `js/checkout.js:58` | matches |  |
| REQ024 | Submit the prescription pre-order in a Pending Prescription Verification status and shall not proceed to prepa… | p.49 | `js/orders.js:17` | matches |  |
| REQ025 | Notify the customer when their prescription pre- order has been approved and is ready for pick-up, or rejected… | p.49 | `js/admin-online-orders.js:640` | matches |  |
| REQ026 | Display a notice informing the customer that the original physical prescription must be presented at the branc… | p.49 | `js/product-details.js:55` | matches |  |
| REQ027 | Allow customers to view the current status of their prescription pre-order in the My Orders module. | p.49 | `js/orders-list.js:38` | matches |  |
| REQ028 | Display the branch's QR Ph QR code and account details to the customer upon order placement. | p.49 | `shop/payment.html:134` | matches | Static QR Ph image (assets/payment-qr.jpg). |
| REQ029 | Require customers to upload a screenshot or photo of their completed QR Ph payment before the order can procee… | p.49 | `js/payment.js:16` | matches |  |
| REQ030 | Hold the order in a pending payment verification status until an administrator confirms the uploaded proof of … | p.50 | `js/payment.js:318` | matches |  |
| REQ031 | Maintain a complete record of each customer's past and active orders organized by status, including Order Pend… | p.50 | `js/orders-list.js:12` (renderOrderCard) | matches |  |
| REQ032 | Allow customers to view the full details of any order, including items, quantities, total amount, and current … | p.50 | `js/order-details.js:213` (renderOrder) | matches |  |
| REQ033 | Allow customers to view and download the system-generated receipt for an order once its payment has been verif… | p.50 | `js/orders.js:340` (downloadOrderReceipt) | matches | Since Nov 16 the button always works and explains when it isn't ready (group test PAY-18). |
| REQ034 | Allow customers to monitor the delivery progress of active orders based on status updates managed and triggere… | p.50 | `js/order-details.js:255` | matches |  |
| REQ035 | Provide a live chat interface accessible to both guests and registered customers. | p.50 | `js/live-chat.js:639` | matches |  |
| REQ036 | Generate AI-powered responses for common customer inquiries, including product browsing, order steps, payment … | p.50 | `js/live-chat.js:569` (chatAiReply) | matches | Built-in answers first, then Gemini; no medical advice. Panel revision #6. |
| REQ037 | Allow customer concerns to be handled by staff when the inquiry requires human assistance. | p.50 | `js/live-chat.js:28` | matches |  |
| REQ038 | Notify staff of new or escalated live chat messages through the admin notification system. | p.51 | `js/products-data.js:649` (waitingChatAlerts) | matches |  |
| REQ039 | Send customers in-platform and email notifications when an order is placed, and for order confirmations, order… | p.51 | `js/orders.js:140` | matches | Email skipped when the customer turns email updates off (REQ042). |
| REQ040 | Allow customers to update their display name, delivery address, registered contact number, and profile picture… | p.51 | `js/account-settings.js:50` | matches |  |
| REQ041 | Require customers to confirm their current password before a new password is set. | p.51 | `js/account-settings.js:224` | matches |  |
| REQ042 | Allow customers to enable or disable email notifications through their account settings. | p.51 | `js/account-settings.js:51` | matches |  |
| REQ043 | Require all staff to log in using credentials created by the Branch Manager, with role-based permissions appli… | p.51 | `js/admin-staff-management.js:105` | matches |  |
| REQ044 | Require OTP verification for all staff only when logging in from an unrecognized device. | p.51 | `js/admin-header.js:37` | matches |  |
| REQ045 | Lock a staff account for 2 minutes after 5 consecutive failed login attempts. | p.51 | `js/auth.js:57` | matches | Same lockout code for staff and customers. |
| REQ046 | Provide a password recovery feature for staff that sends a reset link to the registered email address upon req… | p.52 | `js/forgot-password.js:49` | matches |  |
| REQ047 | Present a dashboard upon staff login showing daily sales totals, active order count, current low-stock items, … | p.52 | `js/admin-dashboard.js:215` | matches |  |
| REQ048 | Notify Branch Manager and Technical Staff of new customer orders, pending payment verifications, low or zero s… | p.52 | `js/products-data.js:421` (computeStaffNotifications) | matches |  |
| REQ049 | Display a complete inventory list showing available stock per product broken down by expiration batch together… | p.52 | `js/admin-inventory.js:14` | matches |  |
| REQ050 | Ensure consistent inventory updates across concurrent transactions to prevent overselling and inaccurate stock… | p.52 | `js/products-data.js:1806` (deductStockFEFOOnce) | matches | Transactions; race tests 16/16 (study/14 §4). |
| REQ051 | Allow authorized staff to record inventory write- offs for expired, damaged, or unsellable items. | p.52 | `js/admin-inventory.js:101` | matches |  |
| REQ052 | Require a stated reason before any inventory write-off is saved. | p.52 | `js/admin-inventory.js:1210` | matches |  |
| REQ053 | Allow authorized staff to create purchase orders by specifying the supplier, expected products, expected quant… | p.53 | `js/admin-inventory.js:17` | matches | Panel-era revision: PO verification with discrepancy. |
| REQ054 | Allow staff to link an incoming stock delivery to an existing purchase order during the receiving process. | p.53 | `js/admin-inventory.js:527` | matches |  |
| REQ055 | Automatically compare received quantities against the linked purchase order quantities upon submission of the … | p.53 | `js/admin-inventory.js:6` | matches |  |
| REQ056 | Generate a Discrepancy Report when the received quantity of any item differs from the PO quantity, detailing e… | p.53 | `js/admin-reports.js:10` | matches |  |
| REQ057 | Update the purchase order status to Received when all delivered quantities match the PO, and shall require sta… | p.53 | `js/admin-inventory.js:6` | matches |  |
| REQ058 | Allow authorized staff to generate discrepancy reports for a selected date range from the Inventory Report Mod… | p.53 | `js/admin-reports.js:10` | matches |  |
| REQ059 | Provide a Stock Count interface allowing authorized staff to input physical count quantities. | p.53 | `js/admin-inventory.js:18` | matches |  |
| REQ060 | Automatically calculate and display the variance between the physical count and the system-recorded stock. | p.53 | `js/admin-inventory.js:1357` | matches |  |
| REQ061 | Allow the Branch Manager to finalize the count, overriding the system inventory with the physical count and re… | p.53 | `js/admin-inventory.js:1675` (finalizeCount) | partly | Manager-only step is enforced by the page, not the rules (study/13 §2.2). |
| REQ062 | Allow staff to record incoming supplier deliveries by entering the product name, received quantity, batch numb… | p.54 | `js/admin-inventory.js:537` (applyStockReceipt) | matches |  |
| REQ063 | Add newly received stock to the active inventory immediately upon confirmation of the delivery record. | p.54 | `js/admin-inventory.js:537` (applyStockReceipt) | matches |  |
| REQ064 | Allow staff to upload multiple stock entries simultaneously using a pre-formatted Excel or CSV template file, … | p.54 | `js/admin-inventory.js:769` | matches |  |
| REQ065 | Apply First Expired, First Out (FEFO) logic across all transactions so that the batch with the earliest expira… | p.54 | `js/products-data.js:1806` (deductStockFEFOOnce) | matches | Online, POS and wholesale all use it. |
| REQ066 | Automatically flag product batches within six months of their expiration date and remove them from available s… | p.54 | `js/products-data.js:247`; `js/products-data.js:697` (enforceExpiryStatus) | partly | Retail exclusion is live at every sale/display; the status label updates when Dashboard or Inventory opens (no timer on the free plan). |
| REQ067 | Automatically flag product batches within two months of their expiration date as Bad Order (BO), triggering a … | p.54 | `js/products-data.js:694`; `js/products-data.js:732` (markBatchBadOrder) | partly | Same as REQ066: applied when Dashboard or Inventory opens. |
| REQ068 | Allow authorized staff to create, edit, and remove product records including product name, category, descripti… | p.54 | `js/admin-products.js:47` | matches |  |
| REQ069 | Allow authorized staff to add, edit, and remove supplier records linked to products. | p.55 | `js/admin-suppliers.js` | matches |  |
| REQ070 | Allow authorized staff to add, rename, and remove product categories used in the catalog. | p.55 | `js/admin-products.js:962` | matches |  |
| REQ071 | Restrict product price modifications to the Branch Manager role only. | p.55 | `firestore.rules:78` (priceFieldsUnchanged) | matches | Enforced by the rules, not just the page. |
| REQ072 | Require the Branch Manager to confirm a price change before it is saved. | p.55 | `js/admin-products.js:495` | matches |  |
| REQ073 | Record every confirmed price change in the Audit Log, including the previous price, updated price, stated reas… | p.55 | `js/admin-products.js:490` | matches |  |
| REQ074 | Display all incoming customer orders in a searchable and filterable order queue. | p.55 | `js/admin-online-orders.js:124` | matches |  |
| REQ075 | Allow authorized staff to confirm, update, or place on hold customer orders. | p.55 | `js/admin-online-orders.js:19` | matches |  |
| REQ076 | Perform FEFO-based stock deduction automatically upon order confirmation. | p.55 | `js/admin-online-orders.js:656` (confirmOrderSale) | matches | Stock is deducted at approval, not at checkout. |
| REQ077 | Display a prescription pre-order verification queue to authorized staff listing all pending RX pre-orders with… | p.55 | `js/admin-online-orders.js:438` | matches |  |
| REQ078 | Allow authorized staff to approve a prescription pre-order after confirming the validity of the uploaded presc… | p.56 | `js/admin-online-orders.js:761` | matches |  |
| REQ079 | Require a mandatory stated reason before a prescription pre-order rejection is confirmed and shall include the… | p.56 | `js/admin-online-orders.js:640` | matches |  |
| REQ080 | Prevent prescription pre-orders from being assigned to delivery under any circumstances. | p.56 | `js/payment.js:310` | matches |  |
| REQ081 | Record the staff member, timestamp, and action taken for each prescription pre-order verification entry. | p.56 | `js/admin-online-orders.js:58` (verificationStamp) | matches |  |
| REQ082 | Allow Technical Staff and Sales Staff to process walk-in purchases, including both OTC and physically served R… | p.56 | `js/admin-pos.js` | matches |  |
| REQ083 | Allow staff to void a completed walk-in transaction and shall require a stated reason before the void is recor… | p.56 | `js/products-data.js:1546` (voidPosSale); `firestore.rules:26` (isManager) | different | Stricter than written: Sales Staff can't void; Technical Staff need the Branch Manager's login (Interview 4 p.191). Partial voids added. |
| REQ084 | Allow walk-in transactions involving RX items to be recorded through the Walk-in Orders sub-module and shall p… | p.56 | `js/admin-pos.js:273` | matches |  |
| REQ085 | Allow administrators to create and manage wholesale buyer accounts, storing client name, contact details, busi… | p.57 | `js/admin-wholesale-accounts.js` | matches |  |
| REQ086 | Allow administrators to upload and store soft copies of required wholesale business documents, including Licen… | p.57 | `js/admin-wholesale-accounts.js:16` | matches |  |
| REQ087 | Allow administrators to record purchase orders submitted by wholesale clients, linking each PO to the buyer's … | p.57 | `js/admin-wholesale-accounts.js:699` (saveWholesaleOrder) | matches |  |
| REQ088 | Restrict wholesale pricing to administrator access only and shall not display wholesale prices on the retail e… | p.57 | `js/products-data.js:905` | matches | Wholesale/cost prices live in staff-only productPrices. |
| REQ089 | Maintain a purchase history per wholesale account, allowing administrators to view all previous orders placed … | p.57 | `js/admin-wholesale-accounts.js:132` | matches |  |
| REQ090 | Allow administrators to process wholesale item exchanges in which a returned item is replaced with another ite… | p.57 | `js/products-data.js:1952` (processWholesaleExchange) | matches |  |
| REQ091 | Allow administrators to record free-of-cost distributions of near-expiry items to wholesale clients, logged at… | p.57 | `js/admin-wholesale-accounts.js:64` | matches |  |
| REQ092 | Automatically generate a transaction record for every confirmed transaction: ▪ For Retail/Walk-in transactions… | p.58 | `js/products-data.js:1924` | matches | 8-digit SI numbers. |
| REQ093 | Generate a receipt for the customer upon payment verification and make it available for download from the My O… | p.58 | `js/orders.js:340` (downloadOrderReceipt) | matches |  |
| REQ094 | Display a payment verification queue to administrators listing all retail orders with uploaded proof of paymen… | p.58 | `js/admin-online-orders.js:638` | matches |  |
| REQ095 | Allow administrators to confirm a payment, or place an order on hold with a recorded reason specifying the pay… | p.58 | `js/admin-online-orders.js:19` | matches |  |
| REQ096 | Allow administrators to update the order status to On Hold - Invalid Screenshot and notify the customer to re … | p.58 | `js/admin-online-orders.js:7` | matches |  |
| REQ097 | Allow administrators to update the order status to On Hold - Underpayment, record the outstanding amount, and … | p.58 | `js/admin-online-orders.js:13` | matches |  |
| REQ098 | Allow administrators to confirm an overpaid order and record the excess amount as store credit linked to the c… | p.58 | `js/admin-online-orders.js:1027` | matches |  |
| REQ099 | Allow administrators to update the order status to On Hold - Payment Not Received, record the reason, and noti… | p.59 | `js/admin-online-orders.js:20` | matches |  |
| REQ100 | Enforce a maximum order hold duration of seven (7) days, after which unresolved orders are automatically marke… | p.59 | `js/orders.js:175` (enforceOrderDeadline) | partly | Closed the next time a page loads that order, not at the exact minute (no server timer). |
| REQ101 | Update the order status from pending verification to confirmed upon administrator approval of the uploaded pay… | p.59 | `js/admin-online-orders.js:753` | matches |  |
| REQ102 | Notify the customer when their payment has been verified, and the order has been confirmed. | p.59 | `js/admin-online-orders.js:9` | matches |  |
| REQ103 | Compile the customer's exact delivery details (Address, Name, Contact, Preferred Schedule, Order ID) and provi… | p.59 | `js/admin-online-orders.js:1174` | matches |  |
| REQ104 | Allow the administrator to manually update the order status to "Dispatched" and input the external Lalamove tr… | p.59 | `js/admin-online-orders.js:180` | matches |  |
| REQ105 | Automatically reflect these administrative status updates in the customer's order tracking view, allowing staf… | p.59 | `js/order-details.js:305` | matches |  |
| REQ106 | Automatically update the order status from "Dispatched" to "Delivered" if the customer does not manually confi… | p.60 | `js/orders.js:93` | partly | Applied when the order is next loaded (no timer). |
| REQ107 | Allow staff to add optional internal notes to delivery records for reference. | p.60 | `js/admin-online-orders.js:1151` | matches |  |
| REQ108 | Display customer chat messages and AI-assisted conversations to authorized staff in a live chat management int… | p.60 | `js/admin-live-chat.js` | matches |  |
| REQ109 | Allow staff to respond to customer messages and manage concerns that require human assistance. | p.60 | `js/admin-live-chat.js:3` | matches |  |
| REQ110 | Allow staff to mark chat threads as resolved. | p.60 | `js/admin-live-chat.js:9` | matches |  |
| REQ111 | Allow authorized staff to generate and export daily, weekly, and monthly sales reports for a selected date ran… | p.60 | `js/admin-reports.js:3` | partly | No separate "weekly" report; the Daily Sales Report takes any date range. |
| REQ112 | Allow authorized staff to export monthly inventory and supplier purchase reports, showing the supplier, batch … | p.60 | `js/admin-reports.js:7` | matches |  |
| REQ113 | Allow authorized staff to generate pull-out reports for documenting items removed from active inventory due to… | p.60 | `js/admin-reports.js:8` | matches |  |
| REQ114 | Allow authorized staff to generate wholesale exchange reports documenting all item exchanges processed during … | p.61 | `js/admin-reports.js:9` | matches |  |
| REQ115 | Allow all report types to be exported in PDF or Excel format. | p.61 | `js/admin-reports.js:715` | matches |  |
| REQ116 | Allow authorized staff to view registered retail customer profiles, including account status, registration dat… | p.61 | `js/admin-customer-accounts.js:80` | matches |  |
| REQ117 | Allow authorized staff to deactivate customer accounts when necessary, without deleting the account record. | p.61 | `js/admin-customer-accounts.js:59` | matches |  |
| REQ118 | Allow the Branch Manager to create, modify, and revoke staff accounts. | p.61 | `js/admin-staff-management.js:48` | matches |  |
| REQ119 | Allow the Branch Manager to assign a designated role to each staff account that determines accessible modules … | p.61 | `js/admin-roles.js:12` | matches |  |
| REQ120 | Enforce role-based access so that Technical Staff cannot access the Staff User Management module or the Price … | p.61 | `js/admin-roles.js:12`; `firestore.rules:69` (isPriceManager) | matches |  |
| REQ121 | Restrict Sales Staff access to the Walk-in Orders sub-module and product catalog viewing only. | p.61 | `js/admin-roles.js:3` | matches |  |
| REQ122 | Record all sensitive system actions including price changes, order management actions (payment approvals, hold… | p.61 | `js/products-data.js:2349` (logAuditEvent) | partly | All listed actions are logged; the user name in each entry is written by the browser (study/13 §2.2). |
| REQ123 | Make the Audit Log accessible to the Branch Manager and Technical Staff for review. | p.62 | `js/admin-roles.js:22` | matches |  |
| REQ124 | Prevent any audit log entry from being edited or deleted once recorded. | p.62 | `firestore.rules:240` | matches | Rules allow create only; no update/delete. |
| REQNF001 | Present a consistent and organized layout across all pages, making it straightforward for both customers and a… | p.62 | `css/style.css:3` | matches |  |
| REQNF002 | Display meaningful feedback messages when a user performs an action, such as confirming a successful transacti… | p.62 | `js/products-data.js:47` (showAppAlert) | matches |  |
| REQNF003 | Render correctly and remain fully usable across desktops, laptops, tablets, and mobile phones without requirin… | p.62 | `css/style.css:165` | matches | Phone fixes from group test DEV-01..03. |
| REQNF004 | Complete standard operations such as loading the product catalog, updating cart contents, and submitting order… | p.62 | `js/products-data.js:964` (loadCatalogCache) | partly | [UNSURE] No timing benchmark in the paper or tests; p.119 notes the Sales Staff's Fair rating on speed. |
| REQNF005 | Reflect inventory changes and order status updates across the platform without requiring a manual page refresh… | p.63 | `js/products-data.js:799` (liveQuery) | matches | Live listeners. Since Nov 16 the shop also reads the catalog live (no 5-minute copy). |
| REQNF006 | Produce sales and inventory reports within a reasonable time frame regardless of the volume of records being p… | p.63 | `js/admin-reports.js:919` (generateReport) | matches |  |
| REQNF007 | Function correctly across major web browsers including Google Chrome, Mozilla Firefox, Microsoft Edge, and Saf… | p.63 | `css/style.css:165` | partly | Group tests covered Chrome, Edge, Safari (DEV-01/02); Firefox [UNSURE]. |
| REQNF008 | Integrate with third-party services used in operations including Google Gemini (Firebase AI Logic), Cloudinary… | p.63 | `js/chat-config.js:4`; `js/cloudinary-config.js:1`; `js/emailjs-config.js` | matches |  |
| REQNF009 | Store all user passwords using secure hashing algorithms and shall not expose raw credentials at any point in … | p.63 | `js/auth.js:139` | matches | Firebase Authentication hashes passwords; the app never stores them. |
| REQNF010 | Transmit all data between the user's browser and the server over an encrypted connection to prevent intercepti… | p.63 | `firebase.json:35` | matches | HTTPS by Firebase Hosting; security headers added. |
| REQNF011 | Enforce role-based access controls so that customers cannot access administrator functions, and each staff rol… | p.63 | `firestore.rules:19` (isStaff) | matches |  |
| REQNF012 | Not transmit personally identifiable patient information, prescription photographs or order details as part of… | p.63 | `js/live-chat.js:569` (chatAiReply) | matches | Only the question, last 8 messages and a short product list go to the AI (chat-config.js historyMessages: 8). |
| REQNF013 | Be hosted on Firebase Hosting, which supports continuous uptime during regular business hours. The database sh… | p.64 | `js/admin-backup.js` | matches | Delete protection on; manual backup download. No automatic backups (free plan). |
| REQNF014 | Display descriptive error messages when an operation cannot be completed, allowing users to understand what we… | p.64 | `js/auth.js:39` (mapAuthError) | matches |  |
| REQNF015 | Be built on an architecture that can support a growing number of registered users, product listings, and concu… | p.64 | `firebase.json:5` | partly | Firestore scales, but the free Spark plan caps reads (about 50,000/day) (p.98). |
| REQNF016 | Allow new branch accounts and inventory records to be added to the platform in future development cycles witho… | p.64 | — | missing | Single branch only (scope p.7). Future work p.120. |
| REQNF017 | Be developed using a modular code structure with accompanying documentation so that individual components can … | p.64 | `study/` | matches | The study/ guides. |
| REQNF018 | Include administrative tools that allow authorized personnel to manage products, users, and inventory records … | p.64 | `js/admin-roles.js:12` | matches |  |
| REQNF019 | Be deployable to alternative hosting environments without requiring structural changes to the application's co… | p.65 | `firebase.json:8` | partly | Static files can be hosted anywhere, but login/database/AI depend on Firebase. |
| REQNF020 | Support data export in standard formats including PDF and Excel to ensure that records remain accessible and u… | p.65 | `js/admin-reports.js:834` | matches |  |
| REQNF021 | Be operable by users with a basic level of digital literacy, requiring no prior technical training to complete… | p.65 | `js/live-chat.js:678` | matches | Survey usability averages 4.33–5.00 (p.118). |
| REQNF022 | Function on any device with a modern web browser and an active internet connection, without requiring the inst… | p.65 | `css/style.css:165` | matches |  |
| REQNF023 | Be designed so that new features, modules, or workflow adjustments can be incorporated in future development c… | p.65 | `js/admin-roles.js:12` | matches |  |
| REQNF024 | Be structured to allow future integration with external services such as third-party courier tracking, additio… | p.65 | `js/admin-online-orders.js:180` | partly | Lalamove tracking link only; no courier/payment API (client decisions). |
| REQNF025 | Collect, store, and process customer personal data in accordance with the provisions of the Data Privacy Act o… | p.65 | `js/legal-content.js:42` | partly | Privacy notice and consent in Terms; access limited by rules. No formal DPA compliance audit [UNSURE]. |
| REQNF026 | Use English as the standard language for all labels, instructions, error messages, and communications througho… | p.66 | `js/legal-content.js` | matches | Labels in English; the chat also understands Taglish. |
| REQNF027 | Present all monetary values in Philippine Peso (₱), formatted with two decimal places and comma separators for… | p.66 | `js/products-data.js:1241` (formatPeso) | matches |  |
| REQNF028 | Display dates in MM/DD/YYYY format and times in 12-hour format with AM/PM notation, consistent with convention… | p.66 | `js/products-data.js:1222` (formatDateMDY) | matches | MM/DD/YYYY and 12-hour time. |
| REQNF029 | Maintain clear and professional language throughout all interfaces, avoiding informal or ambiguous phrasing in… | p.66 | `js/legal-content.js` | matches |  |

Totals: 124 functional + 29 non-functional = 153. Status count: 136 matches, 15 partly, 1 different (REQ083), 1 missing (REQNF016).

## 2.3 Use case diagrams (Paper pp.67–75)

| Diagram | Paper | Where in the system | Status | Notes |
| --- | --- | --- | --- | --- |
| Fig 2.2 Overall Use Case | p.67 | All modules | partly | Drawing links **Sales Staff** to "Manage Live Chat" and not Technical Staff; system is the reverse (`js/admin-roles.js` ADMIN_PAGE_ACCESS). Actor labelled "Registered User" vs text "Registered Customer". |
| Fig 2.3 Platform Access and Account Management (Guest, Registered Customer) | p.68 | `register.html`, `login.html`, `js/auth.js`, `js/account-settings.js`, `js/live-chat.js` | matches | |
| Fig 2.4 Customer Ordering and Purchase Management | p.70 | `js/cart.js`, `js/checkout.js`, `js/payment.js`, `js/orders-list.js` | matches | Text (p.70) describes the prescription upload correctly. |
| Fig 2.5 Inventory Management (Technical Staff, Branch Manager) | p.71 | `js/admin-inventory.js` | partly | Named "Stock Reconciliation" (system: Stock Count). Text p.72 says the Branch Manager opens the count; system: staff count, manager finalizes (REQ061). |
| Fig 2.6 Order Processing and Sales Operations | p.73 | `js/admin-online-orders.js`, `js/admin-pos.js` | matches | |
| Fig 2.7 Administrative Controls | p.74 | `js/admin-staff-management.js`, `js/admin-products.js`, `js/admin-audit-log.js`, `js/admin-reports.js` | matches | Correctly shows Sales Staff limited to POS and catalog. |

## 2.4 Activity diagrams (Paper pp.76–90)

| Diagram | Paper | Where in the system | Status | Notes (details in 05-diagram-walkthrough.md) |
| --- | --- | --- | --- | --- |
| Fig 2.8 Login (Admin and Customer) | p.76 | `js/auth.js:116` (performLogin), `js/device-trust.js` | partly | Drawing feeds a wrong OTP into the password counter; system: wrong device codes have their own 5-try limit. |
| Fig 2.9 Account Registration (Guest) | p.77 | `js/register.js:193` (createCustomerAccount), `js/verify-email.js` | partly | Order differs: system shows Terms before submit; duplicate email found when the account is created. |
| Fig 2.10 Registered Customer Purchasing | p.79 | `js/checkout.js`, `js/payment.js` | **different** | "Is item Rx?" comes after payment upload; no prescription upload step; Rx order still shows address entry. System detects Rx at checkout, hides the address, requires the prescription photo. |
| Fig 2.11 Admin Payment Verification and Order Processing | p.81 | `js/admin-online-orders.js:656` (confirmOrderSale) | **different** | Customer fix goes straight to "Order Confirmed" without staff re-check; courier booked before the Rx check; admin marks expired holds by hand. System: every fix returns to staff (REQ101); Rx orders skip delivery; holds close automatically on load. |
| Fig 2.12 Admin Inventory Management | p.83 | `js/admin-inventory.js:537` (applyStockReceipt) | partly | Mismatch branch loops "Verify quantities"; 2-month branch ends in FEFO deduction; 6-month action chosen by admin. System: PO marked Discrepancy; 2-month stock written off; flags automatic. |
| Fig 2.13 Wholesale Order Processing | p.85 | `js/admin-wholesale-accounts.js:699` (saveWholesaleOrder) | matches | Expired documents block the order (page-level check). |
| Fig 2.14 Walk-in Order Processing (POS) | p.87 | `js/admin-pos.js`, `js/products-data.js:1546` (voidPosSale) | partly | No void path drawn; "Mark RX as Verified" placed in the System lane (staff tick it). |
| Fig 2.15 Wholesale Exchange | p.89 | `js/products-data.js:1952` (processWholesaleExchange) | partly | Ends in "Generate Sales Invoice"; no return-to-stock step drawn. System returns the item to its batch and makes an exchange document. |

## 2.5 In the system but not in the paper (extra)

| Feature | Where | Why it exists |
| --- | --- | --- |
| Walk-in return / exchange with EX number (equal or higher value only) | `js/products-data.js:2039` (processWalkinExchange) | Client asked to keep returns separate from voids (Demo transcript pp.216–217). Paper only requires wholesale exchanges (REQ090). |
| Partial voids (one item of a sale) | `js/products-data.js:1546` (voidPosSale) | Found useful in testing (group test POS-13). |
| Store credit (overpayment and closed holds) | `js/orders.js:280` (createOrderWithCreditRedemption) | Supports REQ098/REQ100 without refunds. |
| Opening-stock upload | `js/admin-opening-stock.js` | One-time loading of existing stock at go-live. |
| Product photo bulk upload | `js/admin-product-photos.js` | Loading pictures for the whole catalog. |
| Recognized devices list + "Forget all other devices" | `js/device-trust.js:58` (forgetOtherDevices) | Supports REQ005/REQ044. |
| Excel/JSON backup download | `js/admin-backup.js` | Free plan has no automatic backups (REQNF013). |
| Clear Test Data (temporary, ends Dec 1, 2026) | `js/admin-clear-test-data.js`; `firestore.rules:333` | Wipes test records before real use. |
| Desktop alerts for staff | `js/admin-header.js` | Optional browser pop-ups for new orders. |
| Security headers | `firebase.json` | Security review item 15 (`study/13`). |
