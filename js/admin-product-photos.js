/**
 * Products > Upload Photos: add photos to many products at once.
 *
 * Staff pick any number of photos named after their products (e.g.
 * "losaar 50.jpg"). Each file name is matched to a product on this computer
 * (no extra database reads), staff check or change every match, and the
 * ticked rows are shrunk, uploaded to Cloudinary and saved on their
 * products together. Only the product's photo changes.
 */

const uploadPhotosBtn = document.getElementById("uploadPhotosBtn");
const photosFileInput = document.getElementById("photosFileInput");
const photosReviewModalEl = document.getElementById("photosReviewModal");
const photosReviewTableBody = document.getElementById("photosReviewTableBody");
const photosProductOptions = document.getElementById("photosProductOptions");
const photosSelectAll = document.getElementById("photosSelectAll");
const photosReviewAlert = document.getElementById("photosReviewAlert");
const photosReviewCount = document.getElementById("photosReviewCount");
const photosSaveBtn = document.getElementById("photosSaveBtn");
const photosCancelBtn = document.getElementById("photosCancelBtn");

// Words that say nothing about which product a photo is. (Forms like
// "syrup" or "tablet" are kept: they tell Lagundi syrup from Lagundi tablet.)
const PHOTO_STOP_WORDS = new Set([
  "JPG", "JPEG", "PNG", "WEBP", "HEIC", "IMG", "IMAGE", "PHOTO", "PIC", "COPY", "FINAL", "NEW",
  "MG", "ML", "MCG", "G", "S", "PC", "PCS", "AND", "WITH", "THE", "OF", "FOR",
]);

let photoRows = []; // { file, url, productId, auto }
let photoProductsByLabel = new Map();
let photoSaving = false;

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

