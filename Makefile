# Simple Makefile for common tasks
.PHONY: help build test lint clean docker-build docker-run install dev

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm ci

build: ## Build the project
	npm run build

test: ## Run tests (non-blocking)
	npm test || true

lint: ## Run linter (non-blocking)
	npm run lint || true

clean: ## Clean build artifacts
	rm -rf dist .tsbuildinfo node_modules

dev: ## Start development servers
	npm run start:websocket:summary

docker-build: ## Build Docker image
	docker build -f build/docker/Dockerfile -t alecs-mcp-server:latest .

docker-run: ## Run Docker container
	docker run -it --rm \
		-p 3000:3000 \
		-p 3013:3013 \
		-p 8082:8082 \
		-v $(PWD)/data:/app/data \
		alecs-mcp-server:latest

release-patch: ## Release patch version
	npm version patch -m "chore: release %s"
	git push && git push --tags

release-minor: ## Release minor version
	npm version minor -m "chore: release %s"
	git push && git push --tags

release-major: ## Release major version
	npm version major -m "chore: release %s"
	git push && git push --tags