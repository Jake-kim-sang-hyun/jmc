import type { SearchFilter, SearchState } from "./types";
import { saveSearch } from "./api";

type FilterField = "categories" | "locations";

let nameQuery = "";
let menuQuery = "";
let visitedFilter: boolean | null = null; // null=전체, true=방문, false=미방문
let cooldownDays: number | null = null; // null=미적용, N=N일 이상 지난 식당만
let minPrice: number | null = null; // null=하한 없음(0 이상)
let maxPrice: number | null = null; // null=상한 없음(무한대)
let minRating: number | null = null; // null=하한 없음
let maxRating: number | null = null; // null=상한 없음
let reservableFilter: boolean | null = null;
let walkinFilter: boolean | null = null;
let waitingFilter: boolean | null = null;
// 월=0, 화=1, ..., 일=6. Date.getDay()는 일=0이므로 +6 % 7로 변환.
const TODAY_DAY_INDEX = (new Date().getDay() + 6) % 7;
const openDaysSelected: Set<number> = new Set([TODAY_DAY_INDEX]); // 비어있으면 미적용. 교집합 조건. 초기에는 오늘 요일 활성화.

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function rowMatchesOpenDays(tr: HTMLTableRowElement, selected: Set<number>): boolean {
  if (selected.size === 0) return true;
  const checks = tr.querySelectorAll<HTMLInputElement>(".open-day-check");
  if (checks.length !== 7) return true; // 데이터 없으면 매일 영업으로 간주
  const open: boolean[] = [true, true, true, true, true, true, true];
  checks.forEach((input) => {
    const day = parseInt(input.dataset.day ?? "-1", 10);
    if (day >= 0 && day < 7) open[day] = input.checked;
  });
  for (const d of selected) {
    if (!open[d]) return false;
  }
  return true;
}

let savedFilters: SearchFilter[] = [];
let selectedIndex: number | null = null;

function loadInitialSearch(): void {
  const el = document.getElementById("initial-search");
  if (!el) return;
  try {
    const data: SearchState = JSON.parse(el.textContent || "{}");
    savedFilters = data.filters ?? [];
    selectedIndex = data.selected ?? null;
  } catch {
    // ignore parse errors
  }
}

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

function menuRowMatchesPrice(
  menuTr: HTMLTableRowElement,
  min: number | null,
  max: number | null,
): boolean {
  if (min === null && max === null) return true;
  const cell = menuTr.querySelector<HTMLElement>("[data-field='menu-price']");
  const raw = cell?.textContent?.replace(/[^\d]/g, "") ?? "";
  if (raw === "") return false;
  const price = parseInt(raw, 10);
  if (Number.isNaN(price)) return false;
  if (min !== null && price < min) return false;
  if (max !== null && price > max) return false;
  return true;
}

function menuRowVisible(menuTr: HTMLTableRowElement): boolean {
  return (
    menuRowMatches(menuTr, menuQuery) &&
    menuRowMatchesPrice(menuTr, minPrice, maxPrice)
  );
}

function rowMatchesRating(
  tr: HTMLTableRowElement,
  min: number | null,
  max: number | null,
): boolean {
  if (min === null && max === null) return true;
  const select = tr.querySelector<HTMLSelectElement>("[data-field='rating'] .rating-select");
  if (!select) return true;
  const rating = parseFloat(select.value);
  if (Number.isNaN(rating)) return true;
  if (min !== null && rating < min) return false;
  if (max !== null && rating > max) return false;
  return true;
}

function rowMatchesCooldown(tr: HTMLTableRowElement, days: number | null): boolean {
  if (days === null) return true;
  const input = tr.querySelector<HTMLInputElement>(".last-visited-input");
  if (!input || !input.value) return true; // 방문 기록 없으면 표시
  const lastDate = new Date(input.value);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= days;
}

function rowMatchesVisited(tr: HTMLTableRowElement, filter: boolean | null): boolean {
  if (filter === null) return true;
  const checkbox = tr.querySelector<HTMLInputElement>(".visited-check");
  if (!checkbox) return true;
  return checkbox.checked === filter;
}

function rowMatchesCheckbox(tr: HTMLTableRowElement, selector: string, filter: boolean | null): boolean {
  if (filter === null) return true;
  const checkbox = tr.querySelector<HTMLInputElement>(selector);
  if (!checkbox) return true;
  return checkbox.checked === filter;
}

