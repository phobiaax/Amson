/**
 * Clear Test Data (temporary, Branch Manager only).
 *
 * Deletes the records made while testing so Amson starts live with a clean
 * system. Works together with the temporary delete rule at the bottom of
 * firestore.rules, which switches itself off on CLEAR_TEST_DATA_UNTIL.
 * Remove this page, its script, its Settings link and that rule after
 * go-live.
 */

// CLEAR_TEST_DATA_UNTIL (the switch-off date) is in admin-roles.js.

// checked: whether the box starts ticked. Groups that usually hold Amson's
// real setup (catalog, suppliers, wholesale buyers) start unticked.
const CLEAR_GROUPS = [
  { key: "sales", label: "Orders and sales", hint: "Online orders, walk-in (POS) sales, wholesale sales and exchanges, customer order notices", collections: ["orders", "prescriptionOrders", "posSales", "wholesaleOrders", "wholesaleExchanges", "customerNotifications"], checked: true },
  { key: "stock", label: "Stock records", hint: "Received batches, purchase orders, stock counts, write-offs", collections: ["stockBatches", "batchCosts", "purchaseOrders", "reconciliations", "writeOffs"], checked: true },
  { key: "chat", label: "Live chat conversations", hint: "All chat threads and their messages", collections: ["chatThreads"], checked: true },
  { key: "logs", label: "Notifications, audit log and login attempts", hint: "A new audit entry saying the test data was cleared is added afterwards", collections: ["notifications", "auditLog", "loginAttempts"], checked: true },
  { key: "catalog", label: "Products and categories", hint: "Only tick this if the products were made up for testing", collections: ["products", "productPrices", "categories"], checked: false },
  { key: "suppliers", label: "Suppliers", hint: "Only tick this if the suppliers were made up for testing", collections: ["suppliers"], checked: false },
  { key: "wholesale", label: "Wholesale accounts", hint: "Only tick this if the wholesale buyers were made up for testing", collections: ["wholesaleAccounts"], checked: false },
];

// Records inside each document of a collection.
const CLEAR_SUBCOLLECTIONS = { chatThreads: ["messages"] };

// Yearly number counters restarted by "Restart numbering".
const RESTART_COUNTER_PATTERN = /^(orders|purchaseOrders|reconciliations)-\d{4}$|^wholesaleExchanges$/;

const clearGroupList = document.getElementById("clearGroupList");
const clearAccountList = document.getElementById("clearAccountList");
const selectTestCustomersBtn = document.getElementById("selectTestCustomersBtn");
const resetNumberingCheck = document.getElementById("resetNumberingCheck");
const lastSiNumberInput = document.getElementById("lastSiNumberInput");
const currentSiLabel = document.getElementById("currentSiLabel");
const clearConfirmInput = document.getElementById("clearConfirmInput");
const clearAlert = document.getElementById("clearAlert");
const clearTestDataBtn = document.getElementById("clearTestDataBtn");
const clearProgressLog = document.getElementById("clearProgressLog");

let clearAdminUid = null;
let clearRunning = false;

document.addEventListener("admin:ready", async (event) => {
  clearAdminUid = event.detail.uid;
  if (new Date() >= CLEAR_TEST_DATA_UNTIL) {
    showClearAlert("This page has expired. The database no longer allows clearing data from here.", "danger");
    clearConfirmInput.disabled = true;
    return;
  }
  await Promise.all([loadClearGroups(), loadClearAccounts(), loadCurrentSiNumber()]);
});

function showClearAlert(message, type) {
  clearAlert.textContent = message;
  clearAlert.className = `alert auth-alert alert-${type} mt-3 mb-0`;
}

function logClearProgress(line) {
  clearProgressLog.classList.remove("d-none");
  clearProgressLog.textContent += `${line}\n`;
  clearProgressLog.scrollTop = clearProgressLog.scrollHeight;
}

// A count query costs about one read per 1,000 records instead of one per
// record; older SDKs without count() fall back to reading them.
async function countCollection(name) {
  const ref = db.collection(name);
  if (typeof ref.count === "function") {
    try {
      const snapshot = await ref.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.warn(`Count query failed for ${name}; reading instead.`, error);
    }
  }
  return (await ref.get()).size;
}

