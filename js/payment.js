// payment page

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
const rxUploadErrorText = document.getElementById("rxUploadErrorText");
const prescriptionPhotoInput = document.getElementById("prescriptionPhotoInput");
let rxPhotoPicker = null;

const pendingOrderRaw = sessionStorage.getItem("amsonPendingOrder");
const pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : null;

let requiresPrescription = false;
let cartSubtotal = null;
let customerCreditBalance = 0;
let fullyCoveredByCredit = false;

function renderCreditPreview() {
  if (cartSubtotal === null) return;
  // prescription orders pay after approval, credit is used then
  if (requiresPrescription) {
    paymentTotalText.textContent = formatPeso(cartSubtotal);
    fullyCoveredByCredit = false;
    return;
  }
  const applied = Math.max(0, Math.min(customerCreditBalance, cartSubtotal));
  const finalTotal = cartSubtotal - applied;

  paymentSubtotalRow.classList.toggle("d-none", applied <= 0);
  paymentCreditRow.classList.toggle("d-none", applied <= 0);
  if (applied > 0) {
    paymentSubtotalText.textContent = formatPeso(cartSubtotal);
    paymentCreditText.textContent = `-${formatPeso(applied)}`;
  }
  paymentTotalText.textContent = formatPeso(finalTotal);

  // credit covers everything so no screenshot needed
  fullyCoveredByCredit = finalTotal <= 0 && cartSubtotal > 0;
  qrBox.classList.toggle("d-none", fullyCoveredByCredit);
  fullyCoveredNotice.classList.toggle("d-none", !fullyCoveredByCredit);
  updateSubmitButtonState();
}

// ---- must be logged in ----
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
    // just a preview, the real credit use happens when the order saves
  }
});

// button stays clickable and lists whats missing
const submitOrderErrorAlert = document.getElementById("submitOrderErrorAlert");
function updateSubmitButtonState() {
  submitOrderBtn.disabled = false;
  submitOrderErrorAlert.classList.add("d-none");
}

// ---- page start ----
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

// ---- whats being ordered and the total ----
function showOrderSummary() {
  requiresPrescription = pendingOrder.cart.some((item) => {
    const product = getProductById(item.id);
    return product && product.rxRequired;
  });
  prescriptionUploadBox.classList.toggle("d-none", !requiresPrescription);
  deliveryFeeNoteSummary.classList.toggle("d-none", requiresPrescription);
  pickupNoteSummary.classList.toggle("d-none", !requiresPrescription);
  if (requiresPrescription) {
    // prescription first, payment after approval
    qrBox.classList.add("d-none");
    fullyCoveredNotice.classList.add("d-none");
    paymentSubtotalRow.classList.add("d-none");
    paymentCreditRow.classList.add("d-none");
    document.getElementById("paymentTotalLabel").textContent = "Total (pay after approval)";
    submitOrderBtn.textContent = "Submit Prescription";
    document.getElementById("submitTermsNote").innerHTML =
      'By submitting, you agree to our <a href="../legal.html#terms" class="link-red" target="_blank" rel="noopener">Terms and Conditions</a>. Nothing is charged now. We\'ll notify you once our pharmacist has checked your prescription, then you can pay.';
    document.getElementById("rxItemsNeeded").innerHTML = pendingOrder.cart
      .map((item) => getProductById(item.id))
      .filter((product) => product && product.rxRequired)
      .map((product) => `<li>${escapeHtml(product.name)}</li>`)
      .join("");
  }

  paymentItemsSummary.innerHTML = checkoutSummaryItemsHtml(pendingOrder.cart);

  cartSubtotal = cartTotalNow();
  paymentTotalText.textContent = formatPeso(cartSubtotal);
  renderCreditPreview();
}

// cart total at current prices
function cartTotalNow() {
  let total = 0;
  for (const item of pendingOrder.cart) {
    const product = getProductById(item.id);
    if (product) total += product.price * item.qty;
  }
  return roundPeso(total);
}

// ---- payment screenshot, prescription photo and reference no. ----
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
  rxPhotoPicker = setUpRxPhotoPicker({
    grid: document.getElementById("rxPhotoGrid"),
    dropzone: rxUploadDropzone,
    input: prescriptionPhotoInput,
    errorText: rxUploadErrorText,
    prompt: document.getElementById("rxUploadPrompt"),
  });
}

// one image picker, previews the file and refuses over 10mb
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

// ---- submit: check form, recheck stock and prices, place order ----
async function submitOrder() {
  const file = requiresPrescription ? null : proofOfPaymentInput.files[0];
  const prescriptionFiles = rxPhotoPicker ? rxPhotoPicker.files() : [];
  const referenceNumber = requiresPrescription ? "" : referenceNumberInput.value.trim();
  if (!checkPaymentForm(file, prescriptionFiles, referenceNumber)) return;

  uploadErrorText.classList.add("d-none");
  rxUploadErrorText.classList.add("d-none");
  referenceNumberErrorText.classList.add("d-none");
  submitOrderErrorAlert.classList.add("d-none");
  submitOrderBtn.disabled = true;
  submitOrderBtn.textContent = "Checking stock...";
  if (!(await stockAndPricesStillOk(prescriptionFiles))) return;

  submitOrderBtn.textContent = "Submitting...";
  await placeOrder(file, prescriptionFiles, referenceNumber);
}

