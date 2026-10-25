/**
 * Inventory > Opening Stock: load the shelf count when the branch starts
 * using the system.
 *
 * Download a count sheet (every product), fill in batch no., expiry and the
 * quantity counted for each batch on the shelf, upload it. Rows are matched
 * by product code (SKU) or by the exact product name, checked, and saved as
 * batches marked source "opening_stock" - counted stock, not a purchase, so
 * no supplier or receipt is needed and Supplier Purchases leaves them out.
 * Same batch rules as Receive Stock (one expiry per batch; an existing
 * batch is topped up).
 */

const openingStockBtn = document.getElementById("openingStockBtn");
const openingStockModalEl = document.getElementById("openingStockModal");
const openingStockDate = document.getElementById("openingStockDate");
const countSheetFileInput = document.getElementById("countSheetFileInput");
const countSheetFileName = document.getElementById("countSheetFileName");
const openingStockSummary = document.getElementById("openingStockSummary");
const openingStockAlert = document.getElementById("openingStockAlert");
const loadOpeningStockBtn = document.getElementById("loadOpeningStockBtn");

const COUNT_SHEET_HEADERS = ["sku", "productName", "category", "batchNo", "expiryDate", "qtyCounted", "unitCost", "notes"];
let openingPlan = null; // { plan, lines, skipped }

openingStockBtn.addEventListener("click", () => {
  openingStockDate.value = todayISO();
  resetOpeningUpload();
  bootstrap.Modal.getOrCreateInstance(openingStockModalEl).show();
});

function resetOpeningUpload() {
  openingPlan = null;
  countSheetFileInput.value = "";
  countSheetFileName.textContent = "";
  openingStockSummary.classList.add("d-none");
  openingStockAlert.classList.add("d-none");
  loadOpeningStockBtn.disabled = true;
  loadOpeningStockBtn.textContent = "Load Opening Stock";
}

function showOpeningAlert(message, type = "danger") {
  openingStockAlert.textContent = message;
  openingStockAlert.className = `alert auth-alert alert-${type} mt-3 mb-0`;
}

/* ---------- Count sheet ---------- */
document.getElementById("downloadCountSheetBtn").addEventListener("click", async () => {
  await loadCatalogCache();
  const products = SAMPLE_PRODUCTS.slice().sort(
    (a, b) => String(CATEGORY_LABELS[a.category] || "").localeCompare(String(CATEGORY_LABELS[b.category] || "")) || String(a.name).localeCompare(String(b.name))
  );
  const rows = products.map((p) => ({
    sku: p.sku || "",
    productName: p.name,
    category: CATEGORY_LABELS[p.category] || "",
    batchNo: "",
    expiryDate: "",
    qtyCounted: "",
    unitCost: p.costingPrice || "",
    notes: "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows, { header: COUNT_SHEET_HEADERS });
  ws["!cols"] = [{ wch: 11 }, { wch: 60 }, { wch: 18 }, { wch: 16 }, { wch: 13 }, { wch: 11 }, { wch: 9 }, { wch: 24 }];
  const help = XLSX.utils.aoa_to_sheet([
    ["How to fill in the count sheet"],
    ["1. For each batch on the shelf, type its batch no., expiry date (e.g. 2028-06-30, or 06/2028) and the quantity counted."],
    ["2. A product with more than one batch: copy its row (keep the sku and productName) once per batch."],
    ["3. Products you don't have: leave qtyCounted blank - they're skipped."],
    ["4. unitCost is optional (it starts as the product's costing price)."],
    ["5. Upload it in Inventory > Opening Stock. Load it only once - loading the same rows again adds the quantities again."],
  ]);
  help["!cols"] = [{ wch: 110 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Count Sheet");
  XLSX.utils.book_append_sheet(wb, help, "How to fill in");
  XLSX.writeFile(wb, `amson-count-sheet-${todayISO()}.xlsx`);
});

/* ---------- Reading the filled sheet ---------- */
document.getElementById("uploadCountSheetBtn").addEventListener("click", () => countSheetFileInput.click());

// Expiry as typed by people: 2028-06-30, 2028-06, 6/2028, 06/28, 6/30/2028,
// or an Excel date cell. A month without a day becomes the 1st (the
// earliest it could expire, so FEFO stays on the safe side).
function normalizeExpiry(value) {
  if (value instanceof Date && !isNaN(value)) return sheetDateToISO(value);
  const v = String(value || "").trim();
  if (!v) return null;
  let m;
  const pad = (n) => String(n).padStart(2, "0");
  const year = (y) => (y.length === 2 ? 2000 + Number(y) : Number(y));
  if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = v.match(/^(\d{4})-(\d{1,2})$/))) return `${m[1]}-${pad(m[2])}-01`;
  if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))) return `${year(m[3])}-${pad(m[1])}-${pad(m[2])}`;
  if ((m = v.match(/^(\d{1,2})\/(\d{2}|\d{4})$/))) return `${year(m[2])}-${pad(m[1])}-01`;
  return null;
}

