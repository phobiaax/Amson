/**
 * Customer live chat (REQ035-038) - the "Chat with us" buttons on shop pages.
 *
 * Every message is answered in this order:
 *   1. Staff already in the chat (or asked for) -> no automatic reply.
 *   2. Asking for a person -> handed to staff.
 *   3. A common question -> built-in answer (no AI used).
 *   4. Anything else -> Gemini (CHAT_CONFIG), within the daily AI limit.
 *   5. AI unavailable or over the limit -> matching products if any, else
 *      handed to staff.
 *
 * Threads live in chatThreads/{id} with a messages subcollection. Signed-in
 * customers use "cust_<uid>"; guests get a random "guest_..." id kept in
 * this browser. Staff answer from admin/live-chat.html.
 */

const CHAT_GUEST_KEY = "amsonChatGuestThread";
const CHAT_MAX_LENGTH = 500;

const CHAT_HANDOFF_WORDS = [
  "staff", "human", "agent", "real person", "talk to someone", "pharmacist", "tao", "kausap",
  "complaint", "reklamo", "wrong item", "maling item", "damaged", "sira",
];

// Built-in answers for the questions customers ask most (no AI call).
function chatFaqAnswers() {
  const info = typeof STORE_INFO !== "undefined" ? STORE_INFO : {};
  const contact = [info.hotline && `call ${info.hotline}`, info.email && `email ${info.email}`]
    .filter(Boolean)
    .join(" or ");
  return [
    {
      keys: ["how to pay", "how do i pay", "payment method", "paano magbayad", "gcash", "qr ph", "qrph", "bayad"],
      answer:
        "We accept payment through our QR Ph code only. At checkout, scan the QR code with your e-wallet or banking app, pay the exact total, then upload a screenshot of the payment and its reference number. Your order is confirmed once our staff verify it.",
    },
    {
      keys: ["delivery fee", "shipping fee", "lalamove", "deliver", "shipping", "padala", "magkano delivery", "magkano ang delivery"],
      answer:
        "Non-prescription orders are delivered by Lalamove. The delivery fee depends on how far you are, so it's set by Lalamove when our staff book your rider - it isn't part of your order total. We email you the exact fee with your delivery receipt, and you pay it directly to the rider. You can pick a preferred delivery schedule at checkout.",
    },
    {
      keys: ["prescription", "reseta", "rx"],
      answer:
        "Prescription medicines are for in-store pick-up only. Upload a clear photo of your valid prescription when you order; our pharmacist checks it before your order is prepared. Bring the original prescription and a valid ID when you pick it up.",
    },
    {
      keys: ["refund", "cancel", "ibalik ang pera", "return"],
      answer:
        "Paid orders can't be cancelled or refunded. If we sent the wrong item, tell us and we'll exchange it. If a payment can't be verified, the order goes on hold for up to 7 days; anything we verified is kept as store credit for your next order.",
    },
    {
      keys: ["store hours", "opening hours", "open", "close", "closing", "what time", "anong oras", "oras", "bukas", "sarado", "sunday", "holiday"],
      answer: info.hours
        ? `Our Las Piñas branch is open ${info.hours}.${contact ? ` You can also ${contact}.` : ""} Online orders can be placed any time; staff check them during store hours.`
        : `Our store hours aren't posted online yet - type "talk to staff" and our team will tell you.${contact ? ` You can also ${contact}.` : ""} Online orders can be placed any time; staff check them during store hours.`,
    },
    {
      keys: ["location", "address", "where are you", "where is", "contact", "saan", "nasaan", "phone number"],
      answer:
        `We're Amson Pharmaceuticals, Las Piñas branch.${info.address ? ` Address: ${info.address}.` : ""}${info.hours ? ` Open ${info.hours}.` : ""}${contact ? ` You can also ${contact}.` : ""}${info.address || contact ? "" : ' Type "talk to staff" and our team will send you the address and contact details.'}`,
    },
    {
      keys: ["wholesale", "bulk", "maramihan"],
      answer:
        "Wholesale orders (drugstores, clinics, hospitals) are handled directly by the branch, not through the online store. You'll need a valid License to Operate and Business Permit. Type \"talk to staff\" and our team will help you.",
    },
    {
      keys: ["receipt", "resibo"],
      answer: "Your order receipt can be downloaded from My Orders once your payment has been verified.",
    },
    {
      keys: ["store credit", "credit balance"],
      answer: "Store credit on your account is applied automatically to your next order at checkout. You can see your balance in Account Settings.",
    },
    {
      keys: ["forgot password", "reset password", "can't log in", "cant login"],
      answer: "Use \"Forgot password\" on the login page and we'll email you a reset link. Check your spam folder if it doesn't arrive in a few minutes.",
    },
  ];
}

function chatNormalize(text) {
  return ` ${String(text).toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ")} `;
}

function chatWantsStaff(text) {
  const t = chatNormalize(text);
  return CHAT_HANDOFF_WORDS.some((w) => t.includes(` ${w} `) || t.includes(` ${w}`));
}

// A built-in answer only for short, clearly-matching questions; longer or
// product-specific messages go to the AI.
function chatMatchFaq(text) {
  const t = chatNormalize(text);
  if (t.trim().split(" ").length > 14) return null;
  let best = null;
  let bestHits = 0;
  chatFaqAnswers().forEach((faq) => {
    const hits = faq.keys.filter((k) => t.includes(` ${k}`)).length;
    if (hits > bestHits) {
      best = faq;
      bestHits = hits;
    }
  });
  return best ? best.answer : null;
}

// Questions about symptoms, dosage or what to take get a fixed, safe
// answer: only a pharmacist or doctor may recommend medicine.
const CHAT_HEALTH_PATTERNS = [
  "good for", "medicine for", "gamot sa", "gamot para", "what to take", "what should i take", "pwede bang inumin",
  "pwede ba inumin", "safe to take", "dose", "dosage", "how many tablets", "ilang beses", "ilan ang iinumin",
  "side effect", "interaction", "symptom", "cough", "ubo", "fever", "lagnat", "headache", "sakit ng ulo", "migraine",
  "sore throat", "sipon", "colds", "flu", "trangkaso", "allergy", "allergies", "rash", "pantal", "diarrhea", "pagtatae",
  "nausea", "nahihilo", "hilo", "vomit", "suka", "stomach ache", "sakit ng tiyan", "toothache", "high blood",
  "hypertension", "diabetes", "asthma", "hika", "pregnant", "buntis", "breastfeeding", "infection", "pain", "masakit",
];

function chatIsHealthQuestion(text) {
  const t = chatNormalize(text);
  return CHAT_HEALTH_PATTERNS.some((p) => t.includes(` ${p} `) || t.includes(` ${p}s `));
}

const CHAT_STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "have", "has", "are", "how", "much", "many", "what", "whats", "can", "may", "does",
  "with", "this", "that", "there", "any", "available", "stock", "price", "pesos", "need", "want", "buy", "order", "sell",
  "meron", "mayroon", "kayo", "ninyo", "nyo", "ang", "mga", "magkano", "ilan", "para", "sana", "pwede", "paano", "yung",
]);

