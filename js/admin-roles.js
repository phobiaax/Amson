/**
 * Shared RBAC constants for the admin side.
 */

const STAFF_ROLES = ["admin", "branch_manager", "technical_staff", "sales_staff"];

const STAFF_ROLE_LABELS = {
  admin: "Administrator",
  branch_manager: "Branch Manager",
  technical_staff: "Technical Staff",
  sales_staff: "Sales Staff",
};

const ADMIN_PAGE_ACCESS = {
  // Sales Staff: walk-in sales (POS, incl. today's sales) and catalog
  // viewing only (REQ121; client: "POS lang").
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
  "settings.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "staff-management.html": ["admin", "branch_manager"],
  "migrate-credit.html": ["admin", "branch_manager"],
};

// Where each role lands after login (and when sent away from a page it
// can't open).
function homePageForRole(role) {
  return role === "sales_staff" ? "pos.html" : "dashboard.html";
}

// Product catalog is view-only for Sales Staff.
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
