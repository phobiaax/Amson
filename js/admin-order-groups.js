/**
 * Online Orders / Prescription Orders top-level group switcher.
 */

const orderGroupOnlineBtn = document.getElementById("orderGroupOnlineBtn");
const orderGroupPrescriptionBtn = document.getElementById("orderGroupPrescriptionBtn");
const onlineOrdersGroup = document.getElementById("onlineOrdersGroup");
const prescriptionOrdersGroup = document.getElementById("prescriptionOrdersGroup");

function setActiveOrderGroup(group) {
  const isOnline = group !== "prescription";
  orderGroupOnlineBtn.classList.toggle("active", isOnline);
  orderGroupPrescriptionBtn.classList.toggle("active", !isOnline);
  onlineOrdersGroup.classList.toggle("d-none", !isOnline);
  prescriptionOrdersGroup.classList.toggle("d-none", isOnline);
}

orderGroupOnlineBtn.addEventListener("click", () => setActiveOrderGroup("online"));
orderGroupPrescriptionBtn.addEventListener("click", () => setActiveOrderGroup("prescription"));

setActiveOrderGroup(new URLSearchParams(window.location.search).get("group"));
