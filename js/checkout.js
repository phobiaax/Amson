/**
 * Checkout page.
 */

const emptyCartNotice = document.getElementById("emptyCartNotice");
const checkoutContent = document.getElementById("checkoutContent");
const checkoutItemsSummary = document.getElementById("checkoutItemsSummary");
const checkoutTotalText = document.getElementById("checkoutTotalText");
const checkoutForm = document.getElementById("checkoutForm");
const proceedToPaymentBtn = document.getElementById("proceedToPaymentBtn");
const deliveryScheduleLabel = document.getElementById("deliveryScheduleLabel");
const saveDeliveryScheduleBtn = document.getElementById("saveDeliveryScheduleBtn");
const deliveryAsapCheck = document.getElementById("deliveryAsapCheck");
const deliveryDateInput = document.getElementById("deliveryDate");
const deliveryTimeSlotInput = document.getElementById("deliveryTimeSlot");
const pickupNoticeCard = document.getElementById("pickupNoticeCard");
const shippingAddressSection = document.getElementById("shippingAddressSection");
const deliveryFeeNote = document.getElementById("deliveryFeeNote");
const deliveryScheduleBtn = document.getElementById("deliveryScheduleBtn");
const streetAddressInput = document.getElementById("streetAddress");
const cityInput = document.getElementById("city");
const provinceInput = document.getElementById("province");
const zipCodeInput = document.getElementById("zipCode");

const TIME_SLOT_LABELS = {
  morning: "Morning (8AM-12PM)",
  afternoon: "Afternoon (12PM-4PM)",
  evening: "Evening (4PM-8PM)",
};

let deliverySchedule = null;
let requiresPrescription = false;

const cart = getCart();

(async function init() {
  if (cart.length === 0) {
    emptyCartNotice.classList.remove("d-none");
    checkoutContent.classList.add("d-none");
    return;
  }

  await loadCatalogCache();

  requiresPrescription = cart.some((item) => {
    const product = getProductById(item.id);
    return product && product.rxRequired;
  });

  if (requiresPrescription) {
    pickupNoticeCard.classList.remove("d-none");
    shippingAddressSection.classList.add("d-none");
    deliveryFeeNote.classList.add("d-none");
    deliveryScheduleBtn.classList.add("d-none");
    [streetAddressInput, cityInput, provinceInput, zipCodeInput].forEach((input) => (input.required = false));
  }

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
})();

// ---- Delivery schedule modal ----
const todayISO = new Date().toISOString().slice(0, 10);
deliveryDateInput.min = todayISO;

deliveryAsapCheck.addEventListener("change", () => {
  const isAsap = deliveryAsapCheck.checked;
  deliveryDateInput.disabled = isAsap;
  deliveryTimeSlotInput.disabled = isAsap;
  if (isAsap) {
    deliveryDateInput.value = "";
  }
});

saveDeliveryScheduleBtn.addEventListener("click", () => {
  if (deliveryAsapCheck.checked) {
    deliverySchedule = { asap: true };
    deliveryScheduleLabel.textContent = "As soon as possible";
    return;
  }

  const date = deliveryDateInput.value;
  const slot = deliveryTimeSlotInput.value;
  if (!date || date < todayISO) return;
  deliverySchedule = { date, slot };
  deliveryScheduleLabel.textContent = `${date} · ${TIME_SLOT_LABELS[slot]}`;
});

// ---- Proceed to Payment ----
let signedInUid = null;

proceedToPaymentBtn.addEventListener("click", async () => {
  if (!signedInUid) {
    window.location.href = "../login.html";
    return;
  }

  if (!checkoutForm.checkValidity()) {
    checkoutForm.classList.add("was-validated");
    return;
  }

  const shipping = requiresPrescription
    ? null
    : {
        streetAddress: streetAddressInput.value.trim(),
        city: cityInput.value.trim(),
        province: provinceInput.value.trim(),
        zipCode: zipCodeInput.value.trim(),
        deliveryNotes: document.getElementById("deliveryNotes").value.trim(),
      };

  const order = {
    contact: {
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      email: document.getElementById("email").value.trim(),
      contactNumber: document.getElementById("contactNumber").value.trim(),
    },
    shipping,
    deliverySchedule: requiresPrescription ? null : deliverySchedule,
    cart: getCart(),
  };

  sessionStorage.setItem("amsonPendingOrder", JSON.stringify(order));

  if (signedInUid && shipping) {
    try {
      await db.collection("users").doc(signedInUid).set(
        { shippingAddress: shipping },
        { merge: true }
      );
    } catch (error) {}
  }

  window.location.href = "payment.html";
});

// ---- Require login to check out; prefill contact info + saved address ----
try {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "../login.html";
      return;
    }
    signedInUid = user.uid;
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (!doc.exists) return;
      const data = doc.data();
      document.getElementById("firstName").value = data.firstName || "";
      document.getElementById("lastName").value = data.lastName || "";
      document.getElementById("email").value = data.email || "";
      document.getElementById("contactNumber").value = data.contactNumber || "";

      if (data.shippingAddress) {
        streetAddressInput.value = data.shippingAddress.streetAddress || "";
        cityInput.value = data.shippingAddress.city || "";
        provinceInput.value = data.shippingAddress.province || "";
        zipCodeInput.value = data.shippingAddress.zipCode || "";
        document.getElementById("deliveryNotes").value = data.shippingAddress.deliveryNotes || "";
      }
    } catch (error) {}
  });
} catch (error) {}
