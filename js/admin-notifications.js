/**
 * Notifications admin page.
 */

const notificationsList = document.getElementById("notificationsList");
const notificationsEmpty = document.getElementById("notificationsEmpty");

const SEVERITY_CLASS = {
  danger: "text-bg-danger",
  warning: "text-bg-warning",
  info: "text-bg-secondary",
};

document.addEventListener("admin:ready", loadNotifications);

async function loadNotifications() {
  try {
    await loadCatalogCache();
    const batchSnapshot = await db.collection("stockBatches").get();
    const orderSnapshot = await db.collection("orders").get();
    const poSnapshot = await db.collection("purchaseOrders").get();

    const batches = batchSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const orders = orderSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const purchaseOrders = poSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const notifications = [];

    batches
      .filter((b) => b.status === "active")
      .forEach((b) => {
        const status = getBatchStatus(b);
        const product = getProductById(b.productId);
        const productName = product ? product.name : "Unknown product";
        if (status === "out_of_stock") {
          notifications.push({
            severity: "danger",
            icon: "bi-box-seam",
            message: `${productName} (Batch ${b.batchNo}) is out of stock.`,
            link: "inventory.html",
          });
        } else if (status === "low_stock") {
          notifications.push({
            severity: "warning",
            icon: "bi-box-seam",
            message: `${productName} (Batch ${b.batchNo}) is low on stock - ${b.quantity} left.`,
            link: "inventory.html",
          });
        } else if (status === "near_expiry") {
          notifications.push({
            severity: "warning",
            icon: "bi-hourglass-split",
            message: `${productName} (Batch ${b.batchNo}) is near expiry - ${b.expirationDate}.`,
            link: "inventory.html",
          });
        }
      });

    orders
      .filter((o) => o.status === "placed")
      .forEach((o) => {
        notifications.push({
          severity: "info",
          icon: "bi-credit-card",
          message: `Order ${o.orderNumber} is awaiting payment verification.`,
          link: "online-orders.html",
        });
      });

    purchaseOrders
      .filter((po) => po.status === "discrepancy")
      .forEach((po) => {
        notifications.push({
          severity: "danger",
          icon: "bi-exclamation-triangle",
          message: `Purchase Order ${po.poNumber} has a delivery discrepancy pending acknowledgement.`,
          link: "inventory.html",
        });
      });

    const severityOrder = { danger: 0, warning: 1, info: 2 };
    notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    renderNotifications(notifications);
  } catch (error) {
    console.error("Failed to load notifications:", error);
  }
}

function renderNotifications(notifications) {
  if (notifications.length === 0) {
    notificationsList.innerHTML = "";
    notificationsEmpty.classList.remove("d-none");
    return;
  }

  notificationsEmpty.classList.add("d-none");
  notificationsList.innerHTML = notifications
    .map(
      (n) => `
        <a href="${n.link}" class="d-flex justify-content-between align-items-center gap-3 p-3" style="text-decoration:none; color:inherit; border:1px solid var(--amson-border); border-radius:10px;">
          <div class="d-flex align-items-center gap-3">
            <i class="bi ${n.icon}" style="font-size:1.2rem;"></i>
            <span>${n.message}</span>
          </div>
          <span class="badge rounded-pill ${SEVERITY_CLASS[n.severity]}">${n.severity === "danger" ? "Urgent" : n.severity === "warning" ? "Warning" : "Info"}</span>
        </a>
      `
    )
    .join("");
}
