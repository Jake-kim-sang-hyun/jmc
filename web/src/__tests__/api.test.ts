import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveBatch } from "../api";
import type { SavePayload } from "../types";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("saveBatch", () => {
  it("올바른 엔드포인트와 페이로드로 fetch를 호출한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const payload: SavePayload = {
      new: [{ name: "새식당", rating: 3, categories: ["한식"], locations: [], kakao_url: "https://a.com", visited: false, description: "", menus: [] }],
      update: [],
      delete: [],
    };

    await saveBatch(payload);

    expect(mockFetch).toHaveBeenCalledWith("/api/restaurants/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  });

  it("응답이 실패하면 에러를 던진다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("서버 오류"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const payload: SavePayload = { new: [], update: [], delete: ["식당"] };

    await expect(saveBatch(payload)).rejects.toThrow("서버 오류");
  });

  it("빈 페이로드도 정상적으로 처리한다", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const payload: SavePayload = { new: [], update: [], delete: [] };
    await saveBatch(payload);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
