/**
 * Checkout page: prefills contact info for signed-in customers, renders
 * the order summary from the cart, and hands off to payment.html via
 * sessionStorage (no backend order write yet).
 */

const emptyCartNotice = document.getElementById("emptyCartNotice");
const checkoutContent = document.getElementById("checkoutContent");
const checkoutItemsSummary = document.getElementById("checkoutItemsSummary");
const checkoutTotalText = document.getElementById("checkoutTotalText");
const checkoutForm = document.getElementById("checkoutForm");
const proceedToPaymentBtn = document.getElementById("proceedToPaymentBtn");
const deliveryScheduleLabel = document.getElementById("deliveryScheduleLabel");
const saveDeliveryScheduleBtn = document.getElementById("saveDeliveryScheduleBtn");

const TIME_SLOT_LABELS = {
  morning: "Morning (8AM-12PM)",
  afternoon: "Afternoon (12PM-4PM)",
  evening: "Evening (4PM-8PM)",
};

let deliverySchedule = null;

const cart = getCart();

if (cart.length === 0) {
  emptyCartNotice.classList.remove("d-none");
  checkoutContent.classList.add("d-none");
} else {
  checkoutItemsSummary.innerHTML = cart
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

  checkoutTotalText.textContent = formatPeso(cartTotal(cart));
}

// ---- Delivery schedule modal ----
saveDeliveryScheduleBtn.addEventListener("click", () => {
  const date = document.getElementById("deliveryDate").value;
  const slot = document.getElementById("deliveryTimeSlot").value;
  if (!date) return;
  deliverySchedule = { date, slot };
  deliveryScheduleLabel.textContent = `${date} · ${TIME_SLOT_LABELS[slot]}`;
});

// ---- Proceed to Payment ----
proceedToPaymentBtn.addEventListener("click", () => {
  if (!checkoutForm.checkValidity()) {
    checkoutForm.classList.add("was-validated");
    return;
  }

  const order = {
    contact: {
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      email: document.getElementById("email").value.trim(),
      contactNumber: document.getElementById("contactNumber").value.trim(),
    },
    shipping: {
      streetAddress: document.getElementById("streetAddress").value.trim(),
      city: document.getElementById("city").value.trim(),
      province: document.getElementById("province").value.trim(),
      zipCode: document.getElementById("zipCode").value.trim(),
      deliveryNotes: document.getElementById("deliveryNotes").value.trim(),
    },
    deliverySchedule,
    cart: getCart(),
  };

  sessionStorage.setItem("amsonPendingOrder", JSON.stringify(order));
  window.location.href = "payment.html";
});

// ---- Prefill contact info for signed-in customers (best-effort; checkout
// itself must keep working even if this never resolves) ----
try {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) return;
      const data = doc.data();
      document.getElementById("firstName").value = data.firstName || "";
      document.getElementById("lastName").value = data.lastName || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("contactNumber").value = data.contactNumber || "";
    } catch (error) {
      // Guest checkout still works with manually entered info.
    }
  });
} catch (error) {
  // Firebase failed to load — checkout still works with manual entry.
}
