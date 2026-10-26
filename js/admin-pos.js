let posCart = [];
let posProductChoices = null;
let currentCashierName = "Staff";
let currentStaffRole = null;

const posProductSelect = document.getElementById("posProductSelect");
const posQtyInput = document.getElementById("posQtyInput");
const posQtyDecrementBtn = document.getElementById("posQtyDecrementBtn");
const posQtyIncrementBtn = document.getElementById("posQtyIncrementBtn");
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
const posPaymentMethodSelect = document.getElementById("posPaymentMethodSelect");
const posCustomerNameInput = document.getElementById("posCustomerNameInput");
const posReferenceFields = document.getElementById("posReferenceFields");
const posReferenceNoInput = document.getElementById("posReferenceNoInput");

// Payment methods that come with a transaction reference number.
const POS_REFERENCE_METHODS = ["gcash", "bank_transfer", "terminal"];

function posPaymentMethod() {
  return posPaymentMethodSelect.value || "cash";
}

posPaymentMethodSelect.addEventListener("change", () => {
  posCashFields.classList.toggle("d-none", posPaymentMethod() !== "cash");
  posReferenceFields.classList.toggle("d-none", !POS_REFERENCE_METHODS.includes(posPaymentMethod()));
  updatePosTotals();
});

posQtyDecrementBtn.addEventListener("click", () => {
  const current = parseInt(posQtyInput.value, 10) || 1;
  posQtyInput.value = Math.max(1, current - 1);
});

posQtyIncrementBtn.addEventListener("click", () => {
  const current = parseInt(posQtyInput.value, 10) || 0;
  posQtyInput.value = current + 1;
});

document.addEventListener("admin:ready", async (e) => {
  const admin = e.detail && e.detail.admin;
  if (admin) currentCashierName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Staff";
  if (admin) currentStaffRole = admin.role;
  // Returns / exchanges: Branch Manager and Technical Staff (as voids).
  document.getElementById("posReturnExchangeBtn").classList.toggle("d-none", !roleCanVoidSales(currentStaffRole));
  loadTodaySales();
  listenToTodaySales();

  await loadCatalogCache();
  populatePosProductSelect();
});

// Return / Exchange starts from the original receipt's SI No. (any date).
document.getElementById("posReturnExchangeBtn").addEventListener("click", async () => {
  const entered = await showAppPrompt("Enter the SI No. on the customer's receipt.", {
    title: "Return / Exchange",
    confirmLabel: "Find Sale",
    placeholder: "e.g. 00000123",
  });
  if (entered == null) return;
  const digits = String(entered).replace(/\D/g, "");
  if (!digits) return;
  try {
    const snap = await db.collection("posSales").where("invoiceNo", "==", formatInvoiceNo(Number(digits))).limit(1).get();
    if (snap.empty) {
      await showAppAlert(`No walk-in sale with SI No. ${formatInvoiceNo(Number(digits))} was found. Online and wholesale orders have their own returns (Wholesale Accounts → purchase history).`);
      return;
    }
    const doc = snap.docs[0];
    openPosSaleReceipt({ id: doc.id, ...doc.data() }, loadTodaySales);
  } catch (error) {
    await showAppAlert("Couldn't look up that sale. Please try again.");
  }
});

function posEligibleProducts() {
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInPOS);
}

