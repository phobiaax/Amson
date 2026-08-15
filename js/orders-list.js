/**
 * My Orders list page.
 */

const ordersSignedOutNotice = document.getElementById("ordersSignedOutNotice");
const ordersEmptyNotice = document.getElementById("ordersEmptyNotice");
const ordersLoading = document.getElementById("ordersLoading");
const ordersList = document.getElementById("ordersList");

function statusIconFor(status) {
  return status === "received" ? "bi-check-circle-fill" : "bi-box-seam";
}

function renderOrderCard(id, order) {
  const itemsHtml = order.items
    .map(
      (item) => `
        <div class="cart-item-row">
          <div class="cart-item-image"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-1">${item.name}</h3>
            <p class="text-muted mb-0" style="font-size:0.85rem;">Qty: ${item.qty}</p>
          </div>
          <div class="product-price mb-0">${formatPeso(item.price * item.qty)}</div>
        </div>
      `
    )
    .join("");

  return `
    <div class="order-card">
      <div class="order-card-header">
        <div class="order-meta-group">
          <div>
            <p class="order-meta-label mb-0">Order Number</p>
            <p class="order-meta-value mb-0">${order.orderNumber}</p>
          </div>
          <div>
            <p class="order-meta-label mb-0">Date</p>
            <p class="order-meta-value mb-0">${formatOrderDate(order.createdAt)}</p>
          </div>
          <div>
            <p class="order-meta-label mb-0">Total</p>
            <p class="order-meta-value product-price mb-0" style="font-size:1rem;">${formatPeso(order.total)}</p>
          </div>
        </div>
        <span class="order-status-badge status-${order.status}">
          <i class="bi ${statusIconFor(order.status)}"></i>
          ${ORDER_STATUS_BADGE_LABELS[order.status] || order.status}
        </span>
      </div>
      <div class="order-card-body">
        ${itemsHtml}
      </div>
      <div class="order-card-footer">
        <button type="button" class="btn btn-outline-dark-amson download-receipt-btn" data-id="${id}">
          <i class="bi bi-file-earmark-text me-1"></i>Download Receipt
        </button>
        <a href="order-details.html?id=${id}" class="btn btn-amson">View Details ></a>
      </div>
    </div>
  `;
}

async function loadOrders(uid) {
  ordersLoading.classList.remove("d-none");
  try {
    const snapshot = await db.collection("orders").where("customerId", "==", uid).get();

    if (snapshot.empty) {
      ordersEmptyNotice.classList.remove("d-none");
      return;
    }

    const docs = snapshot.docs.slice().sort((a, b) => {
      const aTime = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
      const bTime = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
      return bTime - aTime;
    });

    const ordersById = {};
    ordersList.innerHTML = docs
      .map((doc) => {
        ordersById[doc.id] = doc.data();
        return renderOrderCard(doc.id, doc.data());
      })
      .join("");

    document.querySelectorAll(".download-receipt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = ordersById[btn.dataset.id];
        if (order) downloadOrderReceipt(order);
      });
    });
  } catch (error) {
    console.error("Failed to load orders:", error);
    ordersList.innerHTML = `<p class="text-danger">Could not load your orders. Please try again later.</p>`;
  } finally {
    ordersLoading.classList.add("d-none");
  }
}

auth.onAuthStateChanged((user) => {
  if (!user) {
    ordersSignedOutNotice.classList.remove("d-none");
    return;
  }
  loadOrders(user.uid);
});
