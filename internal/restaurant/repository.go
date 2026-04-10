package restaurant

import (
	"encoding/json"
	"fmt"
	"os"
)

type Repository struct {
	filePath string
}

func NewRepository(filePath string) *Repository {
	return &Repository{filePath: filePath}
}

func (r *Repository) FindAll() (*RestaurantData, error) {
	data, err := os.ReadFile(r.filePath)
	if err != nil {
		return nil, fmt.Errorf("파일 읽기 실패: %w", err)
	}

	var result RestaurantData
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("JSON 파싱 실패: %w", err)
	}
	for i := range result.Restaurants {
		normalizeRestaurant(&result.Restaurants[i])
	}
	return &result, nil
}

func (r *Repository) Save(data *RestaurantData) error {
	bytes, err := json.MarshalIndent(data, "", "    ")
	if err != nil {
		return fmt.Errorf("JSON 직렬화 실패: %w", err)
	}

	if err := os.WriteFile(r.filePath, bytes, 0644); err != nil {
		return fmt.Errorf("파일 저장 실패: %w", err)
	}

	return nil
}

func (r *Repository) Create(item Restaurant) error {
	data, err := r.FindAll()
	if err != nil {
		return err
	}

	data.Restaurants = append(data.Restaurants, item)
	return r.Save(data)
}

func (r *Repository) Update(name string, item Restaurant) error {
	data, err := r.FindAll()
	if err != nil {
		return err
	}

	for i, rest := range data.Restaurants {
		if rest.Name == name {
			data.Restaurants[i] = item
			return r.Save(data)
		}
	}

	return fmt.Errorf("식당을 찾을 수 없습니다: %s", name)
}

func (r *Repository) Delete(name string) error {
	data, err := r.FindAll()
	if err != nil {
		return err
	}

	for i, rest := range data.Restaurants {
		if rest.Name == name {
			data.Restaurants = append(data.Restaurants[:i], data.Restaurants[i+1:]...)
			return r.Save(data)
		}
	}

	return fmt.Errorf("식당을 찾을 수 없습니다: %s", name)
}

func normalizeRestaurant(rest *Restaurant) {
	if rest.Locations == nil {
		rest.Locations = []string{}
	}
	if rest.Categories == nil {
		rest.Categories = []string{}
	}
}

func (r *Repository) SaveSearch(s Search) (*RestaurantData, error) {
	data, err := r.FindAll()
	if err != nil {
		return nil, err
	}
	data.Search = s
	if err := r.Save(data); err != nil {
		return nil, err
	}
	return data, nil
}

func (r *Repository) SaveBatch(req SaveRequest) (*RestaurantData, error) {
	data, err := r.FindAll()
	if err != nil {
		return nil, err
	}

	for i := range req.New {
		normalizeRestaurant(&req.New[i])
	}
	for i := range req.Update {
		normalizeRestaurant(&req.Update[i])
	}

	deleteSet := make(map[string]bool, len(req.Delete))
	for _, name := range req.Delete {
		deleteSet[name] = true
	}

	filtered := data.Restaurants[:0]
	for _, rest := range data.Restaurants {
		if !deleteSet[rest.Name] {
			filtered = append(filtered, rest)
		}
	}
	data.Restaurants = filtered

	updateMap := make(map[string]Restaurant, len(req.Update))
	for _, item := range req.Update {
		updateMap[item.Name] = item
	}
	for i, rest := range data.Restaurants {
		if updated, ok := updateMap[rest.Name]; ok {
			data.Restaurants[i] = updated
		}
	}

	data.Restaurants = append(data.Restaurants, req.New...)

	if err := r.Save(data); err != nil {
		return nil, err
	}

	return data, nil
}
