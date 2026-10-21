/**
 * Live Chat Management (REQ108-110): staff see every conversation, reply,
 * take over from the assistant, hand back, and mark threads resolved.
 * Threads and messages update live.
 */

const CHAT_STATUS_LABELS = {
  waiting_staff: "Needs staff",
  staff: "With staff",
  ai: "Assistant",
  resolved: "Resolved",
};

const CHAT_STATUS_BADGES = {
  waiting_staff: "text-bg-danger",
  staff: "text-bg-warning",
  ai: "text-bg-info",
  resolved: "text-bg-secondary",
};

const chatThreadList = document.getElementById("chatThreadList");
const chatThreadEmpty = document.getElementById("chatThreadEmpty");
const chatConversation = document.getElementById("chatConversation");
const chatConversationEmpty = document.getElementById("chatConversationEmpty");
const chatConvName = document.getElementById("chatConvName");
const chatConvMeta = document.getElementById("chatConvMeta");
const chatConvStatus = document.getElementById("chatConvStatus");
const chatConvMessages = document.getElementById("chatConvMessages");
const chatReplyForm = document.getElementById("chatReplyForm");
const chatReplyInput = document.getElementById("chatReplyInput");
const chatReplyBtn = document.getElementById("chatReplyBtn");
const chatHandBackBtn = document.getElementById("chatHandBackBtn");
const chatResolveBtn = document.getElementById("chatResolveBtn");
const chatUsageText = document.getElementById("chatUsageText");
const chatFilterButtons = Array.from(document.querySelectorAll(".chat-filter-btn"));

let chatThreads = [];
let chatFilter = "open";
let selectedThreadId = null;
let unsubscribeConv = null;
let staffName = "Staff";

document.addEventListener("admin:ready", (e) => {
  const admin = e.detail.admin;
  staffName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Staff";
  listenToThreads();
  loadChatUsage();
});

function chatMillis(ts) {
  return ts && ts.toMillis ? ts.toMillis() : 0;
}

function listenToThreads() {
  db.collection("chatThreads")
    .orderBy("lastMessageAt", "desc")
    .limit(200)
    .onSnapshot(
      (snap) => {
        chatThreads = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
        renderThreadList();
        if (selectedThreadId) renderConversationHeader();
      },
      (error) => {
        console.error("Failed to load chats:", error);
        chatThreadEmpty.textContent = "Chats couldn't be loaded. Make sure the latest database rules are published.";
        chatThreadEmpty.classList.remove("d-none");
      }
    );
}

async function loadChatUsage() {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  try {
    const doc = await db.collection("chatUsage").doc(key).get();
    const count = doc.exists ? doc.data().count || 0 : 0;
    chatUsageText.textContent = `AI replies today: ${count} of ${CHAT_CONFIG.dailyAiLimit}${count >= CHAT_CONFIG.dailyAiLimit ? " - limit reached, new questions go to staff" : ""}`;
  } catch (error) {
    chatUsageText.textContent = "AI replies today: unavailable";
  }
}

function filteredThreads() {
  const order = { waiting_staff: 0, staff: 1, ai: 2, resolved: 3 };
  return chatThreads
    .filter((t) => {
      if (chatFilter === "open") return t.status !== "resolved";
      if (chatFilter === "all") return true;
      return t.status === chatFilter;
    })
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || chatMillis(b.lastMessageAt) - chatMillis(a.lastMessageAt));
}

function renderThreadList() {
  const counts = { waiting_staff: 0 };
  chatThreads.forEach((t) => {
    if (t.status === "waiting_staff") counts.waiting_staff += 1;
  });
  const needsBadge = document.getElementById("chatNeedsStaffCount");
  needsBadge.textContent = counts.waiting_staff;
  needsBadge.classList.toggle("d-none", counts.waiting_staff === 0);

  const list = filteredThreads();
  chatThreadEmpty.classList.toggle("d-none", list.length > 0);
  if (list.length) chatThreadEmpty.textContent = "No chats here.";
  chatThreadList.innerHTML = list
    .map(
      (t) => `
        <button type="button" class="verification-queue-item ${t.id === selectedThreadId ? "active" : ""}" data-id="${t.id}">
          <div class="text-start" style="min-width:0;">
            <p class="fw-bold mb-0">${escapeHtml(t.customerName || "Guest")}
              ${t.unreadByStaff ? '<span class="badge rounded-pill text-bg-danger ms-1">New</span>' : ""}</p>
            <p class="text-muted mb-0 text-truncate" style="font-size:0.82rem;">${escapeHtml(t.lastMessage || "")}</p>
            <p class="text-muted mb-0" style="font-size:0.75rem;">${t.kind === "customer" ? "Customer" : "Guest"} - ${formatDateMDY(t.lastMessageAt, true)}</p>
          </div>
          <span class="badge rounded-pill ${CHAT_STATUS_BADGES[t.status] || "text-bg-light"}">${CHAT_STATUS_LABELS[t.status] || t.status}</span>
        </button>
      `
    )
    .join("");
  chatThreadList.querySelectorAll(".verification-queue-item").forEach((btn) => {
    btn.addEventListener("click", () => openThread(btn.dataset.id));
  });
}