function validMonthDay(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return !isNaN(d) && sheetDateToISO(d) === iso;
}

countSheetFileInput.addEventListener("change", async () => {
  const file = countSheetFileInput.files[0];
  if (!file) return;
  countSheetFileName.textContent = file.name;
  openingStockSummary.classList.add("d-none");
  openingStockAlert.classList.add("d-none");
  loadOpeningStockBtn.disabled = true;

  let sheetRows;
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  } catch (error) {
    showOpeningAlert("Couldn't read that file - make sure it's the count sheet saved as .xlsx, .xls or .csv.");
    return;
  }

  // Fresh numbers: other staff may have received stock since the page opened.
  catalogLoadPromise = null;
  await loadCatalogCache();
  const bySku = new Map(SAMPLE_PRODUCTS.filter((p) => p.sku).map((p) => [String(p.sku).toUpperCase(), p]));
  const problems = [];
  const lines = [];
  let skipped = 0;
  sheetRows.forEach((raw, i) => {
    const row = {};
    Object.entries(raw).forEach(([k, v]) => (row[k.trim().toLowerCase()] = v));
    const rowNo = i + 2; // header is row 1 in Excel
    const qtyText = String(row.qtycounted ?? "").trim();
    if (qtyText === "" || Number(qtyText) === 0) {
      skipped += 1;
      return;
    }
    const sku = String(row.sku || "").trim().toUpperCase();
    const name = String(row.productname || "").trim();
    const product = (sku && bySku.get(sku)) || findProductByName(name);
    const label = name || sku || "(no product)";
    const qty = Number(qtyText);
    const batchNo = String(row.batchno || "").trim();
    const expiry = normalizeExpiry(row.expirydate);
    const issues = [];
    if (!product) issues.push("product not found - check the sku or product name");
    if (!Number.isInteger(qty) || qty < 0) issues.push("quantity must be a whole number");
    if (!batchNo) issues.push("batch no. is missing");
    if (!expiry || !validMonthDay(expiry)) issues.push(String(row.expirydate || "").trim() ? `expiry "${row.expirydate}" isn't a date` : "expiry date is missing");
    if (issues.length) {
      problems.push(`Row ${rowNo} - ${label}: ${issues.join("; ")}`);
      return;
    }
    const cost = String(row.unitcost ?? "").trim();
    lines.push({
      productId: product.id,
      batchNo,
      expirationDate: expiry,
      qty,
      supplierId: null,
      supplierReceiptNo: "Opening stock",
      unitCost: cost === "" ? null : Number(cost),
      dateReceived: openingStockDate.value || todayISO(),
      source: "opening_stock",
    });
  });

  const plan = lines.length ? planStockReceipt(lines) : { errors: [], newLines: [], topUps: [] };
  problems.push(...plan.errors);
  const units = lines.reduce((n, l) => n + l.qty, 0);
  const products = new Set(lines.map((l) => l.productId)).size;
  const already = allBatches.some((b) => b.source === "opening_stock");

  openingStockSummary.innerHTML = `
    <div class="row g-2">
      <div class="col-4"><div class="checkout-card p-2 text-center"><p class="text-muted mb-0" style="font-size:0.75rem;">Batches to load</p><p class="fw-bold mb-0 fs-5">${lines.length}</p></div></div>
      <div class="col-4"><div class="checkout-card p-2 text-center"><p class="text-muted mb-0" style="font-size:0.75rem;">Products</p><p class="fw-bold mb-0 fs-5">${products}</p></div></div>
      <div class="col-4"><div class="checkout-card p-2 text-center"><p class="text-muted mb-0" style="font-size:0.75rem;">Units</p><p class="fw-bold mb-0 fs-5">${units.toLocaleString()}</p></div></div>
    </div>
    <p class="text-muted mt-2 mb-0" style="font-size:0.82rem;">${skipped} row${skipped === 1 ? "" : "s"} left blank (not in stock) will be skipped.${plan.topUps.length ? ` ${plan.topUps.length} batch${plan.topUps.length === 1 ? " is" : "es are"} already in the system and will be added to.` : ""}</p>`;
  openingStockSummary.classList.remove("d-none");

  if (problems.length) {
    showOpeningAlert(
      `Fix ${problems.length === 1 ? "this row" : `these ${problems.length} rows`} in the sheet and upload it again (nothing has been saved):\n` +
        problems.slice(0, 15).join("\n") +
        (problems.length > 15 ? `\n...and ${problems.length - 15} more` : "")
    );
    return;
  }
  if (!lines.length) {
    showOpeningAlert("No quantities were filled in - there's nothing to load.");
    return;
  }
  if (already) {
    showOpeningAlert("Opening stock was loaded before. Loading this sheet adds these quantities on top - only continue if this is a different count (for example products that were missed).", "warning");
  }
  openingPlan = { plan, lines, units, products };
  loadOpeningStockBtn.disabled = false;
  loadOpeningStockBtn.textContent = `Load ${lines.length} Batch${lines.length === 1 ? "" : "es"}`;
});

