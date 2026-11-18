# Client Statements with Page Numbers

Source: **PRINTED MANUSCRIPT DEFENSE NOV 12.pdf** (Google Drive). Page numbers are the printed page numbers.

**Where the client's words are:**

| Appendix | What | Pages |
| --- | --- | --- |
| J | First interview (Mar 29, 2026) | pp.142–160 |
| K | Second interview (Apr 8, 2026) | pp.160–176 |
| L | Third interview (Apr 15, 2026) | pp.176–186 |
| M | Fourth interview (May 12, 2026), prototype walkthrough | pp.186–194 |
| P | Survey testing / demo to the branch | pp.204–218 |
| E | Screenshots of chats with the client (images only) | pp.136–137 |
| G | Agreement with the client (image) | p.140 |
| H, I | PayMongo pricing limit, Lalamove API limit (images) | p.141 |

How to use it: say the decision, then "the client said this in our Nth interview, page X", then the chapter page where the paper applies it.

---

## 1. The big policy decisions (most likely questions)

| Topic | What the client said | Page | Where the paper applies it |
| --- | --- | --- | --- |
| **No senior / PWD discount** | Asked about senior/PWD discount: *"Ah wala na po kasi wholesalan kasi to eh."* Walk-ins: *"Wala sa mga discount wala. Sa sobrang mura."* *"Wala na kasi sobrang baba na ng gamot eh."* | **pp.174–175** | Not written in Chapters 1–5. Answer straight from the transcript. |
| **No PayMongo / no payment gateway** | *"Hindi ba pedeng direct nalang samin… Direct talaga kailangang direct."* | p.173 | Limitations p.8 ("third-party payment gateways excluded based on client policy") |
| | *"hindi talaga kami pwedeng mag link sa ibang mga app eh. Ayaw ng boss namin."* *"ayaw niya ng may third party pag dating sa payment"* | pp.177–178 | Appendix H p.141 (PayMongo pricing) |
| | *"ang pinaka forbidden talaga is mag karoon kami ng third party sa payment. Ayaw ng may ari."* | **p.179** | |
| | For the record: *"Ayaw kasi nung may-ari ng third party… ayaw nila ng mga hassle… na hold pa… Kailangan diresto samin… Ang gusto nila real time."* | **p.193** | Recommendation p.120 (gateway is future work) |
| **No Lalamove API / wallet** | Topping up a Lalamove wallet needs office approval, *"dagdag gawain"*; company is *"very private… ayaw nila ng third party"* | p.181 | Appendix I p.141 (Lalamove API limit) |
| | *"Which is hindi talaga mangyayari. Ayaw rin ni sir."* Cash is picked up daily by a runner, *"hindi yan pwede tumagal samin ng 24 hours"*; *"Oo manual talaga mangyayari diyan."* *"puro kami product lang."* | **p.193** | Manual booking with copy button p.82; recommendation p.120 |
| | Booking: *"Mas maigi kung si customer, pero pwede naman na kami… Basta sila ang magbabayad sa rider."* | p.188 | |
| **Lalamove only, no LBC / J&T** | LBC needs drop-off: *"hindi na namin kayang icater yun"*; *"si lalamove okay lang"* (picks up at the store) | pp.171–172 | Delivery limited to the courier's area p.8 |
| | Courier pick-up is OK if no hassle, but payment stays the same | p.180 | |
| **Delivery fee paid to the rider** | Customer pays the medicine; the rider collects the fee from the customer: *"Pede naman yung ganun. Para wala na kaming…"* | **p.182** | REQ020 p.48; checkout notice p.39, p.70 |
| | They can't pay the rider from sales cash: *"negative kami sa cash"* | p.181 | |
| | Failed delivery: *"Hindi mag tetake ng risk yung company… si customer talaga mag babayad nun."* | pp.184–185 | |
| **No COD, payment first** | *"hindi kami nag rerelease ng gamot ng ganun, payment muna."* | **p.172** | REQ022 p.49 (pay before order) |
| | *"Hindi kasi kami nag papadala ng gamot ng hindi pa binabayaran, payment first kasi."* | p.178 | |
| **QR Ph (not GCash, not bank transfer)** | First: GCash and bank transfer only, no Maya; cards in store only | p.174 | Scope p.4; limitation p.8 |
| | Then: drop bank transfer, *"para maiwasan yung editing"*, GCash only; verified on the spot | pp.178–179 | |
| | Final: *"alisin na natin siya [GCash], naka QR Ph na kami ngayon… para sa lahat yun mapa GCash or banko."* | **p.187** | Payment module p.39 |
| **Screenshot proof + manual check** | Customer sends a screenshot; *"Iveverify namin on the spot."* | p.174 | Payment verification p.45 |
| | Fake screenshot risk: *"naveverify naman siya agad eh"*, the money either shows in the account or it doesn't | p.178 | |
| **No refunds, exchange only** | *"bawal refund dito ng pera"*; cash is banked daily to the main office | p.145 | Purpose p.5; limitation p.8 |
| | *"Hindi kami allowed na bumalik ng cash bumalik ng cheque, bumalik ng online."* | **p.170** | Wholesale exchange p.44, p.90 |
| | Wrong item delivered: *"exchange item no refund"* | p.182 | |
| | Once paid, no cancel: *"Edi wag muna silang mag bayad."* *"Kahit anong mode of payment hindi kami pwedeng mag labas ng pera."* | **pp.183–184** | Limitation p.8 (no customer cancellation or refund) |
| | Overpayment goes to the customer's account as credit: *"Oo, walang refund."* | p.188 | REQ098 p.58; REQ099 p.59; store credit p.82 |
| | Exchange for something cheaper isn't allowed: *"Mapipilitan silang mag order ng vitamins… wala kaming refund sa pera."* | **p.217** | |
| **No prescription medicine delivered online** | *"Bawal ang RX sa online mga over the counter lang"* | **p.159** | Rx is **pick-up only**: p.3, p.5, p.7; REQ023 p.49; REQ080 p.56 |
| | Rx flow shown to the branch: no address, bring the original prescription and ID | p.205 | |
| **No BIR / no government link** | *"baka mamaya naka connect kayo sa BIR?"*; *"Confidential hindi niyo pwedeng ilabas."* | p.153 | Receipts are internal records, not BIR: pp.3–4 |
| | *"wag muna between school lang tsaka yung sa atin"* | p.159 | BIR is future work p.120 |
| | Worried about tax exposure if the website spreads | pp.210–211 | |

