/**
 * Payment page.
 */

const MAX_PROOF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const noPendingOrderNotice = document.getElementById("noPendingOrderNotice");
const paymentContent = document.getElementById("paymentContent");
const orderConfirmation = document.getElementById("orderConfirmation");
const paymentItemsSummary = document.getElementById("paymentItemsSummary");
const paymentTotalText = document.getElementById("paymentTotalText");
const uploadDropzone = document.getElementById("uploadDropzone");
const uploadEmptyState = document.getElementById("uploadEmptyState");
const uploadPreviewState = document.getElementById("uploadPreviewState");
const uploadPreviewImage = document.getElementById("uploadPreviewImage");
const uploadPreviewFilename = document.getElementById("uploadPreviewFilename");
const uploadErrorText = document.getElementById("uploadErrorText");
const proofOfPaymentInput = document.getElementById("proofOfPaymentInput");
const referenceNumberInput = document.getElementById("referenceNumberInput");
const referenceNumberErrorText = document.getElementById("referenceNumberErrorText");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const deliveryFeeNoteSummary = document.getElementById("deliveryFeeNoteSummary");
const pickupNoteSummary = document.getElementById("pickupNoteSummary");
const paymentSubtotalRow = document.getElementById("paymentSubtotalRow");
const paymentSubtotalText = document.getElementById("paymentSubtotalText");
const paymentCreditRow = document.getElementById("paymentCreditRow");
const paymentCreditText = document.getElementById("paymentCreditText");
const qrBox = document.getElementById("qrBox");
const fullyCoveredNotice = document.getElementById("fullyCoveredNotice");

const prescriptionUploadBox = document.getElementById("prescriptionUploadBox");
const rxUploadDropzone = document.getElementById("rxUploadDropzone");
const rxUploadEmptyState = document.getElementById("rxUploadEmptyState");
const rxUploadPreviewState = document.getElementById("rxUploadPreviewState");
const rxUploadPreviewImage = document.getElementById("rxUploadPreviewImage");
const rxUploadPreviewFilename = document.getElementById("rxUploadPreviewFilename");
const rxUploadErrorText = document.getElementById("rxUploadErrorText");
const prescriptionPhotoInput = document.getElementById("prescriptionPhotoInput");

const pendingOrderRaw = sessionStorage.getItem("amsonPendingOrder");
const pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : null;

let requiresPrescription = false;
let cartSubtotal = null;
let customerCreditBalance = 0;
let fullyCoveredByCredit = false;

function renderCreditPreview() {
  if (cartSubtotal === null) return;
  const applied = Math.max(0, Math.min(customerCreditBalance, cartSubtotal));
  const finalTotal = cartSubtotal - applied;

  paymentSubtotalRow.classList.toggle("d-none", applied <= 0);
  paymentCreditRow.classList.toggle("d-none", applied <= 0);
  if (applied > 0) {
    paymentSubtotalText.textContent = formatPeso(cartSubtotal);
    paymentCreditText.textContent = `-${formatPeso(applied)}`;
  }
  paymentTotalText.textContent = formatPeso(finalTotal);

  // Credit can fully cover the order - there's nothing to pay via QR Ph,
  // so don't ask for a screenshot/reference number for a payment that
  // never happens.
  fullyCoveredByCredit = finalTotal <= 0 && cartSubtotal > 0;
  qrBox.classList.toggle("d-none", fullyCoveredByCredit);
  fullyCoveredNotice.classList.toggle("d-none", !fullyCoveredByCredit);
  updateSubmitButtonState();
}

// ---- Require login (in case this page is opened directly) ----
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login.html?next=shop%2Fcheckout.html";
    return;
  }
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    customerCreditBalance = doc.exists ? doc.data().creditBalance || 0 : 0;
    renderCreditPreview();
  } catch (error) {
    // Preview only - if it fails to load, checkout still works, the
    // redemption itself happens authoritatively in the order transaction.
  }
});

// Submit Order stays clickable: pressing it with something missing lists
// what's still needed (see submitOrderBtn below). Any change to the form
// clears that list.
const submitOrderErrorAlert = document.getElementById("submitOrderErrorAlert");
function updateSubmitButtonState() {
  submitOrderBtn.disabled = false;
  submitOrderErrorAlert.classList.add("d-none");
}

// ---- Page start ----
(async function init() {
  if (!pendingOrder || !pendingOrder.cart || pendingOrder.cart.length === 0) {
    noPendingOrderNotice.classList.remove("d-none");
    paymentContent.classList.add("d-none");
    return;
  }
  await loadCatalogCache();
  showOrderSummary();
  setUpUploads();
  submitOrderBtn.addEventListener("click", submitOrder);
})();

