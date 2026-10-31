/**
 * Searchable dropdown: a plain search box over a hidden <select>.
 * Staff click the box and type; matching options show underneath, and
 * picking one sets the <select> (and fires its "change" event).
 *
 * It replaces Choices.js and keeps the parts of its API the pages use:
 * setChoices(list, "value", "label", true), setChoiceByValue(value),
 * enable(), disable() and destroy().
 */
const SEARCH_SELECT_MAX_RESULTS = 50;

class SearchSelect {
  constructor(selectEl) {
    this.select = selectEl;
    this.activeIndex = -1;
    this.matches = [];

    this.wrapper = document.createElement("div");
    this.wrapper.className = "search-select";
    this.wrapper.innerHTML = `
      <i class="bi bi-search search-select-icon" aria-hidden="true"></i>
      <input type="text" class="form-control search-select-input" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-autocomplete="list">
      <i class="bi bi-chevron-down search-select-caret" aria-hidden="true"></i>
      <ul class="search-select-list d-none" role="listbox"></ul>`;
    this.input = this.wrapper.querySelector(".search-select-input");
    this.list = this.wrapper.querySelector(".search-select-list");

    selectEl.classList.add("d-none");
    selectEl.after(this.wrapper);
    if (selectEl.id) this.input.setAttribute("aria-label", selectEl.getAttribute("aria-label") || "Search");

    this.onFocus = () => this.open();
    this.onInput = () => this.render(this.input.value);
    this.onKeyDown = (e) => this.handleKey(e);
    this.onBlur = () => setTimeout(() => this.close(), 120);
    this.onCaret = () => (this.isOpen() ? this.input.blur() : this.input.focus());
    // mousedown (not click) so the pick happens before the input blurs.
    this.onListDown = (e) => {
      const li = e.target.closest("li[data-index]");
      if (!li) return;
      e.preventDefault();
      this.pick(this.matches[Number(li.dataset.index)]);
    };

    this.input.addEventListener("focus", this.onFocus);
    this.input.addEventListener("input", this.onInput);
    this.input.addEventListener("keydown", this.onKeyDown);
    this.input.addEventListener("blur", this.onBlur);
    this.wrapper.querySelector(".search-select-caret").addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.onCaret();
    });
    this.list.addEventListener("mousedown", this.onListDown);

    selectEl._searchSelect = this;
    this.showSelected();
    if (selectEl.disabled) this.disable();
  }

  options() {
    return [...this.select.options].map((o) => ({ value: o.value, label: o.textContent }));
  }

  selectedOption() {
    return this.options().find((o) => o.value === this.select.value) || null;
  }

  // The box shows the chosen option; an empty choice ("Choose a supplier")
  // shows as the placeholder instead.
  showSelected() {
    const opt = this.selectedOption();
    const firstEmpty = this.options().find((o) => o.value === "");
    this.input.value = opt && opt.value !== "" ? opt.label : "";
    this.input.placeholder = firstEmpty ? firstEmpty.label : "Type to search...";
  }

  isOpen() {
    return !this.list.classList.contains("d-none");
  }

  open() {
    if (this.input.disabled) return;
    this.input.select();
    this.render("");
    this.list.classList.remove("d-none");
    this.input.setAttribute("aria-expanded", "true");
  }

  close() {
    this.list.classList.add("d-none");
    this.input.setAttribute("aria-expanded", "false");
    this.showSelected();
  }

  // Every word typed must appear somewhere in the option, in any order.
  render(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const selectedLabel = (this.selectedOption() || {}).label;
    const showAll = !words.length || query === selectedLabel;
    this.matches = this.options()
      .filter((o) => o.value !== "")
      .filter((o) => showAll || words.every((w) => o.label.toLowerCase().includes(w)))
      .slice(0, SEARCH_SELECT_MAX_RESULTS);

    if (!this.matches.length) {
      this.list.innerHTML = `<li class="search-select-empty">No matches found</li>`;
      this.activeIndex = -1;
    } else {
      this.activeIndex = Math.max(0, this.matches.findIndex((o) => o.value === this.select.value));
      this.list.innerHTML = this.matches
        .map((o, i) => `<li data-index="${i}" role="option" class="${i === this.activeIndex ? "is-active" : ""}">${escapeSearchSelectText(o.label)}</li>`)
        .join("");
    }
    this.list.classList.remove("d-none");
    this.input.setAttribute("aria-expanded", "true");
  }

  highlight(index) {
    if (!this.matches.length) return;
    this.activeIndex = (index + this.matches.length) % this.matches.length;
    this.list.querySelectorAll("li[data-index]").forEach((li) => li.classList.toggle("is-active", Number(li.dataset.index) === this.activeIndex));
    const li = this.list.querySelector(`li[data-index="${this.activeIndex}"]`);
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  handleKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!this.isOpen()) this.render("");
      this.highlight(this.activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.highlight(this.activeIndex - 1);
    } else if (e.key === "Enter") {
      if (this.isOpen() && this.matches[this.activeIndex]) {
        e.preventDefault();
        this.pick(this.matches[this.activeIndex]);
      }
    } else if (e.key === "Escape") {
      if (this.isOpen()) {
        e.preventDefault();
        e.stopPropagation(); // don't close the modal around it
        this.input.blur();
      }
    }
  }

  pick(option) {
    if (!option) return;
    const changed = this.select.value !== option.value;
    this.select.value = option.value;
    this.close();
    this.input.blur();
    if (changed) this.select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /* ---- Choices.js-compatible API ---- */
  setChoices(list, valueKey = "value", labelKey = "label") {
    const previous = this.select.value;
    this.select.innerHTML = "";
    list.forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item[valueKey];
      opt.textContent = item[labelKey];
      this.select.appendChild(opt);
    });
    if ([...this.select.options].some((o) => o.value === previous)) this.select.value = previous;
    this.showSelected();
    if (this.isOpen()) this.render(this.input.value);
    return this;
  }

  setChoiceByValue(value) {
    this.select.value = value;
    this.showSelected();
    return this;
  }

  enable() {
    this.input.disabled = false;
    this.select.disabled = false;
    this.wrapper.classList.remove("is-disabled");
    return this;
  }

  disable() {
    this.input.disabled = true;
    this.select.disabled = true;
    this.wrapper.classList.add("is-disabled");
    this.close();
    return this;
  }

  destroy() {
    this.wrapper.remove();
    this.select.classList.remove("d-none");
    delete this.select._searchSelect;
  }
}

function escapeSearchSelectText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
