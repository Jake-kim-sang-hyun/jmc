package restaurant

import (
	"encoding/json"
	"os"
	"testing"
)

func TestMenuValidate_MissingName(t *testing.T) {
	m := Menu{Price: 10000}
	if err := m.Validate(); err == nil {
		t.Fatal("name이 없는데 에러가 발생하지 않음")
	}
}

func TestMenuValidate_NegativePrice(t *testing.T) {
	m := Menu{Name: "라멘", Price: -1}
	if err := m.Validate(); err == nil {
		t.Fatal("price가 음수인데 에러가 발생하지 않음")
	}
}

func TestMenuValidate_Valid(t *testing.T) {
	m := Menu{Name: "라멘", Rating: 4.5, Price: 9000, Description: "맛있음"}
	if err := m.Validate(); err != nil {
		t.Fatalf("유효한 메뉴인데 에러 발생: %v", err)
	}
}

func TestMenuValidate_ZeroPrice(t *testing.T) {
	m := Menu{Name: "서비스", Price: 0}
	if err := m.Validate(); err != nil {
		t.Fatalf("price 0은 유효한데 에러 발생: %v", err)
	}
}

func TestMenuValidate_RatingOutOfRange(t *testing.T) {
	m := Menu{Name: "라멘", Rating: -1, Price: 9000}
	if err := m.Validate(); err == nil {
		t.Fatal("rating이 음수인데 에러가 발생하지 않음")
	}

	m.Rating = 5.5
	if err := m.Validate(); err == nil {
		t.Fatal("rating이 5 초과인데 에러가 발생하지 않음")
	}
}

func TestMenuValidate_RatingNotHalfStep(t *testing.T) {
	m := Menu{Name: "라멘", Rating: 2.3, Price: 9000}
	if err := m.Validate(); err == nil {
		t.Fatal("rating이 0.5 단위가 아닌데 에러가 발생하지 않음")
	}
}

func TestMenuValidate_ZeroRating(t *testing.T) {
	m := Menu{Name: "라멘", Rating: 0, Price: 9000}
	if err := m.Validate(); err != nil {
		t.Fatalf("rating 0은 유효한데 에러 발생: %v", err)
	}
}

func TestRestaurantValidate_MissingName(t *testing.T) {
	r := Restaurant{Rating: 3, Categories: []string{"한식"}, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err == nil {
		t.Fatal("name이 없는데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_RatingOutOfRange(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: -1, Categories: []string{"한식"}, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err == nil {
		t.Fatal("rating이 범위 밖인데 에러가 발생하지 않음")
	}

	r.Rating = 5.5
	if err := r.Validate(); err == nil {
		t.Fatal("rating이 5 초과인데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_RatingNotHalfStep(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: 2.3, Categories: []string{"한식"}, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err == nil {
		t.Fatal("rating이 0.5 단위가 아닌데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_EmptyCategories(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: 3, Categories: []string{}, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err != nil {
		t.Fatalf("빈 categories는 허용되어야 함: %v", err)
	}
}

func TestRestaurantValidate_NilCategories(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: 3, Categories: nil, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err == nil {
		t.Fatal("nil categories인데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_NilLocations(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: 3, Categories: []string{"한식"}, Locations: nil, KakaoURL: "https://example.com"}
	if err := r.Validate(); err == nil {
		t.Fatal("nil locations인데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_Valid(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: 4.5, Categories: []string{"한식"}, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err != nil {
		t.Fatalf("유효한 데이터인데 에러 발생: %v", err)
	}
}

func TestRestaurantValidate_ZeroRating(t *testing.T) {
	r := Restaurant{Name: "테스트", Rating: 0, Categories: []string{"한식"}, Locations: []string{}, KakaoURL: "https://example.com"}
	if err := r.Validate(); err != nil {
		t.Fatalf("rating 0은 유효한데 에러 발생: %v", err)
	}
}

func TestRestaurantValidate_InvalidMenu(t *testing.T) {
	r := Restaurant{
		Name:       "테스트",
		Rating:     3,
		Categories: []string{"한식"},
		Locations:  []string{},
		KakaoURL:   "https://example.com",
		Menus:      []Menu{{Name: "", Price: 1000}},
	}
	if err := r.Validate(); err == nil {
		t.Fatal("메뉴 name이 없는데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_InvalidMenuRating(t *testing.T) {
	r := Restaurant{
		Name:       "테스트",
		Rating:     3,
		Categories: []string{"한식"},
		Locations:  []string{},
		KakaoURL:   "https://example.com",
		Menus:      []Menu{{Name: "라멘", Rating: 6, Price: 9000}},
	}
	if err := r.Validate(); err == nil {
		t.Fatal("메뉴 rating이 범위 밖인데 에러가 발생하지 않음")
	}
}

func TestRestaurantValidate_WithValidMenus(t *testing.T) {
	r := Restaurant{
		Name:       "테스트",
		Rating:     3,
		Categories: []string{"한식"},
		Locations:  []string{},
		KakaoURL:   "https://example.com",
		Menus: []Menu{
			{Name: "비빔밥", Rating: 4, Price: 8000, Description: "맛있음"},
			{Name: "된장찌개", Rating: 3.5, Price: 7000},
		},
	}
	if err := r.Validate(); err != nil {
		t.Fatalf("유효한 데이터인데 에러 발생: %v", err)
	}
}

func TestRestaurantDataValidate_NilRestaurants(t *testing.T) {
	d := RestaurantData{Restaurants: nil}
	if err := d.Validate(); err == nil {
		t.Fatal("restaurants가 nil인데 에러가 발생하지 않음")
	}
}

func TestDataJSON(t *testing.T) {
	raw, err := os.ReadFile("../../data.json")
	if err != nil {
		t.Fatalf("data.json 읽기 실패: %v", err)
	}

	var data RestaurantData
	if err := json.Unmarshal(raw, &data); err != nil {
		t.Fatalf("data.json 파싱 실패: %v", err)
	}

	if err := data.Validate(); err != nil {
		t.Fatalf("data.json 검증 실패: %v", err)
	}
}
