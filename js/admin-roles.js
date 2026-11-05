// shared role lists for the admin side

const STAFF_ROLES = ["admin", "branch_manager", "technical_staff", "sales_staff"];

const STAFF_ROLE_LABELS = {
  admin: "Administrator",
  branch_manager: "Branch Manager",
  technical_staff: "Technical Staff",
  sales_staff: "Sales Staff",
};

const ADMIN_PAGE_ACCESS = {
  // sales staff only gets pos and the catalog
  "dashboard.html": ["admin", "branch_manager", "technical_staff"],
  "pos.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "products.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "online-orders.html": ["admin", "branch_manager", "technical_staff"],
  "inventory.html": ["admin", "branch_manager", "technical_staff"],
  "suppliers.html": ["admin", "branch_manager", "technical_staff"],
  "customer-accounts.html": ["admin", "branch_manager", "technical_staff"],
  "wholesale-accounts.html": ["admin", "branch_manager", "technical_staff"],
  "audit-log.html": ["admin", "branch_manager", "technical_staff"],
  "notifications.html": ["admin", "branch_manager", "technical_staff"],
  "live-chat.html": ["admin", "branch_manager", "technical_staff"],
  "reports.html": ["admin", "branch_manager", "technical_staff"],
  "settings.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "staff-management.html": ["admin", "branch_manager"],
  // temporary, only for go-live
  "clear-test-data.html": ["admin", "branch_manager"],
};

// same date as the temp block in firestore.rules, change both
const CLEAR_TEST_DATA_UNTIL = new Date(Date.UTC(2026, 10, 15));

// where each role lands after login
function homePageForRole(role) {
  return role === "sales_staff" ? "pos.html" : "dashboard.html";
}

// sales staff can only view products
function roleCanEditProducts(role) {
  return role !== "sales_staff";
}

function currentAdminPageName() {
  return window.location.pathname.split("/").pop();
}

function roleCanAccessPage(role, pageName) {
  const allowed = ADMIN_PAGE_ACCESS[pageName];
  return allowed ? allowed.includes(role) : true;
}
