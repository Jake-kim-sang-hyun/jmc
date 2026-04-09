import "./style.css";
import {
  createEmptyRow,
  createMenuRow,
  attachRowEvents,
  attachMenuRowEvents,
  collectPayload,
  initRatingSelects,
  formatPriceCell,
  getMenuRows,
} from "./dom";
import { fetchRecommend, saveBatch } from "./api";
import { initKeyboardNavigation } from "./navigate";
import { initTagFilters } from "./filter";

const table = document.querySelector<HTMLTableElement>("table")!;
const tbody = document.querySelector<HTMLTableSectionElement>("#table-body")!;
const btnAdd = document.querySelector<HTMLButtonElement>("#btn-add")!;
const btnSave = document.querySelector<HTMLButtonElement>("#btn-save")!;
const btnRecommend = document.querySelector<HTMLButtonElement>("#btn-recommend")!;

initKeyboardNavigation(table);

btnRecommend.addEventListener("click", async () => {
  try {
    const restaurant = await fetchRecommend();
    if (!restaurant) {
      alert("추천할 식당이 없습니다.");
      return;
    }
    const rows = tbody.querySelectorAll<HTMLTableRowElement>("tr.restaurant-row");
    for (const row of rows) {
      row.classList.remove("row-recommended");
      const nameCell = row.querySelector<HTMLElement>("[data-field='name']");
      if (nameCell?.textContent?.trim() === restaurant.name) {
        row.classList.add("row-recommended");
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => row.classList.remove("row-recommended"), 2000);
        break;
      }
    }
  } catch (err) {
    alert("추천 실패: " + (err as Error).message);
  }
});

btnAdd.addEventListener("click", () => {
  const row = createEmptyRow();
  tbody.insertBefore(row, tbody.firstChild);
});

tbody.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains("btn-add-menu")) return;

  const restaurantRow = target.closest<HTMLTableRowElement>(".restaurant-row");
  if (!restaurantRow) return;

  const menuRows = getMenuRows(restaurantRow);
  const insertAfter =
    menuRows.length > 0 ? menuRows[menuRows.length - 1] : restaurantRow;
  const newMenuRow = createMenuRow();
  insertAfter.after(newMenuRow);

  if (restaurantRow.dataset.status === "") {
    restaurantRow.dataset.status = "updated";
  }
});

btnSave.addEventListener("click", async () => {
  const payload = collectPayload(tbody);

  try {
    await saveBatch(payload);
    location.reload();
  } catch (err) {
    alert("저장 실패: " + (err as Error).message);
  }
});

initRatingSelects(tbody);
tbody
  .querySelectorAll<HTMLElement>("[data-field='menu-price']")
  .forEach(formatPriceCell);
tbody
  .querySelectorAll<HTMLTableRowElement>("tr.restaurant-row")
  .forEach(attachRowEvents);
tbody
  .querySelectorAll<HTMLTableRowElement>("tr.menu-row")
  .forEach(attachMenuRowEvents);

initTagFilters(tbody);