// shows a problem right above the submit button and gives the button back
function showSubmitProblem(message) {
  showFormAlert(submitOrderErrorAlert, message);
  submitOrderErrorAlert.scrollIntoView({ block: "center", behavior: "smooth" });
  submitOrderBtn.disabled = false;
  submitOrderBtn.textContent = requiresPrescription ? "Submit Prescription" : "Submit Order";
}

// ---- anything missing? ----
// true when the form is complete
function checkPaymentForm(file, prescriptionFiles, referenceNumber) {
  const problems = [];
  if (requiresPrescription && !prescriptionFiles.length) {
    problems.push("Upload a clear photo of your prescription.");
    showFormAlert(rxUploadErrorText, "Please upload a photo of your prescription.");
  }
  if (requiresPrescription) {
    // payment comes after approval
  } else if (!fullyCoveredByCredit && !file) {
    problems.push("Upload a screenshot of your payment.");
    showFormAlert(uploadErrorText, "Please upload a screenshot of your QR Ph payment.");
  }
  if (requiresPrescription) {
    // no reference number yet
  } else if (!fullyCoveredByCredit && !referenceNumber) {
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

// ---- last stock and price check ----
async function stockAndPricesStillOk(prescriptionFiles) {
  // no connection: say so instead of calling the items unavailable
  const connectionProblem = () => {
    showSubmitProblem("We couldn't reach the store to check stock. Check your internet connection, then tap Submit Order again.");
    return false;
  };
  if (navigator.onLine === false) return connectionProblem();
  clearCatalogCache();
  try {
    await loadCatalogCache();
  } catch (error) {
    return connectionProblem();
  }
  if (!CATALOG_PRODUCTS.length) return connectionProblem();

  // products pulled from the online store count as unavailable
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
    showSubmitProblem(`Some items in your cart exceed what's currently in stock: ${details}. Please go back to your cart and adjust the quantity.`);
    return false;
  }

  // prices changed so show the new total first
  const freshTotal = cartTotalNow();
  if (Math.abs(freshTotal - cartSubtotal) > 0.001) {
    cartSubtotal = freshTotal;
    renderCreditPreview();
    showSubmitProblem(`Some prices changed since you opened this page. Your new total is ${formatPeso(cartSubtotal)}. Please check it and tap Submit Order again.`);
    return false;
  }

  // prescription orders are always pickup
  const nowNeedsPrescription = pendingOrder.cart.some((item) => getProductById(item.id).rxRequired);
  if (nowNeedsPrescription !== requiresPrescription) {
    // an item became prescription-only (or stopped being one) while the page was open
    showSubmitProblem("Some items in your cart changed whether they need a prescription. Please go back to checkout and try again.");
    return false;
  }
  if (requiresPrescription && !prescriptionFiles.length) {
    prescriptionUploadBox.classList.remove("d-none");
    rxUploadErrorText.textContent = "This order has a prescription item. Please upload a photo of your prescription.";
    rxUploadErrorText.classList.remove("d-none");
    submitOrderBtn.textContent = "Submit Prescription";
    updateSubmitButtonState();
    return false;
  }
  return true;
}

// ---- place the order ----
async function placeOrder(file, prescriptionFiles, referenceNumber) {
  try {
    const user = auth.currentUser;
    const proofOfPaymentUrl = !requiresPrescription && file ? await uploadToCloudinary(file) : null;
    const prescriptionPhotoUrls = requiresPrescription ? await uploadRxPhotos(prescriptionFiles) : [];
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

    const orderData = {
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
      status: "placed",
      statusTimestamps: {
        placed: firebase.firestore.FieldValue.serverTimestamp(),
        payment_confirmed: null,
        dispatched: null,
        delivered: null,
        received: null,
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (requiresPrescription) {
      // pharmacist checks the prescription first, payment comes after approval
      orderData.prescriptionPhotoUrls = prescriptionPhotoUrls;
      orderData.rxReview = { state: "pending", items: {} };
    }

    await createOrderWithCreditRedemption(orderData, { expectFullCredit: fullyCoveredByCredit, applyCredit: !requiresPrescription });

    // order received notification
    if (user) {
      notifyCustomer(
        user.uid,
        requiresPrescription ? `Prescription submitted for order ${orderNumber}` : `Order ${orderNumber} placed`,
        requiresPrescription
          ? "We received your prescription. Our pharmacist will check it, and we'll tell you when you can pay. Nothing has been charged yet."
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
    if (requiresPrescription) {
      document.getElementById("confirmedTitle").textContent = "Prescription Submitted";
      document.getElementById("confirmedMessage").textContent =
        "Our pharmacist will check your prescription. We'll notify you by email once it's approved, then you can pay for your order in My Orders. Nothing has been charged yet.";
    }
    if (user) {
      document.getElementById("viewOrdersLink").classList.remove("d-none");
    }
    paymentContent.classList.add("d-none");
    orderConfirmation.classList.remove("d-none");
  } catch (error) {
    showFormAlert(submitOrderErrorAlert, error.message || "Something went wrong submitting your order. Please try again.");
    submitOrderErrorAlert.scrollIntoView({ block: "center", behavior: "smooth" });
    submitOrderBtn.disabled = false;
    submitOrderBtn.textContent = requiresPrescription ? "Submit Prescription" : "Submit Order";
  }
}
