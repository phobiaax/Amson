/**
 * Prescription pre-order page.
 */

const MAX_RX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const rxSignedOutNotice = document.getElementById("rxSignedOutNotice");
const rxEmptyNotice = document.getElementById("rxEmptyNotice");
const rxPreorderContent = document.getElementById("rxPreorderContent");
const rxItemsContainer = document.getElementById("rxItemsContainer");
const rxTotalText = document.getElementById("rxTotalText");
const rxErrorText = document.getElementById("rxErrorText");
const submitRxOrderBtn = document.getElementById("submitRxOrderBtn");

const rxUploadDropzone = document.getElementById("rxUploadDropzone");
const rxUploadEmptyState = document.getElementById("rxUploadEmptyState");
const rxUploadPreviewState = document.getElementById("rxUploadPreviewState");
const rxUploadPreviewImage = document.getElementById("rxUploadPreviewImage");
const rxUploadPreviewFilename = document.getElementById("rxUploadPreviewFilename");
const rxPrescriptionInput = document.getElementById("rxPrescriptionInput");

const rxPaymentDropzone = document.getElementById("rxPaymentDropzone");
const rxPaymentEmptyState = document.getElementById("rxPaymentEmptyState");
const rxPaymentPreviewState = document.getElementById("rxPaymentPreviewState");
const rxPaymentPreviewImage = document.getElementById("rxPaymentPreviewImage");
const rxPaymentPreviewFilename = document.getElementById("rxPaymentPreviewFilename");
const rxPaymentInput = document.getElementById("rxPaymentInput");

const rxOrderConfirmation = document.getElementById("rxOrderConfirmation");

let signedInUid = null;

function renderRxItems() {
  const cart = getRxCart();

  if (cart.length === 0) {
    rxEmptyNotice.classList.remove("d-none");
    rxPreorderContent.classList.add("d-none");
    return;
  }

  rxEmptyNotice.classList.add("d-none");
  rxPreorderContent.classList.remove("d-none");

  rxItemsContainer.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return "";
      return `
        <div class="cart-item-row" data-id="${product.id}">
          <div class="cart-item-image"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-2">${product.name}</h3>
            <div class="d-flex align-items-center gap-3">
              <div class="qty-stepper">
                <button type="button" class="rx-qty-minus" aria-label="Decrease quantity">&minus;</button>
                <input type="text" class="rx-qty-input" value="${item.qty}" inputmode="numeric" readonly>
                <button type="button" class="rx-qty-plus" aria-label="Increase quantity">+</button>
              </div>
              <a href="#" class="remove-item-link rx-remove-link"><i class="bi bi-trash"></i> Remove</a>
            </div>
          </div>
          <div class="product-price mb-0">${formatPeso(product.price * item.qty)}</div>
        </div>
      `;
    })
    .join("");

  rxTotalText.textContent = formatPeso(rxCartTotal(cart));

  rxItemsContainer.querySelectorAll(".cart-item-row").forEach((row) => {
    const productId = row.dataset.id;

    row.querySelector(".rx-qty-plus").addEventListener("click", () => {
      const item = getRxCart().find((i) => i.id === productId);
      if (!item) return;
      updateRxCartItemQty(productId, item.qty + 1);
      renderRxItems();
      updateSubmitButtonState();
    });

    row.querySelector(".rx-qty-minus").addEventListener("click", () => {
      const item = getRxCart().find((i) => i.id === productId);
      if (!item || item.qty <= 1) return;
      updateRxCartItemQty(productId, item.qty - 1);
      renderRxItems();
      updateSubmitButtonState();
    });

    row.querySelector(".rx-remove-link").addEventListener("click", (e) => {
      e.preventDefault();
      removeFromRxCart(productId);
      renderRxItems();
      updateSubmitButtonState();
    });
  });
}

