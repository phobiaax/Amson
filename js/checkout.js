// checkout page

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

// only the checked items get ordered, whole cart if nothing was marked
function getCheckoutCart() {
  const fullCart = getCart();
  try {
    const raw = sessionStorage.getItem("amsonCheckoutSelectedIds");
    const selectedIds = raw ? JSON.parse(raw) : null;
    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      const idSet = new Set(selectedIds);
      const filtered = fullCart.filter((item) => idSet.has(item.id));
      if (filtered.length > 0) return filtered;
    }
  } catch (error) {}
  return fullCart;
}

const cart = getCheckoutCart();

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

  checkoutItemsSummary.innerHTML = checkoutSummaryItemsHtml(cart);

  checkoutTotalText.textContent = formatPeso(cartTotal(cart));
})();

// ---- delivery schedule modal ----
// local date since utc is still yesterday before 8am here
const todayISO = localISODate(new Date());
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
    deliveryScheduleLabel.textContent = "Same Day Delivery";
    return;
  }

  const date = deliveryDateInput.value;
  const slot = deliveryTimeSlotInput.value;
  if (!date || date < todayISO) return;
  deliverySchedule = { date, slot };
  deliveryScheduleLabel.textContent = `${date} · ${TIME_SLOT_LABELS[slot]}`;
});

// ---- form checks before payment ----
// bad fields get a red outline and a list above the button
const checkoutErrorAlert = document.getElementById("checkoutErrorAlert");

function checkoutFormIsValid() {
  const value = (id) => document.getElementById(id).value.trim();
  const problems = [];
  if (!value("firstName")) problems.push({ id: "firstName", message: "Enter your first name." });
  else if (!NAME_PATTERN.test(value("firstName"))) problems.push({ id: "firstName", message: "First name: letters, spaces, periods and dashes only." });
  if (!value("lastName")) problems.push({ id: "lastName", message: "Enter your last name." });
  else if (!NAME_PATTERN.test(value("lastName"))) problems.push({ id: "lastName", message: "Last name: letters, spaces, periods and dashes only." });
  if (!value("email")) problems.push({ id: "email", message: "Enter your email address." });
  else if (!EMAIL_PATTERN.test(value("email"))) problems.push({ id: "email", message: "Enter a valid email address." });
  if (!value("contactNumber")) problems.push({ id: "contactNumber", message: "Enter your contact number." });
  else if (!PH_PHONE_PATTERN.test(normalizePhPhone(value("contactNumber"))))
    problems.push({ id: "contactNumber", message: "Contact number: a Philippine mobile number (e.g. 0917 123 4567)." });
  if (!requiresPrescription) {
    const ids = { streetAddress: "streetAddress", city: "city", province: "province", zipCode: "zipCode" };
    addressProblems({ streetAddress: value("streetAddress"), city: value("city"), province: value("province"), zipCode: value("zipCode") }).forEach((p) =>
      problems.push({ id: ids[p.field], message: p.message })
    );
  }

  checkoutForm.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  problems.forEach((p) => document.getElementById(p.id).classList.add("is-invalid"));
  if (problems.length === 0) {
    checkoutErrorAlert.classList.add("d-none");
    return true;
  }
  showFormAlert(checkoutErrorAlert, `Please fix the following before continuing:\n- ${problems.map((p) => p.message).join("\n- ")}`);
  document.getElementById(problems[0].id).focus();
  return false;
}

// removes the red outline once the field changes
checkoutForm.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));

// ---- proceed to payment ----
let signedInUid = null;

proceedToPaymentBtn.addEventListener("click", async () => {
  if (!signedInUid) {
    window.location.href = "../login.html?next=shop%2Fcheckout.html";
    return;
  }

  if (!checkoutFormIsValid()) return;

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
    cart,
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

// ---- must be logged in, fills in contact info and saved address ----
try {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "../login.html?next=shop%2Fcheckout.html";
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
