# 15 - Self-Quiz

Answer each question **out loud**, as if a panelist asked it, then check the answers at the bottom.
Types: **[Code]** what does this code do · **[What if]** · **[Why]** design choices · **[Where]** where in the code.

---

## Part A: Questions (65)

### Foundations
1. [Why] Why does the system have no backend server of its own?
2. [Code] What's the difference between `element.textContent = x` and `element.innerHTML = x`, and when do we use each?
3. [Where] Which file connects the website to our Firebase project and creates `auth` and `db`?
4. [Code] What does `await` do in `const userDoc = await db.collection("users").doc(uid).get();`?
5. [Why] Why do admin page scripts wait for the `admin:ready` event instead of starting immediately?
6. [Code] What does `FieldValue.serverTimestamp()` give us that `new Date()` doesn't?
7. [Why] What's a Firestore transaction, and why can't we just read and then write normally for stock?
8. [Where] Which file decides which staff role can open which admin page?
9. [Code] What does `onSnapshot` do, and name two places we use it.
10. [Why] Why does the rules file end with `match /{document=**} { allow read, write: if false; }`?

### Login, register, RBAC
11. [Code] What does `recordFailedLogin` do when the count reaches 5?
12. [What if] What happens if a customer opens the console and sets their own `role` to `"branch_manager"`?
13. [What if] A Sales Staff member types `admin/staff-management.html` in the address bar. What happens, step by step?
14. [Where] Where is the email verification code generated, and how long is it valid?
15. [Why] Why does the login error say "Incorrect email or password" for both a wrong password and an unknown email?
16. [What if] A staff member is deactivated while still logged in on another computer. When do they lose access?
17. [Code] What does `loginNextPage()` protect against?
18. [Why] Why is the new-device code built but not active?

### Shop and cart
19. [Code] Explain `isRetailSellableBatch(batch)` in one sentence.
20. [Why] Why is stock calculated from batches instead of a stock number on the product?
21. [Where] Where are cost and wholesale prices stored, and who can read them?
22. [What if] A customer adds 10 of an item but only 6 are in stock. What does the cart do?
23. [Why] Why does the cart store only `{ id, qty }` and not the price?
24. [What if] A guest adds items to the cart and then logs in. What happens to those items?
25. [Why] Why do shop pages keep a 5-minute copy of the catalog in the browser?

### Checkout and payment
26. [Why] Why QR Ph with a screenshot instead of a payment gateway?
27. [What if] The internet is off when the customer taps Submit Order. What do they see, and is anything saved?
28. [Code] What happens inside `createOrderWithCreditRedemption` if the customer has ₱200 credit and the order is ₱150?
29. [What if] Two customers tap Submit at exactly the same moment. Do they get the same order number?
30. [Where] Which rule stops a customer from creating an order with status `"payment_confirmed"`?
31. [Why] Why are prescription orders pick-up only?
32. [What if] Someone saves a proof-of-payment link pointing to their own website. What happens?
33. [When] When is stock deducted for an online order?

### Online order verification
34. [Code] What does the `check` function inside `confirmOrderSale` do?
35. [What if] Staff click Approve, but the items' prices on the order don't match the catalog. What happens?
36. [What if] A customer never fixes a payment hold. What happens after 7 days?
37. [Code] What does `computeUnappliedCredit` return for an underpayment hold?
38. [Where] Where does the system warn about a reused reference number?
39. [Why] Why can't staff mark a delivery order as "Received"?
40. [What if] Stock runs out between the order and the approval. What does the staff member see?

### POS, voids, exchanges
41. [Code] Why does `posAvailableQty` subtract what's already in the POS cart?
42. [Why] Why is there a preview receipt before the sale is saved?
43. [What if] Two counters complete different sales at the same moment. What happens with the SI numbers?
44. [Code] How does `verifyVoidApprover` check the Branch Manager's password without logging out the cashier?
45. [Why] Why do we mark a sale `voided: true` instead of deleting it?
46. [What if] A customer wants to return a ₱100 item for a ₱60 item and get ₱40 back. What does the system do?
47. [Where] Where does the 58 mm receipt layout come from?

