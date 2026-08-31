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

// ---- Require login (in case this page is opened directly) ----
auth.onAuthStateChanged((user) => {
  if (!user) window.location.href = "../login.html";
});

function updateSubmitButtonState() {
  const hasProof = !!proofOfPaymentInput.files[0];
  const hasReferenceNumber = !!referenceNumberInput.value.trim();
  const hasPrescription = !requiresPrescription || !!prescriptionPhotoInput.files[0];
  submitOrderBtn.disabled = !(hasProof && hasReferenceNumber && hasPrescription);
}

(async function init() {
if (!pendingOrder || !pendingOrder.cart || pendingOrder.cart.length === 0) {
  noPendingOrderNotice.classList.remove("d-none");
  paymentContent.classList.add("d-none");
} else {
  await loadCatalogCache();

  requiresPrescription = pendingOrder.cart.some((item) => {
    const product = getProductById(item.id);
    return product && product.rxRequired;
  });
  prescriptionUploadBox.classList.toggle("d-none", !requiresPrescription);
  deliveryFeeNoteSummary.classList.toggle("d-none", requiresPrescription);
  pickupNoteSummary.classList.toggle("d-none", !requiresPrescription);

  paymentItemsSummary.innerHTML = pendingOrder.cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return "";
      return `
        <div class="checkout-summary-item">
          <div class="cart-item-image" style="width:56px;height:56px;flex-shrink:0;"></div>
          <div class="flex-grow-1">
            <p class="mb-0 fw-medium">${product.name}</p>
            <p class="text-muted mb-0" style="font-size:0.85rem;">Qty: ${item.qty}</p>
            <p class="product-price mb-0" style="font-size:1rem;">${formatPeso(product.price * item.qty)}</p>
          </div>
        </div>
      `;
    })
    .join("");

  let total = 0;
  for (const item of pendingOrder.cart) {
    const product = getProductById(item.id);
    if (product) total += product.price * item.qty;
  }

  paymentTotalText.textContent = formatPeso(total);

  uploadDropzone.addEventListener("click", () => proofOfPaymentInput.click());

  referenceNumberInput.addEventListener("input", () => {
    referenceNumberErrorText.classList.add("d-none");
    updateSubmitButtonState();
  });

  proofOfPaymentInput.addEventListener("change", () => {
    const file = proofOfPaymentInput.files[0];
    if (!file) return;

    uploadErrorText.classList.add("d-none");

    if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
      uploadErrorText.textContent = "That file is too large. Please upload an image under 10MB.";
      uploadErrorText.classList.remove("d-none");
      proofOfPaymentInput.value = "";
      uploadEmptyState.classList.remove("d-none");
      uploadPreviewState.classList.add("d-none");
      updateSubmitButtonState();
      return;
    }

    uploadPreviewImage.src = URL.createObjectURL(file);
    uploadPreviewFilename.textContent = file.name;
    uploadEmptyState.classList.add("d-none");
    uploadPreviewState.classList.remove("d-none");
    updateSubmitButtonState();
  });

  rxUploadDropzone.addEventListener("click", () => prescriptionPhotoInput.click());

  prescriptionPhotoInput.addEventListener("change", () => {
    const file = prescriptionPhotoInput.files[0];
    if (!file) return;

    rxUploadErrorText.classList.add("d-none");

    if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
      rxUploadErrorText.textContent = "That file is too large. Please upload an image under 10MB.";
      rxUploadErrorText.classList.remove("d-none");
      prescriptionPhotoInput.value = "";
      rxUploadEmptyState.classList.remove("d-none");
      rxUploadPreviewState.classList.add("d-none");
      updateSubmitButtonState();
      return;
    }

    rxUploadPreviewImage.src = URL.createObjectURL(file);
    rxUploadPreviewFilename.textContent = file.name;
    rxUploadEmptyState.classList.add("d-none");
    rxUploadPreviewState.classList.remove("d-none");
    updateSubmitButtonState();
  });

  submitOrderBtn.addEventListener("click", async () => {
    const file = proofOfPaymentInput.files[0];
    const prescriptionFile = prescriptionPhotoInput.files[0];
    const referenceNumber = referenceNumberInput.value.trim();
    if (!file || !referenceNumber || (requiresPrescription && !prescriptionFile)) {
      if (!referenceNumber) {
        referenceNumberErrorText.textContent = "Please enter the reference number from your proof of payment.";
        referenceNumberErrorText.classList.remove("d-none");
      }
      return;
    }

    uploadErrorText.classList.add("d-none");
    rxUploadErrorText.classList.add("d-none");
    referenceNumberErrorText.classList.add("d-none");
    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = "Checking stock...";

    // Stock may have changed since the cart was filled (another customer
    // bought it, or it just hasn't been received yet) - re-check against
    // live numbers right before the order is created, not the possibly
    // stale numbers from when checkout started.
    catalogLoadPromise = null;
    await loadCatalogCache();

    const outOfStockItems = pendingOrder.cart
      .map((item) => ({ item, product: getProductById(item.id) }))
      .filter(({ item, product }) => item.qty > (product ? product.totalStock : 0));

    if (outOfStockItems.length > 0) {
      const details = outOfStockItems
        .map(({ item, product }) =>
          product
            ? `${product.name} (only ${product.totalStock} left, ${item.qty} in your cart)`
            : "an item that's no longer available"
        )
        .join("; ");
      uploadErrorText.textContent = `Some items in your cart exceed what's currently in stock: ${details}. Please go back to your cart and adjust the quantity.`;
      uploadErrorText.classList.remove("d-none");
      submitOrderBtn.disabled = false;
      submitOrderBtn.textContent = "Submit Order";
      return;
    }

    submitOrderBtn.textContent = "Submitting...";

    try {
      const user = auth.currentUser;
      const proofOfPaymentUrl = await uploadToCloudinary(file);
      const prescriptionPhotoUrl = prescriptionFile ? await uploadToCloudinary(prescriptionFile) : null;
      const orderNumber = await generateOrderNumber();

      const items = pendingOrder.cart.map((item) => {
        const product = getProductById(item.id);
        return {
          id: item.id,
          name: product ? product.name : "Unknown product",
          price: product ? product.price : 0,
          qty: item.qty,
        };
      });

      await db.collection("orders").add({
        orderNumber,
        customerId: user ? user.uid : null,
        contact: pendingOrder.contact,
        shipping: pendingOrder.shipping,
        deliverySchedule: pendingOrder.deliverySchedule,
        items,
        total,
        proofOfPaymentUrl,
        paymentReferenceNumber: referenceNumber,
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
      });

      clearCart();
      sessionStorage.removeItem("amsonPendingOrder");
      document.getElementById("confirmedOrderNumber").textContent = `Order Number: ${orderNumber}`;
      if (user) {
        document.getElementById("viewOrdersLink").classList.remove("d-none");
      }
      paymentContent.classList.add("d-none");
      orderConfirmation.classList.remove("d-none");
    } catch (error) {
      uploadErrorText.textContent =
        error.message || "Something went wrong submitting your order. Please try again.";
      uploadErrorText.classList.remove("d-none");
      submitOrderBtn.disabled = false;
      submitOrderBtn.textContent = "Submit Order";
    }
  });
}
})();
