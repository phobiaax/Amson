/**
 * Staff Management admin page.
 */

const STAFF_PAGE_SIZE = 8;

let allStaff = [];
let staffFilter = "all";
let staffSearchTerm = "";
let staffCurrentPage = 1;
let editingStaffId = null;

const staffFilterButtons = Array.from(document.querySelectorAll(".order-filter-btn"));
const staffSearchInput = document.getElementById("staffSearchInput");
const staffTableBody = document.getElementById("staffTableBody");
const staffTableEmpty = document.getElementById("staffTableEmpty");
const staffPagination = document.getElementById("staffPagination");
const filterAllCount = document.getElementById("filterAllCount");

const addStaffBtn = document.getElementById("addStaffBtn");
const staffModalEl = document.getElementById("staffModal");
const staffModalTitle = document.getElementById("staffModalTitle");
const staffCredentialFields = document.getElementById("staffCredentialFields");
const staffFirstNameInput = document.getElementById("staffFirstNameInput");
const staffLastNameInput = document.getElementById("staffLastNameInput");
const staffEmailInput = document.getElementById("staffEmailInput");
const staffPasswordInput = document.getElementById("staffPasswordInput");
const staffRoleInput = document.getElementById("staffRoleInput");
const staffModalAlert = document.getElementById("staffModalAlert");
const saveStaffBtn = document.getElementById("saveStaffBtn");

document.addEventListener("admin:ready", loadStaff);

/* ---------- Load ---------- */
async function loadStaff() {
  try {
    const snapshot = await db.collection("users").get();
    allStaff = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((u) => STAFF_ROLES.includes(u.role));

    renderStaffTable();
  } catch (error) {
    console.error("Failed to load staff:", error);
  }
}

/* ---------- Table ---------- */
function computedStaffStatus(staff) {
  return staff.accountStatus === "deactivated" ? "deactivated" : "active";
}

function filteredStaff() {
  let filtered = allStaff.slice();

  if (staffFilter !== "all") {
    filtered = filtered.filter((s) => computedStaffStatus(s) === staffFilter);
  }

  if (staffSearchTerm) {
    const term = staffSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase().includes(term) ||
        (s.email || "").toLowerCase().includes(term)
    );
  }

  return filtered;
}

function renderStaffTable() {
  filterAllCount.textContent = allStaff.length;

  const filtered = filteredStaff();
  const totalPages = Math.max(1, Math.ceil(filtered.length / STAFF_PAGE_SIZE));
  staffCurrentPage = Math.min(staffCurrentPage, totalPages);

  const start = (staffCurrentPage - 1) * STAFF_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + STAFF_PAGE_SIZE);

  if (pageItems.length === 0) {
    staffTableBody.innerHTML = "";
    staffTableEmpty.classList.remove("d-none");
  } else {
    staffTableEmpty.classList.add("d-none");
    staffTableBody.innerHTML = pageItems.map(renderStaffRow).join("");

    document.querySelectorAll(".edit-staff-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll(".toggle-staff-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleStaffStatus(btn.dataset.id));
    });
  }

  renderStaffPagination(totalPages);
}

function renderStaffRow(staff) {
  const status = computedStaffStatus(staff);
  return `
    <tr>
      <td>${staff.firstName || ""} ${staff.lastName || ""}</td>
      <td>${staff.email || "-"}</td>
      <td>${STAFF_ROLE_LABELS[staff.role] || staff.role}</td>
      <td><span class="badge rounded-pill ${status === "active" ? "text-bg-success" : "text-bg-secondary"}">${status === "active" ? "Active" : "Deactivated"}</span></td>
      <td class="d-flex gap-2">
        <button type="button" class="icon-btn edit-staff-btn" data-id="${staff.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
        <button type="button" class="icon-btn toggle-staff-status-btn" data-id="${staff.id}" aria-label="${status === "active" ? "Deactivate" : "Reactivate"}">
          <i class="bi ${status === "active" ? "bi-person-dash" : "bi-person-check"}"></i>
        </button>
      </td>
    </tr>
  `;
}

function renderStaffPagination(totalPages) {
  if (totalPages <= 1) {
    staffPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${staffCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === staffCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${staffCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  staffPagination.innerHTML = html;
}

staffPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") staffCurrentPage -= 1;
  else if (btn.dataset.page === "next") staffCurrentPage += 1;
  else staffCurrentPage = Number(btn.dataset.page);
  renderStaffTable();
});

staffFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    staffFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    staffFilter = btn.dataset.filter;
    staffCurrentPage = 1;
    renderStaffTable();
  });
});