function photoProductLabel(p) {
  return `${p.name}${p.sku ? ` · ${p.sku}` : ""}`;
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

uploadPhotosBtn.addEventListener("click", () => photosFileInput.click());

photosFileInput.addEventListener("change", async () => {
  const files = Array.from(photosFileInput.files || []).filter((f) => /^image\//i.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
  photosFileInput.value = "";
  if (!files.length) return;

  await loadCatalogCache();
  const products = SAMPLE_PRODUCTS.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  photoProductsByLabel = new Map(products.map((p) => [photoProductLabel(p), p]));
  photosProductOptions.innerHTML = products.map((p) => `<option value="${escapeHtml(photoProductLabel(p))}"></option>`).join("");

  const match = buildPhotoMatcher(products);
  photoRows.forEach((r) => URL.revokeObjectURL(r.url));
  photoRows = files.map((file) => {
    const p = match(file.name);
    return { file, url: URL.createObjectURL(file), productId: p ? p.id : null, auto: !!p, checked: !!p };
  });
  photosReviewAlert.classList.add("d-none");
  renderPhotoRows();
  bootstrap.Modal.getOrCreateInstance(photosReviewModalEl).show();
});

function photoRowNote(row, index) {
  if (!row.productId) return { text: "Choose a product", cls: "text-danger" };
  const p = getProductById(row.productId);
  const dupe = photoRows.findIndex((r, i) => i !== index && r.checked && r.productId === row.productId);
  if (row.checked && dupe !== -1) return { text: `Same product as row ${dupe + 1}`, cls: "text-danger" };
  if (p && p.imageUrl) return { text: "Replaces its current photo", cls: "text-warning" };
  return { text: row.auto ? "Matched by file name" : "Chosen", cls: "text-success" };
}

function renderPhotoRows() {
  photosReviewTableBody.innerHTML = photoRows
    .map((row, i) => {
      const p = row.productId ? getProductById(row.productId) : null;
      const note = photoRowNote(row, i);
      return `
        <tr data-index="${i}">
          <td><input class="form-check-input photo-row-check" type="checkbox" ${row.checked ? "checked" : ""} aria-label="Save this photo"></td>
          <td><div style="width:48px;height:48px;border-radius:6px;background:#f2f2f4 url('${row.url}') center/cover no-repeat;"></div></td>
          <td style="word-break:break-all;">${escapeHtml(row.file.name)}</td>
          <td><input type="text" class="form-control form-control-sm photo-row-product" list="photosProductOptions" placeholder="Type to find the product" value="${p ? escapeHtml(photoProductLabel(p)) : ""}"></td>
          <td class="${note.cls}" style="font-size:0.8rem;">${escapeHtml(note.text)}</td>
        </tr>`;
    })
    .join("");
  const ticked = photoRows.filter((r) => r.checked).length;
  const matched = photoRows.filter((r) => r.productId).length;
  photosReviewCount.textContent = `${photoRows.length} photo${photoRows.length === 1 ? "" : "s"} - ${matched} matched, ${ticked} ticked to save`;
  photosSelectAll.checked = ticked === photoRows.length;
}

photosReviewTableBody.addEventListener("change", (e) => {
  const tr = e.target.closest("tr[data-index]");
  if (!tr || photoSaving) return;
  const row = photoRows[Number(tr.dataset.index)];
  if (e.target.classList.contains("photo-row-check")) {
    row.checked = e.target.checked && !!row.productId;
  } else if (e.target.classList.contains("photo-row-product")) {
    const p = photoProductsByLabel.get(e.target.value.trim());
    row.productId = p ? p.id : null;
    row.auto = false;
    row.checked = !!p;
  }
  renderPhotoRows();
});

photosSelectAll.addEventListener("change", () => {
  if (photoSaving) return;
  photoRows.forEach((r) => {
    r.checked = photosSelectAll.checked && !!r.productId;
  });
  renderPhotoRows();
});

photosReviewModalEl.addEventListener("hidden.bs.modal", () => {
  if (photoSaving) return;
  photoRows.forEach((r) => URL.revokeObjectURL(r.url));
  photoRows = [];
  photosReviewTableBody.innerHTML = "";
});

function showPhotosAlert(message, type) {
  photosReviewAlert.textContent = message;
  photosReviewAlert.className = `alert auth-alert alert-${type} mt-3 mb-0`;
}

photosSaveBtn.addEventListener("click", async () => {
  if (photoSaving) return;
  const rows = photoRows.filter((r) => r.checked && r.productId);
  if (!rows.length) {
    showPhotosAlert("Tick at least one photo that has a product.", "danger");
    return;
  }
  const seen = new Set();
  if (rows.some((r) => (seen.has(r.productId) ? true : (seen.add(r.productId), false)))) {
    showPhotosAlert("Two ticked photos are for the same product. Untick one or change its product.", "danger");
    return;
  }

  photoSaving = true;
  photosSaveBtn.disabled = true;
  photosCancelBtn.disabled = true;
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
        row.checked = false;
      } catch (error) {
        console.error("Photo upload failed:", row.file.name, error);
        failed.push(row);
      }
      showPhotosAlert(`Saving photos... ${done.length + failed.length} of ${rows.length}`, "info");
    }
  };
  // Three at a time: quick on good Wi-Fi without choking mobile data.
  await Promise.all([worker(), worker(), worker()]);

  if (done.length) {
    await logAuditEvent({
      action: "Product Photos Uploaded",
      details: `${done.length} photo${done.length === 1 ? "" : "s"}: ${done.map((r) => (getProductById(r.productId) || {}).name || r.productId).join("; ")}`.slice(0, 1500),
    });
  }
  photoSaving = false;
  photosSaveBtn.disabled = false;
  photosCancelBtn.disabled = false;
  // Saved rows leave the list; failed ones stay ticked to try again.
  photoRows = photoRows.filter((r) => !done.includes(r));
  renderPhotoRows();
  catalogLoadPromise = null;
  if (typeof loadProducts === "function") loadProducts();

  if (failed.length) {
    showPhotosAlert(`${done.length} saved. ${failed.length} didn't upload (check the connection) - they're still listed; press Save Photos again.`, "danger");
  } else {
    showPhotosAlert(`${done.length} photo${done.length === 1 ? "" : "s"} saved.${photoRows.length ? " The rows left have no product chosen." : ""}`, "success");
  }
});
