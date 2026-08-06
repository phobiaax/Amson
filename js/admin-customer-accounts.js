/**
 * Customer Accounts admin page: read-only listing of users/{uid} where
 * role === "customer", enriched with a per-customer order count from
 * orders/{orderId}.customerId. Deactivate/Reactivate actually blocks sign-in
 * (see the accountStatus check in js/auth.js's performLogin()), not just a
 * cosmetic badge.
 */

const CUSTOMERS_PAGE_SIZE = 8;

let allCustomers = [];
let customersFilter = "all";
let customersSearchTerm = "";
let customersSortDesc = true;
let customersCurrentPage = 1;
let viewingCustomerId = null;

const filterButtons = Array.from(document.querySelectorAll(".order-filter-btn"));
const customersSearchInput = document.getElementById("customersSearchInput");
const customersSortBtn = document.getElementById("customersSortBtn");
const customersTableBody = document.getElementById("customersTableBody");
const customersTableEmpty = document.getElementById("customersTableEmpty");
const customersPagination = document.getElementById("customersPagination");
const filterAllCount = document.getElementById("filterAllCount");

const viewCustomerModalEl = document.getElementById("viewCustomerModal");
const customerModalAlert = document.getElementById("customerModalAlert");
const toggleCustomerStatusBtn = document.getElementById("toggleCustomerStatusBtn");

document.addEventListener("admin:ready", loadCustomers);

/* ---------- Load ---------- */
async function loadCustomers() {
  try {
    const [usersSnapshot, ordersSnapshot] = await Promise.all([
      db.collection("users").where("role", "==", "customer").get(),
      db.collection("orders").get(),
    ]);

    const orderCounts = {};
    ordersSnapshot.docs.forEach((doc) => {
      const customerId = doc.data().customerId;
      if (!customerId) return;
      orderCounts[customerId] = (orderCounts[customerId] || 0) + 1;
    });

    allCustomers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      totalOrders: orderCounts[doc.id] || 0,
    }));

    renderCustomersTable();
  } catch (error) {
    console.error("Failed to load customers:", error);
  }
}

/* ---------- Table ---------- */
function computedStatus(customer) {
  return customer.accountStatus === "deactivated" ? "deactivated" : "active";
}

function filteredCustomers() {
  let filtered = allCustomers.slice();

  if (customersFilter !== "all") {
    filtered = filtered.filter((c) => computedStatus(c) === customersFilter);
  }

  if (customersSearchTerm) {
    const term = customersSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.contactNumber || "").toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => {
    const aTime = a.createdAt ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt ? b.createdAt.toMillis() : 0;
    return customersSortDesc ? bTime - aTime : aTime - bTime;
  });

  return filtered;
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  return timestamp.toDate().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function renderCustomersTable() {
  filterAllCount.textContent = allCustomers.length;

  const filtered = filteredCustomers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / CUSTOMERS_PAGE_SIZE));
  customersCurrentPage = Math.min(customersCurrentPage, totalPages);

  const start = (customersCurrentPage - 1) * CUSTOMERS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + CUSTOMERS_PAGE_SIZE);

  if (pageItems.length === 0) {
    customersTableBody.innerHTML = "";
    customersTableEmpty.classList.remove("d-none");
  } else {
    customersTableEmpty.classList.add("d-none");
    customersTableBody.innerHTML = pageItems.map(renderCustomerRow).join("");
  }

  renderCustomersPagination(totalPages);
}

function renderCustomerRow(customer) {
  const status = computedStatus(customer);
  return `
    <tr>
      <td>${customer.firstName || ""} ${customer.lastName || ""}</td>
      <td>${customer.email || "—"}</td>
      <td>${customer.contactNumber || "—"}</td>
      <td>${formatDate(customer.createdAt)}</td>
      <td>${customer.totalOrders}</td>
      <td><span class="badge rounded-pill ${status === "active" ? "text-bg-success" : "text-bg-secondary"}">${status === "active" ? "Active" : "Deactivated"}</span></td>
      <td><button type="button" class="icon-btn view-customer-btn" data-id="${customer.id}" aria-label="View"><i class="bi bi-eye"></i></button></td>
    </tr>
  `;
}

