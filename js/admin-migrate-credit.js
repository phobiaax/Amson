/**
 * One-time migration: backfill users/{uid}.creditBalance from the
 * unappliedCredit / paymentOverage.excessAmount already recorded on
 * existing order documents. Safe to re-run - it recomputes the full sum
 * per customer rather than incrementing.
 */

const runMigrationBtn = document.getElementById("runMigrationBtn");
const migrationStatus = document.getElementById("migrationStatus");
const migrationTable = document.getElementById("migrationTable");
const migrationTableBody = document.getElementById("migrationTableBody");

runMigrationBtn.addEventListener("click", async () => {
  runMigrationBtn.disabled = true;
  migrationStatus.textContent = "Scanning orders...";

  try {
    const snapshot = await db.collection("orders").get();
    const balances = {};

    snapshot.docs.forEach((doc) => {
      const order = doc.data();
      if (!order.customerId) return;
      const credit = orderCreditAmount(order);
      if (credit > 0) {
        balances[order.customerId] = (balances[order.customerId] || 0) + credit;
      }
    });

    const uids = Object.keys(balances);
    migrationStatus.textContent = `Writing balances for ${uids.length} customer(s)...`;

    for (const uid of uids) {
      await db.collection("users").doc(uid).set({ creditBalance: balances[uid] }, { merge: true });
    }

    migrationStatus.textContent = `Done. Updated ${uids.length} customer(s).`;
    migrationTableBody.innerHTML = uids
      .map((uid) => `<tr><td>${uid}</td><td>${formatPeso(balances[uid])}</td></tr>`)
      .join("");
    migrationTable.classList.toggle("d-none", uids.length === 0);
  } catch (error) {
    migrationStatus.textContent = `Failed: ${error.message}`;
  } finally {
    runMigrationBtn.disabled = false;
  }
});
