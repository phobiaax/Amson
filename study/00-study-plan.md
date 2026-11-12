# 00 - 7-Day Study Plan

This plan uses the files in this folder. The **hardest modules come first**, while you have the most time and energy.
The last two days are for **practice and review**, not new material.

Plan on **3-4 hours a day**. Each day has the same rhythm:

1. **Read** the day's files with the code open next to them. When a file says `js/cart.js:111`, open that line and read it.
2. **Explain out loud** what you read, as if a panelist asked. If you can't explain it simply, read that part again.
3. **Quiz yourself** with the matching questions in `15-quiz.md`. Write down any you got wrong.
4. **Click it**: do the flow on the live site (https://amsonpharma.web.app), so you've *seen* it work, not just read about it.

Keep one page of notes called **"weak spots"**. You'll come back to it on Days 6 and 7.

---

## Day 1: Foundations and the hardest module (FEFO)

| Time | Do | Files |
| --- | --- | --- |
| 1 h 15 | The basics: page structure, script order, JavaScript basics, Firebase words. Skim the glossary; don't memorize it. | `00-basics.md` |
| 45 min | The big picture: the diagram, the collections table, the roles table. | `01-architecture.md` |
| 1 h 30 | **FEFO and inventory.** It's the heart of the system and the hardest code. Read `deductStockFEFOOnce` (`products-data.js:1851`) line by line with the guide. Draw the "15 units from batch A and B" example on paper. | `07-inventory-and-fefo.md` |
| 15 min | Quiz 1-10, 48-51 | `15-quiz.md` |

**You're done when you can explain:** what a transaction is, why we query outside it and re-read inside it, and what happens when two cashiers sell the last units.

---

## Day 2: Online orders (the second-hardest)

| Time | Do | Files |
| --- | --- | --- |
| 1 h 15 | Checkout and payment: the live re-check, order numbers, store credit in one transaction. | `04-checkout-and-qr-payment.md` |
| 1 h 30 | Verification: the approve transaction and its `check`, holds, the 7-day close, store credit, dispatch. | `05-online-order-verification.md` |
| 30 min | On the live site: place a test order as a customer, then approve it as staff. Watch the status change on both sides. | live site |
| 15 min | Quiz 26-40 | `15-quiz.md` |

**You're done when you can explain:** why stock is deducted at approval and not at checkout, and what stops two staff from approving the same order.

---

## Day 3: POS and security

| Time | Do | Files |
| --- | --- | --- |
| 1 h 15 | POS, voids (with the Branch Manager's password), exchanges, receipts. | `06-pos-voids-exchanges.md` |
| 1 h 30 | **Security.** Panels love this. Read the rules file next to the guide (`firestore.rules`), at least the users, orders and products sections. | `13-security.md` |
| 30 min | On the live site: make a POS sale, then void one item from it. Open the Audit Log and find both entries. | live site |
| 15 min | Quiz 41-47, 65 | `15-quiz.md` |

**You're done when you can explain:** why rules matter more than page checks, and three things a customer *can't* do even from the browser console.

---

## Day 4: Login/RBAC, expiry, products

| Time | Do | Files |
| --- | --- | --- |
| 1 h | Login, register, email code, lockout, the staff page gate. | `02-login-register-otp-lockout-rbac.md` |
| 45 min | Expiry rules and Bad Order. | `08-expiry-monitoring-and-bad-order.md` |
| 45 min | Products and pricing: who sets prices, why private prices live in a separate collection. | `09-products-and-pricing.md` |
| 30 min | On the live site: log in as each role and see which menu items disappear. | live site |
| 15 min | Quiz 11-18, 52-57 | `15-quiz.md` |

---

## Day 5: The remaining modules

| Time | Do | Files |
| --- | --- | --- |
| 45 min | Shop and cart | `03-shop-and-cart.md` |
| 45 min | Wholesale | `10-wholesale.md` |
| 45 min | Reports, dashboard, audit log | `11-reports-dashboard-audit-log.md` |
| 45 min | Live chat and AI: the answer order, the safety checks, App Check. | `12-live-chat-and-ai.md` |
| 15 min | Quiz 19-25, 58-64 | `15-quiz.md` |

---

## Day 6: Testing, the full quiz and a practice demo

| Time | Do | Files |
| --- | --- | --- |
| 45 min | How we tested and what we found. Learn the "script" in section 6 by heart. | `14-testing.md` |
| 1 h | **The whole quiz without looking**, then check answers. Add misses to your weak-spots page. | `15-quiz.md` |
| 30 min | The 5 "explain line by line" snippets, out loud. | `15-quiz.md` Part B |
| 1 h | **Practice demo** on the live site, timed: customer order → staff approval → POS sale → void → inventory receive → report → audit log → chat. Go through the live-site Excel checklist too. | live site + checklist |

---

## Day 7: Review and mock panel (keep it light)

| Time | Do | Files |
| --- | --- | --- |
| 1 h | Re-read only the sections on your weak-spots page. | your notes |
| 1 h | **Mock panel:** ask a friend or groupmate to pick random "Likely panel questions" from files 02-13 and the top 20 in the cheat sheet. Answer without notes. | 02-13, 16 |
| 30 min | Read the cheat sheet twice. | `16-cheatsheet.md` |
| — | Check the live site works: photos uploaded, AI chat answering, test data cleared before **1 Dec 2026** if needed. Then rest. | live site |

---

## Tips

- **Don't memorize line numbers.** Know the **file and function name** (e.g. "`deductStockFEFOOnce` in `products-data.js`"). You can find the line with `Ctrl+F` during the defense.
- **When you don't know an answer**, say what the code *would* do from what you know, or say you'll check. Never guess a feature that isn't there. Each module file's "Known limitations" section is your honest list.
- **The three ideas that answer most questions:**
  1. rules on the server, not the browser;
  2. transactions prevent clashes;
  3. FEFO with expiry rules keeps expired medicine away from customers.
