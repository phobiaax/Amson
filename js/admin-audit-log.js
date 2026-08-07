/**
 * Audit Log admin page: read-only listing of auditLog/{id}, written by
 * logAuditEvent() (js/products-data.js) from Product price-change edits,
 * Inventory write-offs, account deactivation/reactivation, and Wholesale
 * Order recording. IP Address is always "-" - a static client-only site
 * has no reliable way to capture a visitor's public IP without a
 * third-party lookup service, so this stays an honest placeholder
 * instead of a fabricated value.
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
        (e.user || "").toLowerCase().includes(term) ||
        (e.action || "").toLowerCase().includes(term) ||
        (e.details || "").toLowerCase().includes(term)
    );
  }

  if (auditDateFrom) {
    const from = new Date(auditDateFrom);
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
  return timestamp.toDate().toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function renderAuditRow(entry) {
  return `
    <tr>
      <td>${formatTimestamp(entry.createdAt)}</td>
      <td>${entry.user || "-"}</td>
      <td>${entry.action || "-"}</td>
      <td>${entry.details || "-"}</td>
      <td>${entry.ipAddress || "-"}</td>
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
  if (typeof window.jspdf === "undefined") {
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals - Audit Log", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, y);

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text("Timestamp", 14, y);
  doc.text("User", 55, y);
  doc.text("Action", 90, y);
  doc.text("Details", 130, y);
  y += 3;
  doc.line(14, y, 196, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(8);

  filteredAuditEntries().forEach((entry) => {
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(formatTimestamp(entry.createdAt), 14, y);
    doc.text(entry.user || "-", 55, y);
    doc.text(entry.action || "-", 90, y);
    doc.text((entry.details || "-").slice(0, 45), 130, y);
  });

  doc.save(`amson-audit-log-${new Date().toISOString().slice(0, 10)}.pdf`);
});
