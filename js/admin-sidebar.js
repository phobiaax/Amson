// mobile sidebar toggle

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

// desktop sidebar can collapse to icons, choice is remembered
const SIDEBAR_COLLAPSED_KEY = "amsonAdminSidebarCollapsed";
const adminBody = document.querySelector(".admin-body");

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch (error) {
    return false;
  }
}

function setSidebarCollapsed(collapsed) {
  if (!adminBody) return;
  adminBody.classList.toggle("sidebar-collapsed", collapsed);
  const btn = document.getElementById("sidebarCollapseBtn");
  if (btn) {
    btn.setAttribute("aria-expanded", String(!collapsed));
    btn.setAttribute("aria-label", collapsed ? "Expand menu" : "Collapse menu");
    btn.dataset.label = collapsed ? "Expand menu" : "Collapse menu";
  }
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch (error) {}
}

if (adminSidebar && adminBody) {
  // link text goes in a span so it can hide on the icon rail
  adminSidebar.querySelectorAll(".admin-nav-link").forEach((link) => {
    const words = [];
    Array.from(link.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        words.push(node.textContent.trim());
        node.remove();
      }
    });
    if (!words.length) return;
    const label = document.createElement("span");
    label.className = "admin-nav-label";
    label.textContent = words.join(" ");
    const icon = link.querySelector("i");
    if (icon) icon.after(label);
    else link.prepend(label);
    link.dataset.label = label.textContent;
  });

  // logo replaces the store name when collapsed
  const brand = adminSidebar.querySelector(".admin-sidebar-brand");
  if (brand && !brand.querySelector(".admin-sidebar-logo")) {
    const logo = document.createElement("img");
    logo.src = "../assets/logo-transp.png";
    logo.alt = "";
    logo.className = "admin-sidebar-logo";
    brand.prepend(logo);
  }

  const collapseBtn = document.createElement("button");
  collapseBtn.type = "button";
  collapseBtn.id = "sidebarCollapseBtn";
  collapseBtn.className = "admin-sidebar-collapse-btn";
  collapseBtn.innerHTML = '<i class="bi bi-chevron-double-left"></i><span class="admin-nav-label">Collapse</span>';
  collapseBtn.addEventListener("click", () => {
    setSidebarCollapsed(!adminBody.classList.contains("sidebar-collapsed"));
  });
  adminSidebar.appendChild(collapseBtn);

  // set before the page shows so it doesnt jump
  setSidebarCollapsed(readSidebarCollapsed());
}
