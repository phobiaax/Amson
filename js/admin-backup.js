// back up all data button in settings, the free plan has no backups

// collections that go in the backup, chat messages skipped
const BACKUP_COLLECTIONS = [
  ["products", "Products"],
  ["productPrices", "Product Prices"],
  ["categories", "Categories"],
  ["stockBatches", "Stock Batches"],
  ["batchCosts", "Batch Costs"],
  ["suppliers", "Suppliers"],
  ["purchaseOrders", "Purchase Orders"],
  ["reconciliations", "Stock Counts"],
  ["writeOffs", "Write-Offs"],
  ["posSales", "Walk-in Sales"],
  ["orders", "Online Orders"],
  ["prescriptionOrders", "Rx Pre-orders (old)"],
  ["wholesaleAccounts", "Wholesale Accounts"],
  ["wholesaleOrders", "Wholesale Orders"],
  ["wholesaleExchanges", "Exchanges"],
  ["users", "Accounts"],
  ["customerNotifications", "Customer Notices"],
  ["notifications", "Staff Notices"],
  ["chatThreads", "Chats"],
  ["auditLog", "Audit Log"],
  ["storeSettings", "Store Settings"],
  ["counters", "Counters"],
];

const backupCard = document.getElementById("backupCard");
const backupBtn = document.getElementById("backupBtn");
const backupStatus = document.getElementById("backupStatus");

document.addEventListener("admin:ready", (e) => {
  const role = e.detail.admin.role;
  if (backupCard && ["admin", "branch_manager"].includes(role)) backupCard.classList.remove("d-none");
});

// turns firestore values into plain json
function backupPlain(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(backupPlain);
  if (typeof value === "object") {
    const out = {};
    Object.entries(value).forEach(([k, v]) => (out[k] = backupPlain(v)));
    return out;
  }
  return value;
}

// one excel cell, lists become json text
function backupCell(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return text.length > EXCEL_CELL_MAX_CHARS ? `${text.slice(0, EXCEL_CELL_MAX_CHARS)}... (cut - see the JSON file)` : text;
  }
  return value;
}

if (backupBtn) {
  backupBtn.addEventListener("click", async () => {
    if (typeof XLSX === "undefined") {
      backupStatus.textContent = "The Excel library didn't load. Refresh the page and try again.";
      return;
    }
    backupBtn.disabled = true;
    const data = {};
    const skipped = [];
    let total = 0;
    try {
      for (const [name, label] of BACKUP_COLLECTIONS) {
        backupStatus.textContent = `Reading ${label}...`;
        try {
          const snap = await db.collection(name).get();
          data[name] = snap.docs.map((doc) => ({ id: doc.id, ...backupPlain(doc.data()) }));
          total += snap.size;
        } catch (error) {
          skipped.push(label);
          data[name] = [];
        }
      }

      const stamp = localISODate(new Date());
      const wb = XLSX.utils.book_new();
      BACKUP_COLLECTIONS.forEach(([name, label]) => {
        const rows = data[name];
        const headers = ["id"];
        rows.forEach((row) => Object.keys(row).forEach((k) => headers.includes(k) || headers.push(k)));
        const sheetRows = rows.map((row) => headers.map((h) => backupCell(row[h])));
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sheetRows]);
        XLSX.utils.book_append_sheet(wb, ws, label.slice(0, EXCEL_SHEET_NAME_MAX));
      });
      XLSX.writeFile(wb, `amson-backup-${stamp}.xlsx`);

      const json = JSON.stringify({ exportedAt: new Date().toISOString(), project: firebaseConfig.projectId, collections: data });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      link.download = `amson-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      backupStatus.textContent =
        `Downloaded ${total.toLocaleString()} records (Excel + JSON). Keep both files somewhere safe, e.g. a USB drive or Google Drive.` +
        (skipped.length ? ` Not included (no access): ${skipped.join(", ")}.` : "");
      logAuditEvent({ action: "Data Backup Downloaded", details: `${total} records, ${BACKUP_COLLECTIONS.length - skipped.length} record types` });
    } catch (error) {
      backupStatus.textContent = "Something went wrong making the backup. Please try again.";
    } finally {
      backupBtn.disabled = false;
    }
  });
}
