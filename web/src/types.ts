export interface Menu {
  name: string;
  rating: number;
  price: number;
  description: string;
  visited: boolean;
  last_visited_at: string | null;
}

export interface Restaurant {
  name: string;
  rating: number;
  categories: string[];
  locations: string[];
  kakao_url: string;
  visited: boolean;
  description: string;
  menus: Menu[];
  last_visited_at: string | null;
}

export interface UpdateEntry {
  original_name: string;
  restaurant: Restaurant;
}

export interface SavePayload {
  new: Restaurant[];
  update: UpdateEntry[];
  delete: string[];
}

export interface SearchFilter {
  name: string;
  categories: string[];
  locations: string[];
  name_query: string;
  menu_query: string;
  visited: boolean | null;
  cooldown_days: number | null;
}

export interface SearchState {
  filters: SearchFilter[];
  selected: number | null;
}
