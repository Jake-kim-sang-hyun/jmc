import type { Restaurant, Menu, SavePayload } from "./types";
import { buildRatingSelect } from "./rating";

function buildTagCell(
  field: string,
  tags: string[],
  placeholder: string,
): string {
  const tagsHtml = tags
    .map(
      (c) =>
        `<span class="tag" data-tag="${escapeTagAttr(c)}">${escapeTagText(c)} <button type="button" class="tag-remove" aria-label="태그 삭제">×</button></span>`,
    )
    .join("");
  return `<td data-field="${field}" class="tag-cell"><div class="tag-container">${tagsHtml}<input type="text" class="tag-input" placeholder="${placeholder}" maxlength="50"></div></td>`;
}

function escapeTagAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTagText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createEmptyRow(): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.classList.add("restaurant-row");
  tr.dataset.status = "new";
  tr.innerHTML = `
    <td class="col-visited" data-field="visited"><input type="checkbox" class="visited-check"></td>
    <td contenteditable="true" data-field="name"></td>
    <td class="col-menu"><button type="button" class="btn-add-menu">+</button></td>
    <td data-field="rating">${buildRatingSelect(0)}</td>
    ${buildTagCell("categories", [], "태그 입력...")}
    ${buildTagCell("locations", [], "위치 입력...")}
    <td contenteditable="true" data-field="kakao_url"></td>
    <td contenteditable="true" data-field="description"></td>
    <td class="col-delete"><input type="checkbox" class="row-check"></td>
  `;
  attachRowEvents(tr);
  return tr;
}

export function createMenuRow(): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.classList.add("menu-row");
  tr.dataset.status = "new-menu";
  tr.innerHTML = `
    <td class="col-visited" data-field="menu-visited"><input type="checkbox" class="menu-visited-check"></td>
    <td contenteditable="true" data-field="menu-name"></td>
    <td contenteditable="true" data-field="menu-price"></td>
    <td data-field="menu-rating">${buildRatingSelect(0)}</td>
    <td></td>
    <td></td>
    <td></td>
    <td contenteditable="true" data-field="menu-description"></td>
    <td class="col-delete"><input type="checkbox" class="menu-check"></td>
  `;
  attachMenuRowEvents(tr);
  return tr;
}

export function formatPrice(n: number): string {
  if (!n && n !== 0) return "";
  return n.toLocaleString("ko-KR");
}

export function formatPriceCell(td: HTMLElement): void {
  const raw = td.textContent?.trim().replace(/,/g, "") ?? "";
  const n = parseInt(raw, 10);
  if (!isNaN(n) && n > 0) {
    td.textContent = formatPrice(n);
  }
}

function readTagsFromCell(tr: HTMLTableRowElement, field: string): string[] {
  const cell = tr.querySelector<HTMLElement>(`[data-field='${field}']`);
  const container = cell?.querySelector<HTMLElement>(".tag-container");
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(".tag[data-tag]"))
    .map((el) => el.dataset.tag?.trim())
    .filter((s): s is string => Boolean(s));
}