async function loadClearGroups() {
  const rows = await Promise.all(CLEAR_GROUPS.map(async (group) => {
    let total = 0;
    try {
      const counts = await Promise.all(group.collections.map(countCollection));
      total = counts.reduce((sum, n) => sum + n, 0);
    } catch (error) {
      console.error(error);
      total = "?";
    }
    return `
      <div class="form-check mb-3">
        <input class="form-check-input clear-group-check" type="checkbox" id="clearGroup_${group.key}" value="${group.key}" ${group.checked ? "checked" : ""}>
        <label class="form-check-label" for="clearGroup_${group.key}">
          <strong>${escapeHtml(group.label)}</strong> <span class="badge bg-secondary">${total}</span>
          <span class="d-block text-muted" style="font-size:0.8rem;">${escapeHtml(group.hint)}</span>
        </label>
      </div>`;
  }));
  clearGroupList.innerHTML = rows.join("");
}

async function loadClearAccounts() {
  try {
    const snapshot = await db.collection("users").get();
    // The signed-in Branch Manager and other managers are never listed, so
    // the branch can't lock itself out.
    const accounts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((u) => u.id !== clearAdminUid && !["admin", "branch_manager"].includes(u.role))
      .sort((a, b) => (a.role === "customer" ? 0 : 1) - (b.role === "customer" ? 0 : 1) || String(a.email || "").localeCompare(String(b.email || "")));
    if (!accounts.length) {
      clearAccountList.innerHTML = `<p class="text-muted mb-0">No other accounts.</p>`;
      return;
    }
    clearAccountList.innerHTML = accounts.map((u) => {
      const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "(no name)";
      const role = u.role === "customer" ? "Customer" : (STAFF_ROLE_LABELS[u.role] || u.role || "Unknown");
      return `
        <div class="form-check mb-2">
          <input class="form-check-input clear-account-check" type="checkbox" id="clearAccount_${escapeHtml(u.id)}" value="${escapeHtml(u.id)}" data-role="${escapeHtml(u.role || "")}" data-email="${escapeHtml(u.email || "")}">
          <label class="form-check-label" for="clearAccount_${escapeHtml(u.id)}">
            ${escapeHtml(name)} <span class="text-muted">&middot; ${escapeHtml(u.email || "no email")} &middot; ${escapeHtml(role)}</span>
          </label>
        </div>`;
    }).join("");
  } catch (error) {
    console.error(error);
    clearAccountList.innerHTML = `<p class="text-danger mb-0">Couldn't load accounts.</p>`;
  }
}

async function loadCurrentSiNumber() {
  try {
    const doc = await SALES_INVOICE_COUNTER_REF().get();
    currentSiLabel.textContent = doc.exists ? formatInvoiceNo(doc.data().count || 0) : "none yet";
  } catch (error) {
    currentSiLabel.textContent = "-";
  }
}

selectTestCustomersBtn.addEventListener("click", () => {
  document.querySelectorAll(".clear-account-check").forEach((box) => {
    if (box.dataset.role === "customer") box.checked = true;
  });
});

clearConfirmInput.addEventListener("input", () => {
  clearTestDataBtn.disabled = clearRunning || clearConfirmInput.value.trim() !== "DELETE";
});

