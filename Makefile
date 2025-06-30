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

dev: ## Start development server
	npm run dev

## Docker commands
docker-build: ## Build all Docker images
	@echo "Building all Docker image variants..."
	@$(MAKE) docker-build-main
	@$(MAKE) docker-build-full
	@$(MAKE) docker-build-minimal
	@$(MAKE) docker-build-modular
	@$(MAKE) docker-build-websocket
	@$(MAKE) docker-build-sse

docker-build-main: ## Build main PM2 Docker image
	docker build -f build/docker/Dockerfile -t alecs-mcp-server:latest .

docker-build-full: ## Build full server Docker image
	docker build -f build/docker/Dockerfile.full -t alecs-mcp-server:full-latest .

docker-build-minimal: ## Build minimal Docker image
	docker build -f build/docker/Dockerfile.minimal -t alecs-mcp-server:minimal-latest .

docker-build-modular: ## Build modular Docker image
	docker build -f build/docker/Dockerfile.modular -t alecs-mcp-server:modular-latest .

docker-build-websocket: ## Build WebSocket Docker image
	docker build -f build/docker/Dockerfile.websocket -t alecs-mcp-server:websocket-latest .

docker-build-sse: ## Build SSE Docker image
	docker build -f build/docker/Dockerfile.sse -t alecs-mcp-server:sse-latest .

docker-run: ## Run main Docker container
	docker-compose -f build/docker/docker-compose.yml up -d

docker-run-full: ## Run full server Docker container
	docker-compose -f build/docker/docker-compose.full.yml up -d

docker-run-minimal: ## Run minimal Docker container
	docker-compose -f build/docker/docker-compose.minimal.yml up -d

docker-run-modular: ## Run modular Docker containers
	docker-compose -f build/docker/docker-compose.modular.yml up -d

docker-run-remote: ## Run remote access Docker containers
	docker-compose -f build/docker/docker-compose.remote.yml up -d

docker-stop: ## Stop all Docker containers
	docker-compose -f build/docker/docker-compose.yml down
	docker-compose -f build/docker/docker-compose.full.yml down
	docker-compose -f build/docker/docker-compose.minimal.yml down
	docker-compose -f build/docker/docker-compose.modular.yml down
	docker-compose -f build/docker/docker-compose.remote.yml down

docker-logs: ## Show Docker logs
	docker-compose -f build/docker/docker-compose.yml logs -f

## Release commands
release-check: ## Check if ready for release
	@./scripts/pre-release-check.sh

release-patch: ## Release patch version
	npm version patch -m "chore: release v%s"
	git push && git push --tags

release-minor: ## Release minor version
	npm version minor -m "chore: release v%s"
	git push && git push --tags

release-major: ## Release major version
	npm version major -m "chore: release v%s"
	git push && git push --tags

release-tag: ## Create and push release tag (use after manual version update)
	@VERSION=$$(node -p "require('./package.json').version"); \
	git tag -a "v$$VERSION" -m "Release v$$VERSION"; \
	git push origin "v$$VERSION"

release-github: ## Create GitHub release from existing tag
	@VERSION=$$(node -p "require('./package.json').version"); \
	gh release create "v$$VERSION" \
		--title "v$$VERSION - Intelligent DNS Operations" \
		--notes-file RELEASE_NOTES.md \
		--draft

release-dry-run: ## Show what would be published to npm
	npm pack --dry-run

release-publish: ## Manually publish to NPM (GitHub Actions will handle this automatically)
	npm publish

setup-npm: ## Setup npm authentication token
	@echo "NPM authentication is configured via GitHub Actions secrets"