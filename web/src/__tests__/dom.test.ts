import { describe, it, expect } from "vitest";
import {
  createEmptyRow,
  createMenuRow,
  readRow,
  readMenuRow,
  attachRowEvents,
  attachMenuRowEvents,
  getMenuRows,
  collectPayload,
  initRatingSelects,
  formatPrice,
  formatPriceCell,
} from "../dom";
import { buildRatingSelect } from "../rating";

function buildTagCellForTest(
  field: string,
  tags: string[],
  placeholder: string,
): string {
  const tagsHtml = tags
    .map(
      (c) =>
        `<span class="tag" data-tag="${c}">${c} <button type="button" class="tag-remove">×</button></span>`,
    )
    .join("");
  return `<td data-field="${field}" class="tag-cell"><div class="tag-container">${tagsHtml}<input type="text" class="tag-input" placeholder="${placeholder}"></div></td>`;
}

function makeRow(
  overrides: {
    status?: string;
    originalName?: string;
    name?: string;
    rating?: number;
    categories?: string[];
    locations?: string[];
    kakaoUrl?: string;
    visited?: boolean;
    description?: string;
  } = {},
): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.classList.add("restaurant-row");
  tr.dataset.status = overrides.status ?? "";
  if (overrides.originalName) {
    tr.dataset.originalName = overrides.originalName;
  }
  const ratingValue = overrides.rating ?? 0;
  const categories = overrides.categories ?? [];
  const locations = overrides.locations ?? [];
  tr.innerHTML = `
    <td class="col-visited" data-field="visited"><input type="checkbox" class="visited-check"${overrides.visited ? " checked" : ""}></td>
    <td contenteditable="true" data-field="name">${overrides.name ?? ""}</td>
    <td class="col-menu"><button type="button" class="btn-add-menu">+</button></td>
    <td data-field="rating">${buildRatingSelect(ratingValue)}</td>
    ${buildTagCellForTest("categories", categories, "태그 입력...")}
    ${buildTagCellForTest("locations", locations, "위치 입력...")}
    <td contenteditable="true" data-field="kakao_url">${overrides.kakaoUrl ?? ""}</td>
    <td contenteditable="true" data-field="description">${overrides.description ?? ""}</td>
    <td class="col-delete"><input type="checkbox" class="row-check"></td>
  `;
  return tr;
}

function makeMenuRow(
  overrides: {
    name?: string;
    rating?: number;
    price?: number;
    description?: string;
    checked?: boolean;
    visited?: boolean;
  } = {},
): HTMLTableRowElement {
  const tr = document.createElement("tr");
  tr.classList.add("menu-row");
  tr.dataset.status = "";
  const ratingValue = overrides.rating ?? 0;
  tr.innerHTML = `
    <td class="col-visited" data-field="menu-visited"><input type="checkbox" class="menu-visited-check"${overrides.visited ? " checked" : ""}></td>
    <td contenteditable="true" data-field="menu-name">${overrides.name ?? ""}</td>
    <td contenteditable="true" data-field="menu-price">${overrides.price ?? ""}</td>
    <td data-field="menu-rating">${buildRatingSelect(ratingValue)}</td>
    <td></td>
    <td></td>
    <td></td>
    <td contenteditable="true" data-field="menu-description">${overrides.description ?? ""}</td>
    <td class="col-delete"><input type="checkbox" class="menu-check"${overrides.checked ? " checked" : ""}></td>
  `;
  return tr;
}

