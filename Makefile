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

## Docker commands
docker-build: ## Build all Docker images
	docker build -t alecs-mcp-server:latest -f build/docker/Dockerfile .
	docker build -t alecs-mcp-server:full -f build/docker/Dockerfile.full .
	docker build -t alecs-mcp-server:essential -f build/docker/Dockerfile.essential .
	docker build -t alecs-mcp-server:modular -f build/docker/Dockerfile.modular .
	docker build -t alecs-mcp-server:minimal -f build/docker/Dockerfile.minimal .
	docker build -t alecs-mcp-server:websocket -f build/docker/Dockerfile.websocket .
	docker build -t alecs-mcp-server:sse -f build/docker/Dockerfile.sse .

docker-build-main: ## Build main Docker image (PM2 all-in-one)
	docker build -t alecs-mcp-server:latest -f build/docker/Dockerfile .

docker-build-full: ## Build Full Docker image (180+ tools)
	docker build -t alecs-mcp-server:full -f build/docker/Dockerfile.full .

docker-build-essential: ## Build Essential Docker image (15 tools)
	docker build -t alecs-mcp-server:essential -f build/docker/Dockerfile.essential .

docker-build-modular: ## Build Modular Docker image (domain-specific servers)
	docker build -t alecs-mcp-server:modular -f build/docker/Dockerfile.modular .

docker-build-minimal: ## Build Minimal Docker image (3 tools)
	docker build -t alecs-mcp-server:minimal -f build/docker/Dockerfile.minimal .

docker-build-websocket: ## Build WebSocket Docker image
	docker build -t alecs-mcp-server:websocket -f build/docker/Dockerfile.websocket .

docker-build-sse: ## Build SSE Docker image
	docker build -t alecs-mcp-server:sse -f build/docker/Dockerfile.sse .

docker-run: ## Run main Docker container (PM2 all-in-one)
	docker-compose up -d

docker-run-full: ## Run Full Docker container (180+ tools)
	docker-compose -f build/docker/docker-compose.full.yml up -d

docker-run-essential: ## Run Essential Docker container (15 tools)
	docker-compose -f build/docker/docker-compose.essential.yml up -d

docker-run-modular: ## Run Modular Docker container (domain-specific servers)
	docker-compose -f build/docker/docker-compose.modular.yml up -d

docker-run-minimal: ## Run Minimal Docker container (3 tools)
	docker-compose -f build/docker/docker-compose.minimal.yml up -d

docker-run-remote: ## Run remote access containers (WebSocket + SSE)
	docker-compose -f build/docker/docker-compose.remote.yml up -d

release-patch: ## Release patch version
	npm version patch -m "chore: release %s"
	git push && git push --tags

release-minor: ## Release minor version
	npm version minor -m "chore: release %s"
	git push && git push --tags

release-major: ## Release major version
	npm version major -m "chore: release %s"
	git push && git push --tags