// Catalog lines for products the message names (public info only). Words
// match whole product words (or their start), so "for" never matches
// "Forte".
function chatProductMatches(text, limit = 8) {
  if (typeof SAMPLE_PRODUCTS === "undefined") return [];
  const words = chatNormalize(text)
    .trim()
    .split(" ")
    .filter((w) => w.length >= 3 && !CHAT_STOPWORDS.has(w));
  if (!words.length) return [];
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore !== false)
    .map((p) => {
      const tokens = chatNormalize(`${p.name} ${p.genericName || ""} ${p.brand || ""}`).trim().split(" ");
      const hit = (w) => tokens.some((t) => t === w || (w.length >= 4 && t.startsWith(w)));
      return { p, score: words.filter(hit).length };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) =>
      `${p.name}${p.genericName ? ` (${p.genericName})` : ""} - ${formatPeso(p.price)} - ${p.inStock ? `${p.totalStock} in stock` : "out of stock"}${p.rxRequired ? " - prescription required, pick-up only" : ""}`
    );
}

// ---- "What we carry for this" (health questions) ----
// The assistant never picks a medicine for anyone. For a recognized
// symptom it lists the store's non-prescription products whose own label
// text (description and Dosage / Usage notes, written by the pharmacy)
// mentions it - like a shelf sign - with a see-a-doctor warning and a
// button to ask the pharmacist. No AI is used, and nothing about the
// customer's health is sent anywhere.
const CHAT_SYMPTOMS = [
  { name: "fever", fil: "lagnat", say: ["fever", "lagnat", "nilalagnat", "sinat", "temperature"], label: ["fever", "pyrexia", "antipyretic"] },
  { name: "headache", fil: "sakit ng ulo", say: ["headache", "sakit ng ulo", "masakit ang ulo", "migraine"], label: ["headache", "migraine"] },
  { name: "body pain", fil: "pananakit ng katawan", say: ["body pain", "muscle pain", "sakit ng katawan", "pananakit ng katawan", "joint pain", "sprain", "ngalay"], label: ["body pain", "muscle pain", "muscular", "joint pain", "sprain", "aches"] },
  { name: "toothache", fil: "sakit ng ngipin", say: ["toothache", "sakit ng ngipin", "masakit ang ngipin"], label: ["toothache", "dental pain"] },
  { name: "cough", fil: "ubo", say: ["cough", "ubo", "inuubo", "plema", "phlegm"], label: ["cough", "phlegm", "mucus", "expectorant"] },
  { name: "colds", fil: "sipon", say: ["colds", "cold", "sipon", "sinisipon", "runny nose", "stuffy nose", "barado ang ilong", "clogged nose"], label: ["colds", "common cold", "nasal congestion", "runny nose", "decongestant"] },
  { name: "flu", fil: "trangkaso", say: ["flu", "trangkaso"], label: ["flu", "influenza"] },
  { name: "allergy", fil: "allergy o pangangati", say: ["allergy", "allergies", "allergic", "makati", "kati", "itchy", "rashes", "pantal", "hives"], label: ["allergy", "allergies", "allergic", "itch", "rashes", "hives", "antihistamine"] },
  { name: "diarrhea", fil: "pagtatae", say: ["diarrhea", "diarrhoea", "lbm", "pagtatae", "nagtatae", "loose bowel"], label: ["diarrhea", "diarrhoea", "loose bowel"] },
  { name: "acidity", fil: "hyperacidity o heartburn", say: ["hyperacidity", "acidity", "heartburn", "kabag", "bloating", "masakit ang sikmura", "sikmura"], label: ["hyperacidity", "acidity", "heartburn", "antacid", "bloating", "flatulence"] },
  { name: "menstrual pain", fil: "sakit ng puson tuwing may regla", say: ["dysmenorrhea", "menstrual cramps", "period pain", "regla", "puson"], label: ["dysmenorrhea", "menstrual"] },
  { name: "sore throat", fil: "masakit na lalamunan", say: ["sore throat", "masakit ang lalamunan", "lalamunan"], label: ["sore throat", "throat"] },
  { name: "motion sickness", fil: "hilo sa biyahe", say: ["motion sickness", "travel sickness", "hilo sa biyahe", "nahihilo sa sasakyan"], label: ["motion sickness", "travel sickness"] },
  { name: "constipation", fil: "tibi", say: ["constipation", "constipated", "tibi", "hindi makadumi"], label: ["constipation", "laxative"] },
];

// Questions about doses, children, pregnancy, other medicines or long-term
// conditions always go to the pharmacist - no product list at all.
const CHAT_HEALTH_CAUTION = [
  "dose", "dosage", "how many", "how much should", "ilang", "ilan ang", "gaano", "safe for", "safe ba", "pwede ba sa",
  "baby", "sanggol", "infant", "child", "children", "kid", "kids", "bata", "anak", "pregnant", "buntis",
  "breastfeeding", "nagpapasuso", "interaction", "together with", "kasabay", "maintenance", "high blood",
  "hypertension", "diabetes", "asthma", "hika", "kidney", "liver", "heart", "allergic to",
];

function chatSymptomsIn(text) {
  const t = chatNormalize(text);
  return CHAT_SYMPTOMS.filter((s) => s.say.some((w) => t.includes(` ${w} `)));
}

function chatHasHealthCaution(text) {
  const t = chatNormalize(text);
  // Whole words only ("heart" must not catch "heartburn").
  return CHAT_HEALTH_CAUTION.some((w) => t.includes(` ${w} `));
}

function chatOtcProducts() {
  if (typeof SAMPLE_PRODUCTS === "undefined") return [];
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore !== false && !p.rxRequired);
}

// Over-the-counter products sold online whose label text mentions any of
// the given label words.
function chatProductsForLabelWords(keys, limit = 4) {
  return chatOtcProducts()
    .filter((p) => {
      const label = chatNormalize(`${p.description || ""} ${p.dosageNotes || ""}`);
      return keys.some((k) => label.includes(` ${k}`));
    })
    .sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0) || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// The words the pharmacy uses on its over-the-counter labels - what Gemini
// may map a customer's description onto (it can't add words of its own).
const CHAT_LABEL_STOPWORDS = new Set([
  "relief", "relieves", "relieve", "tablet", "tablets", "capsule", "capsules", "syrup", "mild", "moderate", "severe", "such",
  "used", "uses", "take", "taken", "each", "every", "hours", "daily", "with", "from", "this", "that", "used", "temporary",
  "temporarily", "treatment", "treat", "treats", "symptoms", "symptom", "other", "adults", "adult", "children", "years",
  "older", "water", "food", "after", "before", "meals", "dose", "doses", "dosage", "label", "read", "only", "also", "help",
  "helps", "provides", "fast", "acting", "effective", "brand", "generic", "pack", "pieces", "piece", "box", "bottle",
]);
// Common over-the-counter medicine names, kept out of the label words even
// when a product's Generic Name field is empty.
const CHAT_MEDICINE_WORDS = new Set([
  "paracetamol", "acetaminophen", "ibuprofen", "mefenamic", "naproxen", "aspirin", "diclofenac", "loratadine", "cetirizine",
  "diphenhydramine", "chlorphenamine", "chlorpheniramine", "phenylephrine", "pseudoephedrine", "ambroxol", "carbocisteine",
  "guaifenesin", "dextromethorphan", "bromhexine", "loperamide", "simethicone", "aluminum", "aluminium", "magnesium",
  "hydroxide", "bisacodyl", "senna", "lactulose", "meclizine", "dimenhydrinate", "ranitidine", "famotidine", "omeprazole",
  "oxymetazoline", "clotrimazole", "hydrocortisone", "zinc", "ascorbic", "vitamin", "vitamins", "multivitamins",
]);

