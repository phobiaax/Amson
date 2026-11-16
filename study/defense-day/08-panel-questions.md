# 8. Panel questions by chapter

"Q" numbers point to full answers in `01-defense-guide.md` §5; new questions have their answer here.

## Chapter 1: Introduction and objectives (pp.1–8)
- What problem do you solve? → Q1 (pp.1–2)
- State your objectives. → Q2 (pp.5–6). **Know objective 4 word for word** (p.6) and G1 in `04-gaps-and-answers.md`.
- Did you meet them? → Q3, and the traceability table: objectives 1–3 built, objective 4 evaluated differently (02 §2.1).
- Why one branch? → Q4 (p.7; Interview 1 p.152)
- **What did you change in the introduction after the last defense?** "We centered it on the branch's real problems from the interviews: handwritten invoices re-typed into Excel, orders through messaging apps, no record of voids or price changes, and expiry caught by hand (pp.1–2)." [Pre-revision version not in Drive: answer from memory.]
- **Why is prescription pre-order in scope if Rx can't be sold online?** It isn't sold online: paid and reserved online, collected in person with the original (scope p.6; REQ021–026; Interview 1 p.159).

## Review of related literature (pp.9–21)
- **How is your RRL organized?** By four themes, used for both literature and studies: digital transformation of pharmacy sales/inventory/reporting; FEFO-based monitoring and expiry control; e-commerce and customer access; security, RBAC and accountability (pp.9–17), then a synthesis (pp.20–21). This was panel revision #8.
- **How does your system differ from the related systems?** → Q5 and the comparison matrix, Fig 1.1 (p.18).
- **Which study influenced you most?** [UNSURE — agree as a team.] Safe picks: the FEFO studies (e.g. Girsang et al. 2022, p.10; Fazlina et al. 2023, p.15) for the expiry logic, and the RBAC studies (p.12) for roles.
- **Are your sources recent?** Most are 2022–2026 (pp.9–17).

## Theoretical and conceptual framework (pp.21–27)
- **Explain your theoretical framework.** TAM (Davis, 1989; Fig 1.2 p.22) for acceptance: ease of use and usefulness. ISO/IEC 25010 (Fig 1.3 p.23) for technical quality.
- **Why don't your results show TAM or "compliance"?** → G1 (04) and Q41–Q42 in 01. Be ready: this is the revision the panel will check first (revisions #2–3).
- **Explain the IPO.** Fig 1.4 (p.24): Input = users, suppliers, products, stock, orders; Process = FEFO, verification, RBAC, reporting; Output = reports, alerts, records, an evaluated system (pp.24–27).

## Methodology (pp.28–38)
- Why Agile? → Q7 (p.28) · Sprints → Q8 (pp.30–35) · Requirements gathering → Q9 · Tools → Q13 (pp.35–38)
- **How did you involve the client in each sprint?** Four interviews (Mar 29, Apr 8, Apr 15, May 12, 2026) and a walkthrough before deployment (Appendix P, p.204), where changes were requested (separate returns from voids, receipts on every sale; pp.209–217).
- **Why Firebase?** → Q10. **Why no ERD?** → Q11.

## System design (pp.39–98)
- Requirements count: 124 functional, 29 non-functional (pp.46–66). Traceability → `02-traceability.md`.
- Diagrams → `05-diagram-walkthrough.md`; the panel asked to revise their discussions (revision #5).
- **Are those wireframes?** → Q57 (pp.91–94).
- **Budget?** → Q58 (p.98).

## ISO/IEC 25010 evaluation and results (pp.99–118)
- Who answered and how? → Q43 (pp.101–103) · Why only 3 staff? → Q44 · Averages → Q45 · Lowest → Q46 · Students as respondents → Q47
- **Why these five characteristics and not all eight?** "We chose the ones the users can judge from use: functional suitability, performance, usability, reliability, security. Compatibility was covered by device and browser testing (p.100, "Performance and Compatibility Testing"); maintainability and portability are technical [NOT FOUND IN PAPER as tested items]."
- **Is a 4.00 average good?** "It's 'Good' on the scale (5 Excellent … 1 Unacceptable, p.102); every characteristic reached at least that."
- **How did you test reliability or security beyond the survey?** Test cases per requirement (pp.99–100), rule tests, and the group test on the live site (`study/14-testing.md`), including race tests (16/16 simultaneous sales).

## Conclusions and recommendations (pp.119–120)
- **Does your conclusion follow from the data?** It's backed by deployment (p.102) and ratings ≥ 4.00 (p.118). Be careful with "effectively resolved" (p.119) given the old POS is still used (G5).
- **Your recommendations?** → Q50 (p.120). Note: "new products and price changes should appear more quickly" is already done (Nov 16 change).
- **What would you do differently?** "Keep the diagrams in sync with every sprint, and evaluate exactly the characteristics named in objective 4."

## "Why didn't you use…?"

| Question | Answer | Source |
| --- | --- | --- |
| …a payment gateway (PayMongo, GCash API)? | Owner forbids third parties in payment; fees and holding period | Interview 3 pp.178–179; Appendix H p.141 |
| …cash on delivery? | "bayad po talaga muna, payment muna" | Interview 2 p.172 |
| …the Lalamove API? | Needs a prepaid wallet the owner won't fund | Interview 4 p.193; Appendix I p.141 |
| …LBC/J&T/Flash? | Client: nobody would bring parcels to them; Lalamove picks up | Interview 2 p.171 |
| …PHP/MySQL or Laravel? | No server to run; free HTTPS hosting; live updates; Google login | Q10; p.35 |
| …a mobile app? | Responsive site works on any phone without installing | REQNF003, REQNF022 pp.62–65 |
| …SMS OTP? | Cost; email is free; SMS listed as future integration | REQNF024 p.65 |
| …barcode scanning? | Not requested in the interviews; now recommended after the Sales Staff rating | p.120 |
| …BIR-registered receipts? | Client didn't want BIR integration; internal records only | Q51; Interview 1 pp.153, 159 |
| …senior/PWD discount? | Client: prices already wholesale-level | Interview 2 p.174; Q53 |
| …an ERD? | Firestore is document-based; collections described instead | Q11 |
| …ChatGPT instead of Gemini? | Gemini runs through Firebase (no key in our code), free tier, App Check | `js/chat-config.js`; p.35 |
