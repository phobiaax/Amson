/**
 * Reports module (REQ058, REQ111-115, REQNF020): the branch's own report
 * formats, built from the client's sample files.
 *
 *   Daily Sales            - sales, retail, wholesale, payment method, items
 *   Customer File          - every sold line per customer with SI#, batch, expiry
 *   Monthly Inventory      - one sheet per category, POS stock vs physical count
 *   Supplier Purchases     - stock received per supplier
 *   Pull-Out               - write-offs (expired, damaged, unsellable)
 *   PO Discrepancy         - purchase orders received short or over
 *
 * Each builder returns { title, subtitle, filename, sheets: [{ name,
 * sections: [{ heading, columns, rows, totals }] }] }; the same model is
 * shown on screen and exported to PDF and Excel, so the three always match.
 * Columns: { label, align?: "right", width? }. Cells are strings or numbers.
 */

const REPORT_TYPES = {
  daily_sales: { label: "Daily Sales Report", range: "dates" },
  customer_file: { label: "Customer File (sales per customer)", range: "dates" },
  monthly_inventory: { label: "Monthly Inventory (per category)", range: "month" },
  supplier_purchases: { label: "Supplier Purchases", range: "month" },
  pull_out: { label: "Pull-Out Report (write-offs)", range: "dates" },
  returns_exchanges: { label: "Return / Exchange Report (wholesale)", range: "dates" },
  po_discrepancy: { label: "Purchase Order Discrepancy Report", range: "dates" },
};

const REPORT_PAYMENT_LABELS = {
  cash: "Cash",
  gcash: "G-Cash / QR Ph",
  bank_transfer: "Bank Transfer",
  terminal: "Terminal Payment",
  credit: "Credit",
  free_of_cost: "Free of Cost",
  card: "Card",
  ewallet: "E-Wallet",
  exchange: "Exchange (price difference)",
};

function reportNumber(n, decimals = 2) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function reportDateKey(date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
}

function tsToDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function productName(id, fallback) {
  const p = getProductById(id);
  return (p && p.name) || fallback || id || "";
}

/* ---------- Data loading ---------- */

// Every sale in [start, end), from the three channels, as one shape:
// { channel, date, invoiceNo, customer, paymentMethod, total, lines: [{ productId, name, qty, price, amount, batches }] }
async function loadSalesInRange(start, end) {
  const from = firebase.firestore.Timestamp.fromDate(start);
  const to = firebase.firestore.Timestamp.fromDate(end);
  const [posSnap, orderSnap, wholesaleSnap, exchangeSnap] = await Promise.all([
    db.collection("posSales").where("createdAt", ">=", from).where("createdAt", "<", to).get(),
    db.collection("orders").where("statusTimestamps.payment_confirmed", ">=", from).where("statusTimestamps.payment_confirmed", "<", to).get(),
    db.collection("wholesaleOrders").where("createdAt", ">=", from).where("createdAt", "<", to).get(),
    db.collection("wholesaleExchanges").where("createdAt", ">=", from).where("createdAt", "<", to).get(),
  ]);

  const sales = [];
  posSnap.docs.forEach((doc) => {
    const s = doc.data();
    if (s.voided) return;
    sales.push({
      channel: "retail",
      date: tsToDate(s.createdAt),
      invoiceNo: s.invoiceNo || "",
      customer: s.customerName || "Walk-in",
      paymentMethod: s.paymentMethod || "cash",
      total: s.total || 0,
      lines: (s.items || [])
        .filter((i) => i.qty > 0)
        .map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, price: i.price || 0, amount: (i.price || 0) * i.qty, batches: i.batches, batchNo: i.batchNo, expirationDate: i.expirationDate })),
    });
  });
  orderSnap.docs.forEach((doc) => {
    const o = doc.data();
    if (!o.invoiceNo || o.status === "closed_unresolved") return;
    sales.push({
      channel: "retail",
      date: tsToDate(o.statusTimestamps && o.statusTimestamps.payment_confirmed),
      invoiceNo: o.invoiceNo,
      customer: o.contact ? `${o.contact.firstName || ""} ${o.contact.lastName || ""}`.trim() : "Online customer",
      paymentMethod: "gcash",
      // What the customer paid for the goods: store credit applied is
      // still part of the sale's value.
      total: (o.total || 0) + (o.creditApplied || 0),
      lines: (o.items || []).map((i) => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price || 0, amount: (i.price || 0) * i.qty, batches: i.batches, batchNo: i.batchNo, expirationDate: i.expirationDate })),
    });
  });
  wholesaleSnap.docs.forEach((doc) => {
    const w = doc.data();
    sales.push({
      channel: "wholesale",
      date: tsToDate(w.createdAt),
      invoiceNo: w.invoiceNo || "",
      customer: w.buyerName || "Wholesale buyer",
      paymentMethod: w.freeOfCost ? "free_of_cost" : w.paymentMethod || "cash",
      total: w.total || 0,
      lines: (w.items || []).map((i) => ({ productId: i.productId, name: i.productName, qty: i.qty, price: i.unitPrice || 0, amount: i.subtotal || 0, batches: i.batches, batchNo: i.batchNo, expirationDate: i.expirationDate })),
    });
  });
  // An exchange (wholesale, or walk-in: kind "walkin") counts on its own day: the returned units come off
  // (negative), the replacement goes out, and the total is the difference
  // the buyer paid. The original sale stays as it was on its day.
  exchangeSnap.docs.forEach((doc) => {
    const ex = doc.data();
    const ret = ex.returned || {};
    const rep = ex.replacement || {};
    const walkin = ex.kind === "walkin";
    sales.push({
      channel: walkin ? "retail" : "wholesale",
      isExchange: true,
      date: tsToDate(ex.createdAt),
      invoiceNo: ex.exchangeNo || "",
      customer: ex.buyerName || (walkin ? "Walk-in" : "Wholesale buyer"),
      paymentMethod: "exchange",
      total: ex.priceDifference || 0,
      lines: [
        { productId: ret.productId, name: ret.productName, qty: -(ret.qty || 0), price: ret.unitPrice || 0, amount: -(ret.value || 0), batches: (ret.batches || []).map((b) => ({ ...b, qty: -(b.qty || 0) })) },
        { productId: rep.productId, name: rep.productName, qty: rep.qty || 0, price: rep.unitPrice || 0, amount: rep.value || 0, batches: rep.batches || [] },
      ],
    });
  });
  return sales.filter((s) => s.date).sort((a, b) => a.date - b.date);
}

