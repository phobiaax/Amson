/**
 * Mandatory "scroll to the bottom before you can accept" gate for the
 * combined Terms and Conditions / Privacy Policy modal.
 *
 * The agreeTerms checkbox looks and behaves like a normal checkbox, but
 * until the modal has been accepted once, clicking it opens the modal
 * instead of toggling. The "I Have Read and Agree" button inside stays
 * disabled until the body has been scrolled to the end. Accepting closes
 * the modal and checks the box; after that it's just a normal checkbox.
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

const legalAgreeCheckbox = document.getElementById("agreeTerms");

if (legalAgreeCheckbox) {
  let legalAccepted = false;

  legalAgreeCheckbox.addEventListener("click", (e) => {
    if (legalAccepted) return;
    e.preventDefault();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("legalModal")).show();
  });

  document.addEventListener("legal:accepted", () => {
    legalAccepted = true;
    legalAgreeCheckbox.checked = true;
  });
}
