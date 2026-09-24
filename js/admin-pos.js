let posCart = [];
let posProductChoices = null;
let currentCashierName = "Staff";

const posProductSelect = document.getElementById("posProductSelect");
const posQtyInput = document.getElementById("posQtyInput");
const posAddItemBtn = document.getElementById("posAddItemBtn");
const posAddItemError = document.getElementById("posAddItemError");
const posCartBody = document.getElementById("posCartBody");
const posCartEmpty = document.getElementById("posCartEmpty");
const posTotalText = document.getElementById("posTotalText");
const posCashFields = document.getElementById("posCashFields");
const posCashInput = document.getElementById("posCashInput");
const posChangeText = document.getElementById("posChangeText");
const posAlert = document.getElementById("posAlert");
const posCompleteSaleBtn = document.getElementById("posCompleteSaleBtn");
const posPaymentMethodInputs = document.querySelectorAll('input[name="posPaymentMethod"]');

function posPaymentMethod() {
  const checked = document.querySelector('input[name="posPaymentMethod"]:checked');
  return checked ? checked.value : "cash";
}

posPaymentMethodInputs.forEach((input) => {
  input.addEventListener("change", () => {
    posCashFields.classList.toggle("d-none", posPaymentMethod() !== "cash");
    updatePosTotals();
  });
});

document.addEventListener("admin:ready", async (e) => {
  const admin = e.detail && e.detail.admin;
  if (admin) currentCashierName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Staff";

  await loadCatalogCache();
  populatePosProductSelect();
});

function posEligibleProducts() {
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInPOS);
}

function populatePosProductSelect() {
  const options = posEligibleProducts().map((p) => ({
    value: p.id,
    label: `${p.name} - ${formatPeso(p.price)} (${p.totalStock} in stock)`,
  }));
  posProductSelect.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");

  if (posProductChoices) {
    posProductChoices.destroy();
  }
  posProductChoices = new Choices(posProductSelect, {
    searchEnabled: true,
    itemSelectText: "",
    shouldSort: false,
    searchResultLimit: 50,
    fuseOptions: { threshold: 0.3 },
  });
}

// How much of a product is still available to add, given what's already
// sitting in this same sale's cart - so staff can't ring up more than is
// actually on the shelf across multiple "Add" clicks for the same item.
function posAvailableQty(productId) {
  const product = getProductById(productId);
  if (!product) return 0;
  const alreadyInCart = posCart.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.qty, 0);
  return Math.max(0, product.totalStock - alreadyInCart);
}

posAddItemBtn.addEventListener("click", () => {
  posAddItemError.classList.add("d-none");

  const productId = posProductSelect.value;
  const qty = parseInt(posQtyInput.value, 10);
  const product = getProductById(productId);

  if (!product || !qty || qty <= 0) {
    posAddItemError.textContent = "Pick a product and a quantity of at least 1.";
    posAddItemError.classList.remove("d-none");
    return;
  }

  const available = posAvailableQty(productId);
  if (qty > available) {
    posAddItemError.textContent = `Only ${available} of ${product.name} left to add.`;
    posAddItemError.classList.remove("d-none");
    return;
  }

  const existing = posCart.find((i) => i.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    posCart.push({ productId, name: product.name, price: product.price, qty });
  }

  posQtyInput.value = "1";
  renderPosCart();
});

function renderPosCart() {
  posCartEmpty.classList.toggle("d-none", posCart.length > 0);

  posCartBody.innerHTML = posCart
    .map(
      (item, idx) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.qty}</td>
          <td>${formatPeso(item.price)}</td>
          <td>${formatPeso(item.price * item.qty)}</td>
          <td><button type="button" class="icon-btn pos-remove-item-btn" data-idx="${idx}" aria-label="Remove"><i class="bi bi-trash text-danger"></i></button></td>
        </tr>
      `
    )
    .join("");

  document.querySelectorAll(".pos-remove-item-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      posCart.splice(Number(btn.dataset.idx), 1);
      renderPosCart();
    });
  });

  updatePosTotals();
}

function posTotal() {
  return posCart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updatePosTotals() {
  const total = posTotal();
  const cash = parseFloat(posCashInput.value) || 0;
  posTotalText.textContent = formatPeso(total);
  posChangeText.textContent = formatPeso(Math.max(0, cash - total));
}

posCashInput.addEventListener("input", updatePosTotals);

posCompleteSaleBtn.addEventListener("click", async () => {
  posAlert.classList.add("d-none");

  if (posCart.length === 0) {
    posAlert.textContent = "Add at least one item before completing the sale.";
    posAlert.classList.remove("d-none");
    return;
  }

  const total = posTotal();
  const paymentMethod = posPaymentMethod();
  const isCash = paymentMethod === "cash";
  const cash = isCash ? parseFloat(posCashInput.value) || 0 : total;
  if (isCash && cash < total) {
    posAlert.textContent = "Cash received is less than the total.";
    posAlert.classList.remove("d-none");
    return;
  }

  posCompleteSaleBtn.disabled = true;
  try {
    await deductStockFEFOMultiple(posCart.map((item) => ({ productId: item.productId, qty: item.qty })));

    await db.collection("posSales").add({
      items: posCart.map((item) => ({ productId: item.productId, name: item.name, price: item.price, qty: item.qty })),
      total,
      paymentMethod,
      cashReceived: isCash ? cash : total,
      change: isCash ? cash - total : 0,
      cashier: currentCashierName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    const confirmMessage = isCash
      ? `Sale complete. Change due: ${formatPeso(cash - total)}`
      : `Sale complete. Paid by ${paymentMethod === "card" ? "card" : "e-wallet"}.`;
    await showAppAlert(confirmMessage, { title: "Sale Complete" });

    posCart = [];
    posCashInput.value = "";
    renderPosCart();
    catalogLoadPromise = null;
    await loadCatalogCache();
    populatePosProductSelect();
  } catch (error) {
    posAlert.textContent = error.message || "Something went wrong completing this sale. Please try again.";
    posAlert.classList.remove("d-none");
  } finally {
    posCompleteSaleBtn.disabled = false;
  }
});