// Deletes refs in batches (Firestore allows up to 500 writes per batch).
async function deleteRefs(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function clearCollection(name) {
  const snapshot = await db.collection(name).get();
  // Records inside each document (chat messages) are fetched in parallel.
  const subSnapshots = await Promise.all(
    snapshot.docs.flatMap((doc) => (CLEAR_SUBCOLLECTIONS[name] || []).map((sub) => doc.ref.collection(sub).get()))
  );
  const refs = subSnapshots.flatMap((sub) => sub.docs.map((subDoc) => subDoc.ref)).concat(snapshot.docs.map((doc) => doc.ref));
  await deleteRefs(refs);
  return snapshot.size;
}

clearTestDataBtn.addEventListener("click", async () => {
  if (clearRunning || clearConfirmInput.value.trim() !== "DELETE") return;

  const groups = Array.from(document.querySelectorAll(".clear-group-check:checked"))
    .map((box) => CLEAR_GROUPS.find((g) => g.key === box.value))
    .filter(Boolean);
  const accounts = Array.from(document.querySelectorAll(".clear-account-check:checked"));
  const restartNumbering = resetNumberingCheck.checked;
  const siText = lastSiNumberInput.value.trim();
  const lastSi = siText === "" ? null : Number(siText);

  if (lastSi !== null && (!Number.isInteger(lastSi) || lastSi < 0)) {
    showClearAlert("Enter the last SI number as a whole number (or leave it blank).", "danger");
    return;
  }
  if (!groups.length && !accounts.length && !restartNumbering && lastSi === null) {
    showClearAlert("Nothing is selected.", "danger");
    return;
  }

  const summary = [
    ...groups.map((g) => `- ${g.label}`),
    accounts.length ? `- ${accounts.length} account(s)` : "",
    restartNumbering ? "- Restart order/PO/stock count/exchange numbers" : "",
    lastSi !== null ? `- Next SI No. will be ${formatInvoiceNo(lastSi + 1)}` : "",
  ].filter(Boolean).join("\n");
  const ok = await showAppConfirm(`This will permanently delete:\n${summary}\n\nThis cannot be undone.`, { title: "Delete Test Data?", confirmLabel: "Delete" });
  if (!ok) return;

  clearRunning = true;
  clearTestDataBtn.disabled = true;
  clearAlert.classList.add("d-none");
  clearProgressLog.textContent = "";
  const done = [];
  const failed = [];

  for (const group of groups) {
    for (const name of group.collections) {
      try {
        const count = await clearCollection(name);
        logClearProgress(`Deleted ${count} from ${name}`);
        done.push(`${name}: ${count}`);
      } catch (error) {
        console.error(error);
        logClearProgress(`FAILED ${name}: ${error.message}`);
        failed.push(name);
      }
    }
  }

  if (accounts.length) {
    try {
      // The account's saved notification read-state goes with it.
      const refs = [];
      accounts.forEach((box) => {
        refs.push(db.collection("users").doc(box.value));
        refs.push(db.collection("notifications").doc(box.value));
      });
      await deleteRefs(refs);
      logClearProgress(`Deleted ${accounts.length} account(s)`);
      done.push(`accounts: ${accounts.length}`);
    } catch (error) {
      console.error(error);
      logClearProgress(`FAILED accounts: ${error.message}`);
      failed.push("accounts");
    }
  }

  try {
    const countersSnapshot = await db.collection("counters").get();
    const clearedCatalog = groups.some((g) => g.key === "catalog");
    const refs = countersSnapshot.docs
      .filter((doc) => (restartNumbering && RESTART_COUNTER_PATTERN.test(doc.id)) || (clearedCatalog && doc.id === "products"))
      .map((doc) => doc.ref);
    if (refs.length) {
      await deleteRefs(refs);
      logClearProgress(`Restarted ${refs.length} number counter(s)`);
      done.push(`counters: ${refs.length}`);
    }
    if (lastSi !== null) {
      await SALES_INVOICE_COUNTER_REF().set({ count: lastSi });
      logClearProgress(`Next SI No. set to ${formatInvoiceNo(lastSi + 1)}`);
      done.push(`next SI ${formatInvoiceNo(lastSi + 1)}`);
    }
  } catch (error) {
    console.error(error);
    logClearProgress(`FAILED counters: ${error.message}`);
    failed.push("counters");
  }

  await logAuditEvent({ action: "Test Data Cleared", details: done.join(", ") || "Nothing deleted" });

  clearRunning = false;
  clearConfirmInput.value = "";
  if (failed.length) {
    showClearAlert(`Some items could not be deleted: ${failed.join(", ")}.\nIf it says "permission", publish the latest firestore.rules first.`, "danger");
  } else {
    const emails = accounts.map((box) => box.dataset.email).filter(Boolean);
    showClearAlert(`Done.${emails.length ? `\nNow delete these logins in Firebase console → Authentication → Users:\n${emails.join("\n")}` : ""}\nAlso clear old photos in Cloudinary → Media Library if needed.`, "success");
  }
  await Promise.all([loadClearGroups(), loadClearAccounts(), loadCurrentSiNumber()]);
});
