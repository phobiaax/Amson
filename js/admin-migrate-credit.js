/**
 * One-time migration: backfill users/{uid}.creditBalance from the
 * unappliedCredit / paymentOverage.excessAmount already recorded on
 * existing order documents. Runs once: it overwrites each balance with
 * the full sum, so a second run would undo credit customers already spent.
 */

const runMigrationBtn = document.getElementById("runMigrationBtn");
const migrationStatus = document.getElementById("migrationStatus");
const migrationTable = document.getElementById("migrationTable");
const migrationTableBody = document.getElementById("migrationTableBody");

// Re-running it after customers have spent credit would grant that credit
// again, so it locks itself after the first successful run.
const migrationMarkerRef = db.collection("counters").doc("creditMigration");

document.addEventListener("admin:ready", async () => {
  try {
    const marker = await migrationMarkerRef.get();
    if (marker.exists && marker.data().ranAt) {
      runMigrationBtn.disabled = true;
      migrationStatus.textContent = `Already run on ${formatDateMDY(marker.data().ranAt, true)} by ${marker.data().ranBy || "staff"}. It can't be run again.`;
    }
  } catch (error) {
    console.error("Failed to check the migration marker:", error);
  }
});

runMigrationBtn.addEventListener("click", async () => {
  const marker = await migrationMarkerRef.get();
  if (marker.exists && marker.data().ranAt) {
    migrationStatus.textContent = "This migration was already run and can't be run again.";
    runMigrationBtn.disabled = true;
    return;
  }
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

    await migrationMarkerRef.set({
      ranAt: firebase.firestore.FieldValue.serverTimestamp(),
      ranBy: auth.currentUser ? auth.currentUser.email : null,
      customersUpdated: uids.length,
    });
    migrationStatus.textContent = `Done. Updated ${uids.length} customer(s).`;
    migrationTableBody.innerHTML = uids
      .map((uid) => `<tr><td>${uid}</td><td>${formatPeso(balances[uid])}</td></tr>`)
      .join("");
    migrationTable.classList.toggle("d-none", uids.length === 0);
  } catch (error) {
    migrationStatus.textContent = `Failed: ${error.message}`;
    runMigrationBtn.disabled = false;
  }
});
