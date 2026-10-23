/**
 * Products > Upload Photos: add photos to many products at once.
 *
 * Step 1: staff choose (or drop) any number of photos named after their
 * products, e.g. "losaar 50.jpg". Step 2: each file name has been matched to
 * a product on this computer (no extra database reads); staff check or
 * change every match with a searchable product picker. Saving shrinks,
 * uploads (Cloudinary) and attaches the ticked photos together - only each
 * product's photo changes - with a progress and result pop-up.
 */

const uploadPhotosBtn = document.getElementById("uploadPhotosBtn");
const photosModalEl = document.getElementById("photosModal");
const photosFileInput = document.getElementById("photosFileInput");
const photoDropzone = document.getElementById("photoDropzone");
const photosPickedSummary = document.getElementById("photosPickedSummary");
const photosStepPick = document.getElementById("photosStepPick");
const photosStepReview = document.getElementById("photosStepReview");
const photoStep1Label = document.getElementById("photoStep1Label");
const photoStep2Label = document.getElementById("photoStep2Label");
const photosReviewList = document.getElementById("photosReviewList");
const photosReviewEmpty = document.getElementById("photosReviewEmpty");
const photoFilterBtns = Array.from(document.querySelectorAll("#photoFilterBtns [data-filter]"));
const photosSelectAll = document.getElementById("photosSelectAll");
const photosFooterNote = document.getElementById("photosFooterNote");
const photosBackBtn = document.getElementById("photosBackBtn");
const photosNextBtn = document.getElementById("photosNextBtn");
const photosSaveBtn = document.getElementById("photosSaveBtn");

// Words that say nothing about which product a photo is. (Forms like
// "syrup" or "tablet" are kept: they tell Lagundi syrup from Lagundi tablet.)
const PHOTO_STOP_WORDS = new Set([
  "JPG", "JPEG", "PNG", "WEBP", "HEIC", "IMG", "IMAGE", "PHOTO", "PIC", "COPY", "FINAL", "NEW",
  "MG", "ML", "MCG", "G", "S", "PC", "PCS", "AND", "WITH", "THE", "OF", "FOR",
]);

let pickedPhotoFiles = [];
let photoRows = []; // { id, file, url, productId, auto, checked }
let photoProducts = [];
let photoFilter = "all";

document.addEventListener("admin:ready", (e) => {
  const role = e.detail && e.detail.admin && e.detail.admin.role;
  if (!roleCanEditProducts(role)) uploadPhotosBtn.classList.add("d-none");
});

function photoTokens(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/\.[A-Z0-9]{2,5}$/, "")
    // "10MG" -> "10 MG", so a strength typed either way still matches.
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .replace(/([A-Z])(\d)/g, "$1 $2")
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !PHOTO_STOP_WORDS.has(t));
}