describe("createEmptyRow", () => {
  it("status가 new인 tr을 반환한다", () => {
    const tr = createEmptyRow();
    expect(tr.tagName).toBe("TR");
    expect(tr.dataset.status).toBe("new");
  });

  it("restaurant-row 클래스를 갖는다", () => {
    const tr = createEmptyRow();
    expect(tr.classList.contains("restaurant-row")).toBe(true);
  });

  it("9개의 td를 포함한다", () => {
    const tr = createEmptyRow();
    expect(tr.querySelectorAll("td").length).toBe(9);
  });

  it("rating select 드롭다운을 포함한다", () => {
    const tr = createEmptyRow();
    const select = tr.querySelector<HTMLSelectElement>(".rating-select");
    expect(select).not.toBeNull();
    expect(select!.options.length).toBe(11);
  });

  it("visited 체크박스가 첫 번째 td에 있다", () => {
    const tr = createEmptyRow();
    const firstTd = tr.querySelector("td");
    expect(firstTd!.querySelector(".visited-check")).not.toBeNull();
  });

  it("메뉴 추가 버튼이 세 번째 td에 있다", () => {
    const tr = createEmptyRow();
    const tds = tr.querySelectorAll("td");
    expect(tds[2].querySelector(".btn-add-menu")).not.toBeNull();
  });

  it("삭제 체크박스가 마지막 td에 있다", () => {
    const tr = createEmptyRow();
    const tds = tr.querySelectorAll("td");
    const lastTd = tds[tds.length - 1];
    expect(lastTd.querySelector(".row-check")).not.toBeNull();
  });

  it("소감 contenteditable td를 포함한다", () => {
    const tr = createEmptyRow();
    expect(tr.querySelector("[data-field='description']")).not.toBeNull();
  });

  it("카테고리·위치 태그 입력 셀(tag-cell)을 포함한다", () => {
    const tr = createEmptyRow();
    const catCell = tr.querySelector("[data-field='categories']");
    const locCell = tr.querySelector("[data-field='locations']");
    expect(catCell).not.toBeNull();
    expect(locCell).not.toBeNull();
    expect(catCell?.classList.contains("tag-cell")).toBe(true);
    expect(locCell?.classList.contains("tag-cell")).toBe(true);
    expect(catCell?.querySelector(".tag-input")).not.toBeNull();
    expect(locCell?.querySelector(".tag-input")).not.toBeNull();
  });
});

describe("createMenuRow", () => {
  it("menu-row 클래스를 갖는다", () => {
    const tr = createMenuRow();
    expect(tr.classList.contains("menu-row")).toBe(true);
  });

  it("status가 new-menu이다", () => {
    const tr = createMenuRow();
    expect(tr.dataset.status).toBe("new-menu");
  });

  it("9개의 td를 포함한다", () => {
    const tr = createMenuRow();
    expect(tr.querySelectorAll("td").length).toBe(9);
  });

  it("메뉴명, 가격, 소감 필드를 포함한다", () => {
    const tr = createMenuRow();
    expect(tr.querySelector("[data-field='menu-name']")).not.toBeNull();
    expect(tr.querySelector("[data-field='menu-price']")).not.toBeNull();
    expect(
      tr.querySelector("[data-field='menu-description']"),
    ).not.toBeNull();
  });

  it("rating select 드롭다운을 포함한다", () => {
    const tr = createMenuRow();
    const select = tr.querySelector<HTMLSelectElement>(".rating-select");
    expect(select).not.toBeNull();
    expect(select!.options.length).toBe(11);
  });

  it("삭제 체크박스를 포함한다", () => {
    const tr = createMenuRow();
    expect(tr.querySelector(".menu-check")).not.toBeNull();
  });

  it("방문 체크박스가 첫 번째 td에 있다", () => {
    const tr = createMenuRow();
    const firstTd = tr.querySelector("td");
    expect(firstTd!.querySelector(".menu-visited-check")).not.toBeNull();
  });
});

