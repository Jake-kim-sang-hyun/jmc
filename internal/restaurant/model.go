package restaurant

import (
	"fmt"
	"strings"
)

type Menu struct {
	Name        string  `json:"name"`
	Rating      float64 `json:"rating"`
	Price       int     `json:"price"`
	Description string  `json:"description"`
	Visited     bool    `json:"visited"`
}

func (m *Menu) Validate() error {
	if m.Name == "" {
		return fmt.Errorf("메뉴 name은 필수입니다")
	}
	if m.Rating < 0 || m.Rating > 5 {
		return fmt.Errorf("메뉴 rating은 0~5 사이여야 합니다: %s", m.Name)
	}
	if m.Rating*2 != float64(int(m.Rating*2)) {
		return fmt.Errorf("메뉴 rating은 0.5 단위여야 합니다: %s", m.Name)
	}
	if m.Price < 0 {
		return fmt.Errorf("메뉴 price는 0 이상이어야 합니다: %s", m.Name)
	}
	return nil
}

type Restaurant struct {
	Name          string   `json:"name"`
	Rating        float64  `json:"rating"`
	Categories    []string `json:"categories"`
	Locations     []string `json:"locations"`
	KakaoURL      string   `json:"kakao_url"`
	Visited       bool     `json:"visited"`
	Description   string   `json:"description"`
	Menus         []Menu   `json:"menus"`
	LastVisitedAt *string  `json:"last_visited_at,omitempty"`
}

func (r *Restaurant) Validate() error {
	if r.Name == "" {
		return fmt.Errorf("name은 필수입니다")
	}
	if r.Rating < 0 || r.Rating > 5 {
		return fmt.Errorf("rating은 0~5 사이여야 합니다: %s", r.Name)
	}
	if r.Rating*2 != float64(int(r.Rating*2)) {
		return fmt.Errorf("rating은 0.5 단위여야 합니다: %s", r.Name)
	}
	// 변경: nil만 방지 (빈 배열 허용)
	if r.Categories == nil {
		return fmt.Errorf("categories 필드는 필수입니다: %s", r.Name)
	}
	if r.Locations == nil {
		return fmt.Errorf("locations 필드는 필수입니다: %s", r.Name)
	}
	// 카카오톡 맵 url은 없어도 됨(빈문자열로 저장)
	for i, m := range r.Menus {
		if err := m.Validate(); err != nil {
			return fmt.Errorf("%s menus[%d]: %w", r.Name, i, err)
		}
	}
	return nil
}

func (d *RestaurantData) Validate() error {
	if d.Restaurants == nil {
		return fmt.Errorf("restaurants 필드가 없습니다")
	}
	for i, r := range d.Restaurants {
		if err := r.Validate(); err != nil {
			return fmt.Errorf("restaurants[%d]: %w", i, err)
		}
	}
	return nil
}

type CLIConfig struct {
	Port int `json:"port"`
}

type SearchFilter struct {
	Name       string   `json:"name"`
	Categories []string `json:"categories"`
	Locations  []string `json:"locations"`
	NameQuery  string   `json:"name_query"`
	MenuQuery  string   `json:"menu_query"`
	Visited    *bool    `json:"visited"`
}

func (f *SearchFilter) Validate() error {
	if strings.TrimSpace(f.Name) == "" {
		return fmt.Errorf("필터 name은 필수입니다")
	}
	if f.Categories == nil {
		f.Categories = []string{}
	}
	if f.Locations == nil {
		f.Locations = []string{}
	}
	return nil
}

type Search struct {
	Filters  []SearchFilter `json:"filters"`
	Selected *int           `json:"selected"`
}

func (s *Search) Validate() error {
	seen := map[string]bool{}
	for i := range s.Filters {
		if err := s.Filters[i].Validate(); err != nil {
			return fmt.Errorf("search.filters[%d]: %w", i, err)
		}
		if seen[s.Filters[i].Name] {
			return fmt.Errorf("search.filters 이름 중복: %s", s.Filters[i].Name)
		}
		seen[s.Filters[i].Name] = true
	}
	if s.Selected != nil && (*s.Selected < 0 || *s.Selected >= len(s.Filters)) {
		return fmt.Errorf("search.selected 인덱스 범위 밖: %d", *s.Selected)
	}
	return nil
}

type RestaurantData struct {
	Restaurants []Restaurant `json:"restaurants"`
	CLIConfig   CLIConfig    `json:"cli_config"`
	Search      Search       `json:"search"`
}

type SaveRequest struct {
	New    []Restaurant `json:"new"`
	Update []Restaurant `json:"update"`
	Delete []string     `json:"delete"`
}