staffSearchInput.addEventListener("input", () => {
  staffSearchTerm = staffSearchInput.value.trim();
  staffCurrentPage = 1;
  renderStaffTable();
});

/* ---------- Add / Edit modal ---------- */
function openAddModal() {
  editingStaffId = null;
  staffModalTitle.textContent = "Add Staff Account";
  staffCredentialFields.classList.remove("d-none");
  staffFirstNameInput.value = "";
  staffLastNameInput.value = "";
  staffEmailInput.value = "";
  staffPasswordInput.value = "";
  staffRoleInput.value = "sales_staff";
  staffModalAlert.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(staffModalEl).show();
}

function openEditModal(id) {
  const staff = allStaff.find((s) => s.id === id);
  if (!staff) return;

  editingStaffId = id;
  staffModalTitle.textContent = "Edit Staff Account";
  staffCredentialFields.classList.add("d-none");
  staffFirstNameInput.value = staff.firstName || "";
  staffLastNameInput.value = staff.lastName || "";
  staffRoleInput.value = staff.role === "admin" ? "branch_manager" : staff.role;
  staffModalAlert.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(staffModalEl).show();
}

addStaffBtn.addEventListener("click", openAddModal);

saveStaffBtn.addEventListener("click", async () => {
  const firstName = staffFirstNameInput.value.trim();
  const lastName = staffLastNameInput.value.trim();
  const role = staffRoleInput.value;

  if (!firstName || !lastName) {
    staffModalAlert.textContent = "Please enter a first and last name.";
    staffModalAlert.classList.remove("d-none");
    return;
  }

  saveStaffBtn.disabled = true;
  staffModalAlert.classList.add("d-none");

  try {
    if (editingStaffId) {
      await db.collection("users").doc(editingStaffId).update({ firstName, lastName, role });
      await logAuditEvent({
        action: "Staff Account Updated",
        details: `${firstName} ${lastName} - Role: ${STAFF_ROLE_LABELS[role]}`,
      });
    } else {
      const email = staffEmailInput.value.trim();
      const password = staffPasswordInput.value;

      if (!email || password.length < 6) {
        staffModalAlert.textContent = "Please enter an email and a password of at least 6 characters.";
        staffModalAlert.classList.remove("d-none");
        saveStaffBtn.disabled = false;
        return;
      }

      const secondaryApp = firebase.initializeApp(firebaseConfig, "StaffCreation");
      const secondaryAuth = secondaryApp.auth();
      try {
        const credential = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        await db.collection("users").doc(credential.user.uid).set({
          firstName,
          lastName,
          email,
          role,
          accountStatus: "active",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        await secondaryAuth.signOut();
      } finally {
        await secondaryApp.delete();
      }

      await logAuditEvent({
        action: "Staff Account Created",
        details: `${firstName} ${lastName} (${email}) - Role: ${STAFF_ROLE_LABELS[role]}`,
      });
    }

    bootstrap.Modal.getInstance(staffModalEl).hide();
    await loadStaff();
  } catch (error) {
    staffModalAlert.textContent = error.message || "Something went wrong saving this staff account. Please try again.";
    staffModalAlert.classList.remove("d-none");
  } finally {
    saveStaffBtn.disabled = false;
  }
});

/* ---------- Deactivate / Reactivate ---------- */
async function toggleStaffStatus(id) {
  const staff = allStaff.find((s) => s.id === id);
  if (!staff) return;

  const currentStatus = computedStaffStatus(staff);
  const nextStatus = currentStatus === "active" ? "deactivated" : "active";
  const confirmMsg =
    nextStatus === "deactivated"
      ? "Deactivate this staff account? They won't be able to sign in until reactivated."
      : "Reactivate this staff account?";
  if (!confirm(confirmMsg)) return;

  try {
    await db.collection("users").doc(id).update({ accountStatus: nextStatus });
    await logAuditEvent({
      action: nextStatus === "deactivated" ? "Staff Account Deactivated" : "Staff Account Reactivated",
      details: `${staff.firstName || ""} ${staff.lastName || ""} (${staff.email || ""})`,
    });
    await loadStaff();
  } catch (error) {
    alert("Something went wrong updating this account. Please try again.");
  }
}
