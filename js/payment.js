/**
 * Payment page: reads the pending order saved by checkout.js, shows a
 * hardcoded QR Ph payment code (no third-party payment gateway per
 * Amson's requirements), and requires a proof-of-payment upload before
 * "Submit Order" is enabled. No backend order write yet — this just
 * clears the cart and shows a confirmation panel.
 */

const ESTIMATED_DELIVERY_FEE = 85;

const noPendingOrderNotice = document.getElementById("noPendingOrderNotice");
const paymentContent = document.getElementById("paymentContent");
const orderConfirmation = document.getElementById("orderConfirmation");
const paymentItemsSummary = document.getElementById("paymentItemsSummary");
const paymentTotalText = document.getElementById("paymentTotalText");
const deliveryFeeText = document.getElementById("deliveryFeeText");
const uploadDropzone = document.getElementById("uploadDropzone");
const uploadDropzoneLabel = document.getElementById("uploadDropzoneLabel");
const proofOfPaymentInput = document.getElementById("proofOfPaymentInput");
const submitOrderBtn = document.getElementById("submitOrderBtn");

const pendingOrderRaw = sessionStorage.getItem("amsonPendingOrder");
const pendingOrder = pendingOrderRaw ? JSON.parse(pendingOrderRaw) : null;

if (!pendingOrder || !pendingOrder.cart || pendingOrder.cart.length === 0) {
  noPendingOrderNotice.classList.remove("d-none");
  paymentContent.classList.add("d-none");
} else {
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
    uploadDropzoneLabel.textContent = file.name;
    submitOrderBtn.disabled = false;
  });

  submitOrderBtn.addEventListener("click", () => {
    clearCart();
    sessionStorage.removeItem("amsonPendingOrder");
    paymentContent.classList.add("d-none");
    orderConfirmation.classList.remove("d-none");
  });
}
