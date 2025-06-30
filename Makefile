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
docker-build: ## Build Docker image
	docker build -t alecs-mcp-server:latest .

docker-build-dev: ## Build Docker image for development
	docker build -t alecs-mcp-server:dev -f Dockerfile.dev .

docker-run: ## Run Docker container
	docker-compose up -d

docker-stop: ## Stop Docker container
	docker-compose down

docker-logs: ## Show Docker logs
	docker-compose logs -f

## Release commands
release-check: ## Check if ready for release
	@echo "🔍 Checking release readiness..."
	@npm run typecheck && echo "✅ TypeScript check passed" || (echo "❌ TypeScript check failed" && exit 1)
	@npm run lint && echo "✅ Lint check passed" || (echo "❌ Lint check failed" && exit 1)
	@npm test && echo "✅ Tests passed" || (echo "❌ Tests failed" && exit 1)
	@npm run build && echo "✅ Build succeeded" || (echo "❌ Build failed" && exit 1)
	@echo "✅ All checks passed! Ready for release."

release-patch: release-check ## Release patch version
	npm version patch -m "chore: release %s"
	git push && git push --tags

release-minor: release-check ## Release minor version
	npm version minor -m "chore: release %s"
	git push && git push --tags

release-major: release-check ## Release major version
	npm version major -m "chore: release %s"
	git push && git push --tags

release-prerelease: release-check ## Release prerelease version
	npm version prerelease --preid=rc -m "chore: release %s"
	git push && git push --tags

release-dry-run: ## Show what would be published to npm
	npm pack --dry-run

setup-npm: ## Setup npm authentication token
	@./scripts/setup-npm-token.sh