function setRowGroupVisible(
  tr: HTMLTableRowElement,
  visible: boolean,
): void {
  tr.style.display = visible ? "" : "none";
  const menuRows = getMenuRowsFor(tr);
  const menuFilterActive =
    menuQuery !== "" || minPrice !== null || maxPrice !== null;
  menuRows.forEach((menuTr) => {
    if (!visible) {
      menuTr.style.display = "none";
      return;
    }
    const show = !menuFilterActive || menuRowVisible(menuTr);
    menuTr.style.display = show ? "" : "none";
  });
}

export function initTagFilters(tbody: HTMLTableSectionElement): void {
  const container = document.querySelector<HTMLElement>("#tag-filters");
  if (!container) return;

  loadInitialSearch();

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
          rowHasAnyTag(tr, "locations", selected.locations) &&
          rowMatchesVisited(tr, visitedFilter) &&
          rowMatchesCooldown(tr, cooldownDays) &&
          rowMatchesRating(tr, minRating, maxRating) &&
          rowMatchesCheckbox(tr, ".reservable-check", reservableFilter) &&
          rowMatchesCheckbox(tr, ".walkin-check", walkinFilter) &&
          rowMatchesCheckbox(tr, ".waiting-check", waitingFilter) &&
          rowMatchesOpenDays(tr, openDaysSelected);

        let visible = baseVisible;
        const menuFilterActive =
          menuQuery !== "" || minPrice !== null || maxPrice !== null;
        if (visible && menuFilterActive) {
          const menus = getMenuRowsFor(tr);
          visible = menus.some((m) => menuRowVisible(m));
        }

        setRowGroupVisible(tr, visible);
      });
  }

  function currentAsFilter(name: string): SearchFilter {
    return {
      name,
      categories: Array.from(selected.categories),
      locations: Array.from(selected.locations),
      name_query: nameQuery,
      menu_query: menuQuery,
      visited: visitedFilter,
      cooldown_days: cooldownDays,
      min_price: minPrice,
      max_price: maxPrice,
      min_rating: minRating,
      max_rating: maxRating,
      reservable: reservableFilter,
      walkin: walkinFilter,
      waiting: waitingFilter,
      open_days: Array.from(openDaysSelected).sort((a, b) => a - b),
    };
  }

  function applyFilterState(f: SearchFilter): void {
    selected.categories = new Set(f.categories);
    selected.locations = new Set(f.locations);
    nameQuery = f.name_query;
    menuQuery = f.menu_query;
    visitedFilter = f.visited;
    cooldownDays = f.cooldown_days;
    minPrice = f.min_price ?? null;
    maxPrice = f.max_price ?? null;
    minRating = f.min_rating ?? null;
    maxRating = f.max_rating ?? null;
    reservableFilter = f.reservable ?? null;
    walkinFilter = f.walkin ?? null;
    waitingFilter = f.waiting ?? null;
    openDaysSelected.clear();
    (f.open_days ?? []).forEach((d) => openDaysSelected.add(d));

    const nameInput = document.querySelector<HTMLInputElement>("#name-filter");
    if (nameInput) nameInput.value = f.name_query;
    const menuInput = document.querySelector<HTMLInputElement>("#menu-filter");
    if (menuInput) menuInput.value = f.menu_query;
    const visitedSelect = document.querySelector<HTMLSelectElement>("#visited-filter");
    if (visitedSelect) visitedSelect.value = visitedFilter === null ? "all" : visitedFilter ? "true" : "false";
    const cooldownInput = document.querySelector<HTMLInputElement>("#cooldown-filter");
    if (cooldownInput) cooldownInput.value = cooldownDays !== null ? String(cooldownDays) : "";
    const minPriceInput = document.querySelector<HTMLInputElement>("#min-price-filter");
    if (minPriceInput) minPriceInput.value = minPrice !== null ? String(minPrice) : "";
    const maxPriceInput = document.querySelector<HTMLInputElement>("#max-price-filter");
    if (maxPriceInput) maxPriceInput.value = maxPrice !== null ? String(maxPrice) : "";
    const minRatingInput = document.querySelector<HTMLInputElement>("#min-rating-filter");
    if (minRatingInput) minRatingInput.value = minRating !== null ? String(minRating) : "";
    const maxRatingInput = document.querySelector<HTMLInputElement>("#max-rating-filter");
    if (maxRatingInput) maxRatingInput.value = maxRating !== null ? String(maxRating) : "";
    const reservableSelect = document.querySelector<HTMLSelectElement>("#reservable-filter");
    if (reservableSelect) reservableSelect.value = reservableFilter === null ? "all" : reservableFilter ? "true" : "false";
    const walkinSelect = document.querySelector<HTMLSelectElement>("#walkin-filter");
    if (walkinSelect) walkinSelect.value = walkinFilter === null ? "all" : walkinFilter ? "true" : "false";
    const waitingSelect = document.querySelector<HTMLSelectElement>("#waiting-filter");
    if (waitingSelect) waitingSelect.value = waitingFilter === null ? "all" : waitingFilter ? "true" : "false";

    render();
  }

  function clearFilterState(): void {
    selected.categories.clear();
    selected.locations.clear();
    nameQuery = "";
    menuQuery = "";
    visitedFilter = null;
    cooldownDays = null;
    minPrice = null;
    maxPrice = null;
    minRating = null;
    maxRating = null;
    reservableFilter = null;
    walkinFilter = null;
    waitingFilter = null;
    openDaysSelected.clear();

    const nameInput = document.querySelector<HTMLInputElement>("#name-filter");
    if (nameInput) nameInput.value = "";
    const menuInput = document.querySelector<HTMLInputElement>("#menu-filter");
    if (menuInput) menuInput.value = "";
    const visitedSelect = document.querySelector<HTMLSelectElement>("#visited-filter");
    if (visitedSelect) visitedSelect.value = "all";
    const cooldownInput = document.querySelector<HTMLInputElement>("#cooldown-filter");
    if (cooldownInput) cooldownInput.value = "";
    const minPriceInput = document.querySelector<HTMLInputElement>("#min-price-filter");
    if (minPriceInput) minPriceInput.value = "";
    const maxPriceInput = document.querySelector<HTMLInputElement>("#max-price-filter");
    if (maxPriceInput) maxPriceInput.value = "";
    const minRatingInput = document.querySelector<HTMLInputElement>("#min-rating-filter");
    if (minRatingInput) minRatingInput.value = "";
    const maxRatingInput = document.querySelector<HTMLInputElement>("#max-rating-filter");
    if (maxRatingInput) maxRatingInput.value = "";
    const reservableSelect = document.querySelector<HTMLSelectElement>("#reservable-filter");
    if (reservableSelect) reservableSelect.value = "all";
    const walkinSelect = document.querySelector<HTMLSelectElement>("#walkin-filter");
    if (walkinSelect) walkinSelect.value = "all";
    const waitingSelect = document.querySelector<HTMLSelectElement>("#waiting-filter");
    if (waitingSelect) waitingSelect.value = "all";

    render();
  }

  function getSearchState(): SearchState {
    return { filters: savedFilters, selected: selectedIndex };
  }

  async function persistSearch(): Promise<void> {
    try {
      const result = await saveSearch(getSearchState());
      savedFilters = result.filters;
      selectedIndex = result.selected;
    } catch (err) {
      alert("검색 저장 실패: " + (err as Error).message);
    }
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

  // --- Saved filters dropdown ---
  function renderSavedDropdown(): void {
    const wrapper = document.querySelector<HTMLElement>("#saved-filters");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const dropdownContainer = document.createElement("div");
    dropdownContainer.className = "saved-filters-dropdown";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "saved-filters-trigger";
    trigger.textContent = "저장된 검색 ▾";
    dropdownContainer.appendChild(trigger);

    const menu = document.createElement("div");
    menu.className = "saved-filters-menu";
    menu.style.display = "none";

    // "선택 안 함" option
    const noneRow = document.createElement("div");
    noneRow.className = "saved-filter-row";

    const noneRadio = document.createElement("input");
    noneRadio.type = "radio";
    noneRadio.name = "saved-filter-radio";
    noneRadio.checked = selectedIndex === null;
    noneRadio.addEventListener("change", async () => {
      selectedIndex = null;
      clearFilterState();
      await persistSearch();
      renderSavedDropdown();
    });
    noneRow.appendChild(noneRadio);

    const noneLabel = document.createElement("span");
    noneLabel.className = "saved-filter-name";
    noneLabel.textContent = "선택 안 함";
    noneRow.appendChild(noneLabel);

    menu.appendChild(noneRow);

    // Each saved filter
    const deleteChecked = new Set<number>();

    savedFilters.forEach((f, i) => {
      const row = document.createElement("div");
      row.className = "saved-filter-row";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "saved-filter-radio";
      radio.checked = selectedIndex === i;
      radio.addEventListener("change", async () => {
        selectedIndex = i;
        applyFilterState(f);
        await persistSearch();
        renderSavedDropdown();
      });
      row.appendChild(radio);

      const nameSpan = document.createElement("span");
      nameSpan.className = "saved-filter-name";
      nameSpan.textContent = f.name;
      row.appendChild(nameSpan);

      // Reorder buttons
      const moveUp = document.createElement("button");
      moveUp.type = "button";
      moveUp.className = "saved-filter-move";
      moveUp.textContent = "▲";
      moveUp.disabled = i === 0;
      moveUp.addEventListener("click", async (e) => {
        e.stopPropagation();
        [savedFilters[i - 1], savedFilters[i]] = [savedFilters[i], savedFilters[i - 1]];
        if (selectedIndex === i) selectedIndex = i - 1;
        else if (selectedIndex === i - 1) selectedIndex = i;
        await persistSearch();
        renderSavedDropdown();
      });
      row.appendChild(moveUp);

      const moveDown = document.createElement("button");
      moveDown.type = "button";
      moveDown.className = "saved-filter-move";
      moveDown.textContent = "▼";
      moveDown.disabled = i === savedFilters.length - 1;
      moveDown.addEventListener("click", async (e) => {
        e.stopPropagation();
        [savedFilters[i], savedFilters[i + 1]] = [savedFilters[i + 1], savedFilters[i]];
        if (selectedIndex === i) selectedIndex = i + 1;
        else if (selectedIndex === i + 1) selectedIndex = i;
        await persistSearch();
        renderSavedDropdown();
      });
      row.appendChild(moveDown);

      // Delete checkbox
      const delCheck = document.createElement("input");
      delCheck.type = "checkbox";
      delCheck.className = "saved-filter-check";
      delCheck.addEventListener("change", () => {
        if (delCheck.checked) deleteChecked.add(i);
        else deleteChecked.delete(i);
      });
      row.appendChild(delCheck);

      menu.appendChild(row);
    });

    // Save section
    const saveRow = document.createElement("div");
    saveRow.className = "saved-filter-actions";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "saved-filter-input";
    nameInput.placeholder = "필터 이름 입력...";
    saveRow.appendChild(nameInput);

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "saved-filter-btn";
    saveBtn.textContent = "저장";
    saveBtn.addEventListener("click", async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert("필터 이름을 입력해주세요.");
        return;
      }
      if (savedFilters.some((f) => f.name === name)) {
        alert("같은 이름의 필터가 이미 존재합니다: " + name);
        return;
      }
      savedFilters.push(currentAsFilter(name));
      selectedIndex = savedFilters.length - 1;
      await persistSearch();
      renderSavedDropdown();
    });
    saveRow.appendChild(saveBtn);

    menu.appendChild(saveRow);

    // Delete button
    if (savedFilters.length > 0) {
      const deleteRow = document.createElement("div");
      deleteRow.className = "saved-filter-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "saved-filter-btn saved-filter-btn-delete";
      deleteBtn.textContent = "선택 삭제";
      deleteBtn.addEventListener("click", async () => {
        if (deleteChecked.size === 0) return;
        savedFilters = savedFilters.filter((_, idx) => !deleteChecked.has(idx));
        if (selectedIndex !== null) {
          if (deleteChecked.has(selectedIndex)) {
            selectedIndex = null;
            clearFilterState();
          } else {
            // Recalculate index
            let newIdx = 0;
            for (let j = 0; j < selectedIndex; j++) {
              if (!deleteChecked.has(j)) newIdx++;
            }
            selectedIndex = savedFilters.length > 0 ? newIdx : null;
          }
        }
        await persistSearch();
        renderSavedDropdown();
      });
      deleteRow.appendChild(deleteBtn);

      menu.appendChild(deleteRow);
    }

    dropdownContainer.appendChild(menu);
    wrapper.appendChild(dropdownContainer);

    // Toggle dropdown
    trigger.addEventListener("click", () => {
      const isOpen = menu.style.display !== "none";
      menu.style.display = isOpen ? "none" : "";
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!dropdownContainer.contains(e.target as Node)) {
        menu.style.display = "none";
      }
    });
  }

  function renderOpenDaysFilter(): void {
    const wrapper = document.querySelector<HTMLElement>("#open-days-filter");
    if (!wrapper) return;
    wrapper.innerHTML = "";

    const label = document.createElement("span");
    label.className = "filter-label";
    label.textContent = "영업일";
    wrapper.appendChild(label);

    DAY_LABELS.forEach((name, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "filter-tag open-day-filter-btn";
      btn.textContent = name;
      btn.dataset.day = String(i);
      if (openDaysSelected.has(i)) btn.classList.add("active");
      btn.addEventListener("click", () => {
        if (openDaysSelected.has(i)) {
          openDaysSelected.delete(i);
          btn.classList.remove("active");
        } else {
          openDaysSelected.add(i);
          btn.classList.add("active");
        }
        applyFilter();
      });
      wrapper.appendChild(btn);
    });
  }

  function render(): void {
    renderOpenDaysFilter();
    // Drop selected tags that no longer exist
    (["categories", "locations"] as FilterField[]).forEach((field) => {
      const existing = new Set(collectUniqueTags(tbody, field));
      selected[field].forEach((t) => {
        if (!existing.has(t)) selected[field].delete(t);
      });
    });

    container!.innerHTML = "";
    container!.appendChild(buildGroup("카테고리", "categories"));
    container!.appendChild(buildGroup("위치", "locations"));
    applyFilter();
  }

  // Apply initial selected filter
  if (selectedIndex !== null && savedFilters[selectedIndex]) {
    applyFilterState(savedFilters[selectedIndex]);
  } else {
    render();
  }

  renderSavedDropdown();

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

  const visitedSelect = document.querySelector<HTMLSelectElement>("#visited-filter");
  if (visitedSelect) {
    visitedSelect.addEventListener("change", () => {
      const val = visitedSelect.value;
      visitedFilter = val === "all" ? null : val === "true";
      applyFilter();
    });
  }

  const cooldownInput = document.querySelector<HTMLInputElement>("#cooldown-filter");
  if (cooldownInput) {
    cooldownInput.addEventListener("input", () => {
      const val = cooldownInput.value.trim();
      cooldownDays = val === "" ? null : parseInt(val, 10) || null;
      applyFilter();
    });
  }

  function parsePriceInput(val: string): number | null {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 0) return null;
    return n;
  }

  const minPriceInput = document.querySelector<HTMLInputElement>("#min-price-filter");
  if (minPriceInput) {
    minPriceInput.addEventListener("input", () => {
      minPrice = parsePriceInput(minPriceInput.value);
      applyFilter();
    });
  }

  const maxPriceInput = document.querySelector<HTMLInputElement>("#max-price-filter");
  if (maxPriceInput) {
    maxPriceInput.addEventListener("input", () => {
      maxPrice = parsePriceInput(maxPriceInput.value);
      applyFilter();
    });
  }

  function parseRatingInput(val: string): number | null {
    const trimmed = val.trim();
    if (trimmed === "") return null;
    const n = parseFloat(trimmed);
    if (Number.isNaN(n) || n < 0 || n > 5) return null;
    return n;
  }

  const minRatingInput = document.querySelector<HTMLInputElement>("#min-rating-filter");
  if (minRatingInput) {
    minRatingInput.addEventListener("input", () => {
      minRating = parseRatingInput(minRatingInput.value);
      applyFilter();
    });
  }

  const maxRatingInput = document.querySelector<HTMLInputElement>("#max-rating-filter");
  if (maxRatingInput) {
    maxRatingInput.addEventListener("input", () => {
      maxRating = parseRatingInput(maxRatingInput.value);
      applyFilter();
    });
  }

  function parseBoolFilter(val: string): boolean | null {
    return val === "all" ? null : val === "true";
  }

  const reservableSelect = document.querySelector<HTMLSelectElement>("#reservable-filter");
  if (reservableSelect) {
    reservableSelect.addEventListener("change", () => {
      reservableFilter = parseBoolFilter(reservableSelect.value);
      applyFilter();
    });
  }

  const walkinSelect = document.querySelector<HTMLSelectElement>("#walkin-filter");
  if (walkinSelect) {
    walkinSelect.addEventListener("change", () => {
      walkinFilter = parseBoolFilter(walkinSelect.value);
      applyFilter();
    });
  }

  const waitingSelect = document.querySelector<HTMLSelectElement>("#waiting-filter");
  if (waitingSelect) {
    waitingSelect.addEventListener("change", () => {
      waitingFilter = parseBoolFilter(waitingSelect.value);
      applyFilter();
    });
  }

  // Rebuild when tag set changes (add/remove tag, new/deleted row)
  document.addEventListener("jmc:tags-changed", () => {
    render();
  });

  // Reapply when a restaurant's own open-day checkboxes change
  document.addEventListener("jmc:open-days-changed", () => {
    applyFilter();
  });
}
