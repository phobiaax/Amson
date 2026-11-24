# Paper changes for "prescription first, then payment"

System change (deployed Nov 24): for a cart with any Rx item, the customer submits **only the prescription** (up to 5 photos). The pharmacist approves or rejects **each Rx item**. After approval the customer **pays** in My Orders, and staff verify the payment. If some items are rejected, the customer uploads a new prescription **or** removes those items. Nothing is charged before approval, so a rejected prescription never creates store credit. The customer can cancel before paying.

Where to find each part: search the paper for the phrase in **bold**. Page numbers are from the Nov 12 printed copy.

---

## A. Text changes

### 1. Introduction, Background (p.~4), paragraph starting **"The system will allow registered retail customers to pre-order prescription-only medications"**

Replace the whole paragraph:

```
The system will allow registered retail customers to pre-order prescription-only medications online for in-store pick-up. Customers upload clear photographs of their valid doctor's prescriptions, up to five per order, and submit them for verification before any payment is made. An authorized staff member reviews the prescription and approves or rejects each prescription item through the administrative portal. Once the prescription is approved, the customer completes full payment through QR Ph and uploads a payment screenshot, following the same payment process as standard online orders. If an item is not approved, the customer may upload a new prescription or remove the item and pay for the rest, so no payment is collected for medicines that cannot be dispensed. Customers must also present the original physical prescription at the branch when claiming the reserved medicine. Prescription pre-orders are not eligible for delivery under any circumstances.
```

### 2. Scope (p.~10), bullet starting **"The system will allow registered customers to pre-order regulated prescription medicines"**

```
-   The system will allow registered customers to pre-order regulated prescription medicines through the online platform for in-store pick-up only. Customers upload photographs of their valid doctor's prescriptions for verification first and complete full payment through QR Ph only after the prescription is approved.
```

### 3. Limitations (p.~11), bullet starting **"Prescription pre-order delivery is not supported"**

Change only the first sentence's ending, from "even after online payment and administrative prescription photograph verification have been completed" to:

```
even after administrative prescription verification and online payment have been completed.
```

### 4. Modules, Customer Side (p.~37), **"Prescription Pre-Order Module:"**

```
-   Prescription Pre-Order Module: Allows registered customers to pre-order prescription-only medicines for in-store pick-up by uploading clear photographs of their valid doctor's prescriptions, up to five per order, before any payment is made. Authorized staff verify the prescription first. Once it is approved, the customer completes full payment through QR Ph and uploads a payment screenshot from the My Orders module. If any item is not approved, the customer may upload a new prescription or remove the item and pay for the remaining items, or cancel the order without charge. Customers are notified of each decision and must present the original physical prescription at the branch when collecting the reserved medicine. Prescription pre-orders cannot be assigned to delivery under any circumstances.
```

### 5. Modules, Admin Side (p.~40), **"Prescription Pre-Order Verification Sub-module:"**

```
    -   Prescription Pre-Order Verification Sub-module: Displays prescription pre-orders awaiting review, with all uploaded prescription photographs, before any payment is made. Authorized staff approve or reject each prescription item. A rejection requires a stated reason and a message, which are sent to the customer. When every prescription item is approved, the customer is notified to pay; the order returns to the payment verification queue once payment is submitted, and approving the payment triggers FEFO-based stock deduction, the Ready for Pick-up status, and a customer notification. Payment cannot be approved while a rejected prescription item remains on the order. All verification actions are recorded with the responsible user and timestamp.
```

### 6. Sprint plan, Phase 4 "Develop" line (p.~33), **"prescription pre-order submission for RX pre-orde…"**

Optional. If the sentence lists "prescription pre-order submission", add after it:

```
with prescription verification before payment
```

### 7. Functional Requirements, Customer Side, **Prescription Pre-Order Module (REQ021–REQ027, pp.~48–49)**

The numbers stay the same, so the traceability tables don't change. Replace these four:

```
REQ021. The system shall allow registered customers to select eligible prescription-only medicines for pre-order and shall require them to upload at least one clear photograph of a valid doctor's prescription, up to five photographs per order, before the pre-order can be submitted.
```

```
REQ022. The system shall require registered customers to complete full payment through QR Ph and upload a payment screenshot as proof only after all prescription items in the pre-order have been approved, following the same payment flow as standard online orders, and shall apply any available store credit at that point.
```

```
REQ024. The system shall submit the prescription pre-order in a Pending Prescription Verification status without payment and shall not accept payment or proceed to preparation until an authorized staff member approves the prescription for every prescription item in the order.
```

```
REQ025. The system shall notify the customer when their prescription is approved and payment can be made, when an item is not approved together with the stated reason, and when the order is ready for pick-up. For items not approved, the system shall allow the customer to upload a new prescription, remove the items and pay for the remaining items, or cancel the order without charge.
```

REQ023, REQ026 and REQ027 stay as they are.

### 8. REQ031 (p.~50), the status list

Replace the status list inside REQ031 with:

```
including Order Pending Verification (Pending Prescription Verification, Prescription Needs Your Action, and Prescription Approved - Pay Now for pre-orders), Payment Rejected (re-upload needed), On Hold, Payment Confirmed, Dispatched (or Ready for Pick-up), Delivered, Received (or Picked Up), Cancelled, and Closed (Unresolved).
```

### 9. Functional Requirements, Admin Side, **Prescription Pre-Order Sub-module (REQ077–REQ079, p.~56)**

```
REQ077. The system shall display a prescription verification queue to authorized staff listing all pending RX pre-orders with all of their uploaded prescription photographs awaiting review, before any payment is made.
```