describe("readRow", () => {
  it("행 데이터를 올바르게 읽는다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "테스트식당",
      rating: 3,
      categories: ["한식", "분식"],
      kakaoUrl: "https://example.com",
      visited: true,
      description: "맛있는 집",
    });
    tbody.appendChild(tr);

    const result = readRow(tr);
    expect(result).toEqual({
      name: "테스트식당",
      rating: 3,
      categories: ["한식", "분식"],
      locations: [],
      kakao_url: "https://example.com",
      visited: true,
      description: "맛있는 집",
      menus: [],
    });
  });

  it("메뉴 sub-row를 함께 읽는다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "테스트식당",
      rating: 3,
      categories: ["한식"],
      kakaoUrl: "https://example.com",
    });
    const menu1 = makeMenuRow({
      name: "라멘",
      rating: 4.5,
      price: 9000,
      description: "진한 국물",
    });
    const menu2 = makeMenuRow({ name: "차슈덮밥", rating: 3, price: 11000 });
    tbody.appendChild(tr);
    tbody.appendChild(menu1);
    tbody.appendChild(menu2);

    const result = readRow(tr);
    expect(result.menus).toHaveLength(2);
    expect(result.menus[0]).toEqual({
      name: "라멘",
      rating: 4.5,
      price: 9000,
      description: "진한 국물",
      visited: false,
    });
    expect(result.menus[1]).toEqual({
      name: "차슈덮밥",
      rating: 3,
      price: 11000,
      description: "",
      visited: false,
    });
  });

  it("삭제 체크된 메뉴는 제외한다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "테스트식당",
      rating: 3,
      categories: ["한식"],
      kakaoUrl: "https://example.com",
    });
    const menu1 = makeMenuRow({ name: "라멘", price: 9000 });
    const menu2 = makeMenuRow({
      name: "차슈덮밥",
      price: 11000,
      checked: true,
    });
    tbody.appendChild(tr);
    tbody.appendChild(menu1);
    tbody.appendChild(menu2);

    const result = readRow(tr);
    expect(result.menus).toHaveLength(1);
    expect(result.menus[0].name).toBe("라멘");
  });

  it("locations 태그를 올바르게 읽는다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "테스트식당",
      rating: 3,
      categories: ["한식"],
      locations: ["강남", "역삼"],
      kakaoUrl: "https://example.com",
    });
    tbody.appendChild(tr);
    const result = readRow(tr);
    expect(result.locations).toEqual(["강남", "역삼"]);
  });

  it("빈 categories와 locations는 빈 배열을 반환한다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "빈식당",
      rating: 1,
      kakaoUrl: "https://example.com",
    });
    tbody.appendChild(tr);
    const result = readRow(tr);
    expect(result.categories).toEqual([]);
    expect(result.locations).toEqual([]);
  });

  it("rating 0은 숫자 0을 반환한다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "식당",
      rating: 0,
      kakaoUrl: "https://example.com",
    });
    tbody.appendChild(tr);
    const result = readRow(tr);
    expect(result.rating).toBe(0);
  });

  it("rating 4.5는 숫자 4.5를 반환한다", () => {
    const tbody = document.createElement("tbody");
    const tr = makeRow({
      name: "식당",
      rating: 4.5,
      kakaoUrl: "https://example.com",
    });
    tbody.appendChild(tr);
    const result = readRow(tr);
    expect(result.rating).toBe(4.5);
  });
});

describe("readMenuRow", () => {
  it("메뉴 데이터를 올바르게 읽는다", () => {
    const tr = makeMenuRow({
      name: "비빔밥",
      rating: 4,
      price: 8000,
      description: "맛있다",
      visited: true,
    });
    const result = readMenuRow(tr);
    expect(result).toEqual({
      name: "비빔밥",
      rating: 4,
      price: 8000,
      description: "맛있다",
      visited: true,
    });
  });

  it("visited 미체크 시 false를 반환한다", () => {
    const tr = makeMenuRow({ name: "비빔밥", price: 8000 });
    const result = readMenuRow(tr);
    expect(result!.visited).toBe(false);
  });

  it("삭제 체크된 행은 null을 반환한다", () => {
    const tr = makeMenuRow({ name: "비빔밥", price: 8000, checked: true });
    const result = readMenuRow(tr);
    expect(result).toBeNull();
  });

  it("빈 가격은 0을 반환한다", () => {
    const tr = makeMenuRow({ name: "서비스" });
    const result = readMenuRow(tr);
    expect(result!.price).toBe(0);
  });

  it("rating 0은 숫자 0을 반환한다", () => {
    const tr = makeMenuRow({ name: "서비스", rating: 0 });
    const result = readMenuRow(tr);
    expect(result!.rating).toBe(0);
  });

  it("rating 3.5는 숫자 3.5를 반환한다", () => {
    const tr = makeMenuRow({ name: "라멘", rating: 3.5 });
    const result = readMenuRow(tr);
    expect(result!.rating).toBe(3.5);
  });
});