function chatLabelVocabulary(max = 300) {
  // Medicine, generic and brand names are left out, so Gemini can only ever
  // return what the customer describes - never a medicine.
  const productWords = new Set();
  (typeof SAMPLE_PRODUCTS !== "undefined" ? SAMPLE_PRODUCTS : []).forEach((p) =>
    chatNormalize(`${p.name || ""} ${p.genericName || ""} ${p.brand || ""}`).trim().split(" ").forEach((w) => productWords.add(w))
  );
  const counts = new Map();
  chatOtcProducts().forEach((p) => {
    new Set(chatNormalize(`${p.description || ""} ${p.dosageNotes || ""}`).trim().split(" ")).forEach((w) => {
      if (w.length >= 4 && !/^\d+$/.test(w) && !CHAT_LABEL_STOPWORDS.has(w) && !productWords.has(w) && !CHAT_MEDICINE_WORDS.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
    });
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([w]) => w);
}

const CHAT_FILIPINO_WORDS = ["po", "ang", "ng", "ba", "ako", "ko", "sa", "ano", "anong", "pwede", "puwede", "gamot", "mayroon", "meron", "kayo", "para", "yung", "mga", "masakit", "sakit", "ako", "nyo", "niyo", "lang"];
function chatLooksFilipino(text) {
  const t = chatNormalize(text);
  return CHAT_FILIPINO_WORDS.filter((w) => t.includes(` ${w} `)).length >= 2;
}

// Filipino for common label words that aren't a symptom group's name.
const CHAT_WORD_FIL = { pain: "pananakit", aches: "pananakit", itch: "pangangati", itching: "pangangati", swelling: "pamamaga", inflammation: "pamamaga", nausea: "pagduduwal", vomiting: "pagsusuka", dizziness: "pagkahilo", wounds: "sugat", burns: "paso" };

// Fixed wording for health replies - the AI never writes these.
const CHAT_HEALTH_TEXT = {
  en: {
    none: "I'm sorry, I can't recommend medicines or give advice about symptoms or doses. Our pharmacist can help - tap \"Ask our pharmacist\" to ask them here. If your symptoms are severe or don't improve, please see a doctor.",
    intro: (names, list) => `I can't tell you which medicine is right for you, but here's what we carry for ${names}, going by the product labels: ${list}.`,
    warn: "Please read the label before use. See a doctor right away if symptoms are severe, last more than 3 days, or are for a baby or young child, or if you're pregnant or breastfeeding.",
    and: " and ",
  },
  fil: {
    none: "Pasensya na po, hindi po ako makapagbibigay ng payo tungkol sa gamot, sintomas o dosis. Matutulungan po kayo ng aming pharmacist - pindutin ang \"Ask our pharmacist\" para makausap sila dito. Kung malala o hindi gumagaling, magpatingin po sa doktor.",
    intro: (names, list) => `Hindi ko po masasabi kung aling gamot ang tama para sa inyo, pero ito po ang mayroon kami para sa ${names}, ayon sa label ng produkto: ${list}.`,
    warn: "Basahin po ang label bago gamitin. Magpatingin agad sa doktor kung malala, higit 3 araw na, para sa sanggol o bata, o kung kayo ay buntis o nagpapasuso.",
    and: " at ",
  },
};

// ---- Order cards ----
function chatWantsOrders(text) {
  const t = chatNormalize(text);
  return (
    /amp \d{4} \d+/.test(t) ||
    ["my order", "my orders", "order status", "track", "tracking", "where is my order", "nasaan ang order", "nasaan na", "order ko", "status ng order", "on hold", "naka hold", "rider", "binili ko", "asan na", "kailan darating", "darating na", "delivery ko", "my parcel"].some((w) =>
      t.includes(` ${w}`)
    )
  );
}

const CHAT_ORDER_STATUS = {
  placed: "Waiting for payment check",
  payment_confirmed: "Payment confirmed - being prepared",
  dispatched: "On the way",
  delivered: "Delivered",
  received: "Received",
  closed_unresolved: "Closed (not resolved in 7 days)",
};
const CHAT_HOLD_LABELS = {
  invalid_payment: "On hold: payment screenshot couldn't be verified",
  underpayment: "On hold: payment is less than the total",
  payment_not_received: "On hold: payment not received",
  out_of_stock: "On hold: an item is out of stock",
  prescription_rejected: "On hold: prescription not accepted",
};

// The order as the customer should see it now: a hold whose 7 days have run
// out reads as closed (staff pages record the closure).
function chatOrderView(o) {
  const holdOver = o.paymentIssue && o.paymentIssue.holdUntil && o.paymentIssue.holdUntil.toMillis && o.paymentIssue.holdUntil.toMillis() < Date.now();
  const issue = holdOver ? null : o.paymentIssue || null;
  const status = holdOver ? "closed_unresolved" : o.status;
  const label = issue
    ? CHAT_HOLD_LABELS[issue.type] || "On hold"
    : status === "delivered" && o.requiresPrescription
    ? "Ready for pick-up"
    : CHAT_ORDER_STATUS[status] || status;
  return { issue, status, label };
}

// Progress steps for the order card. Prescription orders are picked up, so
// "delivered" there means ready at the store.
function chatOrderSteps(o, status) {
  const pickup = !!o.requiresPrescription || !o.shipping;
  const steps = pickup
    ? [["placed", "Placed"], ["payment_confirmed", "Paid"], ["delivered", "Ready"], ["received", "Picked up"]]
    : [["placed", "Placed"], ["payment_confirmed", "Paid"], ["dispatched", "On the way"], ["delivered", "Delivered"], ["received", "Received"]];
  const at = steps.findIndex(([key]) => key === status);
  return { pickup, steps, current: at };
}

const CHAT_SLOT_LABELS = { morning: "morning (8AM-12PM)", afternoon: "afternoon (12PM-4PM)", evening: "evening (4PM-8PM)" };

function chatDeliverySchedule(schedule) {
  if (!schedule || schedule.asap || !schedule.date) return "same day";
  const [y, m, d] = schedule.date.split("-");
  return `${m}/${d}/${y}${schedule.slot ? `, ${CHAT_SLOT_LABELS[schedule.slot] || schedule.slot}` : ""}`;
}

// Same check as the order page: only a Lalamove share link is shown.
function chatTrackingLink(o) {
  return o.trackingLink && /^https:\/\/share\.lalamove\.com\/\S+$/i.test(o.trackingLink) ? o.trackingLink : null;
}

// What happens next / what the customer should do, in plain words.
function chatOrderNextStep(o, view) {
  const { pickup } = chatOrderSteps(o, view.status);
  if (view.issue) {
    const by = view.issue.holdUntil && view.issue.holdUntil.toDate ? ` by ${formatDateMDY(view.issue.holdUntil)}` : " within 7 days";
    return view.issue.type === "prescription_rejected"
      ? `Open the order and upload a clearer, valid prescription${by}.`
      : view.issue.type === "out_of_stock"
      ? `Open the order to choose what to do${by}, or talk to staff.`
      : `Open the order and upload a new payment screenshot and reference number${by}.`;
  }
  switch (view.status) {
    case "placed":
      return o.requiresPrescription
        ? "Our pharmacist is checking your prescription and staff are verifying your payment. We'll notify you once it's confirmed."
        : "Staff are verifying your payment. We'll notify you once it's confirmed.";
    case "payment_confirmed":
      return pickup
        ? "Your order is being prepared. We'll tell you here when it's ready for pick-up."
        : `Your order is being prepared for delivery (${chatDeliverySchedule(o.deliverySchedule)}). The rider tracking link appears here once it's on the way.`;
    case "dispatched":
      return chatTrackingLink(o)
        ? "Tap Track rider to follow it on Lalamove. Pay the delivery fee to the rider when it arrives."
        : "It's with the rider. The tracking link will show here as soon as staff add it. Pay the delivery fee to the rider.";
    case "delivered":
      return pickup
        ? "Ready at the store. Bring the original prescription and a valid ID, then mark it as picked up in your order."
        : "Delivered. Got everything? Open the order and tap Mark as Received.";
    case "received":
      return "Completed. Thank you! Your receipt is in the order page.";
    case "closed_unresolved":
      return "This order was closed because the hold wasn't resolved in 7 days. Talk to staff if you need help.";
    default:
      return "";
  }
}

function chatSystemInstruction() {
  return [
    "You are the online assistant of Amson Pharmaceuticals, Las Piñas branch, a pharmacy in the Philippines.",
    "Reply in the customer's language (English, Filipino or Taglish), warmly and briefly: at most 80 words, plain text, no markdown.",
    "Store policies: Payment is by QR Ph only; the customer uploads a screenshot and reference number, and staff verify it before the order is confirmed.",
    "Non-prescription orders are delivered by Lalamove; the delivery fee is paid to the rider and is not part of the order total.",
    "Prescription medicines are pick-up only; the customer uploads a prescription photo when ordering and brings the original prescription and a valid ID at pick-up.",
    "Paid orders cannot be cancelled or refunded. Wrong items sent by the store are exchanged. Unverified payments are held up to 7 days; verified amounts become store credit applied to the next order.",
    "Medicines within 6 months of expiry are not sold online. Wholesale buyers are served directly by the branch.",
    "Never give medical advice, dosages, diagnoses, drug interactions or prescription validation; tell the customer to ask a pharmacist or doctor.",
    "Only mention products, prices and stock from the product list given with the question. If a product isn't listed, say you couldn't find it and suggest searching the shop or asking staff. Never invent prices.",
    "Never ask for passwords, payment details or personal information.",
    "If the customer needs help with their specific order or payment, has a complaint, asks for a person, or you are not sure, answer briefly and end your reply with the exact text [[STAFF]].",
    "If the customer describes symptoms or a health condition, or asks what medicine to take or buy for one, reply with only the exact text [[HEALTH]] and nothing else.",
    "If the customer asks about their own order (where it is, its status, tracking, the rider, what they bought), reply with only the exact text [[ORDERS]] and nothing else.",
  ].join(" ");
}

let chatModelPromise = null;

// The chat's own Firebase app (modular SDK), with App Check on it too when
// APP_CHECK_SITE_KEY is set, so only this site can use the Gemini quota.
let chatAppPromise = null;
function getChatFirebaseApp(appMod, v) {
  if (!chatAppPromise) {
    chatAppPromise = (async () => {
      const existing = appMod.getApps().find((a) => a.name === "amson-chat");
      if (existing) return existing;
      const app = appMod.initializeApp(firebaseConfig, "amson-chat");
      if (typeof APP_CHECK_SITE_KEY !== "undefined" && APP_CHECK_SITE_KEY) {
        const checkMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app-check.js`);
        checkMod.initializeAppCheck(app, { provider: new checkMod.ReCaptchaV3Provider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
      }
      return app;
    })();
    chatAppPromise.catch(() => {
      chatAppPromise = null;
    });
  }
  return chatAppPromise;
}

// Loads Firebase AI Logic (modular SDK, separate from the compat SDK the
// rest of the site uses) only when the AI is first needed.
function getChatModel() {
  if (CHAT_CONFIG.aiProvider !== "gemini") return Promise.reject(new Error("AI disabled"));
  if (!chatModelPromise) {
    chatModelPromise = (async () => {
      const v = CHAT_CONFIG.firebaseModularSdkVersion;
      const appMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`);
      const aiMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-ai.js`);
      const app = await getChatFirebaseApp(appMod, v);
      const ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
      return aiMod.getGenerativeModel(ai, {
        model: CHAT_CONFIG.geminiModel,
        systemInstruction: chatSystemInstruction(),
        generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
      });
    })();
    chatModelPromise.catch(() => {
      chatModelPromise = null;
    });
  }
  return chatModelPromise;
}

// A second Gemini model used only to READ health questions: it returns
// JSON (symptom words from the pharmacy's own labels, plus caution flags)
// and never writes anything the customer sees.
let chatReaderPromise = null;
function getChatReaderModel() {
  if (CHAT_CONFIG.aiProvider !== "gemini") return Promise.reject(new Error("AI disabled"));
  if (!chatReaderPromise) {
    chatReaderPromise = (async () => {
      const v = CHAT_CONFIG.firebaseModularSdkVersion;
      const appMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`);
      const aiMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-ai.js`);
      const app = await getChatFirebaseApp(appMod, v);
      const ai = aiMod.getAI(app, { backend: new aiMod.GoogleAIBackend() });
      return aiMod.getGenerativeModel(ai, {
        model: CHAT_CONFIG.geminiModel,
        systemInstruction: [
          "You read one message sent to a Philippine pharmacy's online chat and return JSON only, never a reply to the customer.",
          'Return exactly: {"health": boolean, "symptoms": string[], "caution": boolean, "language": "en" | "fil"}.',
          "health: true if the customer describes symptoms or a condition, or asks what to take or buy for one.",
          "symptoms: the words from the VOCABULARY list (and only from it) that name what the customer describes. Understand English, Filipino, Taglish, typos and descriptions (for example 'mainit ang noo' or 'nilalagnat' -> 'fever'; 'kumikirot ang tuhod' -> 'pain'). Use [] if nothing in the list fits. Never name a medicine and never diagnose beyond the customer's own words.",
          "caution: true if it is about a baby or child, pregnancy or breastfeeding, doses or how many or how often to take, another medicine or maintenance medicine, a long-term condition, or a serious sign (chest pain, trouble breathing, fainting, bleeding, seizures, a fever over 3 days, very high fever).",
          "language: fil if the message is in Filipino or Taglish, otherwise en.",
        ].join(" "),
        generationConfig: { maxOutputTokens: 150, temperature: 0, responseMimeType: "application/json" },
      });
    })();
    chatReaderPromise.catch(() => {
      chatReaderPromise = null;
    });
  }
  return chatReaderPromise;
}

// Resolves { health, symptoms, caution, language }, { limitReached: true },
// or null when the AI isn't available. Only the message itself is sent -
// no name, account, orders or earlier messages.
async function chatAiReadHealth(question, vocabulary) {
  let model;
  try {
    model = await getChatReaderModel();
  } catch (error) {
    console.warn("Chat AI unavailable:", error);
    return null;
  }
  try {
    if (!(await claimChatAiQuota())) return { limitReached: true };
  } catch (error) {
    return null;
  }
  try {
    const result = await model.generateContent(`VOCABULARY: ${vocabulary.join(", ")}\n\nMESSAGE: ${question}`);
    const raw = (result.response.text() || "").trim().replace(/^```(?:json)?|```$/g, "");
    const data = JSON.parse(raw);
    const allowed = new Set(vocabulary);
    return {
      health: !!data.health,
      symptoms: (Array.isArray(data.symptoms) ? data.symptoms : []).map((w) => String(w).toLowerCase().trim()).filter((w) => allowed.has(w)),
      caution: !!data.caution,
      language: data.language === "fil" ? "fil" : "en",
    };
  } catch (error) {
    console.warn("Chat AI couldn't read the question:", error);
    return null;
  }
}

function chatTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Counts one AI reply against today's limit; false once the limit is reached.
async function claimChatAiQuota() {
  const ref = db.collection("chatUsage").doc(chatTodayKey());
  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const count = doc.exists ? doc.data().count || 0 : 0;
    if (count >= CHAT_CONFIG.dailyAiLimit) return false;
    if (doc.exists) tx.update(ref, { count: count + 1, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    else tx.set(ref, { count: 1, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    return true;
  });
}

// Resolves { text, handoff } or null if the AI couldn't answer.
async function chatAiReply(history, question) {
  let model;
  try {
    model = await getChatModel();
  } catch (error) {
    console.warn("Chat AI unavailable:", error);
    return null;
  }
  let allowed = false;
  try {
    allowed = await claimChatAiQuota();
  } catch (error) {
    console.warn("Chat AI quota check failed:", error);
    return null;
  }
  if (!allowed) return { limitReached: true };

  const products = chatProductMatches(question);
  const contents = history.map((m) => ({
    role: m.sender === "customer" ? "user" : "model",
    parts: [{ text: m.sender === "staff" ? `(Staff) ${m.text}` : m.text }],
  }));
  contents.push({
    role: "user",
    parts: [
      {
        text: `${question}\n\n[Product list for this question: ${products.length ? products.join("; ") : "no matching products found"}]`,
      },
    ],
  });
  // Gemini expects the conversation to start with the customer.
  while (contents.length && contents[0].role !== "user") contents.shift();

  // The free tier allows about 15 AI requests a minute across the whole
  // site. If a burst hits that limit, wait a few seconds and try once more
  // before falling back to products / staff.
  const isRateLimited = (error) => /429|RESOURCE_EXHAUSTED|quota|rate/i.test(String((error && error.message) || error));
  try {
    let result;
    try {
      result = await model.generateContent({ contents });
    } catch (error) {
      if (!isRateLimited(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      result = await model.generateContent({ contents });
    }
    let text = (result.response.text() || "").trim();
    if (text.includes("[[HEALTH]]")) return { health: true };
    if (text.includes("[[ORDERS]]")) return { orders: true };
    const handoff = text.includes("[[STAFF]]");
    text = text.replace(/\[\[STAFF\]\]/g, "").trim();
    if (!text) return handoff ? { text: "", handoff } : null;
    return { text, handoff };
  } catch (error) {
    console.warn("Chat AI request failed:", error);
    return null;
  }
}

/* ---------- Widget ---------- */
(function initLiveChat() {
  const entries = document.querySelectorAll("[data-chat-entry]");
  if (!entries.length || typeof db === "undefined") return;

  let threadId = null;
  let threadRef = null;
  let thread = null; // latest thread doc data (null until the first message)
  let displayName = "Guest";
  let customerId = null;
  let messages = [];
  let unsubscribeMessages = null;
  let unsubscribeThread = null;
  let sending = false;
  let lastSentAt = 0;
  // The signed-in customer's orders, for order cards (read live, not copied
  // into the chat).
  let myOrders = null;

  const panel = document.createElement("div");
  panel.className = "chat-panel d-none";
  panel.id = "chatPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat with Amson Pharmaceuticals");
  panel.innerHTML = `
    <div class="chat-panel-header">
      <div>
        <p class="fw-bold mb-0">Amson Pharmaceuticals</p>
        <p class="mb-0 chat-status-text" id="chatStatusText">Assistant</p>
      </div>
      <button type="button" class="chat-close-btn" id="chatCloseBtn" aria-label="Close chat"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="chat-messages" id="chatMessages" aria-live="polite"></div>
    <div class="chat-quick" id="chatQuick">
      <button type="button" data-q="Where is my order?">My orders</button>
      <button type="button" data-q="How do I pay?">How do I pay?</button>
      <button type="button" data-q="How much is the delivery fee?">Delivery fee</button>
      <button type="button" data-q="How do prescription orders work?">Prescription orders</button>
      <button type="button" data-q="I want to talk to staff" id="chatTalkToStaffBtn">Talk to staff</button>
      <button type="button" class="d-none" id="chatBackToAssistantBtn">Back to assistant</button>
    </div>
    <form class="chat-input-row" id="chatForm">
      <input type="text" class="form-control" id="chatInput" maxlength="${CHAT_MAX_LENGTH}" placeholder="Type your question..." autocomplete="off" aria-label="Message">
      <button type="submit" class="btn btn-amson" id="chatSendBtn" aria-label="Send"><i class="bi bi-send"></i></button>
    </form>
    <p class="chat-disclaimer">Our assistant can't give medical advice. For dosage or health questions, please ask our pharmacist.</p>
  `;
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#chatMessages");
  const statusText = panel.querySelector("#chatStatusText");
  const form = panel.querySelector("#chatForm");
  const input = panel.querySelector("#chatInput");
  const sendBtn = panel.querySelector("#chatSendBtn");

  const STATUS_TEXT = {
    ai: "Assistant",
    waiting_staff: "Waiting for staff",
    staff: "Chatting with staff",
    resolved: "Assistant",
  };

  function guestThreadId() {
    let id = null;
    try {
      id = localStorage.getItem(CHAT_GUEST_KEY);
    } catch (error) {}
    if (!id || !/^guest_[A-Za-z0-9]{24}$/.test(id)) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      id = `guest_${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
      try {
        localStorage.setItem(CHAT_GUEST_KEY, id);
      } catch (error) {}
    }
    return id;
  }

  const identityReady = new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      let nextId = null;
      customerId = null;
      stopMyOrders();
      displayName = "Guest";
      if (user) {
        try {
          const doc = await db.collection("users").doc(user.uid).get();
          if (doc.exists && doc.data().role === "customer") {
            customerId = user.uid;
            nextId = `cust_${user.uid}`;
            displayName = `${doc.data().firstName || ""} ${doc.data().lastName || ""}`.trim() || "Customer";
          }
        } catch (error) {
          console.warn("Chat: couldn't read the account:", error);
        }
      }
      if (!nextId) nextId = guestThreadId();
      if (nextId !== threadId) switchThread(nextId);
      resolve();
    });
  });

  function switchThread(id) {
    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeThread) unsubscribeThread();
    threadId = id;
    threadRef = db.collection("chatThreads").doc(id);
    thread = null;
    messages = [];
    renderMessages();
    unsubscribeThread = threadRef.onSnapshot(
      (doc) => {
        thread = doc.exists ? doc.data() : null;
        const status = thread ? thread.status : "ai";
        statusText.textContent = STATUS_TEXT[status] || "Assistant";
        // While waiting, the customer can change their mind and go back to
        // the assistant. Once staff have replied, only staff hand it back.
        panel.querySelector("#chatBackToAssistantBtn").classList.toggle("d-none", status !== "waiting_staff");
        panel.querySelector("#chatTalkToStaffBtn").classList.toggle("d-none", status === "waiting_staff" || status === "staff");
      },
      (error) => console.warn("Chat thread listener:", error)
    );
    unsubscribeMessages = threadRef
      .collection("messages")
      .orderBy("createdAt")
      .onSnapshot(
        (snap) => {
          messages = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
          renderMessages();
        },
        (error) => console.warn("Chat messages listener:", error)
      );
  }

  function renderMessages() {
    const welcome = `<div class="chat-msg chat-msg-assistant">Hi! I'm the Amson Pharmaceuticals assistant. Ask me about products, ordering, payment, delivery or prescription orders. Type "talk to staff" anytime to reach our team.</div>`;
    messagesEl.innerHTML =
      welcome +
      messages
        .map((m) => {
          if (m.sender === "system") return `<div class="chat-msg chat-msg-system">${escapeHtml(m.text)}</div>`;
          const cls = m.sender === "customer" ? "chat-msg-customer" : m.sender === "staff" ? "chat-msg-staff" : "chat-msg-assistant";
          const who = m.sender === "staff" ? `<span class="chat-msg-who">${escapeHtml(m.staffName || "Staff")}</span>` : "";
          // Buttons sit side by side under the cards.
          const list = Array.isArray(m.cards) ? m.cards : [];
          const buttons = list.filter((c) => c.type === "button").map(cardHtml).join("");
          const cards = list.length
            ? `<div class="chat-cards">${list.filter((c) => c.type !== "button").map(cardHtml).join("")}${buttons ? `<div class="chat-card-actions">${buttons}</div>` : ""}</div>`
            : "";
          return `<div class="chat-msg ${cls}">${who}${escapeHtml(m.text)}</div>${cards}`;
        })
        .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
    // Order cards need the customer's orders; load them once, then redraw.
    if (myOrders === null && customerId && messages.some((m) => (m.cards || []).some((c) => c.type === "order"))) {
      loadMyOrders().then(renderMessages);
    }
  }

  // Listened to live, so an order card's status moves on its own when staff
  // confirm, dispatch or flag the order.
  let myOrdersReady = null;
  let myOrdersFor = null;
  let unsubscribeMyOrders = null;
  function stopMyOrders() {
    if (unsubscribeMyOrders) unsubscribeMyOrders();
    unsubscribeMyOrders = null;
    myOrdersReady = null;
    myOrdersFor = null;
    myOrders = null;
  }
  function loadMyOrders() {
    if (!customerId) return Promise.resolve([]);
    // A different account signed in on this page: drop the old listener.
    if (myOrdersFor && myOrdersFor !== customerId) stopMyOrders();
    if (myOrdersReady) return myOrdersReady;
    myOrdersFor = customerId;
    myOrdersReady = new Promise((resolve) => {
      let first = true;
      unsubscribeMyOrders = db.collection("orders").where("customerId", "==", customerId).onSnapshot(
        (snap) => {
          myOrders = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0));
          if (first) {
            first = false;
            resolve(myOrders);
          } else {
            renderMessages();
          }
        },
        (error) => {
          console.warn("Chat: couldn't load orders:", error);
          const last = myOrders || [];
          // Not kept: the next order question tries again.
          stopMyOrders();
          myOrders = last;
          resolve(last);
        }
      );
    });
    return myOrdersReady;
  }

  const shopPath = (page) => `${/\/shop\//.test(window.location.pathname) ? "" : "shop/"}${page}`;

  // Cards under a message. Product and order cards show live data.
  function cardHtml(card) {
    if (card.type === "button") {
      return `<button type="button" class="chat-card-btn" data-chat-q="${escapeHtml(card.q || card.label)}">${escapeHtml(card.label)}</button>`;
    }
    if (card.type === "login") {
      return `<a class="chat-card-btn" href="${/\/shop\//.test(window.location.pathname) ? "../" : ""}login.html">Log in to see your orders</a>`;
    }
    if (card.type === "product") {
      const p = typeof getProductById === "function" ? getProductById(card.id) : null;
      if (!p) return "";
      return `
        <div class="chat-card">
          <a class="fw-medium d-block" href="${shopPath(`product-details.html?id=${encodeURIComponent(p.id)}`)}">${escapeHtml(p.name)}</a>
          <div class="text-muted" style="font-size:0.78rem;">${formatPeso(p.price)} - ${p.inStock ? `${p.totalStock} in stock` : "Out of stock"}</div>
          ${p.dosageNotes ? `<div style="font-size:0.75rem;" class="mt-1">${escapeHtml(p.dosageNotes)}</div>` : ""}
          ${p.inStock ? `<button type="button" class="btn btn-amson btn-sm mt-2 btn-add-cart" data-id="${escapeHtml(p.id)}">+ Add to Cart</button>` : ""}
        </div>`;
    }
    if (card.type === "order") {
      const o = (myOrders || []).find((x) => x.id === card.id);
      if (!o) return myOrders === null ? `<div class="chat-card text-muted" style="font-size:0.78rem;">Loading order...</div>` : "";
      const view = chatOrderView(o);
      const { issue, status: liveStatus, label: status } = view;
      const items = o.items || [];
      const itemCount = items.reduce((n, i) => n + (i.qty || 0), 0);
      const link = chatTrackingLink(o);
      const tracking = link && ["dispatched", "delivered", "received"].includes(liveStatus)
        ? `<a class="chat-card-btn" href="${escapeHtml(safeUrl(link))}" target="_blank" rel="noopener"><i class="bi bi-geo-alt"></i> Track rider</a>`
        : "";
      const orderLink = `<a class="chat-card-btn" href="${shopPath(`order-details.html?id=${encodeURIComponent(o.id)}`)}">${issue ? "Fix this order" : "View order"}</a>`;
      const thumb = (item) => {
        const imageUrl = item.imageUrl || ((typeof getProductById === "function" && getProductById(item.id)) || {}).imageUrl;
        const url = safeUrl(imageUrl) === "#" ? "" : imageUrl;
        return `<span class="chat-order-thumb" style="${escapeHtml(cartItemImageCss(url))}"></span>`;
      };
      const head = `
          <div class="d-flex justify-content-between gap-2"><span class="fw-bold">${escapeHtml(o.orderNumber || "")}</span><span style="font-size:0.78rem;">${formatPeso(o.total || 0)}</span></div>
          <div class="text-muted" style="font-size:0.75rem;">${formatDateMDY(o.createdAt)} - ${itemCount} item${itemCount === 1 ? "" : "s"}</div>`;

      // Several orders: a short card each, with a button for the details.
      if (!card.detail) {
        return `
        <div class="chat-card">
          ${head}
          <div class="chat-order-thumbs mt-1">${items.slice(0, 4).map(thumb).join("")}${items.length > 4 ? `<span class="text-muted" style="font-size:0.72rem;">+${items.length - 4}</span>` : ""}</div>
          <div class="mt-1 ${issue ? "text-danger" : ""}" style="font-size:0.8rem; font-weight:600;">${escapeHtml(status)}</div>
          <div class="d-flex gap-1 flex-wrap mt-2">
            <button type="button" class="chat-card-btn" data-chat-q="${escapeHtml(`Track order ${o.orderNumber || ""}`)}">Show details</button>
            ${tracking}
          </div>
        </div>`;
      }

      const { pickup, steps, current } = chatOrderSteps(o, liveStatus);
      const stamps = o.statusTimestamps || {};
      const stepper = issue || liveStatus === "closed_unresolved"
        ? ""
        : `<div class="chat-order-steps mt-2">${steps
            .map(([key, label], i) => {
              const state = i < current ? "done" : i === current ? "now" : "";
              const when = stamps[key] && stamps[key].toDate ? formatDateMDY(stamps[key]) : "";
              return `<div class="chat-order-step ${state}"><span class="dot"></span><span class="lbl">${escapeHtml(label)}</span>${when && state ? `<span class="when">${escapeHtml(when)}</span>` : ""}</div>`;
            })
            .join("")}</div>`;
      const shown = items.slice(0, 3);
      return `
        <div class="chat-card">
          ${head}
          <div class="mt-2">
            ${shown
              .map((item) => `
            <div class="chat-order-item">
              ${thumb(item)}
              <span class="flex-grow-1">${escapeHtml(item.name || "")}<span class="text-muted d-block" style="font-size:0.72rem;">Qty ${item.qty || 0} x ${formatPeso(item.price || 0)}</span></span>
            </div>`)
              .join("")}
            ${items.length > shown.length ? `<div class="text-muted" style="font-size:0.72rem;">+${items.length - shown.length} more item${items.length - shown.length === 1 ? "" : "s"}</div>` : ""}
          </div>
          <div class="mt-2 ${issue ? "text-danger" : ""}" style="font-size:0.82rem; font-weight:700;">${escapeHtml(status)}</div>
          ${stepper}
          <div class="text-muted mt-1" style="font-size:0.75rem;">${pickup ? "Pick-up at the Amson Pharmaceuticals store" : `Delivery by Lalamove to ${escapeHtml([o.shipping.city, o.shipping.province].filter(Boolean).join(", "))}`}</div>
          ${issue && issue.note ? `<div class="mt-1" style="font-size:0.75rem;">Staff note: ${escapeHtml(issue.note)}</div>` : ""}
          <div class="chat-order-next mt-2">${escapeHtml(chatOrderNextStep(o, view))}</div>
          <div class="d-flex gap-1 flex-wrap mt-2">
            ${orderLink}
            ${tracking}
          </div>
        </div>`;
    }
    return "";
  }

  messagesEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chat-q]");
    if (btn) send(btn.dataset.chatQ);
  });

  async function addMessage(sender, text, cards = null) {
    const msg = { sender, text, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (cards && cards.length) msg.cards = cards;
    await threadRef.collection("messages").add(msg);
  }

  async function answerOrders(text) {
    if (!customerId) {
      await addMessage("assistant", "Log in to see your orders here. You can also check them anytime in My Orders.", [{ type: "login" }]);
      return;
    }
    const orders = await loadMyOrders();
    const numberMatch = String(text).toUpperCase().match(/AMP-\d{4}-\d+/);
    let picked;
    if (numberMatch) {
      picked = orders.filter((o) => (o.orderNumber || "").toUpperCase() === numberMatch[0]);
      if (!picked.length) {
        await addMessage("assistant", `I couldn't find order ${numberMatch[0]} on your account. Here are your recent orders instead.`);
      }
    }
    if (!picked || !picked.length) {
      // Orders still in progress first, then the latest ones.
      // "Show all my orders" skips that and lists the latest five.
      const open = orders.filter((o) => !["received", "closed_unresolved"].includes(chatOrderView(o).status));
      picked = /\ball\b|lahat/i.test(text) ? orders.slice(0, 5) : (open.length ? open : orders).slice(0, 3);
    }
    if (!picked.length) {
      await addMessage("assistant", "You don't have any orders yet. Browse the shop to place your first one.");
      return;
    }
    const staffButton = { type: "button", label: "Talk to staff", q: "I want to talk to staff" };
    if (picked.length > 1) {
      const held = picked.some((o) => chatOrderView(o).issue);
      await addMessage(
        "assistant",
        `Here are your recent orders. Tap Show details on one to see its items, status and tracking.${held ? " One needs your attention before its deadline." : ""}`,
        picked.map((o) => ({ type: "order", id: o.id })).concat([staffButton])
      );
      return;
    }

    // One order: the full card, plus follow-ups that fit where it is.
    const o = picked[0];
    const view = chatOrderView(o);
    const { pickup } = chatOrderSteps(o, view.status);
    const followUps = [];
    if (!view.issue && !pickup && ["payment_confirmed", "dispatched"].includes(view.status)) {
      followUps.push({ type: "button", label: "Delivery fee?", q: "How much is the delivery fee?" });
    }
    if (!view.issue && pickup && ["payment_confirmed", "delivered"].includes(view.status)) {
      followUps.push({ type: "button", label: "What to bring for pick-up", q: "What do I bring for prescription pick-up?" });
    }
    if (orders.length > 1) followUps.push({ type: "button", label: "My other orders", q: "Show all my orders" });
    followUps.push(staffButton);
    await addMessage(
      "assistant",
      // The card shows the live status; this line stays true as it changes.
      `Here's order ${o.orderNumber}. The card below updates as your order moves.`,
      [{ type: "order", id: o.id, detail: true }].concat(followUps)
    );
  }

  // Health questions (see "What we carry for this" above). Returns true
  // when it answered; false when it wasn't a health question after all.
  async function answerHealth(text, { viaAi = false } = {}) {
    const pharmacistButton = { type: "button", label: "Ask our pharmacist", q: "I want to ask the pharmacist" };
    let lang = chatLooksFilipino(text) ? "fil" : "en";
    const reply = async (key) => {
      await addMessage("assistant", CHAT_HEALTH_TEXT[lang][key], [pharmacistButton]);
      return true;
    };
    if (chatHasHealthCaution(text)) return reply("none");
    if (typeof loadCatalogCache === "function") {
      try {
        await loadCatalogCache();
      } catch (error) {}
    }

    // 1. The built-in symptom list (free, no AI).
    let names = [];
    let labelWords = [];
    const known = chatSymptomsIn(text);
    if (known.length) {
      names = known.map((sx) => (lang === "fil" ? sx.fil : sx.name));
      labelWords = known.flatMap((sx) => sx.label);
    } else {
      // 2. Gemini only reads the question and maps it onto the words on
      // the pharmacy's labels; products still come from those labels.
      const vocabulary = chatLabelVocabulary();
      const read = vocabulary.length ? await chatAiReadHealth(text, vocabulary) : null;
      if (!read || read.limitReached) return reply("none");
      if (!read.health) return viaAi ? reply("none") : false;
      lang = read.language;
      if (read.caution) return reply("none");
      labelWords = read.symptoms;
      names = read.symptoms.map((w) => {
        const group = CHAT_SYMPTOMS.find((sx) => sx.label.includes(w));
        if (group) return lang === "fil" ? group.fil : group.name;
        return lang === "fil" ? CHAT_WORD_FIL[w] || w : w;
      });
    }
    const products = labelWords.length ? chatProductsForLabelWords(labelWords) : [];
    if (!products.length) return reply("none");
    const t = CHAT_HEALTH_TEXT[lang];
    await addMessage(
      "assistant",
      `${t.intro([...new Set(names)].join(t.and), products.map((p) => p.name).join(", "))}\n\n${t.warn}`,
      products.map((p) => ({ type: "product", id: p.id })).concat([pharmacistButton])
    );
    return true;
  }


  // Creates the thread on the first message, reopens a resolved one.
  async function touchThread(text) {
    const base = {
      lastMessage: text.slice(0, 120),
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      customerName: displayName,
    };
    if (!thread) {
      // The listener may not have delivered an existing thread yet.
      const existing = await threadRef.get();
      if (existing.exists) thread = existing.data();
    }
    if (!thread) {
      await threadRef.set({
        ...base,
        kind: customerId ? "customer" : "guest",
        customerId,
        status: "ai",
        unreadByStaff: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      thread = { status: "ai" };
      return;
    }
    const update = { ...base };
    if (thread.status === "resolved") update.status = "ai";
    if (thread.status === "waiting_staff" || thread.status === "staff") update.unreadByStaff = true;
    await threadRef.update(update);
    if (update.status) thread.status = update.status;
  }

  async function handOffToStaff(reason, note) {
    await threadRef.update({
      status: "waiting_staff",
      unreadByStaff: true,
      handoffReason: reason,
      handoffAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if (thread) thread.status = "waiting_staff";
    await addMessage("system", note || "I've passed your chat to our staff. A staff member will reply here as soon as they can during store hours.");
  }

  async function respond(text) {
    const status = thread ? thread.status : "ai";
    if (status === "staff" || status === "waiting_staff") return; // staff will answer

    if (chatWantsStaff(text)) {
      await handOffToStaff("customer_asked");
      return;
    }

    if (chatWantsOrders(text)) {
      await answerOrders(text);
      return;
    }

    if (chatIsHealthQuestion(text) || chatSymptomsIn(text).length) {
      if (await answerHealth(text)) return;
    }

    const faq = chatMatchFaq(text);
    if (faq) {
      await addMessage("assistant", faq);
      return;
    }

    if (typeof loadCatalogCache === "function") {
      try {
        await loadCatalogCache();
      } catch (error) {}
    }

    const earlier = messages.filter((m) => m.sender !== "system");
    // The message just sent is passed separately as the question.
    const last = earlier[earlier.length - 1];
    if (last && last.sender === "customer" && last.text === text) earlier.pop();
    const history = earlier.slice(-CHAT_CONFIG.historyMessages).map((m) => ({ sender: m.sender, text: m.text }));
    const reply = await chatAiReply(history, text);

    // The AI spotted a health question the word lists missed.
    if (reply && reply.health) {
      await answerHealth(text, { viaAi: true });
      return;
    }
    // ...or an order question worded in a way the word list doesn't know.
    if (reply && reply.orders) {
      await answerOrders(text);
      return;
    }
    if (reply && reply.text) {
      await addMessage("assistant", reply.text);
      if (reply.handoff) await handOffToStaff("assistant_unsure");
      return;
    }
    if (reply && reply.handoff) {
      await handOffToStaff("assistant_unsure");
      return;
    }

    // No AI answer (unavailable or over today's limit).
    const products = chatProductMatches(text, 5);
    if (products.length) {
      await addMessage("assistant", `Here's what I found in our shop: ${products.join("; ")}. For anything else, type "talk to staff".`);
      return;
    }
    await handOffToStaff(
      reply && reply.limitReached ? "ai_limit" : "ai_unavailable",
      "Our assistant can't answer that right now, so I've passed your chat to our staff. A staff member will reply here as soon as they can during store hours."
    );
  }

  async function send(text) {
    text = String(text || "").trim().slice(0, CHAT_MAX_LENGTH);
    if (!text || sending) return;
    if (Date.now() - lastSentAt < 1500) return; // simple flood guard
    sending = true;
    lastSentAt = Date.now();
    sendBtn.disabled = true;
    input.value = "";
    try {
      await identityReady;
      await touchThread(text);
      await addMessage("customer", text);
      await respond(text);
    } catch (error) {
      console.error("Chat send failed:", error);
      messagesEl.insertAdjacentHTML(
        "beforeend",
        `<div class="chat-msg chat-msg-system">Your message couldn't be sent. Please check your connection and try again.</div>`
      );
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } finally {
      sending = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function openChat() {
    panel.classList.remove("d-none");
    document.querySelectorAll(".floating-chat-btn").forEach((b) => b.classList.add("chat-open"));
    renderMessages();
    setTimeout(() => input.focus(), 50);
  }

  function closeChat() {
    panel.classList.add("d-none");
    document.querySelectorAll(".floating-chat-btn").forEach((b) => b.classList.remove("chat-open"));
  }

  entries.forEach((el) => {
    el.classList.remove("d-none");
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openChat();
    });
  });
  panel.querySelector("#chatCloseBtn").addEventListener("click", closeChat);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input.value);
  });
  panel.querySelectorAll("#chatQuick button[data-q]").forEach((btn) => btn.addEventListener("click", () => send(btn.dataset.q)));
  panel.querySelector("#chatBackToAssistantBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    if (!thread || thread.status !== "waiting_staff") return;
    btn.disabled = true;
    try {
      await threadRef.update({ status: "ai", unreadByStaff: false });
      thread.status = "ai";
      await addMessage("system", "You're back with the assistant. Tap \"Talk to staff\" anytime to reach our team.");
    } catch (error) {
      console.error("Chat: couldn't switch back to the assistant:", error);
    } finally {
      btn.disabled = false;
    }
  });
})();
