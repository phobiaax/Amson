/**
 * Product catalog page: filter (by category), sort, and client-side
 * pagination over SAMPLE_PRODUCTS. Swap SAMPLE_PRODUCTS for a Firestore
 * query later — this filter/sort/paginate logic can stay the same.
 */

const PAGE_SIZE = 16;
let currentPage = 1;
let currentFiltered = SAMPLE_PRODUCTS.slice();

const productsGrid = document.getElementById("productsGrid");
const pagination = document.getElementById("pagination");
const paginationSummary = document.getElementById("paginationSummary");
const catAll = document.getElementById("catAll");
const categoryFilters = Array.from(document.querySelectorAll(".category-filter"));
const sortBy = document.getElementById("sortBy");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");

catAll.addEventListener("change", () => {
  if (catAll.checked) {
    categoryFilters.forEach((cb) => (cb.checked = false));
  }
});

categoryFilters.forEach((cb) => {
  cb.addEventListener("change", () => {
    if (cb.checked) catAll.checked = false;
    const anyChecked = categoryFilters.some((c) => c.checked);
    if (!anyChecked) catAll.checked = true;
  });
});

function storefrontCatalog() {
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore);
}

function applyFilters() {
  const selected = categoryFilters.filter((cb) => cb.checked).map((cb) => cb.value);
  let filtered = selected.length
    ? storefrontCatalog().filter((p) => selected.includes(p.category))
    : storefrontCatalog();

  filtered.sort((a, b) => {
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
    : '<p class="text-muted">No products match your filters.</p>';

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
  currentFiltered = storefrontCatalog();

  // ---- Pre-select category from a ?category= query param (nav links use this) ----
  const initialCategory = new URLSearchParams(window.location.search).get("category");
  if (initialCategory && CATEGORY_LABELS[initialCategory]) {
    catAll.checked = false;
    const match = categoryFilters.find((cb) => cb.value === initialCategory);
    if (match) match.checked = true;
  }

  applyFilters();
})();
