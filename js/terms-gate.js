/**
 * Mandatory "scroll to the bottom before you can accept" gate for the
 * Terms and Conditions / Privacy Policy modals. The "I Have Read and
 * Agree" button in each modal stays disabled until its body has been
 * scrolled to the end; the main agreeTerms checkbox on the page stays
 * disabled until every required modal has been accepted at least once.
 */

document.querySelectorAll(".legal-modal").forEach((modal) => {
  const body = modal.querySelector(".legal-modal-body");
  const acceptBtn = modal.querySelector(".legal-accept-btn");
  const hint = modal.querySelector(".legal-scroll-hint");

  function checkScroll() {
    const reachedBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 8;
    acceptBtn.disabled = !reachedBottom;
    if (reachedBottom) hint.classList.add("d-none");
  }

  body.addEventListener("scroll", checkScroll);
  modal.addEventListener("shown.bs.modal", () => {
    body.scrollTop = 0;
    acceptBtn.disabled = true;
    hint.classList.remove("d-none");
  });

  acceptBtn.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("legal:accepted", { detail: { id: modal.id } }));
    bootstrap.Modal.getOrCreateInstance(modal).hide();
  });
});

const acceptedLegalDocs = new Set();
const requiredLegalDocs = ["termsModal", "privacyModal"];
const legalAgreeCheckbox = document.getElementById("agreeTerms");
const legalAgreeHint = document.getElementById("agreeTermsHint");

document.addEventListener("legal:accepted", (e) => {
  acceptedLegalDocs.add(e.detail.id);
  if (requiredLegalDocs.every((id) => acceptedLegalDocs.has(id))) {
    legalAgreeCheckbox.disabled = false;
    if (legalAgreeHint) legalAgreeHint.classList.add("d-none");
  }
});