// Scores every product against one file name. Rare words (brand names,
// strengths) count for more than common ones (PARACETAMOL appears on many
// products); a clear winner is needed, otherwise staff choose.
function buildPhotoMatcher(products) {
  const docs = products.map((p) => ({ p, tokens: new Set(photoTokens(`${p.name} ${p.genericName || ""} ${p.brand || ""}`)) }));
  const df = new Map();
  docs.forEach((d) => d.tokens.forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
  const weight = (t) => Math.log(1 + docs.length / (df.get(t) || 0.5));

  return function match(fileName) {
    const sku = String(fileName).toUpperCase().match(/MED-\d{4,}/);
    if (sku) {
      const hit = products.find((p) => (p.sku || "").toUpperCase() === sku[0]);
      if (hit) return hit;
    }
    const tokens = [...new Set(photoTokens(fileName))];
    if (!tokens.length) return null;
    const total = tokens.reduce((sum, t) => sum + weight(t), 0);
    let best = null;
    let second = 0;
    docs.forEach((d) => {
      let got = 0;
      tokens.forEach((t) => {
        if (d.tokens.has(t)) got += weight(t);
        // "PARA" for PARACETAMOL, "LOSAAR50" for LOSAAR 50 and the like.
        else if (t.length >= 4 && [...d.tokens].some((w) => w.length >= 4 && (w.startsWith(t) || t.startsWith(w)))) got += weight(t) / 2;
      });
      const score = got / total;
      if (!best || score > best.score) {
        second = best ? best.score : second;
        best = { p: d.p, score };
      } else if (score > second) {
        second = score;
      }
    });
    return best && best.score >= 0.6 && best.score - second >= 0.15 ? best.p : null;
  };
}

/* ---------- Opening and the two steps ---------- */
function openPhotosModal() {
  pickedPhotoFiles = [];
  clearPhotoRows();
  photoFilter = "all";
  showPhotoStep("pick");
  bootstrap.Modal.getOrCreateInstance(photosModalEl).show();
}

uploadPhotosBtn.addEventListener("click", openPhotosModal);

function showPhotoStep(step) {
  const review = step === "review";
  photosStepPick.classList.toggle("d-none", review);
  photosStepReview.classList.toggle("d-none", !review);
  photoStep1Label.classList.toggle("active", !review);
  photoStep2Label.classList.toggle("active", review);
  photosBackBtn.classList.toggle("d-none", !review);
  photosNextBtn.classList.toggle("d-none", review);
  photosSaveBtn.classList.toggle("d-none", !review);
  if (!review) updatePickedSummary();
  else renderPhotoRows();
}

function isPhotoFile(f) {
  return /^image\//i.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
}

function addPickedFiles(files) {
  const known = new Set(pickedPhotoFiles.map((f) => `${f.name}:${f.size}`));
  Array.from(files).filter(isPhotoFile).forEach((f) => {
    if (!known.has(`${f.name}:${f.size}`)) pickedPhotoFiles.push(f);
  });
  updatePickedSummary();
}

function updatePickedSummary() {
  const n = pickedPhotoFiles.length;
  photosPickedSummary.textContent = n ? `${n} photo${n === 1 ? "" : "s"} chosen. Choose or drop more, or go to the next step.` : "";
  photosNextBtn.disabled = n === 0;
  photosNextBtn.textContent = n ? `Next: Check ${n} Match${n === 1 ? "" : "es"}` : "Next: Check Matches";
  photosFooterNote.textContent = "";
}

photosFileInput.addEventListener("change", () => {
  addPickedFiles(photosFileInput.files || []);
  photosFileInput.value = "";
});

["dragenter", "dragover"].forEach((type) =>
  photoDropzone.addEventListener(type, (e) => {
    e.preventDefault();
    photoDropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((type) =>
  photoDropzone.addEventListener(type, (e) => {
    e.preventDefault();
    photoDropzone.classList.remove("dragover");
  })
);
photoDropzone.addEventListener("drop", (e) => addPickedFiles((e.dataTransfer && e.dataTransfer.files) || []));

photosNextBtn.addEventListener("click", async () => {
  if (!pickedPhotoFiles.length) return;
  photosNextBtn.disabled = true;
  await loadCatalogCache();
  photoProducts = SAMPLE_PRODUCTS.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const match = buildPhotoMatcher(photoProducts);
  // Keep matches already made (or fixed) for files carried over from Back.
  const previous = new Map(photoRows.map((r) => [r.file, r]));
  clearPhotoRows(previous);
  photoRows = pickedPhotoFiles.map((file, i) => {
    const kept = previous.get(file);
    if (kept) return kept;
    const p = match(file.name);
    return { id: i, file, url: URL.createObjectURL(file), productId: p ? p.id : null, auto: !!p, checked: !!p };
  });
  photoRows.forEach((r, i) => (r.id = i));
  // Rows that need a product first.
  photoRows.sort((a, b) => (a.productId ? 1 : 0) - (b.productId ? 1 : 0));
  photoFilter = photoRows.some((r) => !r.productId) ? "needs" : "all";
  showPhotoStep("review");
});

photosBackBtn.addEventListener("click", () => showPhotoStep("pick"));

function clearPhotoRows(keep = null) {
  photoRows.forEach((r) => {
    if (!keep || !keep.has(r.file) || !pickedPhotoFiles.includes(r.file)) URL.revokeObjectURL(r.url);
  });
  if (!keep) photoRows = [];
  closeProductPicker();
}

photosModalEl.addEventListener("hidden.bs.modal", () => {
  if (photosSaveBtn.dataset.saving === "1") return;
  clearPhotoRows();
  pickedPhotoFiles = [];
  photosReviewList.innerHTML = "";
});

/* ---------- Step 2: the review list ---------- */
function photoRowState(row) {
  if (!row.productId) return { text: window.innerWidth < 768 ? "Needs a product - pick it below" : "Needs a product - pick it on the right", cls: "text-danger", needs: true };
  const p = getProductById(row.productId);
  const dupe = photoRows.find((r) => r !== row && r.checked && r.productId === row.productId);
  if (row.checked && dupe) return { text: "Another ticked photo is for this product too", cls: "text-danger", needs: true };
  if (p && p.imageUrl) return { text: "Will replace its current photo", cls: "text-warning" };
  return { text: row.auto ? "Matched by file name" : "Chosen by you", cls: "text-success" };
}

function photoThumbStyle(url, width = 120) {
  return url ? `background-image:url('${escapeHtml(cloudinaryImageUrl(url, width))}');` : "";
}

function renderPhotoRows() {
  const states = new Map(photoRows.map((r) => [r, photoRowState(r)]));
  const needs = photoRows.filter((r) => states.get(r).needs).length;
  document.getElementById("photoCountAll").textContent = photoRows.length;
  document.getElementById("photoCountNeeds").textContent = needs;
  document.getElementById("photoCountReady").textContent = photoRows.length - needs;
  photoFilterBtns.forEach((b) => b.classList.toggle("active", b.dataset.filter === photoFilter));

  const shown = photoRows.filter((r) => photoFilter === "all" || (photoFilter === "needs") === states.get(r).needs);
  photosReviewList.innerHTML = shown
    .map((row) => {
      const p = row.productId ? getProductById(row.productId) : null;
      const st = states.get(row);
      return `
        <div class="photo-review-row ${st.needs ? "needs" : ""}" data-row="${row.id}">
          <input class="form-check-input photo-row-check" type="checkbox" ${row.checked ? "checked" : ""} ${row.productId ? "" : "disabled"} aria-label="Save this photo">
          <div class="photo-review-thumb" style="background-image:url('${row.url}');"></div>
          <div class="min-w-0">
            <div class="photo-review-file fw-medium">${escapeHtml(row.file.name)}</div>
            <div class="photo-review-status ${st.cls}">${escapeHtml(st.text)}</div>
          </div>
          <div class="photo-picker">
            <div class="current-thumb" title="${p && p.imageUrl ? "Current photo" : "No photo yet"}" style="${p ? photoThumbStyle(p.imageUrl, 80) : ""}"></div>
            <div class="picker-input-wrap">
              <input type="text" class="form-control form-control-sm photo-row-product" autocomplete="off" placeholder="Search product name, brand or code" value="${p ? escapeHtml(p.name) : ""}" aria-label="Product for this photo">
              ${p ? `<button type="button" class="picker-clear" title="Clear" aria-label="Clear product"><i class="bi bi-x-lg"></i></button>` : ""}
            </div>
          </div>
        </div>`;
    })
    .join("");
  photosReviewEmpty.classList.toggle("d-none", shown.length > 0);
  photosReviewEmpty.textContent = photoFilter === "needs" ? "Every photo has a product." : "Nothing here.";

  const ticked = photoRows.filter((r) => r.checked && r.productId).length;
  photosSelectAll.checked = ticked > 0 && ticked === photoRows.filter((r) => r.productId).length;
  photosSaveBtn.textContent = ticked ? `Save ${ticked} Photo${ticked === 1 ? "" : "s"}` : "Save Photos";
  photosSaveBtn.disabled = ticked === 0;
  photosFooterNote.textContent = needs ? `${needs} photo${needs === 1 ? " needs" : "s need"} a product or will be skipped.` : "All photos have a product.";
}

const rowFor = (el) => photoRows.find((r) => String(r.id) === el.closest("[data-row]").dataset.row);

photoFilterBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    photoFilter = btn.dataset.filter;
    renderPhotoRows();
  })
);

photosSelectAll.addEventListener("change", () => {
  photoRows.forEach((r) => (r.checked = photosSelectAll.checked && !!r.productId));
  renderPhotoRows();
});

photosReviewList.addEventListener("change", (e) => {
  if (!e.target.classList.contains("photo-row-check")) return;
  const row = rowFor(e.target);
  row.checked = e.target.checked && !!row.productId;
  renderPhotoRows();
});

photosReviewList.addEventListener("click", (e) => {
  const clear = e.target.closest(".picker-clear");
  if (!clear) return;
  const row = rowFor(clear);
  row.productId = null;
  row.checked = false;
  row.auto = false;
  renderPhotoRows();
  const input = photosReviewList.querySelector(`[data-row="${row.id}"] .photo-row-product`);
  if (input) {
    input.focus();
    openProductPicker(input);
  }
});

/* ---------- Searchable product picker ---------- */
// One floating list, shown under whichever row's box is being typed in.
const pickerMenu = document.createElement("div");
pickerMenu.className = "product-picker-menu d-none";
pickerMenu.setAttribute("role", "listbox");
document.body.appendChild(pickerMenu);
let pickerInput = null;
let pickerResults = [];
let pickerActive = 0;

function searchProducts(query) {
  const words = photoTokens(query);
  if (!words.length) return photoProducts.slice(0, 8);
  const scored = [];
  photoProducts.forEach((p) => {
    const hay = photoTokens(`${p.name} ${p.genericName || ""} ${p.brand || ""} ${p.sku || ""}`);
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += 2;
      else if (hay.some((h) => h.startsWith(w))) score += 1;
      else return;
    }
    scored.push({ p, score });
  });
  return scored.sort((a, b) => b.score - a.score || String(a.p.name).localeCompare(String(b.p.name))).slice(0, 8).map((x) => x.p);
}

