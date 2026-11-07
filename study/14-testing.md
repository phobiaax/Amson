# 14 - Testing

How the system was tested before the defense, what passed, which bugs were found and fixed, what can only be
tested on the live site, and how to explain all of this to the panel.

---

## 1. The testing approach in one paragraph

We tested the **real website code** against a **fake, local copy of Firebase** (the **Firebase Emulator Suite**), so
**nothing in the live database was created, changed or deleted**. A browser-automation tool (**Playwright**) clicked
through the pages like a real user, as every role, and we checked the results directly in the emulator database.
The **security rules** were tested on their own with 119 "should this be allowed?" checks. We took **screenshots** of
every page at phone, tablet and laptop widths, and checked for script errors, layout overflow and accessibility.
After fixing bugs, we **re-ran** the affected tests and compared the new screenshots with the old ones.

---

## 2. The tools and setup

| Tool | What it is | How we used it |
| --- | --- | --- |
| **Firebase Emulator Suite** (Firestore + Auth) | A local, fake Firebase that behaves like the real one, including **our `firestore.rules`** | All testing ran here, never on live data. |
| **Seed data** | A script that filled the emulator with realistic test data | **8 accounts** across every role (customers, Sales, Technical, Branch Manager, Admin), **18 products**, **21 stock batches** (including expired and near-expiry ones), suppliers, wholesale buyers and orders. |
| **Playwright** | A tool that drives a real Chromium browser from a script | Logged in as each role, filled forms, clicked buttons, uploaded files, and read results. Also ran "two users at the same moment" tests. |
| **Rules test suite** | 119 allow/deny checks against the rules in a separate emulator project | e.g. "a customer reads another customer's order → must be denied". |
| **Stand-ins for outside services** | EmailJS: messages captured, not sent. reCAPTCHA: always passes. Cloudinary: fake upload. Gemini: blocked. | So tests didn't send real emails or use real quotas. |
| **Screenshot + audit script** | Opened every page per role at **375 px (phone), 768 px (tablet), 1440 px (laptop)** | Saved full-page screenshots and automatically checked: sideways scrolling, inputs without labels, buttons without names, low-contrast text, cut-off text, and console errors. |
| **Manual test plans** | `docs/AMSON-Test-Plan.xlsx`, `AMSON-Test-Plan-Quick.xlsx`, `AMSON-Test-Plan-Retest.xlsx`, plus a live-site checklist | Step-by-step manual tests in the browser. |

