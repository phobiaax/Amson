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
  "dashboard.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "products.html": ["admin", "branch_manager", "technical_staff", "sales_staff"],
  "online-orders.html": ["admin", "branch_manager", "technical_staff"],
  "prescription-orders.html": ["admin", "branch_manager", "technical_staff"],
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