function updateSubmitButtonState() {
  const hasItems = getRxCart().length > 0;
  const hasPrescription = !!rxPrescriptionInput.files[0];
  const hasPaymentProof = !!rxPaymentInput.files[0];
  submitRxOrderBtn.disabled = !(hasItems && hasPrescription && hasPaymentProof);
}

function wireUploadDropzone(dropzone, input, emptyState, previewState, previewImage, previewFilename) {
  dropzone.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;

    rxErrorText.classList.add("d-none");

    if (file.size > MAX_RX_FILE_SIZE_BYTES) {
      rxErrorText.textContent = "That file is too large. Please upload an image under 10MB.";
      rxErrorText.classList.remove("d-none");
      input.value = "";
      updateSubmitButtonState();
      return;
    }

    previewImage.src = URL.createObjectURL(file);
    previewFilename.textContent = file.name;
    emptyState.classList.add("d-none");
    previewState.classList.remove("d-none");
    updateSubmitButtonState();
  });
}

wireUploadDropzone(rxUploadDropzone, rxPrescriptionInput, rxUploadEmptyState, rxUploadPreviewState, rxUploadPreviewImage, rxUploadPreviewFilename);
wireUploadDropzone(rxPaymentDropzone, rxPaymentInput, rxPaymentEmptyState, rxPaymentPreviewState, rxPaymentPreviewImage, rxPaymentPreviewFilename);

async function generatePrescriptionOrderNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`prescriptionOrders-${year}`);
  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `RX-${year}-${String(nextCount).padStart(4, "0")}`;
}

submitRxOrderBtn.addEventListener("click", async () => {
  const cart = getRxCart();
  const prescriptionFile = rxPrescriptionInput.files[0];
  const paymentFile = rxPaymentInput.files[0];
  if (cart.length === 0 || !prescriptionFile || !paymentFile || !signedInUid) return;

  rxErrorText.classList.add("d-none");
  submitRxOrderBtn.disabled = true;
  submitRxOrderBtn.textContent = "Submitting...";

  try {
    const prescriptionImageUrl = await uploadToCloudinary(prescriptionFile);
    const proofOfPaymentUrl = await uploadToCloudinary(paymentFile);
    const orderNumber = await generatePrescriptionOrderNumber();

    const userDoc = await db.collection("users").doc(signedInUid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const contact = {
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      email: userData.email || "",
      contactNumber: userData.contactNumber || "",
    };

    const items = cart.map((item) => {
      const product = getProductById(item.id);
      return {
        id: item.id,
        name: product ? product.name : "Unknown product",
        price: product ? product.price : 0,
        qty: item.qty,
      };
    });

    await db.collection("prescriptionOrders").add({
      orderNumber,
      customerId: signedInUid,
      contact,
      items,
      total: rxCartTotal(cart),
      prescriptionImageUrl,
      proofOfPaymentUrl,
      status: "pending_verification",
      statusTimestamps: {
        pending_verification: firebase.firestore.FieldValue.serverTimestamp(),
        ready_for_pickup: null,
        rejected: null,
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    clearRxCart();
    document.getElementById("confirmedRxOrderNumber").textContent = `Order Number: ${orderNumber}`;
    rxPreorderContent.classList.add("d-none");
    rxOrderConfirmation.classList.remove("d-none");
  } catch (error) {
    rxErrorText.textContent = error.message || "Something went wrong submitting your pre-order. Please try again.";
    rxErrorText.classList.remove("d-none");
    submitRxOrderBtn.disabled = false;
    submitRxOrderBtn.textContent = "Submit Pre-Order";
  }
});

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    rxSignedOutNotice.classList.remove("d-none");
    rxEmptyNotice.classList.add("d-none");
    rxPreorderContent.classList.add("d-none");
    return;
  }

  rxSignedOutNotice.classList.add("d-none");
  signedInUid = user.uid;
  await loadCatalogCache();
  renderRxItems();
  updateSubmitButtonState();
});
