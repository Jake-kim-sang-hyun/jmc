import type { Restaurant, SavePayload, SearchState } from "./types";

export type Fetcher = typeof fetch;

export async function fetchRecommend(
  fetcher: Fetcher = fetch
): Promise<Restaurant | null> {
  const response = await fetcher("/api/restaurants/recommend");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }
  const data = await response.json();
  return data;
}

export async function saveBatch(
  payload: SavePayload,
  fetcher: Fetcher = fetch
): Promise<void> {
  const response = await fetcher("/api/restaurants/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }
}

export async function saveSearch(
  state: SearchState,
  fetcher: Fetcher = fetch,
): Promise<SearchState> {
  const response = await fetcher("/api/search", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }
  return response.json();
}
