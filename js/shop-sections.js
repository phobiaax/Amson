/**
 * Shop sections: how customers browse the online store, by need. Separate
 * from the branch categories (Generics, Branded, ...), which drive the
 * month-end reports. Shared by every page that shows the store menu, and by
 * the admin product form and batch import. A product has at most one;
 * products without one still show under All Products.
 */
const SHOP_SECTIONS = [
  { id: "pain-fever", label: "Pain & Fever", icon: "bi-thermometer-half" },
  { id: "cough-colds", label: "Cough, Colds & Allergy", icon: "bi-wind" },
  { id: "stomach", label: "Stomach & Digestion", icon: "bi-capsule" },
  { id: "vitamins", label: "Vitamins & Supplements", icon: "bi-sun" },
  { id: "heart-bp", label: "Heart, Blood Pressure & Diabetes", icon: "bi-heart-pulse" },
  { id: "antibiotics", label: "Antibiotics (Rx)", icon: "bi-prescription2" },
  { id: "skin", label: "Skin & Personal Care", icon: "bi-droplet" },
  { id: "first-aid", label: "Medical Supplies & Devices", icon: "bi-bandaid" },
];
const SHOP_SECTION_LABELS = Object.fromEntries(SHOP_SECTIONS.map((s) => [s.id, s.label]));

// The first list had 12 sections; their ids and names still work (saved
// products, import files) and land in the section they were merged into.
const SHOP_SECTION_ALIASES = {
  allergy: "cough-colds",
  "cough-and-colds": "cough-colds",
  diabetes: "heart-bp",
  "heart-and-blood-pressure": "heart-bp",
  "personal-care": "skin",
  "skin-care": "skin",
  devices: "first-aid",
  "health-devices-and-tests": "first-aid",
  "first-aid-and-medical-supplies": "first-aid",
};

// A section id from a saved value or what someone typed in an import file:
// its id or its name (current or old), ignoring case, spaces and "&"/"and".
// Unknown text -> "" (none).
function resolveShopSection(text) {
  const key = (v) => String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const k = key(text);
  if (!k) return "";
  if (SHOP_SECTION_LABELS[k]) return k;
  if (SHOP_SECTION_ALIASES[k]) return SHOP_SECTION_ALIASES[k];
  const hit = SHOP_SECTIONS.find((s) => key(s.label) === k);
  return hit ? hit.id : "";
}

// The store menu under the header: All Products + the 8 sections, the same
// on every page.
function renderShopSectionNav() {
  const nav = document.querySelector(".category-nav .nav");
  if (!nav) return;
  const base = /\/shop\//.test(window.location.pathname) ? "" : "shop/";
  nav.innerHTML =
    `<li class="nav-item"><a class="nav-link" href="${base}products.html">All Products</a></li>` +
    SHOP_SECTIONS.map((s) => `<li class="nav-item"><a class="nav-link" href="${base}products.html?section=${s.id}">${s.label.replace(/&/g, "&amp;")}</a></li>`).join("");
}
renderShopSectionNav();
