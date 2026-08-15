/**
 * Shared RBAC constants for the admin side, used by admin-header.js and
 * admin-staff-management.js. "admin" is kept as a full-access legacy role
 * so existing accounts still work.
 */

const STAFF_ROLES = ["admin", "branch_manager", "technical_staff", "sales_staff"];

const STAFF_ROLE_LABELS = {
  admin: "Administrator",
  branch_manager: "Branch Manager",
  technical_staff: "Technical Staff",
  sales_staff: "Sales Staff",
};

// Walk-in Orders/POS and Live Chat don't exist yet, so Sales Staff is
// scoped to just the catalog and their own account for now. Price
// Management doesn't have its own page yet either - it's part of the
// Products edit form - so there's nothing to restrict there yet.
const ADMIN_PAGE_ACCESS = {
  "dashboard.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "products.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "online-orders.html": ["admin", "branch_manager", "technical_staff"],
  "inventory.html": ["admin", "branch_manager", "technical_staff"],
  "suppliers.html": ["admin", "branch_manager", "technical_staff"],
  "customer-accounts.html": ["admin", "branch_manager", "technical_staff"],
  "wholesale-accounts.html": ["admin", "branch_manager", "technical_staff"],
  "audit-log.html": ["admin", "branch_manager", "technical_staff"],
  "notifications.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "settings.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "staff-management.html": ["admin", "branch_manager"],
};

function currentAdminPageName() {
  return window.location.pathname.split("/").pop();
}

function roleCanAccessPage(role, pageName) {
  const allowed = ADMIN_PAGE_ACCESS[pageName];
  return allowed ? allowed.includes(role) : true;
}