## 2. Roles, prices, voids and the audit log

| Topic | What the client said | Page | Paper |
| --- | --- | --- | --- |
| **Price lock, one person** | Wants a lock: *"yung sa main lang yung nakakagalaw, para iwas kami sa… sisi"* | **p.150** | REQ071–073 p.55 |
| | *"kailangan lang one access, one person lock"* | p.151 | |
| | Separate manager laptop: *"siya lang yung pwedeng magbago nung price"* | p.152 | |
| | Only Sir Arman changes prices; *"Kailangan namin ng reason… reason and date"*; an audit log *"iwas sisi"*; note *"approved by boss"* for discounts | **p.165** | Audit log REQ122–124 pp.61–62 |
| **Roles** | Branch Manager needs every permission | pp.160–161 | REQ121 p.61 |
| | Sales staff: *"Sales lang talaga siya."* | p.162 | |
| | Manager prices without main office approval; manager approves exchanges (staff only when the manager is away) | p.161 | |
| **Void needs a second person** | Voided sale goes back to its quantity | pp.190–191 | Void REQ083 p.56; Branch Manager void approval p.100 |
| | *"hindi pwede na i-void niya yun unless wala ako… kailangan makita ng kasama mo"*; main problem is discrepancies | **p.191** | |
| | A void needs the receipt number, the reason, and whether there's an exchange item | p.191 | |
| **Return vs void** | A next-day return isn't a void; voiding it would deduct twice | **p.216** | Walk-in returns by SI number p.103 |
| | Book returns like a supplier delivery ("return/supplier") | pp.216–217 | |
| | Old problem: no void/cancel lock in their POS | p.150 | Problem statement p.1 |

## 3. Expiry, FEFO and stock