describe("getMenuRows", () => {
  it("식당 행 다음의 메뉴 행들을 반환한다", () => {
    const tbody = document.createElement("tbody");
    const r1 = makeRow({ name: "식당1" });
    const m1 = makeMenuRow({ name: "메뉴1" });
    const m2 = makeMenuRow({ name: "메뉴2" });
    const r2 = makeRow({ name: "식당2" });
    const m3 = makeMenuRow({ name: "메뉴3" });
    tbody.append(r1, m1, m2, r2, m3);

    expect(getMenuRows(r1)).toHaveLength(2);
    expect(getMenuRows(r2)).toHaveLength(1);
  });

  it("메뉴 행이 없으면 빈 배열을 반환한다", () => {
    const tbody = document.createElement("tbody");
    const r1 = makeRow({ name: "식당1" });
    const r2 = makeRow({ name: "식당2" });
    tbody.append(r1, r2);

    expect(getMenuRows(r1)).toHaveLength(0);
  });
});

describe("attachRowEvents", () => {
  it("contenteditable 편집 시 status가 updated로 변경된다", () => {
    const tr = makeRow({ name: "식당" });
    attachRowEvents(tr);

    const nameCell = tr.querySelector<HTMLElement>("[data-field='name']")!;
    nameCell.dispatchEvent(new Event("input"));

    expect(tr.dataset.status).toBe("updated");
  });

  it("rating select 변경 시 status가 updated로 변경된다", () => {
    const tr = makeRow({ name: "식당", rating: 3 });
    attachRowEvents(tr);

    const select = tr.querySelector<HTMLSelectElement>(".rating-select")!;
    select.value = "4";
    select.dispatchEvent(new Event("change"));

    expect(tr.dataset.status).toBe("updated");
  });

  it("visited 체크 변경 시 status가 updated로 변경된다", () => {
    const tr = makeRow({ name: "식당" });
    attachRowEvents(tr);

    tr.querySelector<HTMLInputElement>(".visited-check")!.dispatchEvent(
      new Event("change"),
    );

    expect(tr.dataset.status).toBe("updated");
  });

  it("소감 편집 시 status가 updated로 변경된다", () => {
    const tr = makeRow({ name: "식당" });
    attachRowEvents(tr);

    const descCell = tr.querySelector<HTMLElement>(
      "[data-field='description']",
    )!;
    descCell.dispatchEvent(new Event("input"));

    expect(tr.dataset.status).toBe("updated");
  });

  it("row-check 체크 시 status가 deleted로 변경된다", () => {
    const tr = makeRow({ name: "식당" });
    attachRowEvents(tr);

    const cb = tr.querySelector<HTMLInputElement>(".row-check")!;
    cb.checked = true;
    cb.dispatchEvent(new Event("change"));

    expect(tr.dataset.status).toBe("deleted");
    expect(tr.classList.contains("row-deleted")).toBe(true);
  });

  it("row-check 해제 시 status가 빈 문자열로 복원된다", () => {
    const tr = makeRow({ name: "식당" });
    attachRowEvents(tr);

    const cb = tr.querySelector<HTMLInputElement>(".row-check")!;
    cb.checked = true;
    cb.dispatchEvent(new Event("change"));
    cb.checked = false;
    cb.dispatchEvent(new Event("change"));

    expect(tr.dataset.status).toBe("");
    expect(tr.classList.contains("row-deleted")).toBe(false);
  });
});