function openProductPicker(input) {
  pickerInput = input;
  const row = rowFor(input);
  const current = row.productId ? getProductById(row.productId) : null;
  const query = current && input.value === current.name ? "" : input.value;
  pickerResults = searchProducts(query);
  pickerActive = 0;
  pickerMenu.innerHTML = pickerResults.length
    ? pickerResults
        .map((p, i) => {
          const usedBy = photoRows.find((r) => r !== row && r.checked && r.productId === p.id);
          return `
          <button type="button" class="product-picker-item ${i === 0 ? "active" : ""}" role="option" data-index="${i}">
            <span class="thumb" style="${photoThumbStyle(p.imageUrl, 80)}"></span>
            <span class="min-w-0">
              <span class="d-block text-truncate">${escapeHtml(p.name)}</span>
              <span class="meta">${escapeHtml(p.sku || "")}${p.imageUrl ? " · has a photo" : ""}${usedBy ? " · another photo is set to this" : ""}</span>
            </span>
          </button>`;
        })
        .join("")
    : `<div class="product-picker-empty">No product matches "${escapeHtml(input.value)}".</div>`;
  const box = input.getBoundingClientRect();
  pickerMenu.style.left = `${box.left}px`;
  pickerMenu.style.width = `${Math.max(box.width, 320)}px`;
  const below = window.innerHeight - box.bottom;
  if (below < 240 && box.top > below) {
    pickerMenu.style.top = "";
    pickerMenu.style.bottom = `${window.innerHeight - box.top + 4}px`;
  } else {
    pickerMenu.style.bottom = "";
    pickerMenu.style.top = `${box.bottom + 4}px`;
  }
  pickerMenu.classList.remove("d-none");
}