function selectedThread() {
  return chatThreads.find((t) => t.id === selectedThreadId) || null;
}

function renderConversationHeader() {
  const t = selectedThread();
  if (!t) return;
  chatConvName.textContent = t.customerName || "Guest";
  chatConvMeta.textContent = `${t.kind === "customer" ? "Registered customer" : "Guest"} - started ${formatDateMDY(t.createdAt, true)}${t.resolvedBy ? ` - resolved by ${t.resolvedBy}` : ""}`;
  chatConvStatus.className = `badge rounded-pill ${CHAT_STATUS_BADGES[t.status] || "text-bg-light"}`;
  chatConvStatus.textContent = CHAT_STATUS_LABELS[t.status] || t.status;
  chatHandBackBtn.classList.toggle("d-none", t.status === "ai" || t.status === "resolved");
  chatResolveBtn.classList.toggle("d-none", t.status === "resolved");
}

function openThread(id) {
  selectedThreadId = id;
  if (unsubscribeConv) unsubscribeConv();
  chatConversationEmpty.classList.add("d-none");
  chatConversation.classList.remove("d-none");
  chatConvMessages.innerHTML = "";
  renderThreadList();
  renderConversationHeader();

  const ref = db.collection("chatThreads").doc(id);
  if ((selectedThread() || {}).unreadByStaff) ref.update({ unreadByStaff: false }).catch(() => {});
  unsubscribeConv = ref
    .collection("messages")
    .orderBy("createdAt")
    .onSnapshot(
      (snap) => {
        chatConvMessages.innerHTML = snap.docs
          .map((d) => {
            const m = d.data({ serverTimestamps: "estimate" });
            const time = formatDateMDY(m.createdAt, true);
            if (m.sender === "system") return `<div class="chat-msg chat-msg-system">${escapeHtml(m.text)}</div>`;
            const who = { customer: "Customer", assistant: "Assistant", staff: m.staffName || "Staff" }[m.sender] || m.sender;
            const cls = m.sender === "customer" ? "chat-msg-assistant" : m.sender === "staff" ? "chat-msg-customer" : "chat-msg-staff";
            return `<div class="chat-msg ${cls}"><span class="chat-msg-who">${escapeHtml(who)} - ${time}</span>${escapeHtml(m.text)}</div>`;
          })
          .join("");
        chatConvMessages.scrollTop = chatConvMessages.scrollHeight;
        const t = selectedThread();
        if (t && t.unreadByStaff && t.id === id) ref.update({ unreadByStaff: false }).catch(() => {});
      },
      (error) => console.error("Failed to load messages:", error)
    );
}

chatReplyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatReplyInput.value.trim().slice(0, 1000);
  if (!text || !selectedThreadId) return;
  chatReplyBtn.disabled = true;
  const ref = db.collection("chatThreads").doc(selectedThreadId);
  try {
    // Replying takes the chat over from the assistant.
    await ref.collection("messages").add({
      sender: "staff",
      staffName,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await ref.update({
      status: "staff",
      assignedStaff: staffName,
      unreadByStaff: false,
      lastMessage: text.slice(0, 120),
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    chatReplyInput.value = "";
  } catch (error) {
    await showAppAlert("Your reply couldn't be sent. Please try again.");
  } finally {
    chatReplyBtn.disabled = false;
    chatReplyInput.focus();
  }
});

chatHandBackBtn.addEventListener("click", async () => {
  if (!selectedThreadId) return;
  const ref = db.collection("chatThreads").doc(selectedThreadId);
  try {
    await ref.update({ status: "ai", unreadByStaff: false });
    await ref.collection("messages").add({
      sender: "system",
      text: "Our assistant will answer your next questions. Type \"talk to staff\" to reach our team again.",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await showAppAlert("Couldn't hand the chat back. Please try again.");
  }
});

chatResolveBtn.addEventListener("click", async () => {
  if (!selectedThreadId) return;
  const ref = db.collection("chatThreads").doc(selectedThreadId);
  try {
    await ref.update({
      status: "resolved",
      unreadByStaff: false,
      resolvedBy: staffName,
      resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    await ref.collection("messages").add({
      sender: "system",
      text: "This chat was marked resolved. Send a new message anytime if you need more help.",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await showAppAlert("Couldn't mark the chat resolved. Please try again.");
  }
});

chatFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    chatFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    chatFilter = btn.dataset.filter;
    renderThreadList();
  });
});

document.getElementById("chatUsageRefreshBtn").addEventListener("click", loadChatUsage);
