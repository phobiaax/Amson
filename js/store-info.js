/**
 * Store details shown in every page footer - edit them here, once.
 * Leave a value empty ("") to hide that line rather than show a guess.
 * The client still has to confirm the contact details and FDA LTO number.
 */
const STORE_INFO = {
  name: "Amson Pharmaceuticals",
  about:
    "A pharmaceutical distributor and retailer serving walk-in customers, drugstores, clinics and hospitals from its Las Piñas branch since September 2023.",
  hotline: "",
  email: "",
  hours: "",
  address: "",
  fdaLtoNo: "",
};

function renderSiteFooter() {
  const footer = document.querySelector("footer.site-footer");
  if (!footer) return;

  // Pages under /shop/ and /admin/ link up one level to the legal page.
  const inSubfolder = /\/(shop|admin)\//.test(window.location.pathname);
  const legalHref = `${inSubfolder ? "../" : ""}legal.html`;
  const esc = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const line = (label, value) => (value ? `<p class="mb-1">${label}${esc(value)}</p>` : "");

  const contactLines =
    line("Hotline: ", STORE_INFO.hotline) +
    line("Email: ", STORE_INFO.email) +
    line("", STORE_INFO.hours) +
    line("", STORE_INFO.address);

  footer.innerHTML = `
    <div class="container">
      <div class="row gy-4">
        <div class="col-md-5">
          <h6>About ${esc(STORE_INFO.name)}</h6>
          <p>${esc(STORE_INFO.about)}</p>
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
      &copy; ${new Date().getFullYear()} ${esc(STORE_INFO.name)}. All rights reserved.${STORE_INFO.fdaLtoNo ? ` FDA LTO No. ${esc(STORE_INFO.fdaLtoNo)}` : ""}
    </div>
  `;
}

renderSiteFooter();

// ---- Header search (every customer-facing page) ----
// Sends the term to the catalog page, which does the actual matching.
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

// ---- Store announcement / promotion banner (REQ008) ----
// Set by staff in Admin -> Settings. Shown under the header on shop pages.
(async function renderStoreBanner() {
  const header = document.querySelector(".site-header");
  if (!header || typeof db === "undefined") return;
  try {
    const doc = await db.collection("storeSettings").doc("homeBanner").get();
    if (!doc.exists) return;
    const b = doc.data();
    if (!b.active || !b.message) return;
    const bar = document.createElement("div");
    bar.className = `store-banner store-banner-${b.kind === "promotion" ? "promotion" : "announcement"}`;
    bar.setAttribute("role", "status");
    const icon = document.createElement("i");
    icon.className = `bi ${b.kind === "promotion" ? "bi-tag-fill" : "bi-megaphone-fill"} me-2`;
    bar.appendChild(icon);
    bar.appendChild(document.createTextNode(b.message));
    header.insertAdjacentElement("afterend", bar);
  } catch (error) {
    console.warn("Store announcement unavailable:", error);
  }
})();
