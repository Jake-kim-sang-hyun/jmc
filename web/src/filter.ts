type FilterField = "categories" | "locations";

let nameQuery = "";
let menuQuery = "";

function collectUniqueTags(
  tbody: HTMLTableSectionElement,
  field: FilterField,
): string[] {
  const set = new Set<string>();
  tbody
    .querySelectorAll<HTMLTableRowElement>("tr.restaurant-row")
    .forEach((tr) => {
      const cell = tr.querySelector<HTMLElement>(`[data-field='${field}']`);
      cell
        ?.querySelectorAll<HTMLElement>(".tag[data-tag]")
        .forEach((el) => {
          const t = el.dataset.tag?.trim();
          if (t) set.add(t);
        });
    });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
}

function rowHasAnyTag(
  tr: HTMLTableRowElement,
  field: FilterField,
  selected: Set<string>,
): boolean {
  if (selected.size === 0) return true;
  const cell = tr.querySelector<HTMLElement>(`[data-field='${field}']`);
  if (!cell) return false;
  const tags = cell.querySelectorAll<HTMLElement>(".tag[data-tag]");
  for (const el of Array.from(tags)) {
    const t = el.dataset.tag?.trim();
    if (t && selected.has(t)) return true;
  }
  return false;
}

function rowMatchesName(tr: HTMLTableRowElement, query: string): boolean {
  if (query === "") return true;
  const nameCell = tr.querySelector<HTMLElement>("[data-field='name']");
  const name = nameCell?.textContent?.trim().toLowerCase() ?? "";
  return name.includes(query);
}

function getMenuRowsFor(tr: HTMLTableRowElement): HTMLTableRowElement[] {
  const rows: HTMLTableRowElement[] = [];
  let sibling = tr.nextElementSibling as HTMLElement | null;
  while (sibling && !sibling.classList.contains("restaurant-row")) {
    if (sibling.classList.contains("menu-row")) {
      rows.push(sibling as HTMLTableRowElement);
    }
    sibling = sibling.nextElementSibling as HTMLElement | null;
  }
  return rows;
}

function menuRowMatches(
  menuTr: HTMLTableRowElement,
  query: string,
): boolean {
  if (query === "") return true;
  const nameCell = menuTr.querySelector<HTMLElement>("[data-field='menu-name']");
  const name = nameCell?.textContent?.trim().toLowerCase() ?? "";
  return name.includes(query);
}

function setRowGroupVisible(
  tr: HTMLTableRowElement,
  visible: boolean,
  menuFilterQuery: string,
): void {
  tr.style.display = visible ? "" : "none";
  const menuRows = getMenuRowsFor(tr);
  menuRows.forEach((menuTr) => {
    if (!visible) {
      menuTr.style.display = "none";
      return;
    }
    const show = menuFilterQuery === "" || menuRowMatches(menuTr, menuFilterQuery);
    menuTr.style.display = show ? "" : "none";
  });
}

export function initTagFilters(tbody: HTMLTableSectionElement): void {
  const container = document.querySelector<HTMLElement>("#tag-filters");
  if (!container) return;

  const selected: Record<FilterField, Set<string>> = {
    categories: new Set(),
    locations: new Set(),
  };

  function applyFilter(): void {
    tbody
      .querySelectorAll<HTMLTableRowElement>("tr.restaurant-row")
      .forEach((tr) => {
        const baseVisible =
          rowMatchesName(tr, nameQuery) &&
          rowHasAnyTag(tr, "categories", selected.categories) &&
          rowHasAnyTag(tr, "locations", selected.locations);

        let visible = baseVisible;
        if (visible && menuQuery !== "") {
          const menus = getMenuRowsFor(tr);
          visible = menus.some((m) => menuRowMatches(m, menuQuery));
        }

        setRowGroupVisible(tr, visible, menuQuery);
      });
  }

  function buildGroup(label: string, field: FilterField): HTMLElement {
    const group = document.createElement("div");
    group.className = "filter-group";
    group.dataset.field = field;

    const labelEl = document.createElement("span");
    labelEl.className = "filter-label";
    labelEl.textContent = label;
    group.appendChild(labelEl);

    const tags = collectUniqueTags(tbody, field);
    tags.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-tag";
      btn.textContent = t;
      btn.dataset.tag = t;
      if (selected[field].has(t)) btn.classList.add("active");
      btn.addEventListener("click", () => {
        if (selected[field].has(t)) {
          selected[field].delete(t);
          btn.classList.remove("active");
        } else {
          selected[field].add(t);
          btn.classList.add("active");
        }
        applyFilter();
      });
      group.appendChild(btn);
    });

    return group;
  }

  function render(): void {
    // Drop selected tags that no longer exist
    (["categories", "locations"] as FilterField[]).forEach((field) => {
      const existing = new Set(collectUniqueTags(tbody, field));
      selected[field].forEach((t) => {
        if (!existing.has(t)) selected[field].delete(t);
      });
    });

    container.innerHTML = "";
    container.appendChild(buildGroup("카테고리", "categories"));
    container.appendChild(buildGroup("위치", "locations"));
    applyFilter();
  }

  render();

  const nameInput = document.querySelector<HTMLInputElement>("#name-filter");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      nameQuery = nameInput.value.trim().toLowerCase();
      applyFilter();
    });
  }

  const menuInput = document.querySelector<HTMLInputElement>("#menu-filter");
  if (menuInput) {
    menuInput.addEventListener("input", () => {
      menuQuery = menuInput.value.trim().toLowerCase();
      applyFilter();
    });
  }

  // Rebuild when tag set changes (add/remove tag, new/deleted row)
  document.addEventListener("jmc:tags-changed", () => {
    render();
  });
}