describe("attachMenuRowEvents", () => {
  it("메뉴 편집 시 부모 식당 status가 updated로 변경된다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴" });
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const nameCell = menuRow.querySelector<HTMLElement>(
      "[data-field='menu-name']",
    )!;
    nameCell.dispatchEvent(new Event("input"));

    expect(restaurantRow.dataset.status).toBe("updated");
  });

  it("메뉴 편집 시 자식 행 status가 updated-menu로 변경된다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴" });
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const nameCell = menuRow.querySelector<HTMLElement>(
      "[data-field='menu-name']",
    )!;
    nameCell.dispatchEvent(new Event("input"));

    expect(menuRow.dataset.status).toBe("updated-menu");
  });

  it("메뉴 rating 변경 시 부모 식당 status가 updated로 변경된다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴", rating: 3 });
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const select = menuRow.querySelector<HTMLSelectElement>(".rating-select")!;
    select.value = "4";
    select.dispatchEvent(new Event("change"));

    expect(restaurantRow.dataset.status).toBe("updated");
  });

  it("메뉴 rating 변경 시 자식 행 status가 updated-menu로 변경된다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴", rating: 3 });
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const select = menuRow.querySelector<HTMLSelectElement>(".rating-select")!;
    select.value = "4";
    select.dispatchEvent(new Event("change"));

    expect(menuRow.dataset.status).toBe("updated-menu");
  });

  it("메뉴 삭제 체크 시 row-deleted 클래스가 추가되고 부모가 updated된다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴" });
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const cb = menuRow.querySelector<HTMLInputElement>(".menu-check")!;
    cb.checked = true;
    cb.dispatchEvent(new Event("change"));

    expect(menuRow.classList.contains("row-deleted")).toBe(true);
    expect(restaurantRow.dataset.status).toBe("updated");
  });

  it("이미 new-menu인 메뉴 행은 status가 변경되지 않는다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴" });
    menuRow.dataset.status = "new-menu";
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const nameCell = menuRow.querySelector<HTMLElement>(
      "[data-field='menu-name']",
    )!;
    nameCell.dispatchEvent(new Event("input"));

    expect(menuRow.dataset.status).toBe("new-menu");
  });

  it("메뉴 visited 체크 시 자식과 부모 모두 updated 상태가 된다", () => {
    const tbody = document.createElement("tbody");
    const restaurantRow = makeRow({ name: "식당" });
    const menuRow = makeMenuRow({ name: "메뉴" });
    tbody.append(restaurantRow, menuRow);

    attachMenuRowEvents(menuRow);
    const visitedCb =
      menuRow.querySelector<HTMLInputElement>(".menu-visited-check")!;
    visitedCb.checked = true;
    visitedCb.dispatchEvent(new Event("change"));

    expect(menuRow.dataset.status).toBe("updated-menu");
    expect(restaurantRow.dataset.status).toBe("updated");
  });
});

describe("collectPayload", () => {
  function makeTbody(
    items: { row: HTMLTableRowElement; menus?: HTMLTableRowElement[] }[],
  ): HTMLTableSectionElement {
    const tbody = document.createElement("tbody");
    for (const item of items) {
      tbody.appendChild(item.row);
      if (item.menus) {
        for (const m of item.menus) {
          tbody.appendChild(m);
        }
      }
    }
    return tbody;
  }

  it("new 행을 수집한다", () => {
    const tr = makeRow({
      status: "new",
      name: "새식당",
      rating: 4,
      categories: ["한식"],
      kakaoUrl: "https://a.com",
    });
    const payload = collectPayload(makeTbody([{ row: tr }]));

    expect(payload.new).toHaveLength(1);
    expect(payload.new[0].name).toBe("새식당");
    expect(payload.new[0].rating).toBe(4);
    expect(payload.new[0].menus).toEqual([]);
    expect(payload.update).toHaveLength(0);
    expect(payload.delete).toHaveLength(0);
  });

  it("new 행에 메뉴가 포함된다", () => {
    const tr = makeRow({
      status: "new",
      name: "새식당",
      rating: 4,
      categories: ["한식"],
      kakaoUrl: "https://a.com",
    });
    const menu = makeMenuRow({ name: "라멘", rating: 4.5, price: 9000 });
    const payload = collectPayload(makeTbody([{ row: tr, menus: [menu] }]));

    expect(payload.new[0].menus).toHaveLength(1);
    expect(payload.new[0].menus[0].name).toBe("라멘");
    expect(payload.new[0].menus[0].rating).toBe(4.5);
  });

  it("updated 행을 수집한다", () => {
    const tr = makeRow({
      status: "updated",
      name: "수정식당",
      rating: 2.5,
      categories: ["일식"],
      kakaoUrl: "https://b.com",
      description: "변경됨",
    });
    const payload = collectPayload(makeTbody([{ row: tr }]));

    expect(payload.update).toHaveLength(1);
    expect(payload.update[0].name).toBe("수정식당");
    expect(payload.update[0].description).toBe("변경됨");
  });

  it("deleted 행은 originalName으로 수집한다", () => {
    const tr = makeRow({
      status: "deleted",
      name: "삭제식당",
      originalName: "원래이름",
    });
    const payload = collectPayload(makeTbody([{ row: tr }]));

    expect(payload.delete).toEqual(["원래이름"]);
  });

  it("상태 없는 행은 무시한다", () => {
    const tr = makeRow({
      status: "",
      name: "변경없음",
      rating: 3,
      kakaoUrl: "https://c.com",
    });
    const payload = collectPayload(makeTbody([{ row: tr }]));

    expect(payload.new).toHaveLength(0);
    expect(payload.update).toHaveLength(0);
    expect(payload.delete).toHaveLength(0);
  });

  it("혼합 상태를 올바르게 분류한다", () => {
    const newRow = makeRow({
      status: "new",
      name: "새식당",
      rating: 5,
      categories: ["한식"],
      kakaoUrl: "https://a.com",
    });
    const updatedRow = makeRow({
      status: "updated",
      name: "수정식당",
      rating: 2,
      categories: ["일식"],
      kakaoUrl: "https://b.com",
    });
    const deletedRow = makeRow({
      status: "deleted",
      name: "삭제식당",
      originalName: "삭제대상",
    });
    const unchangedRow = makeRow({
      status: "",
      name: "그대로",
      rating: 1,
      kakaoUrl: "https://d.com",
    });

    const payload = collectPayload(
      makeTbody([
        { row: newRow },
        { row: updatedRow },
        { row: deletedRow },
        { row: unchangedRow },
      ]),
    );

    expect(payload.new).toHaveLength(1);
    expect(payload.update).toHaveLength(1);
    expect(payload.delete).toEqual(["삭제대상"]);
  });
});