function readTextWithBreaks(el: HTMLElement): string {
  return el.innerHTML
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function handlePlainTextPaste(e: ClipboardEvent): void {
  e.preventDefault();
  const text = e.clipboardData?.getData("text/plain") ?? "";
  document.execCommand("insertText", false, text);
}

function markRowUpdated(tr: HTMLTableRowElement): void {
  if (tr.dataset.status === "") {
    tr.dataset.status = "updated";
  }
}

function addTagFromInput(
  input: HTMLInputElement,
  container: HTMLElement,
  tr: HTMLTableRowElement,
): void {
  const parts = input.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return;
  for (const val of parts) {
    const span = document.createElement("span");
    span.className = "tag";
    span.dataset.tag = val;
    span.appendChild(document.createTextNode(val + " "));
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-remove";
    btn.textContent = "×";
    btn.setAttribute("aria-label", "태그 삭제");
    span.appendChild(btn);
    container.insertBefore(span, input);
  }
  input.value = "";
  markRowUpdated(tr);
}

function attachTagCellEvents(tr: HTMLTableRowElement): void {
  tr.querySelectorAll<HTMLElement>(".tag-cell").forEach((cell) => {
    const container = cell.querySelector<HTMLElement>(".tag-container");
    const input = cell.querySelector<HTMLInputElement>(".tag-input");
    if (!container || !input) return;

    let composing = false;
    input.addEventListener("compositionstart", () => {
      composing = true;
    });
    input.addEventListener("compositionend", () => {
      composing = false;
    });
    input.addEventListener("keydown", (e) => {
      if (composing || e.isComposing) return;
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTagFromInput(input, container, tr);
      }
    });
    input.addEventListener("blur", () => {
      if (input.value.trim()) addTagFromInput(input, container, tr);
    });
    container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("tag-remove")) {
        target.closest(".tag")?.remove();
        markRowUpdated(tr);
      }
    });
  });
}

export function attachRowEvents(tr: HTMLTableRowElement): void {
  attachTagCellEvents(tr);

  tr.querySelectorAll<HTMLTableCellElement>("td[contenteditable]").forEach(
    (td) => {
      td.addEventListener("paste", handlePlainTextPaste as EventListener);
      td.addEventListener("input", () => {
        markRowUpdated(tr);
      });
    },
  );

  const ratingSelect = tr.querySelector<HTMLSelectElement>(".rating-select");
  if (ratingSelect) {
    ratingSelect.addEventListener("change", () => markRowUpdated(tr));
  }

  const visitedCheck = tr.querySelector<HTMLInputElement>(".visited-check");
  if (visitedCheck) {
    visitedCheck.addEventListener("change", () => markRowUpdated(tr));
  }

  const rowCheck = tr.querySelector<HTMLInputElement>(".row-check");
  if (rowCheck) {
    rowCheck.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        tr.dataset.status = "deleted";
        tr.classList.add("row-deleted");
      } else {
        tr.dataset.status = "";
        tr.classList.remove("row-deleted");
      }
    });
  }
}

function markMenuRowUpdated(tr: HTMLTableRowElement): void {
  if (tr.dataset.status === "") {
    tr.dataset.status = "updated-menu";
  }
  markParentUpdated(tr);
}

export function attachMenuRowEvents(tr: HTMLTableRowElement): void {
  tr.querySelectorAll<HTMLTableCellElement>("td[contenteditable]").forEach(
    (td) => {
      td.addEventListener("paste", handlePlainTextPaste as EventListener);
      td.addEventListener("input", () => {
        markMenuRowUpdated(tr);
      });
    },
  );

  const priceCell = tr.querySelector<HTMLElement>("[data-field='menu-price']");
  if (priceCell) {
    priceCell.addEventListener("focus", () => {
      const raw = priceCell.textContent?.trim().replace(/,/g, "") ?? "";
      if (raw !== priceCell.textContent?.trim()) {
        priceCell.textContent = raw;
      }
    });
    priceCell.addEventListener("blur", () => {
      formatPriceCell(priceCell);
    });
  }

  const menuRatingSelect = tr.querySelector<HTMLSelectElement>(".rating-select");
  if (menuRatingSelect) {
    menuRatingSelect.addEventListener("change", () => {
      markMenuRowUpdated(tr);
    });
  }

  const menuVisitedCheck = tr.querySelector<HTMLInputElement>(
    ".menu-visited-check",
  );
  if (menuVisitedCheck) {
    menuVisitedCheck.addEventListener("change", () => {
      markMenuRowUpdated(tr);
    });
  }

  const menuCheck = tr.querySelector<HTMLInputElement>(".menu-check");
  if (menuCheck) {
    menuCheck.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        tr.classList.add("row-deleted");
      } else {
        tr.classList.remove("row-deleted");
      }
      markMenuRowUpdated(tr);
    });
  }
}