// ---- 1. What's being ordered, and the total ----
function showOrderSummary() {
  requiresPrescription = pendingOrder.cart.some((item) => {
    const product = getProductById(item.id);
    return product && product.rxRequired;
  });
  prescriptionUploadBox.classList.toggle("d-none", !requiresPrescription);
  deliveryFeeNoteSummary.classList.toggle("d-none", requiresPrescription);
  pickupNoteSummary.classList.toggle("d-none", !requiresPrescription);

  paymentItemsSummary.innerHTML = checkoutSummaryItemsHtml(pendingOrder.cart);

  cartSubtotal = cartTotalNow();
  paymentTotalText.textContent = formatPeso(cartSubtotal);
  renderCreditPreview();
}

// The cart's total at the catalog's current prices.
function cartTotalNow() {
  let total = 0;
  for (const item of pendingOrder.cart) {
    const product = getProductById(item.id);
    if (product) total += product.price * item.qty;
  }
  return total;
}

// ---- 2. The payment screenshot, prescription photo and reference number ----
function setUpUploads() {
  referenceNumberInput.addEventListener("input", () => {
    referenceNumberErrorText.classList.add("d-none");
    updateSubmitButtonState();
  });
  setUpFilePicker({
    dropzone: uploadDropzone,
    input: proofOfPaymentInput,
    errorText: uploadErrorText,
    emptyState: uploadEmptyState,
    previewState: uploadPreviewState,
    previewImage: uploadPreviewImage,
    previewFilename: uploadPreviewFilename,
  });
  setUpFilePicker({
    dropzone: rxUploadDropzone,
    input: prescriptionPhotoInput,
    errorText: rxUploadErrorText,
    emptyState: rxUploadEmptyState,
    previewState: rxUploadPreviewState,
    previewImage: rxUploadPreviewImage,
    previewFilename: rxUploadPreviewFilename,
  });
}

// One image picker: clicking the box opens the file chooser; a chosen image
// is previewed, and one over 10MB is refused.
function setUpFilePicker({ dropzone, input, errorText, emptyState, previewState, previewImage, previewFilename }) {
  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    errorText.classList.add("d-none");

    if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
      errorText.textContent = "That file is too large. Please upload an image under 10MB.";
      errorText.classList.remove("d-none");
      input.value = "";
      emptyState.classList.remove("d-none");
      previewState.classList.add("d-none");
      updateSubmitButtonState();
      return;
    }

    previewImage.src = URL.createObjectURL(file);
    previewFilename.textContent = file.name;
    emptyState.classList.add("d-none");
    previewState.classList.remove("d-none");
    updateSubmitButtonState();
  });
}

// ---- Submit Order: check the form, re-check stock and prices, place it ----
async function submitOrder() {
  const file = proofOfPaymentInput.files[0];
  const prescriptionFile = prescriptionPhotoInput.files[0];
  const referenceNumber = referenceNumberInput.value.trim();
  if (!checkPaymentForm(file, prescriptionFile, referenceNumber)) return;

  uploadErrorText.classList.add("d-none");
  rxUploadErrorText.classList.add("d-none");
  referenceNumberErrorText.classList.add("d-none");
  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = "Checking stock...";
  if (!(await stockAndPricesStillOk(prescriptionFile))) return;

  submitOrderBtn.textContent = "Submitting...";
  await placeOrder(file, prescriptionFile, referenceNumber);
}

// ---- 3. Is anything missing? ----
// Lists everything still missing or invalid above the button, and under
// each field. Returns true when the form is complete.
function checkPaymentForm(file, prescriptionFile, referenceNumber) {
  const problems = [];
  if (requiresPrescription && !prescriptionFile) {
    problems.push("Upload a clear photo of your prescription.");
    showFormAlert(rxUploadErrorText, "Please upload a photo of your prescription.");
  }
  if (!fullyCoveredByCredit && !file) {
    problems.push("Upload a screenshot of your payment.");
    showFormAlert(uploadErrorText, "Please upload a screenshot of your QR Ph payment.");
  }
  if (!fullyCoveredByCredit && !referenceNumber) {
    problems.push("Enter the reference number from your proof of payment.");
    showFormAlert(referenceNumberErrorText, "Please enter the reference number from your proof of payment.");
  } else if (!fullyCoveredByCredit && !isValidReferenceNumber(referenceNumber)) {
    problems.push(REFERENCE_NUMBER_HINT);
    showFormAlert(referenceNumberErrorText, REFERENCE_NUMBER_HINT);
  }
  if (problems.length) {
    showFormAlert(submitOrderErrorAlert, `Please complete the following before submitting:\n- ${problems.join("\n- ")}`);
    return false;
  }
  return true;
}