/* ---------- Builders ---------- */

function rangeSubtitle(start, end) {
  const last = new Date(end.getTime() - 1000);
  return `${formatDateMDY(start)} 12:00:01 AM - ${formatDateMDY(last)} 11:59:59 PM`;
}

async function buildDailySalesReport(start, end) {
  const [sales, batchSnap, supplierSnap] = await Promise.all([
    loadSalesInRange(start, end),
    db.collection("stockBatches").get(),
    db.collection("suppliers").get(),
  ]);
  const batchesById = new Map(batchSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));
  const supplierNames = new Map(supplierSnap.docs.map((d) => [d.id, d.data().name || ""]));
  // Older sales only kept the batch number, not the batch's ID.
  const findBatch = (productId, b) =>
    (b.batchId && batchesById.get(b.batchId)) ||
    Array.from(batchesById.values()).find((x) => x.productId === productId && b.batchNo && x.batchNo === b.batchNo) ||
    null;
  const byBatch = new Map();
  const byDay = new Map();
  const ensureDay = (key) => {
    if (!byDay.has(key)) byDay.set(key, { orders: 0, total: 0, retailItems: 0, retailTotal: 0, wholesaleItems: 0, wholesaleTotal: 0, methods: new Map() });
    return byDay.get(key);
  };
  const items = new Map();

  sales.forEach((s) => {
    const day = ensureDay(reportDateKey(s.date));
    const qty = s.lines.reduce((n, l) => n + l.qty, 0);
    if (!s.isExchange) day.orders += 1;
    day.total += s.total;
    if (s.channel === "wholesale") {
      day.wholesaleItems += qty;
      day.wholesaleTotal += s.total;
    } else {
      day.retailItems += qty;
      day.retailTotal += s.total;
    }
    const m = day.methods.get(s.paymentMethod) || { orders: 0, amount: 0 };
    m.orders += s.isExchange ? 0 : 1;
    m.amount += s.total;
    day.methods.set(s.paymentMethod, m);
    s.lines.forEach((l) => {
      const key = l.productId || l.name;
      const it = items.get(key) || { name: productName(l.productId, l.name), qty: 0, amount: 0 };
      it.qty += l.qty;
      it.amount += l.amount;
      items.set(key, it);

      // Batch, expiry, date received and supplier per item sold.
      const parts = l.batches && l.batches.length ? l.batches.filter((b) => b.qty !== 0) : [{ batchNo: l.batchNo, expirationDate: l.expirationDate, qty: l.qty }];
      parts.forEach((b) => {
        const batch = findBatch(l.productId, b);
        const bKey = `${key}|${batch ? batch.id : b.batchNo || ""}`;
        const row = byBatch.get(bKey) || {
          name: productName(l.productId, l.name),
          batchNo: b.batchNo || (batch && batch.batchNo) || "",
          expirationDate: b.expirationDate || (batch && batch.expirationDate) || "",
          dateReceived: (batch && batch.dateReceived) || "",
          supplier: (batch && batch.supplierId && supplierNames.get(batch.supplierId)) || "",
          qty: 0,
          amount: 0,
        };
        row.qty += b.qty;
        row.amount += l.price * b.qty;
        byBatch.set(bKey, row);
      });
    });
  });

  const days = Array.from(byDay.entries());
  const sum = (f) => days.reduce((n, [, d]) => n + f(d), 0);
  const money = (n) => reportNumber(n);
  const qty = (n) => reportNumber(n, 0);

  const salesSection = {
    heading: "Sales",
    columns: [
      { label: "Date", width: 1.2 }, { label: "No. of Orders", align: "right" }, { label: "Total", align: "right", width: 1.2 },
      { label: "Discount / Deduction", align: "right" }, { label: "Grand Total", align: "right", width: 1.2 }, { label: "Less VAT", align: "right" },
      { label: "VATable Sales", align: "right" }, { label: "VAT 12%", align: "right" }, { label: "VAT Exempt Sales", align: "right", width: 1.2 },
    ],
    rows: days.map(([date, d]) => [date, qty(d.orders), money(d.total), money(0), money(d.total), money(0), money(0), money(0), money(d.total)]),
    totals: [
      ["SUBTOTAL", qty(sum((d) => d.orders)), money(sum((d) => d.total)), money(0), money(sum((d) => d.total)), money(0), money(0), money(0), money(sum((d) => d.total))],
      ["Pay-In", "", "", "", "", "", "", "", money(0)],
      ["Pay-Out", "", "", "", "", "", "", "", money(0)],
      ["TOTAL", "", "", "", "", "", "", "", money(sum((d) => d.total))],
    ],
  };
  const channelSection = (heading, itemsOf, totalOf) => ({
    heading,
    columns: [{ label: "Date", width: 2 }, { label: "No. of Items", align: "right", width: 2 }, { label: "Total Amount", align: "right", width: 2 }],
    rows: days.map(([date, d]) => [date, qty(itemsOf(d)), money(totalOf(d))]),
    totals: [["TOTAL", qty(sum(itemsOf)), money(sum(totalOf))]],
  });
  const methodRows = [];
  days.forEach(([date, d]) => {
    Array.from(d.methods.entries())
      .sort((a, b) => (REPORT_PAYMENT_LABELS[a[0]] || a[0]).localeCompare(REPORT_PAYMENT_LABELS[b[0]] || b[0]))
      .forEach(([method, m]) => methodRows.push([date, (REPORT_PAYMENT_LABELS[method] || method).toUpperCase(), qty(m.orders), money(m.amount)]));
  });

  return {
    title: "AMSON PHARMACEUTICALS",
    subtitle: rangeSubtitle(start, end),
    filename: `daily-sales-${localISODate(start)}`,
    notes: [
      "All sales are shown as VAT-exempt, as in the branch's current report. Discounts and pay-in/pay-out are not recorded in the system.",
      "Retail = walk-in (POS) and online orders; online orders count on the day their payment was confirmed. Voided sales are excluded.",
      "Wholesale exchanges count on the day of the exchange: the returned items come off, the replacement is added, and the total is the price difference paid.",
    ],
    sheets: [
      {
        name: "Daily Sales",
        sections: [
          salesSection,
          channelSection("Retail Sales", (d) => d.retailItems, (d) => d.retailTotal),
          channelSection("Wholesale Sales", (d) => d.wholesaleItems, (d) => d.wholesaleTotal),
          {
            heading: "Payment Method",
            columns: [{ label: "Date", width: 1.5 }, { label: "Payment Method", width: 2 }, { label: "No. of Orders", align: "right", width: 1.5 }, { label: "Total Amount", align: "right", width: 1.5 }],
            rows: methodRows,
            totals: [["", "TOTAL", qty(sum((d) => d.orders)), money(sum((d) => d.total))]],
          },
          {
            heading: "Item Sold",
            columns: [{ label: "Item", width: 4 }, { label: "No. of Items", align: "right" }, { label: "Total Amount", align: "right" }, { label: "Discount/Deductions", align: "right" }],
            rows: Array.from(items.values())
              .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
              .map((it) => [it.name, qty(it.qty), money(it.amount), money(0)]),
            totals: [["TOTAL", qty(Array.from(items.values()).reduce((n, i) => n + i.qty, 0)), money(Array.from(items.values()).reduce((n, i) => n + i.amount, 0)), money(0)]],
          },
          {
            heading: "Item Sold by Batch",
            columns: [
              { label: "Item", width: 3 }, { label: "Batch No", width: 1.2 }, { label: "Exp" }, { label: "Date Received" },
              { label: "Supplier", width: 1.8 }, { label: "No. of Items", align: "right" }, { label: "Total Amount", align: "right" },
            ],
            rows: Array.from(byBatch.values())
              .sort((a, b) => a.name.localeCompare(b.name) || String(a.expirationDate).localeCompare(String(b.expirationDate)))
              .map((r) => [r.name, r.batchNo, r.expirationDate ? formatDateMDY(r.expirationDate) : "", r.dateReceived ? formatDateMDY(r.dateReceived) : "", r.supplier, qty(r.qty), money(r.amount)]),
            totals: [["TOTAL", "", "", "", "", qty(Array.from(byBatch.values()).reduce((n, r) => n + r.qty, 0)), money(Array.from(byBatch.values()).reduce((n, r) => n + r.amount, 0))]],
          },
        ],
      },
    ],
  };
}

