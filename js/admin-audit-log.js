/**
 * Audit Log admin page.
 */

const AUDIT_PAGE_SIZE = 10;

let allAuditEntries = [];
let auditSearchTerm = "";
let auditDateFrom = "";
let auditDateTo = "";
let auditCurrentPage = 1;

const auditSearchInput = document.getElementById("auditSearchInput");
const auditDateFromInput = document.getElementById("auditDateFromInput");
const auditDateToInput = document.getElementById("auditDateToInput");
const auditClearFiltersBtn = document.getElementById("auditClearFiltersBtn");
const auditTableBody = document.getElementById("auditTableBody");
const auditTableEmpty = document.getElementById("auditTableEmpty");
const auditPagination = document.getElementById("auditPagination");
const exportAuditLogBtn = document.getElementById("exportAuditLogBtn");

document.addEventListener("admin:ready", loadAuditLog);

/* ---------- Load ---------- */
async function loadAuditLog() {
  try {
    const snapshot = await db.collection("auditLog").orderBy("createdAt", "desc").get();
    allAuditEntries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderAuditTable();
  } catch (error) {
    console.error("Failed to load audit log:", error);
  }
}

/* ---------- Table ---------- */
function filteredAuditEntries() {
  let filtered = allAuditEntries.slice();

  if (auditSearchTerm) {
    const term = auditSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        [e.user, e.action, e.details, e.record, e.before, e.after, e.reason].some((v) => (v || "").toLowerCase().includes(term))
    );
  }

  if (auditDateFrom) {
    const from = new Date(`${auditDateFrom}T00:00:00`); // local midnight, not UTC
    filtered = filtered.filter((e) => e.createdAt && e.createdAt.toDate() >= from);
  }

  if (auditDateTo) {
    const to = new Date(auditDateTo);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter((e) => e.createdAt && e.createdAt.toDate() <= to);
  }

  return filtered;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "-";
  return formatDateMDY(timestamp, true);
}

function renderAuditTable() {
  const filtered = filteredAuditEntries();
  const totalPages = Math.max(1, Math.ceil(filtered.length / AUDIT_PAGE_SIZE));
  auditCurrentPage = Math.min(auditCurrentPage, totalPages);

  const start = (auditCurrentPage - 1) * AUDIT_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + AUDIT_PAGE_SIZE);

  if (pageItems.length === 0) {
    auditTableBody.innerHTML = "";
    auditTableEmpty.classList.remove("d-none");
  } else {
    auditTableEmpty.classList.add("d-none");
    auditTableBody.innerHTML = pageItems.map(renderAuditRow).join("");
  }

  renderAuditPagination(totalPages);
}

// Record / Before / After / Reason are only on entries that changed
// something (REQ122); older entries and plain events show "-".
function renderAuditRow(entry) {
  const change =
    entry.before || entry.after
      ? `<span class="text-muted">${escapeHtml(entry.before || "-")}</span> <i class="bi bi-arrow-right"></i> ${escapeHtml(entry.after || "-")}`
      : "-";
  return `
    <tr>
      <td>${formatTimestamp(entry.createdAt)}</td>
      <td>${escapeHtml(entry.user || "-")}</td>
      <td>${escapeHtml(entry.action || "-")}</td>
      <td>${escapeHtml(entry.record || "-")}</td>
      <td>${change}</td>
      <td>${escapeHtml(entry.reason || "-")}</td>
      <td>${escapeHtml(entry.details || "-")}</td>
      <td>${escapeHtml(entry.ipAddress || "-")}</td>
    </tr>
  `;
}

function renderAuditPagination(totalPages) {
  if (totalPages <= 1) {
    auditPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${auditCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === auditCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${auditCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  auditPagination.innerHTML = html;
}

auditPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") auditCurrentPage -= 1;
  else if (btn.dataset.page === "next") auditCurrentPage += 1;
  else auditCurrentPage = Number(btn.dataset.page);
  renderAuditTable();
});

auditSearchInput.addEventListener("input", () => {
  auditSearchTerm = auditSearchInput.value.trim();
  auditCurrentPage = 1;
  renderAuditTable();
});

auditDateFromInput.addEventListener("change", () => {
  auditDateFrom = auditDateFromInput.value;
  auditCurrentPage = 1;
  renderAuditTable();
});

auditDateToInput.addEventListener("change", () => {
  auditDateTo = auditDateToInput.value;
  auditCurrentPage = 1;
  renderAuditTable();
});

auditClearFiltersBtn.addEventListener("click", () => {
  auditSearchInput.value = "";
  auditDateFromInput.value = "";
  auditDateToInput.value = "";
  auditSearchTerm = "";
  auditDateFrom = "";
  auditDateTo = "";
  auditCurrentPage = 1;
  renderAuditTable();
});

/* ---------- Export ---------- */
exportAuditLogBtn.addEventListener("click", () => {
  exportTable({
    title: "Audit Log",
    subtitle: auditDateFrom || auditDateTo ? `${auditDateFrom || "start"} to ${auditDateTo || "today"}` : "All entries",
    filenamePrefix: "amson-audit-log",
    rows: filteredAuditEntries(),
    columns: [
      { label: "Date & Time", value: (e) => formatDateMDY(e.createdAt, true), width: 1.3 },
      { label: "User", value: (e) => e.user || "", width: 1.2 },
      { label: "Action", value: (e) => e.action || "", width: 1.5 },
      { label: "Record", value: (e) => e.record || "", width: 1.6 },
      { label: "Before", value: (e) => e.before || "", width: 1.8 },
      { label: "After", value: (e) => e.after || "", width: 1.8 },
      { label: "Reason", value: (e) => e.reason || "", width: 1.6 },
      { label: "Details", value: (e) => e.details || "", width: 3.5 },
    ],
  });
});
