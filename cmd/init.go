package cmd

import (
	"fmt"
	"os"

	"github.com/arch-spatula/jmc/internal/restaurant"
)

// 초기화 출력
func Init() {
	// 현재 실행파일의 위치에 `data.json`이 있는지 확인해본다.
	filePath := "data.json"
	_, err := os.Stat(filePath)
	if err != nil {
		fmt.Println("data.json 파일이 없습니다.")
		// 없으면 최소한의 `data.json`을 만든다.
		repo := restaurant.NewRepository(filePath)
		data := restaurant.RestaurantData{
			Restaurants: []restaurant.Restaurant{},
			CLIConfig:   restaurant.CLIConfig{Port: 8080},
			Search: restaurant.Search{
				Filters:  []restaurant.SearchFilter{},
				Selected: nil,
			},
		}
		if err := repo.Save(&data); err != nil {
			fmt.Fprintf(os.Stderr, "data.json 파일을 생성할 수 없습니다: %v\n", err)
			return
		}
		fmt.Println("data.json 파일을 생성했습니다.")
		return
	}
	// `data.json`이 있으면 유효성을 확인한다.
	repo := restaurant.NewRepository(filePath)
	data, err := repo.FindAll()
	if err != nil {
		fmt.Fprintf(os.Stderr, "data.json 파일을 읽을 수 없습니다: %v\n", err)
		return
	}
	if err := data.Validate(); err != nil {
		fmt.Fprintf(os.Stderr, "data.json 파일이 유효하지 않습니다: %v\n", err)
		return
	}
	// 유효하면 이미 만들어져있다고 알려준다.
	fmt.Println("data.json 파일이 유효합니다. 이미 만들어져있습니다.")
}
