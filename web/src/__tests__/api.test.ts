import { describe, it, expect, vi } from "vitest";
import { fetchRecommend, saveBatch, saveSearch, type Fetcher } from "../api";
import type { Restaurant, SavePayload, SearchState } from "../types";

function mockFetcher(response: Partial<Response>): Fetcher {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(null),
    text: () => Promise.resolve(""),
    ...response,
  });
}

describe("saveBatch", () => {
  it("올바른 엔드포인트와 페이로드로 fetch를 호출한다", async () => {
    const fetcher = mockFetcher({ ok: true });

    const payload: SavePayload = {
      new: [
        {
          name: "새식당",
          rating: 3,
          categories: ["한식"],
          locations: [],
          kakao_url: "",
          visited: false,
          description: "",
          menus: [],
        },
      ],
      update: [],
      delete: [],
    };

    await saveBatch(payload, fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/restaurants/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  it("빈 페이로드도 올바른 JSON으로 전송한다", async () => {
    const fetcher = mockFetcher({ ok: true });
    const payload: SavePayload = { new: [], update: [], delete: [] };

    await saveBatch(payload, fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/restaurants/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new: [], update: [], delete: [] }),
    });
  });

  it("응답이 실패하면 서버 메시지로 에러를 던진다", async () => {
    const fetcher = mockFetcher({
      ok: false,
      text: () => Promise.resolve("서버 오류"),
    });

    const payload: SavePayload = { new: [], update: [], delete: ["식당"] };

    await expect(saveBatch(payload, fetcher)).rejects.toThrow("서버 오류");
  });
});

describe("fetchRecommend", () => {
  it("올바른 엔드포인트로 GET 요청을 보낸다", async () => {
    const fetcher = mockFetcher({
      ok: true,
      json: () => Promise.resolve(null),
    });

    await fetchRecommend(fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/restaurants/recommend");
  });

  it("응답 JSON을 Restaurant 객체로 반환한다", async () => {
    const restaurant: Restaurant = {
      name: "테스트식당",
      rating: 4.5,
      categories: ["한식"],
      locations: ["강남"],
      kakao_url: "https://example.com",
      visited: false,
      description: "맛집",
      menus: [
        {
          name: "비빔밥",
          rating: 4,
          price: 9000,
          description: "",
          visited: false,
        },
      ],
    };

    const fetcher = mockFetcher({
      ok: true,
      json: () => Promise.resolve(restaurant),
    });

    const result = await fetchRecommend(fetcher);

    expect(result).toEqual(restaurant);
  });

  it("추천 식당이 없으면 null을 반환한다", async () => {
    const fetcher = mockFetcher({
      ok: true,
      json: () => Promise.resolve(null),
    });

    const result = await fetchRecommend(fetcher);

    expect(result).toBeNull();
  });

  it("응답이 실패하면 서버 메시지로 에러를 던진다", async () => {
    const fetcher = mockFetcher({
      ok: false,
      text: () => Promise.resolve("추천 실패"),
    });

    await expect(fetchRecommend(fetcher)).rejects.toThrow("추천 실패");
  });
});

describe("saveSearch", () => {
  it("PUT /api/search로 올바른 페이로드를 전송한다", async () => {
    const state: SearchState = {
      filters: [
        {
          name: "테스트필터",
          categories: ["한식"],
          locations: ["강남"],
          name_query: "맛집",
          menu_query: "",
        },
      ],
      selected: 0,
    };

    const fetcher = mockFetcher({
      ok: true,
      json: () => Promise.resolve(state),
    });

    const result = await saveSearch(state, fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/search", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    expect(result).toEqual(state);
  });

  it("응답이 실패하면 에러를 던진다", async () => {
    const fetcher = mockFetcher({
      ok: false,
      text: () => Promise.resolve("필터 name은 필수입니다"),
    });

    const state: SearchState = { filters: [], selected: null };

    await expect(saveSearch(state, fetcher)).rejects.toThrow(
      "필터 name은 필수입니다",
    );
  });
});