// ---- 4. Last check of stock and prices ----
// Stock may have changed since the cart was filled (another customer bought
// it, or it hasn't been received yet), and prices may have changed too, so
// both are re-checked against live numbers right before the order is made.
// Returns true when it's fine to go ahead; otherwise explains why not.
async function stockAndPricesStillOk(prescriptionFile) {
  clearCatalogCache();
  await loadCatalogCache();

  // A product taken off the online store since it was added to the cart
  // counts as unavailable too.
  const onlineProduct = (id) => storefrontCatalog().find((p) => p.id === id) || null;
  const outOfStockItems = pendingOrder.cart
    .map((item) => ({ item, product: onlineProduct(item.id) }))
    .filter(({ item, product }) => item.qty > (product ? product.totalStock : 0));
  if (outOfStockItems.length > 0) {
    const details = outOfStockItems
      .map(({ item, product }) =>
        product ? `${product.name} (only ${product.totalStock} left, ${item.qty} in your cart)` : "an item that's no longer available online"
      )
      .join("; ");
    uploadErrorText.textContent = `Some items in your cart exceed what's currently in stock: ${details}. Please go back to your cart and adjust the quantity.`;
    uploadErrorText.classList.remove("d-none");
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = "Submit Order";
    return false;
  }

  // Prices changed: show the new total before submitting.
  const freshTotal = cartTotalNow();
  if (Math.abs(freshTotal - cartSubtotal) > 0.001) {
    cartSubtotal = freshTotal;
    renderCreditPreview();
    uploadErrorText.textContent = `Some prices changed since you opened this page. Your new total is ${formatPeso(cartSubtotal)}. Please check it and tap Submit Order again.`;
    uploadErrorText.classList.remove("d-none");
    submitOrderBtn.textContent = "Submit Order";
    updateSubmitButtonState();
    return false;
  }

  // Prescription pre-orders are always picked up at the store.
  requiresPrescription = pendingOrder.cart.some((item) => getProductById(item.id).rxRequired);
  if (requiresPrescription && !prescriptionFile) {
    prescriptionUploadBox.classList.remove("d-none");
    rxUploadErrorText.textContent = "This order has a prescription item. Please upload a photo of your prescription.";
    rxUploadErrorText.classList.remove("d-none");
    submitOrderBtn.textContent = "Submit Order";
    updateSubmitButtonState();
    return false;
  }
  return true;
}

// ---- 5. Place the order ----
// Uploads the photos, saves the order (using any store credit), tells the
// customer it was received, empties those items from the cart, and shows
// the confirmation.
async function placeOrder(file, prescriptionFile, referenceNumber) {
  try {
    const user = auth.currentUser;
    const proofOfPaymentUrl = file ? await uploadToCloudinary(file) : null;
    const prescriptionPhotoUrl = prescriptionFile ? await uploadToCloudinary(prescriptionFile, { kind: "document" }) : null;
    const orderNumber = await generateOrderNumber();

    const items = pendingOrder.cart.map((item) => {
      const product = getProductById(item.id);
      return {
        id: item.id,
        name: product ? product.name : "Unknown product",
        price: product ? product.price : 0,
        qty: item.qty,
        imageUrl: product ? product.imageUrl || null : null,
      };
    });

    await createOrderWithCreditRedemption({
      orderNumber,
      customerId: user ? user.uid : null,
      contact: pendingOrder.contact,
      shipping: requiresPrescription ? null : pendingOrder.shipping,
      deliverySchedule: requiresPrescription ? null : pendingOrder.deliverySchedule,
      items,
      total: cartSubtotal,
      proofOfPaymentUrl,
      paymentReferenceNumber: referenceNumber || null,
      requiresPrescription,
      prescriptionPhotoUrl,
      status: "placed",
      statusTimestamps: {
        placed: firebase.firestore.FieldValue.serverTimestamp(),
        payment_confirmed: null,
        dispatched: null,
        delivered: null,
        received: null,
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { expectFullCredit: fullyCoveredByCredit });

    // Order submission notification (Fig 2.10).
    if (user) {
      notifyCustomer(
        user.uid,
        `Order ${orderNumber} placed`,
        requiresPrescription
          ? "We received your prescription pre-order. Our pharmacist will check your prescription and payment, and we'll tell you when it's ready for pick-up."
          : "We received your order and payment proof. We'll let you know once our staff verify your payment.",
        "orders.html",
        "info",
        "order_placed"
      );
    }

    removeItemsFromCart(pendingOrder.cart.map((item) => item.id));
    sessionStorage.removeItem("amsonPendingOrder");
    clearCatalogCache(); // stock just went down
    sessionStorage.removeItem("amsonCheckoutSelectedIds");
    document.getElementById("confirmedOrderNumber").textContent = `Order Number: ${orderNumber}`;
    if (user) {
      document.getElementById("viewOrdersLink").classList.remove("d-none");
    }
    paymentContent.classList.add("d-none");
    orderConfirmation.classList.remove("d-none");
  } catch (error) {
    uploadErrorText.textContent = error.message || "Something went wrong submitting your order. Please try again.";
    uploadErrorText.classList.remove("d-none");
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = "Submit Order";
  }
}