async function buildCustomerFileReport(start, end) {
  const sales = await loadSalesInRange(start, end);
  const byCustomer = new Map();
  sales.forEach((s) => {
    const key = s.customer.trim().toUpperCase() || "WALK-IN";
    if (!byCustomer.has(key)) byCustomer.set(key, []);
    byCustomer.get(key).push(s);
  });

  const columns = [
    { label: "Customer Name", width: 1.6 }, { label: "Date", width: 1.8 }, { label: "SI#" }, { label: "Batch No", width: 1.2 },
    { label: "Exp" }, { label: "Qty", align: "right", width: 0.6 }, { label: "Item", width: 3 }, { label: "Sales Price", align: "right" },
    { label: "Total Amount", align: "right" }, { label: "Terms of Payment", width: 1.1 },
  ];
  const rows = [];
  Array.from(byCustomer.keys())
    .sort()
    .forEach((customer) => {
      let custQty = 0;
      let custTotal = 0;
      byCustomer.get(customer).forEach((s) => {
        s.lines.forEach((l) => {
          // One row per batch the line came from, like the branch's file.
          const parts = l.batches && l.batches.length ? l.batches.filter((b) => b.qty !== 0) : [{ batchNo: l.batchNo, expirationDate: l.expirationDate, qty: l.qty }];
          parts.forEach((b) => {
            rows.push([
              s.customer,
              formatDateMDY(s.date, true),
              s.invoiceNo,
              b.batchNo || "",
              b.expirationDate ? formatDateMDY(b.expirationDate) : "",
              reportNumber(b.qty, 0),
              productName(l.productId, l.name),
              reportNumber(l.price),
              reportNumber(l.price * b.qty),
              REPORT_PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
            ]);
            custQty += b.qty;
            custTotal += l.price * b.qty;
          });
        });
      });
      rows.push({ total: true, cells: ["Total", "", "", "", "", reportNumber(custQty, 0), "", "", reportNumber(custTotal), ""] });
      rows.push({ blank: true, cells: columns.map(() => "") });
    });

  return {
    title: "AMSON PHARMACEUTICALS - Customer Report",
    subtitle: rangeSubtitle(start, end),
    filename: `customer-file-${localISODate(start)}`,
    notes: ["Every line sold, per customer, with its Sales Invoice number, batch and expiry. Walk-in sales without a name are grouped as Walk-in."],
    sheets: [{ name: "Customer Report", sections: [{ heading: "", columns, rows, totals: [] }] }],
  };
}

