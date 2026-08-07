/**
 * Payment page: reads the pending order saved by checkout.js, shows a
 * hardcoded QR Ph payment code (no third-party payment gateway per
 * Amson's requirements), and requires a proof-of-payment upload before
 * "Submit Order" is enabled. On submit: uploads the proof image to
 * Cloudinary (see js/cloudinary.js - chosen over Firebase Storage to
 * avoid the Blaze plan's billing requirement), writes an orders/{id} doc
 * in Firestore with status "placed", clears the cart, and shows a
 * confirmation panel.
 */

const ESTIMATED_DELIVERY_FEE = 85;
const MAX_PROOF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const noPendingOrderNotice = document.getElementById("noPendingOrderNotice");
const paymentContent = document.getElementById("paymentContent");
const orderConfirmation = document.getElementById("orderConfirmation");
const paymentItemsSummary = document.getElementById("paymentItemsSummary");
const paymentTotalText = document.getElementById("paymentTotalText");
const deliveryFeeText = document.getElementById("deliveryFeeText");
const uploadDropzone = document.getElementById("uploadDropzone");
const uploadEmptyState = document.getElementById("uploadEmptyState");
const uploadPreviewState = document.getElementById("uploadPreviewState");
const uploadPreviewImage = document.getElementById("uploadPreviewImage");
const uploadPreviewFilename = document.getElementById("uploadPreviewFilename");
const uploadErrorText = document.getElementById("uploadErrorText");
const proofOfPaymentInput = document.getElementById("proofOfPaymentInput");
const submitOrderBtn = document.getElementById("submitOrderBtn");

const pendingOrderRaw = sessionStorage.getItem("amsonPendingOrder");
const pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : null;

(async function init() {
if (!pendingOrder || !pendingOrder.cart || pendingOrder.cart.length === 0) {
  noPendingOrderNotice.classList.remove("d-none");
  paymentContent.classList.add("d-none");
} else {
  await loadCatalogCache();

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

  const total = pendingOrder.cart.reduce((sum, item) => {
    const product = getProductById(item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);

  paymentTotalText.textContent = formatPeso(total);
  deliveryFeeText.textContent = `~${formatPeso(ESTIMATED_DELIVERY_FEE)}`;

  uploadDropzone.addEventListener("click", () => proofOfPaymentInput.click());

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
      submitOrderBtn.disabled = true;
      return;
    }

    uploadPreviewImage.src = URL.createObjectURL(file);
    uploadPreviewFilename.textContent = file.name;
    uploadEmptyState.classList.add("d-none");
    uploadPreviewState.classList.remove("d-none");
    submitOrderBtn.disabled = false;
  });

  submitOrderBtn.addEventListener("click", async () => {
    const file = proofOfPaymentInput.files[0];
    if (!file) return;

    uploadErrorText.classList.add("d-none");
    submitOrderBtn.disabled = true;
    submitOrderBtn.textContent = "Submitting...";

    try {
      const user = auth.currentUser;
      const proofOfPaymentUrl = await uploadToCloudinary(file);
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
        deliveryFeeEstimate: ESTIMATED_DELIVERY_FEE,
        proofOfPaymentUrl,
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
