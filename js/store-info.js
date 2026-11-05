// store details for the footer, empty values are hidden
const STORE_INFO = {
  name: "Amson Pharmaceuticals",
  about:
    "A pharmaceutical distributor and retailer serving walk-in customers, drugstores, clinics and hospitals from its Las Piñas branch since September 2023.",
  hotline: "(02) 856 21155",
  email: "",
  hours: "daily, 9:00 AM - 6:00 PM",
  address: "Unit 8 Benz Compound, J. Aguilar Ave., Pamplona Tres, Las Piñas City",
  fdaLtoNo: "CDRR-NCR-DI/W-734203",
};

function renderSiteFooter() {
  const footer = document.querySelector("footer.site-footer");
  if (!footer) return;

  // shop and admin pages are one folder down
  const inSubfolder = /\/(shop|admin)\//.test(window.location.pathname);
  const legalHref = `${inSubfolder ? "../" : ""}legal.html`;
  const escapeText = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const line = (label, value) => (value ? `<p class="mb-1">${label}${escapeText(value)}</p>` : "");

  const contactLines =
    line("Hotline: ", STORE_INFO.hotline) +
    line("Email: ", STORE_INFO.email) +
    line("Open ", STORE_INFO.hours) +
    line("", STORE_INFO.address);

  footer.innerHTML = `
    <div class="container">
      <div class="row gy-4">
        <div class="col-md-5">
          <h6>About ${escapeText(STORE_INFO.name)}</h6>
          <p>${escapeText(STORE_INFO.about)}</p>
        </div>
        <div class="col-md-3">
          <h6>Information</h6>
          <a href="${legalHref}#privacy" class="d-block">Privacy Policy</a>
          <a href="${legalHref}#terms" class="d-block">Terms &amp; Conditions</a>
        </div>
        ${contactLines ? `<div class="col-md-4"><h6>Contact Us</h6>${contactLines}</div>` : ""}
      </div>
    </div>
    <div class="footer-bottom text-center py-3 mt-4">
      &copy; ${new Date().getFullYear()} ${escapeText(STORE_INFO.name)}. All rights reserved.${STORE_INFO.fdaLtoNo ? ` FDA LTO No. ${escapeText(STORE_INFO.fdaLtoNo)}` : ""}
    </div>
  `;
}

renderSiteFooter();

// header search goes to the catalog page
document.querySelectorAll(".site-header .search-input").forEach((input) => {
  const catalogPage = /\/shop\//.test(window.location.pathname) ? "products.html" : "shop/products.html";
  const go = () => {
    const term = input.value.trim();
    window.location.href = term ? `${catalogPage}?q=${encodeURIComponent(term)}` : catalogPage;
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
  const btn = input.parentElement && input.parentElement.querySelector(".search-btn");
  if (btn) btn.addEventListener("click", go);
  const current = new URLSearchParams(window.location.search).get("q");
  if (current) input.value = current;
});

// shop banner set in admin settings
(async function renderStoreBanner() {
  const header = document.querySelector(".site-header");
  if (!header || typeof db === "undefined") return;
  try {
    const doc = await db.collection("storeSettings").doc("homeBanner").get();
    if (!doc.exists) return;
    const banner = doc.data();
    if (!banner.active || !banner.message) return;
    const bar = document.createElement("div");
    bar.className = `store-banner store-banner-${banner.kind === "promotion" ? "promotion" : "announcement"}`;
    bar.setAttribute("role", "status");
    const icon = document.createElement("i");
    icon.className = `bi ${banner.kind === "promotion" ? "bi-tag-fill" : "bi-megaphone-fill"} me-2`;
    bar.appendChild(icon);
    bar.appendChild(document.createTextNode(banner.message));
    header.insertAdjacentElement("afterend", bar);
  } catch (error) {
    console.warn("Store announcement unavailable:", error);
  }
})();