async function buildMonthlyInventoryReport(year, month) {
  const period = `${year}-${String(month + 1).padStart(2, "0")}`;
  const [batchSnap, reconSnap, supplierSnap] = await Promise.all([
    db.collection("stockBatches").get(),
    db.collection("reconciliations").where("period", "==", period).get(),
    db.collection("suppliers").get(),
  ]);
  const suppliers = {};
  supplierSnap.docs.forEach((d) => (suppliers[d.id] = d.data().name || ""));
  const batchesById = {};
  batchSnap.docs.forEach((d) => (batchesById[d.id] = d.data()));
  // Every supplier a batch came from (a topped-up batch can have several).
  const supplierOf = (b) => {
    if (!b) return "";
    const ids = b.deliveries && b.deliveries.length ? b.deliveries.map((dl) => dl.supplierId) : [b.supplierId];
    return [...new Set(ids.filter(Boolean).map((id) => suppliers[id]).filter(Boolean))].join(", ");
  };
  const recon = reconSnap.docs.map((d) => d.data()).filter((r) => r.status === "finalized").sort((a, b) => (tsToDate(b.finalizedAt) || 0) - (tsToDate(a.finalizedAt) || 0))[0];

  // Lines: from the finalized count for that month when there is one (its
  // system qty is the POS stock at count time), else today's batches.
  let lines;
  if (recon) {
    lines = (recon.items || []).map((i) => ({ productId: i.productId, batchNo: i.batchNo, expirationDate: i.expirationDate, posQty: i.systemQty, physical: i.countedQty, supplier: supplierOf(batchesById[i.batchId]) }));
  } else {
    lines = batchSnap.docs
      .map((d) => d.data())
      .filter((b) => b.status === "active" || b.status === "wholesale_only")
      .map((b) => ({ productId: b.productId, batchNo: b.batchNo, expirationDate: b.expirationDate, posQty: b.quantity || 0, physical: "", supplier: supplierOf(b) }));
  }
  const withLines = new Set(lines.map((l) => l.productId));
  SAMPLE_PRODUCTS.filter((p) => p.status === "active" && !withLines.has(p.id)).forEach((p) =>
    lines.push({ productId: p.id, batchNo: "", expirationDate: "", posQty: 0, physical: recon ? 0 : "" })
  );

  const sheets = [];
  const categories = Object.entries(CATEGORY_LABELS).sort((a, b) => a[1].localeCompare(b[1]));
  const uncategorized = [["", "Uncategorized"]];
  categories.concat(uncategorized).forEach(([catId, catName]) => {
    const catLines = lines
      .filter((l) => {
        const p = getProductById(l.productId);
        return p && (catId ? p.category === catId : !CATEGORY_LABELS[p.category]);
      })
      .sort((a, b) => productName(a.productId).localeCompare(productName(b.productId)) || String(a.expirationDate).localeCompare(String(b.expirationDate)));
    if (!catLines.length) return;
    sheets.push({
      name: catName.toUpperCase().slice(0, 31),
      sections: [
        {
          heading: catName.toUpperCase(),
          columns: [
            { label: catName.toUpperCase(), width: 4 }, { label: "POS Stock", align: "right" }, { label: "Physical", align: "right" },
            { label: "Costing", align: "right" }, { label: "Retail", align: "right" }, { label: "Wholesale", align: "right" },
            { label: "Batch #", width: 1.3 }, { label: "Expiry Date", width: 1.1 }, { label: "Supplier", width: 1.6 },
          ],
          rows: catLines.map((l) => {
            const p = getProductById(l.productId) || {};
            return [
              p.name || "",
              reportNumber(l.posQty, 0),
              l.physical === "" ? "" : reportNumber(l.physical, 0),
              reportNumber(p.costingPrice),
              reportNumber(p.retailPrice),
              reportNumber(p.wholesalePrice),
              l.batchNo || "",
              l.expirationDate ? formatDateMDY(l.expirationDate) : "",
              l.supplier || "",
            ];
          }),
          totals: [],
        },
      ],
    });
  });

  const monthName = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Batches whose expiry date falls in this month, whatever happened to
  // them (written off as Bad Order beforehand, still on hand, or sold out).
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const expired = batchSnap.docs
    .map((d) => d.data())
    .filter((b) => {
      const exp = b.expirationDate ? new Date(`${b.expirationDate}T12:00:00`) : null;
      return exp && exp >= monthStart && exp < monthEnd;
    })
    .sort((a, b) => String(a.expirationDate).localeCompare(String(b.expirationDate)) || productName(a.productId).localeCompare(productName(b.productId)));
  const expiredUnits = (b) => (b.status === "bad_order" ? b.badOrderQty || 0 : b.quantity || 0);
  const expiredStatus = (b) =>
    b.status === "bad_order" ? (b.disposedAt ? "Written off (Bad Order), disposed" : "Written off (Bad Order)") : (b.quantity || 0) > 0 ? "Still in stock" : "Sold out before expiry";
  const expiredProducts = new Set(expired.map((b) => b.productId)).size;
  const expiredTotal = expired.reduce((n, b) => n + expiredUnits(b), 0);
  if (expired.length) {
    sheets.push({
      name: "EXPIRED",
      sections: [
        {
          heading: `EXPIRED IN ${monthName.toUpperCase()}`,
          columns: [
            { label: "Product", width: 3 }, { label: "Category", width: 1.4 }, { label: "Batch #", width: 1.2 }, { label: "Expiry Date", width: 1.1 },
            { label: "Supplier", width: 1.6 }, { label: "Units", align: "right", width: 0.8 }, { label: "Status", width: 2 },
          ],
          rows: expired.map((b) => {
            const p = getProductById(b.productId) || {};
            return [p.name || b.productId, CATEGORY_LABELS[p.category] || "", b.batchNo || "", formatDateMDY(`${b.expirationDate}T12:00:00`), supplierOf(b), reportNumber(expiredUnits(b), 0), expiredStatus(b)];
          }),
          totals: [[`TOTAL: ${expired.length} batch${expired.length === 1 ? "" : "es"}, ${expiredProducts} product${expiredProducts === 1 ? "" : "s"}`, "", "", "", "", reportNumber(expiredTotal, 0), ""]],
        },
      ],
    });
  }

  return {
    title: `${monthName.toUpperCase()} END INVENTORY`,
    subtitle: recon
      ? `From stock count ${recon.rcnNumber || ""} finalized ${formatDateMDY(recon.finalizedAt, true)} by ${recon.finalizedBy || "-"}`
      : `No finalized stock count for ${monthName}: POS stock is as of ${formatDateMDY(new Date(), true)} and the Physical column is blank`,
    filename: `monthly-inventory-${period}`,
    notes: [
      "One sheet per category, one row per batch. Prices are the current product prices.",
      expired.length
        ? `${expired.length} batch${expired.length === 1 ? "" : "es"} of ${expiredProducts} product${expiredProducts === 1 ? "" : "s"} expired in ${monthName} (${reportNumber(expiredTotal, 0)} units) - see the EXPIRED sheet. Units are what was written off as Bad Order, or what is still in stock.`
        : `No batches expired in ${monthName}.`,
    ],
    sheets,
  };
}

