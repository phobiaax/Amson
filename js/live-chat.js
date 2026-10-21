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
      keys: ["delivery fee", "shipping fee", "lalamove", "deliver", "shipping", "padala"],
      answer:
        "Non-prescription orders are delivered by Lalamove. The delivery fee isn't included in your order total - you pay it directly to the rider. You can pick a preferred delivery schedule at checkout.",
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
      keys: ["track", "order status", "where is my order", "nasaan", "my order"],
      answer:
        "You can see your order's status in My Orders. Once it's dispatched, the Lalamove tracking link appears on the order page. If something looks wrong, type \"talk to staff\" and our team will check it.",
    },
    {
      keys: ["store hours", "open", "location", "address", "where are you", "contact", "saan"],
      answer:
        `We're Amson Pharmaceuticals, Las Piñas branch.${info.address ? ` Address: ${info.address}.` : ""}${info.hours ? ` Hours: ${info.hours}.` : ""}${contact ? ` You can also ${contact}.` : ""} The store details are also at the bottom of every page.`,
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

const CHAT_HEALTH_ANSWER =
  "I'm sorry, I can't recommend medicines or give advice about symptoms or doses. Our pharmacist can help - tap \"Talk to staff\" to ask them here. If your symptoms are severe or don't improve, please see a doctor.";

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
  ].join(" ");
}

let chatModelPromise = null;

// Loads Firebase AI Logic (modular SDK, separate from the compat SDK the
// rest of the site uses) only when the AI is first needed.
function getChatModel() {
  if (CHAT_CONFIG.aiProvider !== "gemini") return Promise.reject(new Error("AI disabled"));
  if (!chatModelPromise) {
    chatModelPromise = (async () => {
      const v = CHAT_CONFIG.firebaseModularSdkVersion;
      const appMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-app.js`);
      const aiMod = await import(`https://www.gstatic.com/firebasejs/${v}/firebase-ai.js`);
      const app = appMod.getApps().find((a) => a.name === "amson-chat") || appMod.initializeApp(firebaseConfig, "amson-chat");
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
          return `<div class="chat-msg ${cls}">${who}${escapeHtml(m.text)}</div>`;
        })
        .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function addMessage(sender, text) {
    await threadRef.collection("messages").add({
      sender,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
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

    if (chatIsHealthQuestion(text)) {
      await addMessage("assistant", CHAT_HEALTH_ANSWER);
      return;
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
