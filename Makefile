APP_NAME := jmc

# Cross-platform support: Windows / macOS / Linux
# - Windows: .exe extension, PowerShell commands (Copy-Item, Remove-Item)
# - macOS / Linux: no extension, Unix commands (cp, rm)
ifeq ($(OS),Windows_NT)
    BINARY := $(APP_NAME).exe
    CP := powershell -Command Copy-Item
    RM := powershell -Command Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
else
    BINARY := $(APP_NAME)
    CP := cp
    RM := rm -rf
endif

.DEFAULT_GOAL := help
.PHONY: help install build build-web run clean test test-web

help:
	@echo "  help            Show available commands"
	@echo "  install         Install dependencies"
	@echo "  build-web       Build web frontend"
	@echo "  build           Build full application"
	@echo "  run             Build and run wiki server"
	@echo "  test-web        Run web frontend tests"
	@echo "  test            Run all tests"
	@echo "  clean           Remove build artifacts"

install:
	go mod download
	cd web && pnpm install

build-web:
	cd web && pnpm run build
	$(CP) web/template/index.html cmd/wiki/index.html

build: build-web
	go build -o $(BINARY) .

run: build
	./$(BINARY) wiki

test-web:
	cd web && pnpm test

test: test-web
	go test ./... -v

clean:
	$(RM) $(BINARY)
	$(RM) cmd/wiki