function closeProductPicker() {
  pickerMenu.classList.add("d-none");
  pickerInput = null;
}

function choosePickerProduct(index) {
  const p = pickerResults[index];
  if (!p || !pickerInput) return;
  const row = rowFor(pickerInput);
  row.productId = p.id;
  row.auto = false;
  row.checked = true;
  closeProductPicker();
  renderPhotoRows();
}

function highlightPicker(index) {
  const items = pickerMenu.querySelectorAll(".product-picker-item");
  if (!items.length) return;
  pickerActive = (index + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle("active", i === pickerActive));
  items[pickerActive].scrollIntoView({ block: "nearest" });
}

photosReviewList.addEventListener("focusin", (e) => {
  if (e.target.classList.contains("photo-row-product")) {
    e.target.select();
    openProductPicker(e.target);
  }
});
photosReviewList.addEventListener("input", (e) => {
  if (e.target.classList.contains("photo-row-product")) openProductPicker(e.target);
});
photosReviewList.addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("photo-row-product") || pickerMenu.classList.contains("d-none")) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightPicker(pickerActive + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightPicker(pickerActive - 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    choosePickerProduct(pickerActive);
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation(); // close the list, not the whole modal
    closeProductPicker();
  }
});
photosReviewList.addEventListener("focusout", (e) => {
  if (!e.target.classList.contains("photo-row-product")) return;
  // Leaving the box without picking puts back what was chosen.
  setTimeout(() => {
    if (pickerInput === e.target && document.activeElement !== e.target) {
      closeProductPicker();
      renderPhotoRows();
    }
  }, 150);
});
// mousedown (not click) so the box keeps focus until the choice is made.
pickerMenu.addEventListener("mousedown", (e) => {
  const item = e.target.closest(".product-picker-item");
  if (!item) return;
  e.preventDefault();
  choosePickerProduct(Number(item.dataset.index));
});
photosStepReview.addEventListener("scroll", closeProductPicker, { passive: true });
window.addEventListener("resize", closeProductPicker);