function populatePosProductSelect() {
  const options = posEligibleProducts().map((p) => ({
    value: p.id,
    label: `${p.name} - ${formatPeso(p.price)} (${p.totalStock} in stock)`,
  }));
  // Destroy first: Choices puts the select's original options back when it's
  // destroyed, which overwrote the new stock numbers after every sale.
  if (posProductChoices) {
    posProductChoices.destroy();
  }
  posProductSelect.innerHTML = options.map((o) => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join("");
  posProductChoices = new Choices(posProductSelect, {
    searchEnabled: true,
    allowHTML: false,
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

function adjustCartItemQty(idx, delta) {
  const item = posCart[idx];
  if (!item) return;

  if (delta > 0 && posAvailableQty(item.productId) <= 0) {
    posAddItemError.textContent = `No more ${item.name} left to add.`;
    posAddItemError.classList.remove("d-none");
    return;
  }

  posAddItemError.classList.add("d-none");
  item.qty += delta;
  if (item.qty <= 0) {
    posCart.splice(idx, 1);
  }
  renderPosCart();
}

function renderPosCart() {
  posCartEmpty.classList.toggle("d-none", posCart.length > 0);

  posCartBody.innerHTML = posCart
    .map(
      (item, idx) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>
            <div class="input-group input-group-sm" style="width:110px;">
              <button type="button" class="btn btn-outline-secondary pos-qty-decrement-btn" data-idx="${idx}" aria-label="Decrease quantity"><i class="bi bi-dash-lg"></i></button>
              <span class="form-control text-center">${item.qty}</span>
              <button type="button" class="btn btn-outline-secondary pos-qty-increment-btn" data-idx="${idx}" aria-label="Increase quantity"><i class="bi bi-plus-lg"></i></button>
            </div>
          </td>
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

  document.querySelectorAll(".pos-qty-decrement-btn").forEach((btn) => {
    btn.addEventListener("click", () => adjustCartItemQty(Number(btn.dataset.idx), -1));
  });

  document.querySelectorAll(".pos-qty-increment-btn").forEach((btn) => {
    btn.addEventListener("click", () => adjustCartItemQty(Number(btn.dataset.idx), 1));
  });

  updatePosTotals();
  updateRxBlock();
}

// RX items need the cashier to confirm they physically checked the
// prescription (REQ084, Fig 2.14) - no upload for walk-ins.
const posRxBlock = document.getElementById("posRxBlock");
const posRxVerifiedCheck = document.getElementById("posRxVerifiedCheck");
const posRxNotesInput = document.getElementById("posRxNotesInput");

function posCartHasRx() {
  return posCart.some((item) => {
    const product = getProductById(item.productId);
    return product && product.rxRequired;
  });
}

function updateRxBlock() {
  const hasRx = posCartHasRx();
  posRxBlock.classList.toggle("d-none", !hasRx);
  if (!hasRx) {
    posRxVerifiedCheck.checked = false;
    posRxNotesInput.value = "";
  }
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

posCompleteSaleBtn.addEventListener("click", () => {
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

  const needsReference = POS_REFERENCE_METHODS.includes(paymentMethod);
  const referenceNo = needsReference ? posReferenceNoInput.value.trim() : "";
  if (needsReference && !referenceNo) {
    posAlert.textContent = "Enter the reference number from the payment slip or receipt.";
    posAlert.classList.remove("d-none");
    return;
  }

  const rxIncluded = posCartHasRx();
  if (rxIncluded && !posRxVerifiedCheck.checked) {
    posAlert.textContent = "Check the customer's prescription and tick RX Verified before completing this sale.";
    posAlert.classList.remove("d-none");
    return;
  }
  const rxNotes = posRxNotesInput.value.trim();

  const items = posCart.map((item) => ({ productId: item.productId, name: item.name, price: item.price, qty: item.qty }));
  // Walk-in buyers stay generic unless the cashier types a name (the
  // branch's Customer File groups sales by name, e.g. regulars, EMPLOYEE).
  const customerName = posCustomerNameInput.value.trim() || "Walk-in";

  // Nothing is committed yet - this is a preview. Stock only gets deducted
  // and the sale only gets written once the cashier hits Confirm below, so
  // Edit Transaction has nothing to undo: the cart's exactly as they left it.
  showSaleReceipt({
    items,
    total,
    paymentMethod,
    isCash,
    amountPaid: isCash ? cash : total,
    change: cash - total,
    cashier: currentCashierName,
    branch: POS_BRANCH_NAME,
    completedAt: new Date(),
    customerName,
    referenceNo,
    title: "Review Transaction",
    onConfirm: async () => {
      try {
        // Stock deduction, the SI# and the sale record are one transaction:
        // a sale can't be saved without its stock leaving, or vice versa.
        const saleRef = db.collection("posSales").doc();
        const stockVersion = liveVersion("stockBatches");
        const { invoiceNo } = await deductStockFEFOMultiple(
          items.map((item) => ({ productId: item.productId, qty: item.qty })),
          {
            record: {
              ref: saleRef,
              mode: "set",
              build: (allocations, invoiceNo) => ({
                invoiceNo,
                customerName,
                items: items.map((item, idx) => ({ ...item, ...batchFieldsFromAllocation(allocations[idx]) })),
                total,
                paymentMethod,
                referenceNo: referenceNo || null,
                cashReceived: isCash ? cash : paymentMethod === "credit" ? 0 : total,
                change: isCash ? cash - total : 0,
                cashier: currentCashierName,
                branch: POS_BRANCH_NAME,
                rxVerified: rxIncluded,
                rxNotes: rxIncluded ? rxNotes : "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              }),
            },
          }
        );

        posCart = [];
        posCashInput.value = "";
        posCustomerNameInput.value = "";
        posReferenceNoInput.value = "";
        renderPosCart();
        catalogLoadPromise = null;
        await loadCatalogCache({ afterStockChange: stockVersion });
        populatePosProductSelect();

        // Show the finished receipt (with its SI No.) so it can be printed.
        showSaleReceipt({
          items,
          total,
          paymentMethod,
          isCash,
          amountPaid: isCash ? cash : total,
          change: isCash ? cash - total : 0,
          cashier: currentCashierName,
          branch: POS_BRANCH_NAME,
          completedAt: new Date(),
          customerName,
          referenceNo,
          invoiceNo,
          title: "Sale Complete",
          autoPrint: true,
        });
        logAuditEvent({
          action: "Walk-in Sale",
          details: `SI ${invoiceNo} - ${customerName} - ${items.map((it) => `${it.name} x${it.qty}`).join(", ")} - Total ${formatPeso(total)}, ${
            SALE_RECEIPT_PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod
          }${referenceNo ? ` (Ref ${referenceNo})` : ""} - stock deducted`,
        });
        loadTodaySales();
        return true;
      } catch (error) {
        posAlert.textContent = error.message || "Something went wrong completing this sale. Please try again.";
        posAlert.classList.remove("d-none");
      }
    },
  });
});

/* ---------- Today's Sales (walk-in history inside the POS) ---------- */
const posTodaySalesBody = document.getElementById("posTodaySalesBody");
const posTodaySalesEmpty = document.getElementById("posTodaySalesEmpty");
let todaySales = [];

async function loadTodaySales() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const snapshot = await db
      .collection("posSales")
      .where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(startOfDay))
      .get();
    todaySales = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.createdAt ? b.createdAt.toMillis() : 0) - (a.createdAt ? a.createdAt.toMillis() : 0));
    renderTodaySales();
  } catch (error) {
    console.error("Failed to load today's sales:", error);
  }
}

function renderTodaySales() {
  posTodaySalesEmpty.classList.toggle("d-none", todaySales.length > 0);
  posTodaySalesBody.innerHTML = todaySales
    .map(
      (sale) => `
        <tr class="${sale.voided ? "text-muted" : ""}">
          <td class="fw-medium">${escapeHtml(sale.invoiceNo || "-")}</td>
          <td>${sale.createdAt ? sale.createdAt.toDate().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : "-"}</td>
          <td>${escapeHtml(sale.customerName || "Walk-in")}</td>
          <td>${(sale.items || []).reduce((n, i) => n + i.qty, 0)}</td>
          <td>${formatPeso(sale.total)}</td>
          <td>${escapeHtml(SALE_RECEIPT_PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod || "-")}</td>
          <td>
            ${sale.voided ? '<span class="badge rounded-pill text-bg-danger me-1">Voided</span>' : sale.partialVoids && sale.partialVoids.length ? '<span class="badge rounded-pill text-bg-warning me-1">Items Voided</span>' : ""}
            <button type="button" class="btn btn-outline-dark-amson btn-sm pos-today-view-btn" data-id="${sale.id}">View</button>
          </td>
        </tr>
      `
    )
    .join("");
  posTodaySalesBody.querySelectorAll(".pos-today-view-btn").forEach((btn) => {
    btn.addEventListener("click", () => openPosSaleReceipt(todaySales.find((s) => s.id === btn.dataset.id), loadTodaySales));
  });
}

document.getElementById("posTodayRefreshBtn").addEventListener("click", loadTodaySales);

// Live (REQNF005): sales rung up on another counter appear here too.
let unsubscribeTodaySales = null;
function listenToTodaySales() {
  if (unsubscribeTodaySales) return;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  let first = true;
  let timer = null;
  unsubscribeTodaySales = db
    .collection("posSales")
    .where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(startOfDay))
    .onSnapshot(
      () => {
        if (first) {
          first = false;
          return;
        }
        clearTimeout(timer);
        timer = setTimeout(loadTodaySales, 500);
      },
      (error) => console.warn("Live sales unavailable:", error)
    );
}

// View/print a past sale, and void it if this staff member's role allows.
function openPosSaleReceipt(sale, afterVoid) {
  if (!sale) return;
  const isCash = sale.paymentMethod === "cash";
  showSaleReceipt({
    items: sale.items || [],
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    isCash,
    amountPaid: sale.cashReceived,
    change: sale.change || 0,
    cashier: sale.cashier || "-",
    branch: sale.branch || POS_BRANCH_NAME,
    completedAt: sale.createdAt && sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(),
    invoiceNo: sale.invoiceNo || null,
    customerName: sale.customerName || "Walk-in",
    referenceNo: sale.referenceNo || "",
    title: "Sale Receipt",
    voidInfo: voidSummary(sale),
    partialVoidInfo: partialVoidSummary(sale),
    onExchange:
      !sale.voided && roleCanVoidSales(currentStaffRole)
        ? async () => {
            const stockVersion = liveVersion("stockBatches");
            const exchange = await openWalkinExchangeDialog(sale, currentCashierName);
            if (!exchange) return;
            catalogLoadPromise = null;
            await loadCatalogCache({ afterStockChange: stockVersion });
            populatePosProductSelect();
            if (afterVoid) afterVoid();
          }
        : null,
    onVoid:
      !sale.voided && roleCanVoidSales(currentStaffRole)
        ? async () => {
            // Technical Staff need a Branch Manager to approve (client rule).
            const details = await promptVoidDetails(sale, { requireApproval: currentStaffRole === "technical_staff" });
            if (!details) return;
            try {
              const stockVersion = liveVersion("stockBatches");
              const result = await voidPosSale(sale, details, currentCashierName);
              catalogLoadPromise = null;
              await loadCatalogCache({ afterStockChange: stockVersion });
              populatePosProductSelect();
              await showAppAlert(
                result.fullVoid
                  ? `SI No. ${sale.invoiceNo || "-"} was voided and its items returned to stock.`
                  : `${formatPeso(result.voidedAmount)} of SI No. ${sale.invoiceNo || "-"} was voided (${result.voidedLines.map((l) => `${l.name} x${l.qty}`).join(", ")}) and returned to stock.`,
                { title: result.fullVoid ? "Sale Voided" : "Items Voided" }
              );
              if (afterVoid) afterVoid();
            } catch (error) {
              await showAppAlert(error.message || "Something went wrong voiding this sale. Please try again.");
            }
          }
        : null,
  });
}