async function buildSupplierPurchasesReport(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const [batchSnap, supplierSnap] = await Promise.all([db.collection("stockBatches").get(), db.collection("suppliers").get()]);
  const suppliers = {};
  supplierSnap.docs.forEach((d) => (suppliers[d.id] = d.data().name));

  // A batch topped up by later deliveries lists each one in `deliveries`;
  // each delivery is its own row here.
  // Unit costs are staff-only (batchCosts), added back here.
  const received = (await attachBatchCosts(batchSnap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    .flatMap((b) =>
      b.deliveries && b.deliveries.length
        ? b.deliveries.map((dl) => ({ ...b, ...dl, initialQuantity: dl.qty, quantity: dl.qty }))
        : [b]
    )
    // Opening stock was counted, not bought from a supplier.
    .filter((b) => b.source !== "opening_stock")
    .map((b) => {
      const when = b.dateReceived ? new Date(`${b.dateReceived}T00:00:00`) : tsToDate(b.createdAt);
      return { ...b, when };
    })
    .filter((b) => b.when && b.when >= start && b.when < end);

  const columns = [
    { label: "Supplier Name", width: 1.6 }, { label: "Date Received" }, { label: "Receipt #" }, { label: "Product Name", width: 2.6 },
    { label: "Brand Name", width: 1.1 }, { label: "Batch #" }, { label: "Expiry Date" }, { label: "Qty", align: "right", width: 0.7 },
    { label: "Price", align: "right" }, { label: "Amount", align: "right" },
  ];
  const sheetFor = (name, list) => {
    const bySupplier = new Map();
    list.forEach((b) => {
      const s = suppliers[b.supplierId] || "Unspecified supplier";
      if (!bySupplier.has(s)) bySupplier.set(s, []);
      bySupplier.get(s).push(b);
    });
    const rows = [];
    let grand = 0;
    Array.from(bySupplier.keys())
      .sort()
      .forEach((s) => {
        let subtotal = 0;
        bySupplier
          .get(s)
          .sort((a, b) => a.when - b.when)
          .forEach((b) => {
            const p = getProductById(b.productId) || {};
            const qty = b.initialQuantity != null ? b.initialQuantity : b.quantity || 0;
            const amount = (b.unitCost || 0) * qty;
            subtotal += amount;
            rows.push([s, formatDateMDY(b.when), b.supplierReceiptNo || "", p.name || "", p.brand || "", b.batchNo || "", b.expirationDate ? formatDateMDY(b.expirationDate) : "", reportNumber(qty, 0), b.unitCost != null ? reportNumber(b.unitCost) : "", reportNumber(amount)]);
          });
        rows.push({ total: true, cells: [`TOTAL - ${s}`, "", "", "", "", "", "", "", "", reportNumber(subtotal)] });
        grand += subtotal;
      });
    return { name, sections: [{ heading: name, columns, rows, totals: [["GRAND TOTAL", "", "", "", "", "", "", "", "", reportNumber(grand)]] }] };
  };

  const monthName = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return {
    title: "AMSON PHARMACEUTICALS - Supplier Purchases",
    subtitle: monthName,
    filename: `supplier-purchases-${localISODate(start).slice(0, 7)}`,
    notes: ["Stock received during the month, per supplier. Price is the unit cost entered at receiving; blank when it wasn't entered."],
    // One sheet: the branch sells medicines and medical supplies only (the
    // old report's separate grocery sheet isn't needed).
    sheets: [sheetFor("SUPPLIER DRUGSTORE", received)],
  };
}

async function buildPullOutReport(start, end) {
  // By the write-off date staff picked (which may be earlier than when it
  // was saved), so every write-off is read and filtered here.
  const [woSnap, batchSnap] = await Promise.all([db.collection("writeOffs").get(), db.collection("stockBatches").get()]);
  const batches = {};
  (await attachBatchCosts(batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })))).forEach((b) => (batches[b.id] = b));
  let totalQty = 0;
  let totalCost = 0;
  const rows = woSnap.docs
    .map((d) => d.data())
    .filter((w) => {
      const when = writeOffEffectiveDate(w);
      return when && when >= start && when < end;
    })
    .sort((a, b) => (writeOffEffectiveDate(a) || 0) - (writeOffEffectiveDate(b) || 0))
    .map((w) => {
      const b = batches[w.batchId] || {};
      const p = getProductById(w.productId) || {};
      const unit = b.unitCost != null ? b.unitCost : p.costingPrice || 0;
      totalQty += w.quantity || 0;
      totalCost += unit * (w.quantity || 0);
      return [w.writeOffDate ? formatDateMDY(`${w.writeOffDate}T12:00:00`) : formatDateMDY(w.createdAt, true), p.name || w.productId, w.batchNo || b.batchNo || "", b.expirationDate ? formatDateMDY(b.expirationDate) : "", reportNumber(w.quantity, 0), reportNumber(unit), reportNumber(unit * (w.quantity || 0)), w.reason || ""];
    });
  return {
    title: "AMSON PHARMACEUTICALS - Pull-Out Report",
    subtitle: rangeSubtitle(start, end),
    filename: `pull-out-${localISODate(start)}`,
    notes: ["Stock removed from inventory (expired, damaged or unsellable). Cost is the batch's unit cost, or the product's costing price."],
    sheets: [
      {
        name: "Pull-Out",
        sections: [
          {
            heading: "Pull-Out (Write-Offs)",
            columns: [{ label: "Date", width: 1.3 }, { label: "Product", width: 3 }, { label: "Batch #" }, { label: "Expiry" }, { label: "Qty", align: "right", width: 0.6 }, { label: "Unit Cost", align: "right" }, { label: "Cost Value", align: "right" }, { label: "Reason", width: 2 }],
            rows,
            totals: [["TOTAL", "", "", "", reportNumber(totalQty, 0), "", reportNumber(totalCost), ""]],
          },
        ],
      },
    ],
  };
}

