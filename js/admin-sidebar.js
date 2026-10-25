/**
 * Mobile sidebar toggle.
 */

const adminSidebar = document.querySelector(".admin-sidebar");
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

function closeAdminSidebar() {
  adminSidebar.classList.remove("open");
  sidebarBackdrop.classList.remove("show");
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", () => {
    adminSidebar.classList.add("open");
    sidebarBackdrop.classList.add("show");
  });
}

if (sidebarBackdrop) {
  sidebarBackdrop.addEventListener("click", closeAdminSidebar);
}
