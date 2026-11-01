# Code map

## products-data.js sections

`js/products-data.js` is the shared core loaded by most pages. Its functions
are grouped into the sections below, in file order; each starts with a
`// ---- name ----` header. Only function declarations were regrouped:
everything that runs when the page loads and all shared data (`let` /
`const`) kept its original order.

### dialogs

Bootstrap pop-ups used instead of the browser's alert/confirm/prompt, and stacking several pop-ups.

- Functions: `restackModals()`, `ensureAppDialogModal()`, `showAppAlert()`, `setAppDialogField()`, `showAppConfirm()`, `showAppPrompt()`, `showAppSelect()`, `hideModalAndWait()`
- Also runs when the page loads: 2 statements (event listeners / start-up)

### catalog

The shared product list every page works from, and finding products in it.

- Functions: `getProductById()`, `storefrontCatalog()`, `productNameKey()`, `findProductByName()`, `generateProductSku()`
- Shared data: `SAMPLE_PRODUCTS`, `CATEGORY_LABELS`, `catalogLoadPromise`

### stock levels and alerts

Low / out-of-stock and expiry rules, and the counts behind the stock alert tiles.

- Functions: `nearExpiryCutoff()`, `isRetailSellableBatch()`, `isWholesaleSellableBatch()`, `getStockLevelStatus()`, `getExpiryStatus()`, `getBatchStatuses()`, `sumPhysicalStockByProduct()`, `computeInventoryAlertCounts()`
- Shared data: `DEFAULT_REORDER_POINT`, `NEAR_EXPIRY_MONTHS`, `BATCH_STATUS_LABELS`, `SEVERITY_COLORS`, `SEVERITY_BACKGROUNDS`

### staff notifications

The staff bell, sidebar badge and Notifications page: what needs attention and what has been read.

- Functions: `getStaffNotificationsCached()`, `rememberStaffNotifications()`, `staffNotificationsSavedAt()`, `staffNotifMillis()`, `staffOrderNotifications()`, `staffChatNotifications()`, `computeStaffNotifications()` (built from `stockLevelAlerts()`, `expiryAlerts()`, `poDiscrepancyAlerts()`, `pricePendingAlerts()`, `badOrderAlerts()`, `wholesaleDocumentAlerts()`, `wholesaleReleaseAlerts()`, `waitingChatAlerts()`), `getStaffNotifReadMap()`, `isStaffNotifRead()`, `markStaffNotifRead()`, `markAllStaffNotifsRead()`
- Shared data: `STAFF_NOTIF_CACHE_KEY`, `STAFF_NOTIF_CACHE_MS`, `STAFF_NOTIF_CATEGORY_LABELS`

### expiry rules (near-expiry, bad order, write-offs)

Moving near-expiry stock to wholesale-only and expired stock to Bad Order.

- Functions: `enforceExpiryStatus()`, `markBatchBadOrder()`, `writeOffEffectiveDate()`
- Shared data: `BAD_ORDER_MONTHS`

### catalog loading (live reads, short browser copy, staff-only prices)

Loading products and stock from Firestore with as few reads as possible, and merging in the staff-only prices.

- Functions: `liveQuery()`, `liveVersion()`, `liveSnapshotAfter()`, `liveStockBatches()`, `catalogBrowserCacheAllowed()`, `clearCatalogCache()`, `catalogCacheReplacer()`, `catalogCacheReviver()`, `readCatalogBrowserCache()`, `writeCatalogBrowserCache()`, `isStaffPage()`, `loadPrivatePrices()`, `setPrivatePrices()`, `attachBatchCosts()`, `loadCatalogCache()`
- Shared data: `DEFAULT_CATEGORIES`, `liveQueries`, `CATALOG_CACHE_KEY`, `CATALOG_CACHE_MS`, `catalogLoadedOnce`, `PRIVATE_PRICE_FIELDS`

### progress pop-up for long jobs

The progress bar and result pop-up for imports, photo uploads and stock receipts.

- Functions: `ensureTaskModal()`, `showTaskProgress()`, `updateTaskProgress()`, `showTaskResult()`
- Shared data: `taskModalEl`, `TASK_ICONS`

### staff form helpers (toggles, searchable dropdowns, item lists)

Small helpers shared by the staff forms (Products, Suppliers, Inventory, Wholesale, POS).

- Functions: `showFormAlert()`, `wireSegmentedToggle()`, `setToggleValue()`, `getToggleValue()`, `makeSearchableSelect()`, `destroyChoicesIn()`, `updateRemoveButtonsVisibility()`, `renumberItems()`

### storefront: home page category cards

The "Shop by Category" cards on the home page.

- Functions: `renderHomeCategoryCards()`
- Also runs when the page loads: 1 statement (event listener / start-up)

### formatting (dates, money, text, links, PDF)

Turning dates, peso amounts and text into what is shown or printed.

- Functions: `localISODate()`, `formatDateMDY()`, `formatPeso()`, `escapeHtml()`, `safeUrl()`, `pdfSafeText()`, `printPdf()`, `createPdf()`
- Shared data: `PDF_TEXT_SWAPS`

### receipts

The sale receipt pop-up (POS, Walk-in Orders, online order receipts).

- Functions: `showSaleReceipt()`
- Shared data: `SALE_RECEIPT_PAYMENT_METHOD_LABELS`, `POS_BRANCH_NAME`

### voids

Voiding a walk-in sale (whole or some items), with Branch Manager approval when needed.

- Functions: `roleCanVoidSales()`, `promptVoidDetails()`, `verifyVoidApprover()`, `voidPosSale()`, `partialVoidSummary()`, `voidSummary()`, `voidByText()`

### exports

Exporting any table to PDF or Excel.

- Functions: `exportTable()`

### stock (fefo) and sales invoice numbers

Taking stock out first-expiry, first-out in one transaction, and giving each sale its SI No.

- Functions: `deductStockFEFOMultiple()`, `batchFieldsFromAllocation()`, `SALES_INVOICE_COUNTER_REF()`, `formatInvoiceNo()`

### returns and exchanges

Wholesale and walk-in returns/exchanges and the exchange slip.

- Functions: `planBatchReturn()`, `processWholesaleExchange()`, `processWalkinExchange()`, `openWalkinExchangeDialog()`, `printWalkinExchangeSlip()`

### audit log

Writing an entry to the audit log.

- Functions: `logAuditEvent()`

### storefront: product cards and quick view

Product cards, the quick-view pop-up and the quantity / Add to Cart / Buy Now controls.

- Functions: `cloudinaryImageUrl()`, `cartItemImageCss()`, `rxTag()`, `renderProductCard()`, `checkoutSummaryItemsHtml()`, `wireProductBuyControls()`, `showProductQuickView()`
- Also runs when the page loads: 1 statement (event listener / start-up)