```
REQ078. The system shall allow authorized staff to approve or reject each prescription item in a pre-order. When all prescription items are approved, the system shall notify the customer to pay; upon approval of the subsequent payment, the system shall trigger FEFO-based stock deduction, a Ready for Pick-up status update, and a customer notification. The system shall prevent payment approval while a rejected prescription item remains on the order.
```

```
REQ079. The system shall require a mandatory stated reason and message before a prescription item is rejected and shall include them in the customer notification.
```

REQ080 and REQ081 stay as they are.

### 10. Use case description for Fig 2.4 (p.~70), the sentence starting **"For regulated RX medicines, the customer may instead submit a prescription pre-order"**

Replace up to "…upon collection.":

```
For regulated RX medicines, the customer submits a prescription pre-order, which is automatically designated for in-store pick-up only. The customer uploads photographs of their valid doctor's prescriptions first, and an authorized staff member approves or rejects each prescription item through the administrative portal. After approval, the customer pays through QR Ph from the My Orders module. If an item is not approved, the customer may upload a new prescription, remove the item, or cancel the order without charge. The customer must also present the original physical prescription at the branch upon collection.
```

### 11. Use case description for Fig 2.6 (p.~73), after **"reviewing uploaded payment screenshots through the Payment Verification module."**

Insert:

```
For prescription pre-orders, staff first verify the uploaded prescription and approve or reject each prescription item before the customer pays; the order returns to the queue for payment verification once the customer submits payment.
```

### 12. Activity diagram description for Fig 2.10 (p.~80), from **"If the item is RX, the order is automatically designated"** to the end of the paragraph

```
If the item is RX, the order is automatically designated as a prescription pre-order for in-store pick-up only, and the customer cannot select delivery as a fulfillment option. The customer uploads clear photographs of their valid doctor's prescriptions and submits the pre-order without payment. The pre-order is placed in a Pending Prescription Verification status until an authorized staff member reviews it. If every prescription item is approved, the customer is notified, completes full payment through QR Ph, and uploads a payment screenshot from the My Orders module. If an item is not approved, the customer either uploads a new prescription, which returns the order for review, or removes the item and proceeds to payment for the remaining items; the customer may also cancel the order without charge. The customer must present the original physical prescription in person at the branch upon collection.
```

### 13. Activity diagram description for Fig 2.11 (p.~82), sentence starting **"Prescription pre-orders pending in the same queue are confirmed in the same manner"**

Replace up to "…in person at the branch.":

```
Prescription pre-orders enter the same queue twice. First, before any payment, the administrator reviews the uploaded prescription photographs and approves or rejects each prescription item with a stated reason; the customer is notified of the result. Second, after the customer pays for the approved items, the administrator verifies the payment in the same manner as a standard order; upon confirmation, stock is deducted by FEFO and the customer is notified that the order is ready for pick-up, with the original prescription to be presented in person at the branch.
```

### 14. Testing (Results and Discussion) and test plan

If your test plan lists Rx cases (ORD or RX IDs), add one row each:
- Rx cart: submit with no photo → refused
- Submit with 2 photos → Pending Prescription Verification, no payment asked
- Staff reject 1 item → customer sees reason; remove item → total updates → pay → staff approve → Ready for Pick-up
- Cancel before paying → Cancelled, no store credit

---

## B. Diagram changes (smallest edits)

### Fig 2.10 Registered Customer Purchasing: 3 edits
1. **Move** the "Is item/s RX?" diamond to just **after "Display Checkout Page"**.
   - **No** → the existing address path, unchanged.
2. **Yes** → rename "Submit as pick-up pre-order" to **"Upload Prescription and Submit Pre-order"** → new System box **"Record Order as Pending Prescription Verification"** → into the existing "Send Order Submission Notification".
3. "Upload Proof of Payment" now goes **straight to "Submit Order"**.

Payment for Rx orders is shown in Fig 2.11.

### Fig 2.11 Admin Payment Verification: 1 new branch at the top + 1 move
1. After "Display Payment Verification Queue", add an Admin diamond **"Prescription pre-order not yet paid?"**
   - **No** → the existing "Validate Uploaded Payment Screenshot", unchanged.
   - **Yes** → Admin **"Review Prescription per Item"** → diamond **"All items approved?"**
     - **Yes** → Customer **"Pay and Upload Payment Screenshot"** → arrow to "Validate Uploaded Payment Screenshot".
     - **No** → Customer **"Upload New Prescription"** → arrow back to "Review Prescription per Item".
2. **Move** the "Is order a prescription pre-order?" diamond to just **after "Generate Receipt"**:
   - **Yes** → Mark Order as Ready for Pick-up.
   - **No** → Copy delivery details and book courier → Provide tracking link → Mark Order as Dispatched.

Removing rejected items and cancelling are left out of the drawing; the description text covers them.

### Fig 2.4 Use Case, Customer: 1 new oval
- Add **"Pay for Approved Pre-Order"**, linked to Registered User.

### Fig 2.6 Use Case, Order Processing: no change
- It already has "Verify Prescription" and "Verify Proof of Payment" as separate use cases.

## C. Defense answers

- **Why the change?** "If a prescription was rejected after payment, the money could only become store credit, because the branch has a no-refund policy. Checking the prescription first means customers never pay for medicine we can't dispense."
- **Multiple prescriptions?** "Up to 5 photos per order, and the pharmacist decides per item, so one bad prescription doesn't block the rest."
- **What stops a customer approving their own prescription?** "The database rules: customers can't change the decisions, and staff can't approve a payment while a rejected item is still on the order."