/* ---------- Saving ---------- */
photosSaveBtn.addEventListener("click", async () => {
  const rows = photoRows.filter((r) => r.checked && r.productId);
  if (!rows.length) return;
  const seen = new Set();
  const dupe = rows.find((r) => (seen.has(r.productId) ? true : (seen.add(r.productId), false)));
  if (dupe) {
    photoFilter = "needs";
    renderPhotoRows();
    return;
  }

  photosSaveBtn.dataset.saving = "1";
  await hideModalAndWait(photosModalEl);
  showTaskProgress("Saving photos", "Keep this page open until it finishes.");
  const done = [];
  const failed = [];
  let next = 0;
  const worker = async () => {
    while (next < rows.length) {
      const row = rows[next++];
      const p = getProductById(row.productId);
      try {
        const imageUrl = await uploadToCloudinary(row.file, { kind: "product" });
        await db.collection("products").doc(row.productId).update({ imageUrl });
        if (p) p.imageUrl = imageUrl;
        done.push(row);
      } catch (error) {
        console.error("Photo upload failed:", row.file.name, error);
        failed.push(row);
      }
      updateTaskProgress(done.length + failed.length, rows.length, p ? p.name : "");
    }
  };
  // Three at a time: quick on good Wi-Fi without choking mobile data.
  await Promise.all([worker(), worker(), worker()]);
  photosSaveBtn.dataset.saving = "";

  if (done.length) {
    await logAuditEvent({
      action: "Product Photos Uploaded",
      details: `${done.length} photo${done.length === 1 ? "" : "s"}: ${done.map((r) => (getProductById(r.productId) || {}).name || r.productId).join("; ")}`.slice(0, 1500),
    });
  }
  // Saved photos leave the list; failed and skipped ones stay for a retry.
  done.forEach((r) => URL.revokeObjectURL(r.url));
  photoRows = photoRows.filter((r) => !done.includes(r));
  pickedPhotoFiles = photoRows.map((r) => r.file);
  catalogLoadPromise = null;
  if (typeof loadProducts === "function") loadProducts();

  const plural = (n) => `${n} photo${n === 1 ? "" : "s"}`;
  const skipped = photoRows.length - failed.length;
  const choice = await showTaskResult(
    failed.length
      ? {
          type: done.length ? "warning" : "danger",
          title: done.length ? "Some photos didn't save" : "Photos didn't save",
          message: `${plural(done.length)} saved. ${plural(failed.length)} didn't upload (check the connection).`,
          list: failed.map((r) => r.file.name),
          actions: [
            { key: "done", label: "Close" },
            { key: "back", label: "Try again", primary: true },
          ],
        }
      : {
          type: "success",
          title: "Photos saved",
          message: `${plural(done.length)} added to their products.${skipped ? `\n${plural(skipped)} without a product ${skipped === 1 ? "was" : "were"} skipped.` : ""}`,
          actions: skipped
            ? [
                { key: "done", label: "Done" },
                { key: "back", label: `Finish the ${skipped} skipped`, primary: true },
              ]
            : [
                { key: "more", label: "Upload more" },
                { key: "done", label: "Done", primary: true },
              ],
        }
  );
  if (choice === "back") {
    photoFilter = failed.length ? "all" : "needs";
    showPhotoStep("review");
    bootstrap.Modal.getOrCreateInstance(photosModalEl).show();
  } else if (choice === "more") {
    openPhotosModal();
  } else {
    clearPhotoRows();
    pickedPhotoFiles = [];
  }
});