/* ---------- Saving ---------- */
loadOpeningStockBtn.addEventListener("click", async () => {
  if (!openingPlan) return;
  const { plan, units, products } = openingPlan;
  loadOpeningStockBtn.disabled = true;
  await hideModalAndWait(openingStockModalEl);
  showTaskProgress("Loading opening stock", "Keep this page open until it finishes.");

  // Groups of up to 400 lines, each all-or-nothing, so a failed group can be
  // retried without doubling the ones before it.
  const ops = plan.newLines.map((line) => ({ line })).concat(plan.topUps.map((t) => ({ topUp: t })));
  let saved = 0;
  let failedError = null;
  for (let start = 0; start < ops.length; start += 400) {
    const chunk = ops.slice(start, start + 400);
    const subPlan = { newLines: chunk.filter((o) => o.line).map((o) => o.line), topUps: chunk.filter((o) => o.topUp).map((o) => o.topUp) };
    updateTaskProgress(saved, ops.length);
    try {
      await db.runTransaction(async (transaction) => {
        const write = await applyStockReceipt(transaction, subPlan);
        write();
      });
      saved += chunk.length;
    } catch (error) {
      console.error("Opening stock group failed:", error);
      failedError = error;
      break;
    }
  }
  updateTaskProgress(saved, ops.length);

  if (saved) {
    await logAuditEvent({
      action: "Opening Stock Loaded",
      details: `${saved} batch${saved === 1 ? "" : "es"} from the count sheet (count date ${formatDateMDY(`${openingStockDate.value || todayISO()}T12:00:00`)})${failedError ? `; stopped after ${saved} of ${ops.length}` : ""}`,
    });
  }
  await loadInventory();

  if (failedError) {
    await showTaskResult({
      type: saved ? "warning" : "danger",
      title: saved ? "Opening stock partly loaded" : "Opening stock wasn't loaded",
      message: `${saved} of ${ops.length} batches were saved before the connection failed. Don't upload the whole sheet again: check Inventory, then upload a sheet with only the missing rows.`,
    });
  } else {
    await showTaskResult({
      type: "success",
      title: "Opening stock loaded",
      message: `${saved} batch${saved === 1 ? "" : "es"} - ${units.toLocaleString()} units of ${products} product${products === 1 ? "" : "s"} - are now in stock and can be sold.`,
    });
  }
  resetOpeningUpload();
});