### Inventory, FEFO, expiry
48. [Code] In the FEFO engine, what does `.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))` do?
49. [Why] Why does the FEFO engine run the query *outside* the transaction and then re-read each batch *inside* it?
50. [What if] A sale needs 15 units: batch A (expires sooner) has 10, batch B has 50. What exactly is deducted?
51. [Why] Why does finalizing a stock count apply the *difference* instead of setting the counted number?
52. [What if] Staff try to receive a box with expiry date 01/01/2020.
53. [Code] What do the two numbers `NEAR_EXPIRY_MONTHS = 6` and `BAD_ORDER_MONTHS = 2` control?
54. [What if] The Dashboard and Inventory both run `markBatchBadOrder` on the same batch at the same moment.
55. [Where] When does `enforceExpiryStatus()` run?

### Products, wholesale, reports, chat, security
56. [What if] Technical Staff add a new product. What prices and status does it get, and why?
57. [Why] Why can't Firestore rules just hide the `costingPrice` field on a public product document?
58. [What if] A wholesale buyer's LTO expired last week. Can staff record an order?
59. [Why] Why can wholesale orders use "wholesale only" (near-expiry) batches?
60. [Code] What does `logAuditEvent` save, and why can't it be edited later?
61. [When] On which date does an online order count as a sale in the reports?
62. [Code] What does `chatLooksLikeDosage` protect against?
63. [Why] Why does the chat check for staff requests, other people's data, complaints, orders and health **before** calling Gemini?
64. [What if] The daily AI limit (400) is reached. What happens to new questions?
65. [Why] The Firebase API key is visible in `firebase-config.js`. Why isn't that a security hole?

---

## Part B: Explain these code snippets line by line

### Snippet 1: `js/products-data.js:203-210`
```js
function getProductById(id) {
  return CATALOG_PRODUCTS.find((p) => String(p.id) === String(id));
}

function storefrontCatalog() {
  return CATALOG_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore);
}
```

### Snippet 2: `js/orders.js:322-327`
```js
nextCount = await db.runTransaction(async (transaction) => {
  const counterDoc = await transaction.get(counterRef);
  const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1;
  transaction.set(counterRef, { count: next }, { merge: true });
  return next;
});
```

### Snippet 3: `firestore.rules:51-54`
```
allow update: if isSignedIn() && myUid() == uid &&
  request.resource.data.get("role", null) == resource.data.get("role", null) &&
  request.resource.data.get("accountStatus", null) == resource.data.get("accountStatus", null) &&
  request.resource.data.get("creditBalance", 0) <= resource.data.get("creditBalance", 0);
```

### Snippet 4: `js/cart.js:111-133` (shortened)
```js
function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  const product = typeof getProductById === "function" ? getProductById(productId) : null;
  const maxQty = product ? product.totalStock : Infinity;
  const currentQty = existing ? existing.qty : 0;
  const desiredQty = currentQty + qty;
  const finalQty = Math.min(desiredQty, maxQty);
  const capped = finalQty < desiredQty;
  if (finalQty <= 0) return { qty: currentQty, capped: true };
  if (existing) existing.qty = finalQty; else cart.push({ id: productId, qty: finalQty });
  saveCart(cart);
  return { qty: finalQty, capped };
}
```

### Snippet 5: `js/products-data.js:1818-1830`
```js
async function deductStockFEFOMultiple(items, options = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await deductStockFEFOOnce(items, options);
    } catch (error) {
      if (error && error.code === "permission-denied" && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt + Math.random() * 200));
        continue;
      }
      throw error;
    }
  }
}
```

---
---

## Part C: Answers

### Foundations
1. The client is one branch on a tight budget. Firebase's free plan gives logins, a database, hosting and live updates without running a server. The trade-off: the browser can't be trusted, so security lives in the Firestore rules.
2. `textContent` puts plain text on the page (always safe). `innerHTML` builds HTML from a string (needed for lists/cards), and any user-typed value inside it must go through `escapeHtml()` to prevent XSS.
3. `js/firebase-config.js` (`initializeApp` line 11, `auth` and `db` lines 21-22).
4. It pauses that function until Firestore answers, without freezing the page, then puts the answer in `userDoc`.
5. The header must first check login, deactivation and role (`admin-header.js:13-71`). Only then does it fire `admin:ready`, so pages never load data for someone who shouldn't see it.
6. Google's server time, which a wrong or faked device clock can't change.
7. A group of reads and writes that happen all together or not at all, and re-run if the data changed meanwhile. Without it, two cashiers could both read "5 left" and both sell 5.
8. `js/admin-roles.js` (`ADMIN_PAGE_ACCESS`, line 12).
9. It keeps listening and calls our function every time the data changes. Uses: the Online Orders queue (`listenToOrders`), the staff bell (`watchStaffAlertsLive`), the Inventory table, the chat, a customer's order page, the POS today's sales.
10. Default deny: anything not explicitly allowed above is refused, so a forgotten collection isn't left open.