describe("initRatingSelects", () => {
  it("data-value로 select 초기값을 설정한다", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <select class="rating-select" data-value="3.5">
        <option value="0">-</option>
        <option value="3">⭐⭐⭐</option>
        <option value="3.5">⭐⭐⭐(반)</option>
        <option value="4">⭐⭐⭐⭐</option>
      </select>
    `;

    initRatingSelects(container);

    const select = container.querySelector<HTMLSelectElement>(".rating-select")!;
    expect(select.value).toBe("3.5");
  });
});

describe("formatPrice", () => {
  it("숫자를 콤마 포맷으로 변환한다", () => {
    expect(formatPrice(9000)).toBe("9,000");
    expect(formatPrice(11000)).toBe("11,000");
    expect(formatPrice(1234567)).toBe("1,234,567");
  });

  it("0은 '0'을 반환한다", () => {
    expect(formatPrice(0)).toBe("0");
  });

  it("1000 미만은 콤마 없이 반환한다", () => {
    expect(formatPrice(500)).toBe("500");
  });
});

describe("formatPriceCell", () => {
  it("셀 텍스트를 콤마 포맷으로 변환한다", () => {
    const td = document.createElement("td");
    td.textContent = "9000";
    formatPriceCell(td);
    expect(td.textContent).toBe("9,000");
  });

  it("이미 콤마가 있는 텍스트도 처리한다", () => {
    const td = document.createElement("td");
    td.textContent = "9,000";
    formatPriceCell(td);
    expect(td.textContent).toBe("9,000");
  });

  it("빈 셀은 변경하지 않는다", () => {
    const td = document.createElement("td");
    td.textContent = "";
    formatPriceCell(td);
    expect(td.textContent).toBe("");
  });
});

describe("readMenuRow with comma price", () => {
  it("콤마가 포함된 가격을 올바르게 읽는다", () => {
    const tr = document.createElement("tr");
    tr.classList.add("menu-row");
    tr.innerHTML = `
      <td></td>
      <td contenteditable="true" data-field="menu-name">라멘</td>
      <td contenteditable="true" data-field="menu-price">9,000</td>
      <td data-field="menu-rating"><select class="rating-select"><option value="0" selected>-</option></select></td>
      <td></td>
      <td></td>
      <td contenteditable="true" data-field="menu-description"></td>
      <td class="col-delete"><input type="checkbox" class="menu-check"></td>
    `;
    const result = readMenuRow(tr);
    expect(result!.price).toBe(9000);
  });
});