// The branch's "Return to POS" sheet, plus what was given in exchange
// (REQ114).
async function buildReturnsExchangeReport(start, end) {
  const from = firebase.firestore.Timestamp.fromDate(start);
  const to = firebase.firestore.Timestamp.fromDate(end);
  const snap = await db.collection("wholesaleExchanges").where("createdAt", ">=", from).where("createdAt", "<", to).get();
  let totalReturned = 0;
  let totalDiff = 0;
  const rows = [];
  snap.docs
    .map((d) => d.data())
    .sort((a, b) => (tsToDate(a.createdAt) || 0) - (tsToDate(b.createdAt) || 0))
    .forEach((ex) => {
      const r = ex.returned || {};
      const parts = r.batches && r.batches.length ? r.batches : [{ batchNo: "", expirationDate: "", qty: r.qty }];
      parts.forEach((b, i) => {
        rows.push([
          r.productName || "",
          b.batchNo || "",
          b.expirationDate ? formatDateMDY(b.expirationDate) : "",
          ex.buyerName || "",
          ex.invoiceNo ? `SI ${ex.invoiceNo}` : "",
          formatDateMDY(ex.purchasedAt),
          formatDateMDY(ex.createdAt),
          reportNumber(b.qty, 0),
          reportNumber(r.unitPrice),
          reportNumber((b.qty || 0) * (r.unitPrice || 0)),
          i === 0 ? `${(ex.replacement || {}).productName || ""} x${(ex.replacement || {}).qty || 0}` : "",
          i === 0 ? reportNumber(ex.priceDifference) : "",
          i === 0 ? `${ex.exchangeNo || ""}: ${ex.reason || ""}` : "",
        ]);
      });
      totalReturned += r.value || 0;
      totalDiff += ex.priceDifference || 0;
    });
  return {
    title: "AMSON PHARMACEUTICALS - Return / Exchange Report",
    subtitle: rangeSubtitle(start, end),
    filename: `returns-exchanges-${localISODate(start)}`,
    notes: ["Items returned by walk-in customers and wholesale buyers, and what they took in exchange. No refunds are given; the customer pays any price difference."],
    sheets: [
      {
        name: "Return to POS",
        sections: [
          {
            heading: "Return Medicine from Customer",
            columns: [
              { label: "Item", width: 2.4 }, { label: "Batch" }, { label: "Expiry" }, { label: "Customer", width: 1.5 }, { label: "DR# / SI#" },
              { label: "Date Purchase" }, { label: "Date Return" }, { label: "Qty", align: "right", width: 0.6 }, { label: "Amount", align: "right" },
              { label: "Total Amount", align: "right" }, { label: "Replaced With", width: 1.8 }, { label: "Difference Paid", align: "right" }, { label: "Exchange / Reason", width: 2 },
            ],
            rows,
            totals: [["TOTAL", "", "", "", "", "", "", "", "", reportNumber(totalReturned), "", reportNumber(totalDiff), ""]],
          },
        ],
      },
    ],
  };
}

async function buildPoDiscrepancyReport(start, end) {
  const [poSnap, supplierSnap] = await Promise.all([db.collection("purchaseOrders").get(), db.collection("suppliers").get()]);
  const suppliers = {};
  supplierSnap.docs.forEach((d) => (suppliers[d.id] = d.data().name));
  const rows = [];
  poSnap.docs
    .map((d) => d.data())
    .filter((po) => {
      const when = tsToDate(po.receivedAt);
      return when && when >= start && when < end && po.receivingRecord && (po.receivingRecord.discrepancies || []).length;
    })
    .sort((a, b) => tsToDate(a.receivedAt) - tsToDate(b.receivedAt))
    .forEach((po) => {
      po.receivingRecord.discrepancies.forEach((d) => {
        rows.push([po.poNumber || "", suppliers[po.supplierId] || "-", formatDateMDY(po.receivedAt), po.receivingRecord.supplierReceiptNo || "", productName(d.productId), reportNumber(d.expectedQty, 0), reportNumber(d.receivedQty, 0), reportNumber(d.diff, 0), po.status === "discrepancy" ? "Open" : "Acknowledged"]);
      });
    });
  return {
    title: "AMSON PHARMACEUTICALS - Purchase Order Discrepancies",
    subtitle: rangeSubtitle(start, end),
    filename: `po-discrepancy-${localISODate(start)}`,
    notes: ["Purchase orders received during the period whose delivered quantity differed from the order."],
    sheets: [
      {
        name: "PO Discrepancies",
        sections: [
          {
            heading: "Discrepancies",
            columns: [{ label: "PO No." }, { label: "Supplier", width: 1.6 }, { label: "Date Received" }, { label: "Receipt / DR" }, { label: "Product", width: 3 }, { label: "Expected", align: "right" }, { label: "Received", align: "right" }, { label: "Difference", align: "right" }, { label: "Status" }],
            rows,
            totals: [],
          },
        ],
      },
    ],
  };
}

function localISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---------- Output: preview, PDF, Excel ---------- */

function reportRow(row) {
  if (Array.isArray(row)) return { cells: row, total: false, blank: false };
  return { cells: row.cells, total: !!row.total, blank: !!row.blank };
}

function renderReportPreview(report) {
  const sectionHtml = (section, sheetName) => `
    ${section.heading && section.heading !== sheetName ? `<h3 class="h6 fw-bold text-center mt-3 mb-2">${escapeHtml(section.heading)}</h3>` : ""}
    <div class="table-responsive">
      <table class="table table-sm align-middle report-table">
        <thead><tr>${section.columns.map((c) => `<th class="${c.align === "right" ? "text-end" : ""}">${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${section.rows.length === 0 ? `<tr><td colspan="${section.columns.length}" class="text-muted">No records for this period.</td></tr>` : ""}
          ${section.rows
            .map((r) => {
              const { cells, total, blank } = reportRow(r);
              if (blank) return `<tr class="report-blank-row"><td colspan="${section.columns.length}"></td></tr>`;
              return `<tr class="${total ? "fw-bold" : ""}">${cells.map((v, i) => `<td class="${section.columns[i] && section.columns[i].align === "right" ? "text-end" : ""}">${escapeHtml(String(v))}</td>`).join("")}</tr>`;
            })
            .join("")}
          ${section.totals
            .map((t) => `<tr class="fw-bold report-total-row">${t.map((v, i) => `<td class="${section.columns[i] && section.columns[i].align === "right" ? "text-end" : ""}">${escapeHtml(String(v))}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    </div>`;
  return `
    <div class="text-center mb-2">
      <h2 class="h5 fw-bold mb-0">${escapeHtml(report.title)}</h2>
      <p class="text-muted mb-0">${escapeHtml(report.subtitle)}</p>
    </div>
    ${report.sheets.length === 0 ? '<p class="text-muted text-center">No records for this period.</p>' : ""}
    ${report.sheets
      .map((sheet) => `${report.sheets.length > 1 ? `<h3 class="h6 fw-bold mt-4 border-bottom pb-1">${escapeHtml(sheet.name)}</h3>` : ""}${sheet.sections.map((sec) => sectionHtml(sec, report.sheets.length > 1 ? sheet.name : null)).join("")}`)
      .join("")}
    ${(report.notes || []).map((n) => `<p class="text-muted mb-1" style="font-size:0.78rem;">${escapeHtml(n)}</p>`).join("")}
  `;
}

function downloadReportPdf(report) {
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }
  const doc = createPdf({ orientation: "landscape" });
  const marginX = 10;
  const pageWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const lineHeight = 3.8;
  let y = 14;

  const newPageIfNeeded = (height) => {
    if (y + height > pageHeight - 12) {
      doc.addPage();
      y = 14;
      return true;
    }
    return false;
  };

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(report.title, doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(report.subtitle, doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
  y += 8;

  report.sheets.forEach((sheet) => {
    if (report.sheets.length > 1) {
      newPageIfNeeded(14);
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text(sheet.name, marginX, y);
      y += 6;
    }
    sheet.sections.forEach((section) => {
      const totalShare = section.columns.reduce((n, c) => n + (c.width || 1), 0);
      const widths = section.columns.map((c) => ((c.width || 1) / totalShare) * pageWidth);
      const drawRow = (cells, bold) => {
        doc.setFont(undefined, bold ? "bold" : "normal");
        const wrapped = cells.map((v, i) => doc.splitTextToSize(String(v), widths[i] - 5));
        const height = Math.max(1, ...wrapped.map((w) => w.length)) * lineHeight + 1.6;
        if (newPageIfNeeded(height) && !bold) {
          drawRow(section.columns.map((c) => c.label), true);
          doc.setFont(undefined, "normal");
        }
        let x = marginX;
        wrapped.forEach((lines, i) => {
          // Right-aligned numbers stop 4mm short of the next column.
          if (section.columns[i] && section.columns[i].align === "right") doc.text(lines, x + widths[i] - 4, y, { align: "right" });
          else doc.text(lines, x, y);
          x += widths[i];
        });
        y += height;
        doc.setDrawColor(225);
        doc.line(marginX, y - 1.6, marginX + pageWidth, y - 1.6);
      };
      newPageIfNeeded(20);
      if (section.heading && !(report.sheets.length > 1 && section.heading === sheet.name)) {
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text(section.heading, doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
        y += 6;
      }
      doc.setFontSize(8);
      drawRow(section.columns.map((c) => c.label), true);
      if (section.rows.length === 0) {
        doc.setFont(undefined, "normal");
        doc.text("No records for this period.", marginX, y);
        y += 5;
      }
      section.rows.forEach((r) => {
        const { cells, total, blank } = reportRow(r);
        if (blank) {
          y += 2;
          return;
        }
        drawRow(cells, total);
      });
      section.totals.forEach((t) => drawRow(t, true));
      y += 6;
    });
  });

  doc.setFontSize(7.5);
  doc.setFont(undefined, "normal");
  doc.setTextColor(110);
  (report.notes || []).concat([`Generated ${formatDateMDY(new Date(), true)}`]).forEach((n) => {
    newPageIfNeeded(5);
    doc.text(doc.splitTextToSize(n, pageWidth), marginX, y);
    y += 4.5;
  });
  doc.save(`${report.filename}.pdf`);
}

// Numbers go into Excel as numbers so the main office can add them up.
function excelValue(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^-?[\d,]+(\.\d+)?$/.test(v.trim()) && /\d/.test(v)) {
    // Keep codes with leading zeros (SI#, batch numbers) as text.
    if (/^0\d/.test(v.trim())) return v;
    return Number(v.replace(/,/g, ""));
  }
  return v;
}

function downloadReportExcel(report) {
  if (typeof XLSX === "undefined") {
    showAppAlert("Excel export isn't available right now. Please try again in a moment.");
    return;
  }
  const wb = XLSX.utils.book_new();
  const sheets = report.sheets.length ? report.sheets : [{ name: "Report", sections: [] }];
  const used = new Set();
  sheets.forEach((sheet) => {
    const aoa = [[report.title], [report.subtitle], []];
    let maxCols = 1;
    sheet.sections.forEach((section) => {
      maxCols = Math.max(maxCols, section.columns.length);
      if (section.heading) aoa.push([section.heading]);
      aoa.push(section.columns.map((c) => c.label));
      section.rows.forEach((r) => {
        const { cells, blank } = reportRow(r);
        aoa.push(blank ? [] : cells.map(excelValue));
      });
      section.totals.forEach((t) => aoa.push(t.map(excelValue)));
      aoa.push([]);
    });
    (report.notes || []).forEach((n) => aoa.push([n]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = Array.from({ length: maxCols }, (_, i) => ({ wch: i === 0 ? 34 : 16 }));
    let name = (sheet.name || "Report").replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
    while (used.has(name)) name = `${name.slice(0, 28)}_${used.size}`;
    used.add(name);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `${report.filename}.xlsx`);
}

/* ---------- Page ---------- */

const reportTypeSelect = document.getElementById("reportTypeSelect");
const reportDatesGroup = document.getElementById("reportDatesGroup");
const reportMonthGroup = document.getElementById("reportMonthGroup");
const reportFromInput = document.getElementById("reportFromInput");
const reportToInput = document.getElementById("reportToInput");
const reportMonthSelect = document.getElementById("reportMonthSelect");
const reportYearSelect = document.getElementById("reportYearSelect");
const reportGenerateBtn = document.getElementById("reportGenerateBtn");
const reportPdfBtn = document.getElementById("reportPdfBtn");
const reportExcelBtn = document.getElementById("reportExcelBtn");
const reportPreview = document.getElementById("reportPreview");
const reportAlert = document.getElementById("reportAlert");

let currentReport = null;

function setupReportControls() {
  reportTypeSelect.innerHTML = Object.entries(REPORT_TYPES)
    .map(([value, t]) => `<option value="${value}">${escapeHtml(t.label)}</option>`)
    .join("");
  const today = localISODate(new Date());
  reportFromInput.value = today;
  reportToInput.value = today;
  reportFromInput.max = today;
  reportToInput.max = today;
  const now = new Date();
  reportMonthSelect.innerHTML = Array.from({ length: 12 }, (_, m) => `<option value="${m}">${new Date(2000, m, 1).toLocaleDateString("en-US", { month: "long" })}</option>`).join("");
  reportMonthSelect.value = String(now.getMonth());
  reportYearSelect.innerHTML = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)
    .map((y) => `<option value="${y}">${y}</option>`)
    .join("");
  // ?type=... opens a specific report (links from Orders / Inventory).
  const requested = new URLSearchParams(window.location.search).get("type");
  if (requested && REPORT_TYPES[requested]) reportTypeSelect.value = requested;
  syncReportControls();
}

function syncReportControls() {
  const range = REPORT_TYPES[reportTypeSelect.value].range;
  reportDatesGroup.classList.toggle("d-none", range !== "dates");
  reportMonthGroup.classList.toggle("d-none", range !== "month");
  currentReport = null;
  reportPdfBtn.disabled = true;
  reportExcelBtn.disabled = true;
}

function parseLocalDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

async function generateReport() {
  reportAlert.classList.add("d-none");
  const type = reportTypeSelect.value;
  let report;
  reportGenerateBtn.disabled = true;
  reportGenerateBtn.textContent = "Generating...";
  try {
    await loadCatalogCache();
    if (REPORT_TYPES[type].range === "dates") {
      if (!reportFromInput.value || !reportToInput.value) throw new Error("Pick a start and end date.");
      const start = parseLocalDate(reportFromInput.value);
      const toDay = parseLocalDate(reportToInput.value);
      if (toDay < start) throw new Error("The end date is before the start date.");
      const end = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate() + 1);
      report = await {
        daily_sales: buildDailySalesReport,
        customer_file: buildCustomerFileReport,
        pull_out: buildPullOutReport,
        returns_exchanges: buildReturnsExchangeReport,
        po_discrepancy: buildPoDiscrepancyReport,
      }[type](start, end);
    } else {
      const year = Number(reportYearSelect.value);
      const month = Number(reportMonthSelect.value);
      report = await { monthly_inventory: buildMonthlyInventoryReport, supplier_purchases: buildSupplierPurchasesReport }[type](year, month);
    }
    currentReport = report;
    reportPreview.innerHTML = renderReportPreview(report);
    reportPdfBtn.disabled = false;
    reportExcelBtn.disabled = false;
    logAuditEvent({ action: "Report Generated", details: `${REPORT_TYPES[type].label} - ${report.subtitle}` });
  } catch (error) {
    console.error("Report failed:", error);
    reportAlert.textContent = error.message || "Something went wrong generating this report. Please try again.";
    reportAlert.classList.remove("d-none");
  } finally {
    reportGenerateBtn.disabled = false;
    reportGenerateBtn.textContent = "Generate";
  }
}

if (reportTypeSelect) {
  setupReportControls();
  reportTypeSelect.addEventListener("change", syncReportControls);
  [reportFromInput, reportToInput, reportMonthSelect, reportYearSelect].forEach((el) => el.addEventListener("change", syncReportControls));
  reportGenerateBtn.addEventListener("click", generateReport);
  reportPdfBtn.addEventListener("click", () => currentReport && downloadReportPdf(currentReport));
  reportExcelBtn.addEventListener("click", () => currentReport && downloadReportExcel(currentReport));
}
