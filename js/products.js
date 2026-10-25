/**
 * Product catalog page.
 */

const PAGE_SIZE = 16;
let currentPage = 1;
let currentFiltered = SAMPLE_PRODUCTS.slice();

const productsGrid = document.getElementById("productsGrid");
const pagination = document.getElementById("pagination");
const paginationSummary = document.getElementById("paginationSummary");
const catAll = document.getElementById("catAll");
const categoryFilterList = document.getElementById("categoryFilterList");
// Filled from the categories collection once the catalog loads (see
// renderCategoryFilters), so it always matches Manage Categories.
let categoryFilters = [];
const sortBy = document.getElementById("sortBy");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const priceMinInput = document.getElementById("priceMinInput");
const priceMaxInput = document.getElementById("priceMaxInput");
const stockFilterSelect = document.getElementById("stockFilterSelect");
const sectionFilterSelect = document.getElementById("sectionFilterSelect");
const productsHeading = document.getElementById("productsHeading");
const searchSummary = document.getElementById("searchSummary");

// Keyword from the header search box (?q=). Matches name, generic name,
// brand and description, ignoring case and extra spaces.
const searchTerm = (new URLSearchParams(window.location.search).get("q") || "").trim();

function matchesSearch(product) {
  if (!searchTerm) return true;
  const haystack = [product.name, product.genericName, product.brand, product.description].join(" ").toLowerCase();
  return searchTerm
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

catAll.addEventListener("change", () => {
  if (catAll.checked) {
    categoryFilters.forEach((cb) => (cb.checked = false));
  }
});

function renderCategoryFilters() {
  categoryFilterList.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(
      ([id, name], idx) => `
        <div class="form-check">
          <input class="form-check-input category-filter" type="checkbox" id="catFilter${idx}" value="${escapeHtml(id)}">
          <label class="form-check-label" for="catFilter${idx}">${escapeHtml(name)}</label>
        </div>
      `
    )
    .join("");
  categoryFilters = Array.from(categoryFilterList.querySelectorAll(".category-filter"));
  categoryFilters.forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) catAll.checked = false;
      const anyChecked = categoryFilters.some((c) => c.checked);
      if (!anyChecked) catAll.checked = true;
    });
  });
}

function applyFilters() {
  const selected = categoryFilters.filter((cb) => cb.checked).map((cb) => cb.value);
  let filtered = selected.length
    ? storefrontCatalog().filter((p) => selected.includes(p.category))
    : storefrontCatalog();
  if (sectionFilterSelect.value) filtered = filtered.filter((p) => p.shopSection === sectionFilterSelect.value);

  const minPrice = parseFloat(priceMinInput.value);
  const maxPrice = parseFloat(priceMaxInput.value);
  filtered = filtered.filter(
    (p) =>
      matchesSearch(p) &&
      (isNaN(minPrice) || p.price >= minPrice) &&
      (isNaN(maxPrice) || p.price <= maxPrice) &&
      (stockFilterSelect.value === "all" || (stockFilterSelect.value === "in" ? p.inStock : !p.inStock))
  );

  filtered.sort((a, b) => {
    // Out-of-stock items sink to the bottom no matter what sort is
    // chosen - they're still browsable, just not what anyone's shopping
    // for right now.
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;

    switch (sortBy.value) {
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  currentFiltered = filtered;
  currentPage = 1;
  renderPage();
}

function renderPage() {
  const totalItems = currentFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = currentFiltered.slice(start, start + PAGE_SIZE);

  productsGrid.innerHTML = pageItems.length
    ? pageItems.map(renderProductCard).join("")
    : `<p class="text-muted">${searchTerm ? `No products found for "${escapeHtml(searchTerm)}".` : "No products match your filters."}</p>`;

  renderPagination(totalPages);

  const rangeStart = totalItems === 0 ? 0 : start + 1;
  const rangeEnd = Math.min(start + PAGE_SIZE, totalItems);
  paginationSummary.textContent = `Showing ${rangeStart}-${rangeEnd} of ${totalItems} items`;
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === currentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${currentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  pagination.innerHTML = html;
}

pagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;

  if (btn.dataset.page === "prev") currentPage -= 1;
  else if (btn.dataset.page === "next") currentPage += 1;
  else currentPage = Number(btn.dataset.page);

  renderPage();
  window.scrollTo({ top: productsGrid.offsetTop - 100, behavior: "smooth" });
});

applyFiltersBtn.addEventListener("click", applyFilters);

(async function init() {
  await loadCatalogCache();
  renderCategoryFilters();
  // Only sections that have products in the store.
  sectionFilterSelect.innerHTML =
    '<option value="">All sections</option>' +
    storefrontShopSections().map((sec) => `<option value="${escapeHtml(sec.id)}">${escapeHtml(sec.label)}</option>`).join("");
  currentFiltered = storefrontCatalog();

  if (searchTerm) {
    productsHeading.textContent = "Search Results";
    searchSummary.innerHTML = `Showing results for "<strong>${escapeHtml(searchTerm)}</strong>" &middot; <a href="products.html" class="link-red">Clear search</a>`;
    searchSummary.classList.remove("d-none");
  }

  // ---- Pre-select category from query param ----
  const initialCategory = new URLSearchParams(window.location.search).get("category");
  if (initialCategory && CATEGORY_LABELS[initialCategory]) {
    catAll.checked = false;
    const match = categoryFilters.find((cb) => cb.value === initialCategory);
    if (match) match.checked = true;
  }

  // ---- Pre-select shop section from query param ----
  const initialSection = new URLSearchParams(window.location.search).get("section");
  if (initialSection && SHOP_SECTION_LABELS[initialSection]) {
    sectionFilterSelect.value = initialSection;
    if (!searchTerm) productsHeading.textContent = SHOP_SECTION_LABELS[initialSection];
  }

  applyFilters();
})();