### Login, register, RBAC
11. It saves `lockedUntil` = now + 2 minutes on `loginAttempts/{email}`, and the user sees "locked for 2 minutes".
12. The rules refuse: on your own document, `role` must stay the same (`firestore.rules:52`).
13. The header reads their profile, sees `sales_staff`, `roleCanAccessPage` returns false → "You don't have access to that page" → sent to `pos.html`. The page body never appears. The rules would also refuse staff-management writes (manager only).
14. `generateOtpCode()` in `js/otp.js:5`, called from `register.js:200`; valid for 10 minutes (`OTP_CODE_TTL_MS`).
15. So attackers can't find out which emails have accounts (account enumeration).
16. Immediately for database access: `isStaff()` checks `accountStatus` on every request. On the next page load the header signs them out.
17. Open redirects: it only allows `shop/<page>.html`, so a phishing link can't send users to another site after login.
18. A team decision. With it on, everyone needs a real inbox and a code on each new browser, which is inconvenient for testing and the defense. It's one setting (`REQUIRE_DEVICE_CODE` in `device-trust.js:4`).

### Shop and cart
19. A batch counts for retail only if it's active, has units, and expires more than 6 months from today.
20. Each batch has its own expiry date. FEFO, expiry alerts and Bad Order need per-batch numbers, and one source of truth can't get out of sync.
21. In `productPrices/{productId}` (and purchase costs in `batchCosts`), readable only by staff (`firestore.rules:105-110`, `219-221`).
22. It caps the quantity at 6 and shows "Only 6 in stock - your cart is now at the limit."
23. Prices are always read fresh from the catalog, so an old or edited price can't get into the order.
24. On login they're merged into the account cart (bigger quantity per item wins), and the guest copy is cleared.
25. To save Firestore reads on the free plan. The payment page re-reads stock live before submitting, so the copy can't cause overselling.

### Checkout and payment
26. No gateway fees or contracts; customers already use GCash/Maya; money goes straight to the branch. The cost is manual verification.
27. "We couldn't reach the store to check stock. Check your internet connection, then tap Submit Order again." Nothing is saved.
28. It reads the balance inside the transaction: applied = min(200, 150) = 150, final total = 0. The order is saved with `creditApplied: 150`, and the balance goes down by 150 (to 50) in the same transaction.
29. No. The counter rule allows only +1, so the late transaction is refused; `generateOrderNumber` waits a moment and retries, getting the next number.
30. `firestore.rules:138`: `request.resource.data.status == "placed"`.
31. The pharmacist must check the original prescription and a valid ID before releasing Rx medicine.
32. The rules refuse it: `photoLinkOk` only accepts `https://res.cloudinary.com/wb6wxped/...`.
33. When staff approve the payment, in the same transaction that gives the SI number (`confirmOrderSale`).

### Online order verification
34. Inside the transaction it re-reads the order and throws "already processed by someone else" if it's no longer `placed` or already has an SI number, so two staff can't deduct stock twice.
35. A dialog lists the mismatches and asks "Approve anyway?" Staff should only approve if the money received covers the correct amount.
36. On the next staff page load it becomes "Closed (Unresolved)" and any verified money becomes store credit, with a notice to the customer.
37. The amount the customer already paid (`amountReceived`) plus any store credit used on the order.
38. `warnIfReferenceReused` in `admin-online-orders.js:522`, shown in the review panel.
39. "Received" means the customer confirmed it. Staff can only move it to Delivered; the customer (or the 3-day rule for Delivered) does the rest.
40. "We can't fulfill this order… Put the order on a 7-day hold?" If it happens mid-transaction, the order is put on an out-of-stock hold automatically.

### POS, voids, exchanges
41. So the cashier can't add the same product twice and go past the stock.
42. To catch mistakes before stock is deducted and an SI number is used (fewer voids).
43. Both bump the SI counter; the rules refuse the stale one; `deductStockFEFOMultiple` retries it and it gets the next number. No duplicates.
44. It signs in on a temporary second Firebase app, checks the role and status, signs out, and deletes that app.
45. For the audit trail: the SI number still exists with the reason, who voided and who approved. Reports skip `voided` sales.
46. Refused: the replacement must be of equal or higher value. Amson doesn't give refunds.
47. The `@media print` section in `css/style.css` (around line 2100), which sets the receipt to 58 mm wide.

