# 7. Security Q&A (30 questions)

Answer in two or three sentences, name the source, stop. Honest beats impressive: if something is a known limit, say so and give the fix.
Paper security requirements: REQ003–005, REQ041, REQ043–045 (pp.46–51), REQ071, REQ119–124 (pp.55–62), REQNF009–012 (p.63), REQNF025 (p.65).

## A. Roles and database rules

**S1. How are roles enforced?** Two layers: each admin page checks the role and redirects (`js/admin-roles.js` ADMIN_PAGE_ACCESS, `js/admin-header.js`), and the Firestore rules on Google's servers check every read and write (`firestore.rules`, `isStaff`, `isManager`). The rules are what really protect the data. (REQ119–121 p.61; REQNF011 p.63)

**S2. Can a customer make themselves a manager?** No. A new account can only be created as `customer` with zero credit, and nobody can change their own `role`, `accountStatus`, or raise their store credit (`firestore.rules`, users block). (01 Q23)

**S3. What if Sales Staff open the dashboard URL?** The page sends them back to POS, and the rules refuse the data even if they got past the page. Shown in the demo, step 12.

**S4. Who can change prices?** Only the Branch Manager: the rules require price fields to stay the same for everyone else (`firestore.rules` priceFieldsUnchanged / isPriceManager). Every change needs a reason and is logged. (REQ071–073 p.55)

**S5. Are there checks only the page enforces?** Yes, a few: finalizing the stock count, adding a category, blocking wholesale orders with expired documents. A staff member with console skills could bypass them; every action still lands in the audit log. Fix: tighter per-role rules. (study/13 §2.2)

**S6. Can the audit log be faked or erased?** Entries can be added but never edited or deleted (`firestore.rules`, auditLog block). Limitation: the user name in an entry is written by the browser, so a console user could add an entry under another name; they still can't change existing ones. (REQ124 p.62; study/13 §2.2)

## B. Payments and the QR

**S7. How do you know a payment screenshot isn't fake?** The system doesn't claim to. Staff check the branch's actual GCash/bank account before approving; the system warns when a reference number was already used. (Interview 3 p.178; `js/admin-online-orders.js`; study/13 #5)

