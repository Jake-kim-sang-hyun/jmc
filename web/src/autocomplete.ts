import { hangulStartsWith } from "./hangul";

function collectAllTags(field: string): string[] {
  const set = new Set<string>();
  document
    .querySelectorAll<HTMLElement>(`[data-field='${field}'] .tag[data-tag]`)
    .forEach((el) => {
      const t = el.dataset.tag?.trim();
      if (t) set.add(t);
    });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
}

function getExistingTags(container: HTMLElement): Set<string> {
  const set = new Set<string>();
  container.querySelectorAll<HTMLElement>(".tag[data-tag]").forEach((el) => {
    const t = el.dataset.tag?.trim();
    if (t) set.add(t);
  });
  return set;
}

export interface Autocomplete {
  update(query: string): void;
  moveUp(): void;
  moveDown(): void;
  hasActiveItem(): boolean;
  getActiveValue(): string | null;
  hide(): void;
  isVisible(): boolean;
  destroy(): void;
}

export function createAutocomplete(
  container: HTMLElement,
  field: string,
  onSelect: (value: string) => void,
): Autocomplete {
  const list = document.createElement("div");
  list.className = "autocomplete-list";
  list.style.display = "none";
  container.style.position = "relative";
  container.appendChild(list);

  let activeIndex = -1;
  let items: string[] = [];

  function setActive(idx: number): void {
    const children = list.children;
    if (activeIndex >= 0 && activeIndex < children.length) {
      children[activeIndex].classList.remove("autocomplete-active");
    }
    activeIndex = idx;
    if (activeIndex >= 0 && activeIndex < children.length) {
      children[activeIndex].classList.add("autocomplete-active");
      (children[activeIndex] as HTMLElement).scrollIntoView({
        block: "nearest",
      });
    }
  }

  function hide(): void {
    list.style.display = "none";
    list.innerHTML = "";
    items = [];
    activeIndex = -1;
  }

  function update(query: string): void {
    if (query === "") {
      hide();
      return;
    }
    const allTags = collectAllTags(field);
    const existing = getExistingTags(container);
    const filtered = allTags.filter(
      (t) => !existing.has(t) && hangulStartsWith(t, query),
    );
    items = filtered;
    activeIndex = -1;
    list.innerHTML = "";
    if (filtered.length === 0) {
      list.style.display = "none";
      return;
    }
    filtered.forEach((tag, i) => {
      const div = document.createElement("div");
      div.className = "autocomplete-item";
      div.textContent = tag;
      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        onSelect(tag);
      });
      div.addEventListener("mouseenter", () => {
        setActive(i);
      });
      list.appendChild(div);
    });
    list.style.display = "";
  }

  return {
    update,
    moveUp() {
      if (items.length === 0) return;
      setActive(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
    },
    moveDown() {
      if (items.length === 0) return;
      setActive(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
    },
    hasActiveItem() {
      return activeIndex >= 0 && activeIndex < items.length;
    },
    getActiveValue() {
      if (activeIndex >= 0 && activeIndex < items.length)
        return items[activeIndex];
      return null;
    },
    hide,
    isVisible() {
      return list.style.display !== "none" && items.length > 0;
    },
    destroy() {
      list.remove();
    },
  };
}
