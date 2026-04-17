package main

import (
	"fmt"
	"os"

	"github.com/arch-spatula/jmc/cmd"
)

const version = "0.1.0"

func main() {
	// 인자가 없으면 식당을 출력함
	if len(os.Args) == 1 {
		cmd.Recommend()
		os.Exit(0)
	}

	switch os.Args[1] {
	//
	case "-h":
		fallthrough
	case "help":
		cmd.Help()
		os.Exit(0)
	//
	case "-w":
		fallthrough
	case "wiki":
		cmd.Wiki()
		os.Exit(0)
	//
	case "-v":
		fallthrough
	case "version":
		fmt.Printf("jmc version %s\n", version)
		// git pull릉 통해 버전을 비교
		os.Exit(0)

	//
	case "update":
		fmt.Println("개발 예정")
		os.Exit(0)

	//
	case "init":
		cmd.Init()
		os.Exit(0)

	//
	case "config":
		fmt.Println("개발 예정")
		os.Exit(0)

	//
	case "kurimanju":
		cmd.Kurimanju()
		os.Exit(0)

	//
	default:
		fmt.Fprintf(os.Stderr, "알 수 없는 명령어: %s\n", os.Args[1])
		os.Exit(1)
	}
}