### Inventory, FEFO, expiry
48. It orders the batches so the one expiring soonest comes first.
49. Firestore transactions can't run queries, only read documents by reference. So we find the references first, then re-read each one inside the transaction to get current quantities.
50. 10 from batch A and 5 from batch B, both recorded on the sale line.
51. Sales happen during the count. Applying counted − system to the *current* quantity keeps those sales.
52. Refused: "An expiry date has already passed… expired stock can't be received."
53. 6 months: a batch moves to wholesale-only and leaves retail. 2 months (or expired): it becomes Bad Order and is written off.
54. Only one write-off is recorded: the transaction makes the second one see `status === "bad_order"` and stop.
55. When staff open the Dashboard or Inventory page.

### Products, wholesale, reports, chat, security
56. All prices 0, `status: "inactive"`, `pricePending: true`. Only the Branch Manager may set prices; the product can't be sold until priced.
57. Rules allow or deny whole documents, not single fields. So private prices live in a separate staff-only document.
58. No. The order form blocks it until the document is updated (`checkProcessOrder`).
59. Wholesale buyers (clinics, pharmacies) use stock quickly. This reduces waste from batches that can't be sold at retail.
60. Action, details, user name, record, before, after, reason, server time. The rules forbid update and delete on `auditLog`.
61. The payment-confirmed date (`statusTimestamps.payment_confirmed`).
62. An AI reply that gives a dose or schedule ("take 2 tablets every 6 hours"). It's replaced with the safe "ask our pharmacist" message.
63. They're safer, free and predictable, and they save the AI quota. Safety-critical cases never depend on the AI following instructions.
64. The AI isn't called: matching product cards are shown, or the chat is handed to staff.
65. Firebase web keys identify the project; they're public by design. Access is controlled by the security rules (and we can restrict the key to our domains).

### Part B answers

**Snippet 1**
- `getProductById(id)`: search the loaded catalog for the product with this id.
- `.find(...)`: return the **first** product where the test is true, or `undefined`.
- `String(p.id) === String(id)`: compare as text, so `5` and `"5"` match.
- `storefrontCatalog()`: the products the **shop** may show.
- `.filter(...)`: keep only products that are `active` **and** marked available in the online store.

**Snippet 2**
- `db.runTransaction(async (transaction) => {...})`: start an all-or-nothing operation that Firestore re-runs if the data changes meanwhile.
- `transaction.get(counterRef)`: read the counter document inside the transaction.
- `(counterDoc.exists ? ... : 0) + 1`: if the counter exists use its count (or 0), otherwise 0; then add 1.
- `transaction.set(counterRef, { count: next }, { merge: true })`: save the new number without wiping other fields.
- `return next`: the transaction's result becomes `nextCount`, used to build `AMP-2026-0001`.

**Snippet 3**
- `allow update: if`: this is one way an update to `users/{uid}` can be allowed.
- `isSignedIn() && myUid() == uid`: you're logged in and it's **your own** document.
- `request.resource.data.get("role", null) == resource.data.get("role", null)`: the role after the change must equal the role before (you can't change your role).
- Same for `accountStatus` (you can't reactivate yourself).
- `creditBalance` after ≤ before: you can spend credit but never add it.

**Snippet 4**
- Read the cart, and see whether this product is already in it.
- Find the product to know its stock; `maxQty` is the stock (or unlimited if the catalog isn't loaded).
- `desiredQty` = what's in the cart + what's being added.
- `finalQty` = the smaller of desired and stock, so we never exceed stock.
- `capped` is true if we had to cut it down (to show a warning).
- If `finalQty` is 0 or less, the item is out of stock: return without changing the cart.
- Otherwise update the existing line or add a new `{ id, qty }` line, save the cart, and report the result.

**Snippet 5**
- `for (let attempt = 1; ; attempt++)`: a loop with no end condition; we leave it with `return` or `throw`.
- `return await deductStockFEFOOnce(...)`: try the whole sale; if it succeeds, return its result.
- `catch (error)`: it failed.
- `error.code === "permission-denied" && attempt < 4`: the rules refused (most likely another counter bumped the SI number first), and we've tried fewer than 4 times.
- `setTimeout(resolve, 150 * attempt + Math.random() * 200)`: wait a little longer each time, plus a random part, so two counters don't clash again.
- `continue`: try again with fresh data.
- `throw error`: any other error (like "Not enough stock"), or too many attempts, goes back to the caller to show the cashier.