| Topic | What the client said | Page | Paper |
| --- | --- | --- | --- |
| **6 months: off retail. 2 months: Bad Order** | *"6 months bago mag-expire, pinipull out na yun. Hindi na siya for sale… After 2 months… lalabas na yun sa BO"* | **p.148** | REQ066–067 p.54; problem statement p.2 |
| | Near-expiry goes to doctors as free goods (Rx only to doctors) | p.148 | |
| **Expired stock has happened** | *"Oo naman, hindi maiwasan yun"*; DOH collects it, weighed and burned | p.147 | p.2 ("expired products have occurred") |
| **Batch and expiry tracking** | *"indicated yan sa inventory, yung batch nya at saka expiry"* | p.147 | FEFO REQ065 p.54 |
| | Branch follows first-expiry-first | pp.147–148 | |
| | One batch and one expiry per delivery | p.166 | |
| **Monthly physical count stays** | Store closes at month end to count | p.146 | p.4 (the system supports the count, doesn't replace it) |
| | *"hindi mo talaga malalaman yung totoong bilang kung hindi mo siya bibilangin actual"* | p.146 | |
| | *"hindi kasi kaya gawin ng system yung pag iinventory… tao parin gagawa"* | **p.192** | |
| | Mismatch: recount; still short, the employee pays (*"abono"*) | p.166 | |
| | Stock-count screen accepted ("so recorded na sya") | p.217 | |
| **Free of cost** | Needs a "free of cost" option for near-expiry given to doctors | pp.170–171 | REQ091 p.57 |
| | Wholesale only, so it doesn't show on the e-commerce side | p.171 | |

## 4. Wholesale

| Topic | What the client said | Page | Paper |
| --- | --- | --- | --- |
| **Not on the online store** | Prices can't be public: *"Ay hindi, hindi pwede."* *"Retail na lang tayo."* | **p.162** | REQ088 p.57; limitation p.8 |
| | *"They are not allowed to order online, yung wholesalers. Kasi we need the proper documents."* | p.162 | |
| | Online shows retail price for everyone: *"retail talaga para safe naman namin sa price"* | p.163 | |
| **Documents: LTO + Business Permit** | License to operate and business permit required | pp.162–163 | REQ085–086 p.57; p.2 |
| | Required before serving doctors and hospitals | p.149 | |
| | *"Kahit Xerox basta latest"*; uploading them is fine | p.164 | |
| **PO from chat, recorded in the system** | Orders come by Messenger, Viber or WhatsApp as a PO; recording it in the system: *"Oo, ganoon na lang."* | p.163 | REQ087 p.57; p.44 |
| **Purchase history per buyer** | Every purchase compiled in the customer's file | p.167 | REQ089 p.57 |
| | So a buyer can reorder "what I bought 3 weeks ago" without calling | p.168 | |
| | Walk-ins stay unnamed; wholesale needs a name | pp.167–168 | |
| **Wholesale returns** | Allowed (expiry or packaging) as change item, no money | p.170 | REQ090 p.57; p.90 |

## 5. Reports

| Topic | What the client said | Page | Paper |
| --- | --- | --- | --- |
| **Batch and expiry on reports** | *"Kailangan ko yung batch tsaka expiry"*, missing from their POS printout | **p.151** | Objective 3 p.5; REQ111–115 pp.60–61 |
| | Daily sales with quantity, batch and expiry, detailed | p.167 | |
| **Which reports** | Daily sales, monthly purchases (supplier), monthly inventory, pull-outs and returns | pp.168–169 | |
| | Recap: daily sales, monthly purchases, wholesale, pull-out | p.185 | |
| | Purchase details: *"batch expiry, date ng purchase, receipt number"* | p.169 | |
| | Batch, receipt number and date for supplier items | p.192 | |
| **Main office keeps its own system** | They still copy into the office's system; the goal is faster, not direct | pp.175–176 | Not a direct link (p.153 confidentiality) |
| **Dashboard and PDF** | *"Mas advanced siya… makikita mo na rin kung ano yung mabenta"* | pp.189–190 | Dashboard REQ047 p.52 |
| | Export the dashboard to PDF | p.190 | |
| | Reports split by category (generics vs medical supplies) | p.213 | |

## 6. Online store, chat and devices

| Topic | What the client said | Page | Paper |
| --- | --- | --- | --- |
| **E-commerce wanted** | *"Mas okay yun"*; less phoning and chatting | pp.153–154 | Project context pp.1–3 |
| | Pharmacies have to message or call Sir Arman | p.154 | |
| | Expects more customers online: *"Bakit pa pupunta sa shop ang init init"* | p.158 | |
| **Live chat** | *"mas okay din naman kung live chat siya… atleast na aassist agad"* | **p.177** | REQ035–038 pp.50–51 |
| | Staff reply in the website chat | p.187 | |
| **Phone access** | Manager rides a motorbike, needs it on the phone | p.155 | Responsive web p.7 |
| | Branch Manager can open it on a phone | p.216 | |
| **Registration to order** | Confirms customers must register first | p.189 | |
| **Volumes** | 1–2 online orders a day, 4–5 when busy | pp.176–177 | |
| | About 100 customers a week, at least 50 | p.192 | |
| | 20 receipts / ₱9k on slow days, up to 200 and ₱70k | p.144 | |
| **Hold and cancel** | Cancel only before processing | p.183 | 7-day hold, then credit: p.8, p.82 |

## 7. Receipts, POS and go-live

| Topic | What the client said | Page | Paper |
| --- | --- | --- | --- |
| **Receipts** | Their old POS is for inventory only; the sale is the handwritten sales invoice | p.150 | Problem p.1 |
| | Not every customer asks for a BIR receipt; POS receipt otherwise | p.164 | |
| | Always prints | p.165 | |
| | Wants a small printed receipt (who, items, date, time) | pp.209–212 | Receipt printing added p.103 |
| | Small thermal printer, like Mercury Drug | p.156 | Branch buys the printer p.103 |
| **Old POS stays as main** | *"huwag nalang dagalin si POS… main server namin yan"*; entries go in both | pp.208–209 | Known gap: integration is future work p.120 |
| **Walk-in payment methods** | Cash, QR, bank, terminal, credit; reference numbers except cash: *"dyan natitrace yung payment"* | **p.207** | POS payment method + reference p.101 |
| **Rx at the counter** | No prescription, no antibiotic; prescription isn't recorded | p.165 | |
| **Branch only** | Las Piñas only; usable in the Manila branch later over the internet | pp.152–153 | Limitation p.7 (single branch) |
| **Login IDs** | The branch changes the login IDs and passwords themselves | p.215 | |

## 8. Supporting statements from the evaluation

| Point | Detail | Page |
| --- | --- | --- |
| Deployed | Live at amsonpharma.web.app on **Oct 22, 2026** | p.102 |
| Survey dates | Oct 27–28, 2026 | p.103 |
| Changes the branch asked for during use, all done | Receipt for every sale, returns by SI number, Picked Up status, store address/hours/FDA LTO, hidden costing and wholesale prices, backup | p.103 |
| Respondents | 53: Branch Manager, Technical Staff, Sales Staff, 50 customers | p.102, p.119 |
| Branch Manager | Reports, prices and stock count 5; rule-following 5; account safety 3; overall 4 | pp.105–107 |
| Technical Staff | Usability, reliability and overall all 5 | pp.108–110 |
| Sales Staff | Overall 5; POS search 3; catalog updates 3 | pp.111–113 |
| Customers | Reliability 4.82 (highest); 40 of 50 overall Excellent; **48 of 50 would use it again** | pp.117–118 |
| All groups | Every characteristic averaged **4.00 or higher** | p.118 |
| Improvements already stated | POS search, faster catalog updates, staff account security, AI chat | pp.119–120 |
| Future work | BIR registration, multi-branch, old-POS integration, gateway and courier API, offline mode | p.120 |
| Client before the build | Missed problems? *"Hmmm wala naman."* | p.192 |
| | Expects less repeated work, faster | p.193 |
| | *"Sakin okay naman na siya"* | p.194 |
| | *"Actually okay naman siya maganda naman siya"* | p.188 |

## 9. Watch out

- **Senior/PWD** is only in the interview (pp.174–175), not in Chapters 1–5. Quote the page and the reason: wholesale prices are already low.
- **"Bawal ang RX sa online" (p.159)** can sound like it contradicts the Rx pre-order. Answer: nothing Rx is delivered or sold blind. It's pick-up only, a pharmacist checks the prescription, and the original plus an ID are shown at the counter (pp.3, 5, 7; p.205, where the branch saw this flow).
- **The client said "all payment modes" at the start (p.149)**, meaning walk-in. Online narrowed to GCash/bank (p.174), then GCash (p.179), then QR Ph (p.187). Walk-in still takes cash, QR, bank, terminal and credit (p.207).
- **Old POS stays as main (pp.208–209)**, so the branch enters some sales twice. It's admitted as future work (p.120).
- **Appendices E, G, H and I are images.** Check the printed copy for the chat screenshots (pp.136–137), the agreement (p.140) and the PayMongo/Lalamove limits (p.141).