**S8. Could someone replace the QR code with their own?** Only someone who can deploy the site. That's limited to the team, with 2-step verification, and staff confirm money reached Amson's own account before approving. (study/13 #12)

**S9. Can a customer change the price in their order?** Prices are sent by the browser, so a technical user could alter them. Staff see a "check before approving" warning when order prices don't match the catalog, and they verify the amount received. (`js/admin-online-orders.js:506` orderPriceProblems; study/13 #3)

**S10. Can a customer give themselves store credit?** No. The rules only let credit go down, and only together with an order that uses it (`firestore.rules` orders create, lastCreditOrderId). (study/13)

**S11. Why not a payment gateway, which would be more secure?** The owner forbids third parties in payment (Interview 3 p.179); PayMongo was proposed and declined (p.141). Manual verification is the client's control.

## C. Passwords, login, OTP

**S12. How are passwords stored?** By Firebase Authentication, hashed; we never store or see them. (REQNF009 p.63)

**S13. Password rules?** At least 6 characters with a letter, a number and a symbol (`js/validators.js:4`); same for staff accounts (group test ROLE-13).

**S14. Brute force?** 5 wrong passwords lock the email for 2 minutes (`js/auth.js:56-57`), enforced in the rules too (count-up only, `loginLockValid`), plus reCAPTCHA. (REQ004, REQ045 pp.47–51)

**S15. How does the email code work, and can it be skipped?** A 6-digit code, valid 10 minutes (`js/otp.js:2`), sent by EmailJS. The check runs in the browser, so a technical user could mark their own account verified; they still can't touch anyone else's data. Fix: Firebase's built-in email link or a server check (paid plan). (study/13 #4)

**S15b. Can someone register with a throwaway email?** Not with the 39 common throwaway domains (mailinator, yopmail, 10minutemail…), which are refused (`js/validators.js:21`); full list in `06-demo-script.md` §6.7. Other throwaway services aren't blocked, but every account still needs the 6-digit code sent to that inbox. (Group test LOG-01)

**S16. New-device code?** On (`js/device-trust.js:4`). A browser not on the account's trusted list must enter an emailed code; 5 wrong codes cancel the login. "Forget all other devices" sends every other browser back to verify. (REQ005, REQ044)

**S17. How random are the codes?** Six digits from `Math.random` (`js/otp.js:5`). Fine against guessing with the 5-try limit; `crypto.getRandomValues` would be stronger. Say it if asked.

**S18. reCAPTCHA?** On login and registration, checked in the browser only; bots that skip the page skip it. Firebase's own throttling still applies. (REQ003 p.46; study/13 #16)

**S19. Deactivated accounts?** Staff and customers are signed out on their next page load and can't log in again (group tests ROLE-11, ROLE-12). The customer rules don't check status yet, a known gap. (study/13 §2.2)

## D. App Check, keys, transport

**S20. Do you use App Check?** Yes, for the AI chat only: Gemini requests must carry a reCAPTCHA Enterprise token from our site (`js/chat-config.js:11`, `js/live-chat.js:455`). It isn't on for the database (`js/firebase-config.js:14` is empty); the rules protect the database instead.

**S21. Your Firebase key is visible.** Firebase web keys are public by design; they identify the project. Data is protected by the rules. Restricting the key to our domains is an owner setting still to do. (study/13 #11)

**S22. Is data encrypted in transit?** Yes, HTTPS on Firebase Hosting, plus security headers: X-Frame-Options DENY, nosniff, Referrer-Policy (`firebase.json`). (REQNF010 p.63)

## E. Uploads and privacy

**S23. What stops someone uploading a virus or a huge file?** Images only, up to 10 MB, checked in the browser (`js/payment.js:3`); Cloudinary stores them. Order photo links must point to our Cloudinary account (rule `photoLinkOk`, `firestore.rules:127`). Limitation: the Cloudinary preset is unsigned; limiting size and type in the preset is an owner action. (study/13 #6, #8)

**S24. Who can see prescription photos?** The customer who uploaded it and ops staff, through their order; other customers can't read the order (`firestore.rules` orders block; group test SEC-01).

**S25. Does the AI see personal data?** No. It receives the question, the last 8 chat messages and a short product list, never prescriptions, addresses or order details (REQNF012 p.63; `js/chat-config.js` historyMessages: 8).

**S26. Can the AI give medical advice?** It's instructed not to, and any reply that looks like a dose is blocked before it's shown (`js/live-chat.js:14-20` CHAT_DOSAGE_PATTERNS). For symptoms it lists products we carry and points to the pharmacist. (p.35; group tests CHAT-03, CHAT-04)

**S27. Data Privacy Act?** REQNF025 (p.65) requires it. The Terms/Privacy page states processing under RA 10173 (`js/legal-content.js:42`); customers accept it at sign-up; the rules limit each customer to their own data; cost prices are hidden in staff-only records. **[UNSURE]**: no formal privacy impact assessment or DPO registration is described in the paper.

**S28. Cross-site scripting?** User text is escaped before display (`escapeHtml` in `js/products-data.js`); group tests SHOP-03 and CHAT-12 showed `<b>` and `<script>` as plain text.

**S29. Backups and accidental deletion?** Delete protection is on for the database; the manager downloads a full Excel/JSON backup (`js/admin-backup.js`). No automatic backups on the free plan. (REQNF013 p.64)

**S30. What would you fix first with a budget?** Move the browser-only checks (email code, reCAPTCHA, order prices) to a server function on the Blaze plan, restrict the API key and Cloudinary preset, and add staff two-step login (the manager's lowest rating was account safety, p.119–120).