function markParentUpdated(menuRow: HTMLTableRowElement): void {
  let prev = menuRow.previousElementSibling as HTMLElement | null;
  while (prev) {
    if (prev.classList.contains("restaurant-row")) {
      if ((prev as HTMLTableRowElement).dataset.status === "") {
        (prev as HTMLTableRowElement).dataset.status = "updated";
      }
      return;
    }
    prev = prev.previousElementSibling as HTMLElement | null;
  }
}

export function getMenuRows(
  restaurantRow: HTMLTableRowElement,
): HTMLTableRowElement[] {
  const rows: HTMLTableRowElement[] = [];
  let sibling = restaurantRow.nextElementSibling;
  while (sibling) {
    if (sibling.classList.contains("restaurant-row")) break;
    if (sibling.classList.contains("menu-row")) {
      rows.push(sibling as HTMLTableRowElement);
    }
    sibling = sibling.nextElementSibling;
  }
  return rows;
}

export function readMenuRow(tr: HTMLTableRowElement): Menu | null {
  const menuCheck = tr.querySelector<HTMLInputElement>(".menu-check");
  if (menuCheck && menuCheck.checked) return null;

  const name = tr
    .querySelector<HTMLElement>("[data-field='menu-name']")!
    .textContent!.trim();
  const ratingSelect = tr.querySelector<HTMLSelectElement>(".rating-select");
  const rating = ratingSelect ? parseFloat(ratingSelect.value) : 0;
  const priceText = tr
    .querySelector<HTMLElement>("[data-field='menu-price']")!
    .textContent!.trim()
    .replace(/,/g, "");
  const price = priceText ? parseInt(priceText, 10) || 0 : 0;
  const description = readTextWithBreaks(
    tr.querySelector<HTMLElement>("[data-field='menu-description']")!,
  );
  const visited =
    tr.querySelector<HTMLInputElement>(".menu-visited-check")?.checked ?? false;

  return { name, rating, price, description, visited };
}

export function readRow(tr: HTMLTableRowElement): Restaurant {
  const name = tr
    .querySelector<HTMLElement>("[data-field='name']")!
    .textContent!.trim();
  const ratingSelect = tr.querySelector<HTMLSelectElement>(".rating-select");
  const rating = ratingSelect ? parseFloat(ratingSelect.value) : 0;
  const categories = readTagsFromCell(tr, "categories");
  const locations = readTagsFromCell(tr, "locations");
  const kakaoUrl = tr
    .querySelector<HTMLElement>("[data-field='kakao_url']")!
    .textContent!.trim();
  const visited = tr.querySelector<HTMLInputElement>(".visited-check")!.checked;
  const description = readTextWithBreaks(
    tr.querySelector<HTMLElement>("[data-field='description']")!,
  );

  const menuRows = getMenuRows(tr);
  const menus: Menu[] = [];
  for (const menuTr of menuRows) {
    const menu = readMenuRow(menuTr);
    if (menu) menus.push(menu);
  }

  return {
    name,
    rating,
    categories,
    locations,
    kakao_url: kakaoUrl,
    visited,
    description,
    menus,
  };
}

export function collectPayload(tbody: HTMLTableSectionElement): SavePayload {
  const rows = tbody.querySelectorAll<HTMLTableRowElement>("tr.restaurant-row");
  const payload: SavePayload = { new: [], update: [], delete: [] };

  rows.forEach((tr) => {
    const status = tr.dataset.status;

    if (status === "new") {
      payload.new.push(readRow(tr));
    } else if (status === "updated") {
      payload.update.push(readRow(tr));
    } else if (status === "deleted") {
      const name =
        tr.dataset.originalName ||
        tr.querySelector<HTMLElement>("[data-field='name']")!.textContent!.trim();
      if (name) {
        payload.delete.push(name);
      }
    }
  });

  return payload;
}

export function initRatingSelects(container: HTMLElement): void {
  container
    .querySelectorAll<HTMLSelectElement>(".rating-select[data-value]")
    .forEach((select) => {
      select.value = select.dataset.value!;
    });
}