> **Be ready for this question:** "Can we see the automated tests?" The test scripts were kept **outside the project
> repository** (they're test tooling, not part of the website), so they're not in the GitHub repo. What's in the repo
> are the manual test plans in `docs/`. Say this honestly if asked.

---

## 3. What passed

From the pre-defense test report (cleanup branch, 11/05/2026):

- **Register and sign-in:** validation, the disposable-email block, scrolling through the terms, the 6-digit code (typed and pasted), and the 5-try lock for 2 minutes (also with different capitals and spaces in the email). Deactivated accounts are blocked.
- **Store credit:** fully or partly covers orders; the balance can't go negative or be claimed twice.
- **Checkout:** a double-clicked Submit makes only one order; a missing prescription is caught.
- **Stock deduction:** oldest expiry first across several batches; near-expiry batches skipped for retail but used for wholesale.
- **Order issues:**
  - underpayment, and overpayment (₱110 credited);
  - prescription rejected, then resubmitted;
  - the out-of-stock hold (not shown to the customer);
  - an expired 7-day hold closing with credit;
  - auto-deliver after 3 days.
- **Two staff at once:**
  - two staff approving the same order: one wins, the other gets "already processed";
  - two POS counters selling the last 5 units: one succeeds, the other gets "not enough stock".
- **Voids:** full and partial; Technical Staff need the BM password; self-approval and a wrong password are refused; the cashier stays signed in.
- **Exchanges:** walk-in and wholesale, both ways (back to stock / set aside); cheaper replacements refused.
- **Wholesale:**
  - orders: expired documents blocked, free items need a reason;
  - invoice PDF;
  - the Waiting-for-release list and Mark Released.
- **Reports:** all 7 generate a preview, PDF and Excel; dashboard totals match the database; exports and the 22-sheet backup download.
- **Text safety (XSS):** HTML typed into names, addresses, chat and the store banner is shown as text, never run.
- **Live chat without the AI:** built-in answers, product cards, safe health replies, hand-off and staff replies.
- **Pages:** **0 script errors and 0 console errors across 147 page loads**; no page scrolls sideways at 375, 768 or 1440 px.
- **Security rules: 117 of 119 checks behaved as intended.** The 2 others were:
  - bug #8 (SI counter could be set to any number), **fixed**;
  - the known email-verification limitation (a customer can mark their own email verified from the console), **accepted**.

---

## 4. Bugs found and fixed

**24 bugs** were found in the main test (1 critical, 2 high, 6 medium, 9 low, 6 cosmetic). Each fix was its own commit.
**Bug #9 was not fixed** (listed as a known limitation). Two more concurrency bugs were found and fixed afterwards.

| # | Severity | Bug | Fix |
| --- | --- | --- | --- |
| 1 | **Critical** | Write Off took stock from the **wrong product's batch** when the product was changed after the batch list loaded | Clear the old batch choice when the product changes; `writeOffProblem` refuses a batch that belongs to another product (`admin-inventory.js:1128-1146`, `1242-1257`). |
| 2 | High | Products could be saved with a negative or ₱0 retail price | `productPriceProblem`: retail must be > ₱0, costs not negative (form + Excel import). |
| 3 | High | Stock with an expiry date already in the past was accepted, then written off at once | Receive form/Excel refuse past dates; warning within 2 months (`expiryPassed`, `confirmExpiringSoon`). |
| 4 | Medium | Audit log showed "₱[object Object]" after price changes | Build the "after" text before swapping in delete markers. |
| 5 | Medium | Order submit while offline showed a wrong message, off-screen | Offline/catalog failure → connection message next to Submit (`stockAndPricesStillOk`). |
| 6 | Medium | Stock count accepted negative and decimal counts | Whole numbers of 0 or more only. |
| 7 | Medium | A Branch Manager could deactivate their own account and the Administrator | Blocked in Staff Management. |
| 8 | Medium | Any staff member could set the SI counter to any number | **Rule change:** `salesInvoices` only +1. |
| 9 | Medium | Two staff editing the same product: the second save wipes the first | **Not fixed**: known limitation. |
| 10 | Low | Decimal/signed quantities silently changed ("1.5" became 15) | `wholeQty()` everywhere, with a message. |
| 11 | Low | Supplier/wholesale forms accepted invalid phone/email and duplicate names | `contactDetailsProblem`, `sameCompanyName`. |
| 12 | Low | POS receipt didn't update right after a void | Redraw the receipt after the void. |
| 13 | Low | No message on the 5th wrong password when the device clock was fast | Catch the refused record and still show the message. |
| 14 | Low | Change Email pop-up had no Close button | Added. |
| 15 | Low | Raw Firebase error text when adding staff with a used email | Friendly message. |
| 16 | Low | Chat dropped a message sent within 1.5 s | The message now waits and sends. |
| 17 | Low | Accessibility: missing labels, unnamed icon buttons | `aria-label`s added (no visual change). |
| 18 | Low | Phone layout rough spots (chat button over buttons, tabs wrapping, empty-cart summary) | Small CSS fixes. |
| 19 | Cosmetic | Bad Order reason said "within 2 months" for already-expired batches | Says "expired on …". |
| 20 | Cosmetic | Invalid report dates left the previous report on screen | Preview cleared on error. |
| 21 | Cosmetic | Price-change confirm listed prices that didn't change (0 → 0) | Missing value treated as 0. |
| 22 | Cosmetic | Receive Stock Excel template showed SKU "SKU-0001" | Uses the real "MED-" format. |
| 23 | Cosmetic | Leftover code for a removed dashboard card | Removed. |
| 24 | Cosmetic | No way to add a new category name | "Add category" for the Branch Manager, with duplicate check and audit log. |

**Found after the main test:**

| # | Bug | How it was found | Fix and proof |
| --- | --- | --- | --- |
| – | **Regression from fix #8:** with the strict "+1 only" SI rule, two POS counters completing sales at the same moment failed with `permission-denied` (3 of 10 rounds) | A "race" test: two browsers clicking Confirm together, 10 rounds | `deductStockFEFOMultiple` retries the whole sale up to 3 more times (`products-data.js:1818-1830`). Re-test: **16 of 16** simultaneous sales succeeded, no duplicate SI numbers. |
| 25 | Two customers submitting checkout at the same moment: one failed on the order-number counter (this was already happening on the live site) | Same kind of race test with two customers | `generateOrderNumber` retries (`orders.js:313-338`). Re-test: **10 of 10** orders placed with unique numbers. |

**After all fixes:** the affected tests were re-run, and the screenshot set was taken again and compared with the
"before" set. The only differences were the intended ones (e.g. the new Close button and category row).

---

## 5. What can only be tested on the live site

The emulator can't test real outside services. These are in the live-site checklist (Excel):
- **Real emails** (EmailJS): sign-up code, email-change code, order updates (also check Spam).
- **reCAPTCHA** on login and register (tests used a stand-in).
- **The AI assistant** (Gemini + App Check): only the no-AI fallback could be tested locally.
- **Cloudinary uploads** of real photos (size limits, preset), and re-uploading product photos.
- **Forgot-password email** and its reset link.
- **Printing**: receipt print window and the **58 mm thermal printer**.
- **Real phones**: iPhone Safari and a mid-range Android (tests used a Chromium phone simulation).
- **Speed** with the real catalog size, and a real Lalamove tracking link.
- **Deployed headers and rules** match the repository (check in the browser's Network tab and the Firebase console).

---

## 6. How to explain testing to the panel (script)

> "We didn't test on live data. We ran the real website code against the **Firebase Emulator**, a local copy of
> Firebase that uses our actual security rules, filled with realistic test data for every role. We used **Playwright**
> to automate the browser: logging in as each role, placing orders, approving payments, selling at the POS, voiding,
> receiving stock and so on. We checked the results in the database.
>
> We tested the **security rules separately** with 119 allow/deny checks. For example, 'a customer reads another
> customer's order' must be denied. We also tested **concurrency**: two cashiers selling the last units at the same
> time, two staff approving the same order, two customers checking out at the same moment.
>
> We took **147 screenshots** across phone, tablet and laptop widths with zero script errors. We found 24 bugs:
> 1 critical, a write-off that could take stock from the wrong batch. We fixed 23 and documented the remaining one.
> Then a concurrency test found two more bugs, which we fixed and re-tested: 16 of 16 simultaneous sales and 10 of 10
> simultaneous orders succeeded.
>
> Things that need real services, like emails, reCAPTCHA, the AI, the thermal printer and real phones, we test on
> the live site with a checklist."

---

## 7. Testing terms (for questions)

| Term | Meaning in our project |
| --- | --- |
| **Unit test** | Testing one function alone. We mostly tested whole flows instead. |
| **End-to-end (E2E) test** | Testing a full user flow in a real browser (what Playwright did). |
| **Regression** | A fix that breaks something else (the SI-counter rule fix did, and we caught it). |
| **Regression testing** | Re-running tests after changes to catch regressions. |
| **Race condition test** | Two users doing the same thing at the same moment. |
| **Emulator** | A local fake of Firebase used for safe testing. |
| **Seed data** | Test data loaded before tests. |
| **Visual regression** | Comparing screenshots before and after a change. |
| **Acceptance testing** | The client/users trying the system against their requirements (our manual test plans). |
| **Black-box / white-box** | Testing from the outside (clicking) vs. with knowledge of the code. We did both: E2E plus code reading. |

---

## 8. Likely panel questions on testing

1. **"How did you test without damaging real data?"** The Firebase Emulator Suite, a local copy of Firestore and Auth using our real rules.
2. **"How do you know the security rules work?"** 119 allow/deny checks against the emulator; 117 behaved as intended, one was fixed (SI counter), one is a documented limitation (email verification).
3. **"What was your most serious bug?"** Write Off could deduct from another product's batch when the product was changed. It was fixed and re-tested, and the save now also refuses mismatched batches.
4. **"Did you test what happens when two people do the same thing?"** Yes: two cashiers selling the last units, two staff approving one order, two customers checking out at once, and two counters selling different items at once.
5. **"Did fixing bugs cause new bugs?"** Yes, once: the stricter SI-counter rule made simultaneous sales fail. Our race test caught it, and we added a retry (16/16 after).
6. **"Did you test on phones?"** In automated phone-size browsers (375 px). Real iPhone/Android testing is on the live-site checklist.
7. **"How did you test the AI?"** The no-AI paths (FAQ, product cards, health templates, hand-off) were tested automatically. The Gemini replies need the live site with App Check, and are on the checklist.
8. **"What's left untested?"** Real emails, reCAPTCHA, Gemini, real uploads, printing and real devices. They're on the live-site checklist with Passed / Failed columns.
