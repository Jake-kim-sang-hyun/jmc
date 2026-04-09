import { describe, it, expect, beforeEach } from "vitest";
import { initKeyboardNavigation } from "../navigate";

function buildTable(): HTMLTableElement {
  const table = document.createElement("table");
  table.innerHTML = `
    <tbody>
      <tr>
        <td class="col-visited"><input type="checkbox" class="visited-check"></td>
        <td contenteditable="true" data-field="name">식당1</td>
        <td class="col-menu"><button type="button" class="btn-add-menu">+</button></td>
        <td data-field="rating"><select class="rating-select"><option value="0">-</option></select></td>
        <td data-field="categories" class="tag-cell"><div class="tag-container"><span class="tag" data-tag="한식">한식 <button class="tag-remove">×</button></span><input type="text" class="tag-input"></div></td>
        <td data-field="locations" class="tag-cell"><div class="tag-container"><input type="text" class="tag-input"></div></td>
        <td contenteditable="true" data-field="kakao_url">url</td>
        <td contenteditable="true" data-field="description">소감</td>
        <td class="col-last-visited" data-field="last_visited_at"><input type="date" class="last-visited-input"></td>
        <td class="col-delete"><input type="checkbox" class="row-check"></td>
      </tr>
      <tr>
        <td class="col-visited" data-field="menu-visited"><input type="checkbox" class="menu-visited-check"></td>
        <td contenteditable="true" data-field="menu-name">라멘</td>
        <td contenteditable="true" data-field="menu-price">9000</td>
        <td data-field="menu-rating"><select class="rating-select"><option value="0">-</option></select></td>
        <td></td>
        <td></td>
        <td></td>
        <td contenteditable="true" data-field="menu-description">맛있다</td>
        <td class="col-last-visited"></td>
        <td class="col-delete"><input type="checkbox" class="menu-check"></td>
      </tr>
      <tr>
        <td class="col-visited"><input type="checkbox" class="visited-check"></td>
        <td contenteditable="true" data-field="name">식당2</td>
        <td class="col-menu"><button type="button" class="btn-add-menu">+</button></td>
        <td data-field="rating"><select class="rating-select"><option value="0">-</option></select></td>
        <td data-field="categories" class="tag-cell"><div class="tag-container"><span class="tag" data-tag="일식">일식 <button class="tag-remove">×</button></span><input type="text" class="tag-input"></div></td>
        <td data-field="locations" class="tag-cell"><div class="tag-container"><input type="text" class="tag-input"></div></td>
        <td contenteditable="true" data-field="kakao_url">url2</td>
        <td contenteditable="true" data-field="description">소감2</td>
        <td class="col-last-visited" data-field="last_visited_at"><input type="date" class="last-visited-input"></td>
        <td class="col-delete"><input type="checkbox" class="row-check"></td>
      </tr>
    </tbody>
  `;
  document.body.appendChild(table);
  return table;
}

describe("initKeyboardNavigation", () => {
  let table: HTMLTableElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    table = buildTable();
    initKeyboardNavigation(table);
  });

  it("ArrowDown으로 같은 열의 다음 행 셀로 이동한다", () => {
    const nameCell = table.querySelector<HTMLElement>(
      "[data-field='name']",
    )!;
    nameCell.focus();

    table.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );

    const menuNameCell = table.querySelector<HTMLElement>(
      "[data-field='menu-name']",
    )!;
    expect(document.activeElement).toBe(menuNameCell);
  });

  it("ArrowUp으로 같은 열의 이전 행 셀로 이동한다", () => {
    const rows = table.querySelectorAll("tr");
    const thirdRowName = rows[2].querySelector<HTMLElement>(
      "[data-field='name']",
    )!;
    thirdRowName.focus();

    table.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );

    const menuNameCell = rows[1].querySelector<HTMLElement>(
      "[data-field='menu-name']",
    )!;
    expect(document.activeElement).toBe(menuNameCell);
  });

  it("첫 번째 행에서 ArrowUp은 아무 일도 하지 않는다", () => {
    const nameCell = table.querySelector<HTMLElement>(
      "[data-field='name']",
    )!;
    nameCell.focus();

    table.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );

    expect(document.activeElement).toBe(nameCell);
  });
});