function renderCustomersPagination(totalPages) {
  if (totalPages <= 1) {
    customersPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${customersCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === customersCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${customersCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  customersPagination.innerHTML = html;
}

customersPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") customersCurrentPage -= 1;
  else if (btn.dataset.page === "next") customersCurrentPage += 1;
  else customersCurrentPage = Number(btn.dataset.page);
  renderCustomersTable();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    customersFilter = btn.dataset.filter;
    customersCurrentPage = 1;
    renderCustomersTable();
  });
});

customersSearchInput.addEventListener("input", () => {
  customersSearchTerm = customersSearchInput.value.trim();
  customersCurrentPage = 1;
  renderCustomersTable();
});

customersSortBtn.addEventListener("click", () => {
  customersSortDesc = !customersSortDesc;
  renderCustomersTable();
});

/* ---------- View modal ---------- */
customersTableBody.addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".view-customer-btn");
  if (viewBtn) openViewModal(allCustomers.find((c) => c.id === viewBtn.dataset.id));
});

function openViewModal(customer) {
  if (!customer) return;
  viewingCustomerId = customer.id;
  customerModalAlert.classList.add("d-none");

  document.getElementById("viewCustomerName").textContent = `${customer.firstName || ""} ${customer.lastName || ""}`;
  document.getElementById("viewCustomerEmail").textContent = customer.email || "—";
  document.getElementById("viewCustomerPhone").textContent = customer.contactNumber || "—";
  document.getElementById("viewCustomerDateRegistered").textContent = formatDate(customer.createdAt);
  document.getElementById("viewCustomerTotalOrders").textContent = customer.totalOrders;
  document.getElementById("viewCustomerEmailVerified").textContent = customer.emailVerified ? "Yes" : "No";

  const addr = customer.shippingAddress;
  document.getElementById("viewCustomerAddress").textContent = addr
    ? `${addr.streetAddress || ""}, ${addr.city || ""}, ${addr.province || ""} ${addr.zipCode || ""}`.trim()
    : "No shipping address saved yet.";

  const status = computedStatus(customer);
  const statusEl = document.getElementById("viewCustomerStatus");
  statusEl.textContent = status === "active" ? "Active" : "Deactivated";
  statusEl.className = `badge rounded-pill ${status === "active" ? "text-bg-success" : "text-bg-secondary"}`;

  toggleCustomerStatusBtn.textContent = status === "active" ? "Deactivate Account" : "Reactivate Account";
  toggleCustomerStatusBtn.className = status === "active" ? "btn btn-outline-dark-amson flex-fill" : "btn btn-amson flex-fill";
  toggleCustomerStatusBtn.style.borderColor = status === "active" ? "var(--amson-red)" : "";
  toggleCustomerStatusBtn.style.color = status === "active" ? "var(--amson-red)" : "";

  bootstrap.Modal.getOrCreateInstance(viewCustomerModalEl).show();
}

toggleCustomerStatusBtn.addEventListener("click", async () => {
  if (!viewingCustomerId) return;
  const customer = allCustomers.find((c) => c.id === viewingCustomerId);
  if (!customer) return;

  const currentStatus = computedStatus(customer);
  const nextStatus = currentStatus === "active" ? "deactivated" : "active";
  const confirmMsg =
    nextStatus === "deactivated"
      ? "Deactivate this customer's account? They won't be able to sign in until reactivated."
      : "Reactivate this customer's account?";
  if (!confirm(confirmMsg)) return;

  toggleCustomerStatusBtn.disabled = true;
  try {
    await db.collection("users").doc(viewingCustomerId).update({ accountStatus: nextStatus });
    await logAuditEvent({
      action: nextStatus === "deactivated" ? "Account Deactivated" : "Account Reactivated",
      details: `Customer: ${customer.firstName || ""} ${customer.lastName || ""} (${customer.email || ""})`,
    });

    bootstrap.Modal.getInstance(viewCustomerModalEl).hide();
    await loadCustomers();
  } catch (error) {
    customerModalAlert.textContent = "Something went wrong updating this account. Please try again.";
    customerModalAlert.classList.remove("d-none");
  } finally {
    toggleCustomerStatusBtn.disabled = false;
  }
});
