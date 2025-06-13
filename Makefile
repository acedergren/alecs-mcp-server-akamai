# Makefile for ALECS MCP Server
# Production and development workflows

# Variables
PROJECT_NAME := alecs-mcp-server-akamai
DOCKER_IMAGE := $(PROJECT_NAME)
DOCKER_TAG := latest
NODE_VERSION := 20
BUILD_DIR := dist
SRC_DIR := src

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Phony targets
.PHONY: help install build dev test lint typecheck clean docker-build docker-run docker-dev setup prod check-deps validate-edgerc release

## Help
help:
	@echo "$(BLUE)ALECS MCP Server - Makefile Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make install        Install dependencies"
	@echo "  make dev           Run development server with hot reload"
	@echo "  make test          Run test suite"
	@echo "  make lint          Run ESLint"
	@echo "  make typecheck     Run TypeScript type checking"
	@echo "  make clean         Clean build artifacts"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make build         Build production version"
	@echo "  make prod          Run production server"
	@echo "  make validate      Run all checks (lint, typecheck, test)"
	@echo ""
	@echo "$(GREEN)Docker:$(NC)"
	@echo "  make docker-build  Build Docker image"
	@echo "  make docker-run    Run Docker container"
	@echo "  make docker-dev    Run development container"
	@echo ""
	@echo "$(GREEN)Setup:$(NC)"
	@echo "  make setup         Initial project setup"
	@echo "  make check-deps    Check system dependencies"

## Check dependencies
check-deps:
	@echo "$(BLUE)Checking system dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js is not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)❌ npm is not installed$(NC)"; exit 1; }
	@NODE_VERSION=$$(node -v | cut -d'v' -f2 | cut -d'.' -f1); \
	if [ $$NODE_VERSION -lt $(NODE_VERSION) ]; then \
		echo "$(RED)❌ Node.js version must be $(NODE_VERSION) or higher (current: v$$NODE_VERSION)$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ All dependencies satisfied$(NC)"

## Validate .edgerc file
validate-edgerc:
	@echo "$(BLUE)Checking .edgerc configuration...$(NC)"
	@if [ ! -f "$$HOME/.edgerc" ]; then \
		echo "$(YELLOW)⚠️  Warning: .edgerc file not found at $$HOME/.edgerc$(NC)"; \
		echo "$(YELLOW)   Please ensure it's available when running the server$(NC)"; \
	else \
		echo "$(GREEN)✓ .edgerc file found$(NC)"; \
	fi

## Initial setup
setup: check-deps
	@echo "$(BLUE)Setting up ALECS MCP Server...$(NC)"
	@npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"
	@npm run build
	@echo "$(GREEN)✓ Initial build complete$(NC)"
	@make validate-edgerc
	@echo ""
	@echo "$(GREEN)✅ Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Ensure your .edgerc file is configured"
	@echo "  2. Run 'make dev' for development"
	@echo "  3. Run 'make prod' for production"

## Install dependencies
install:
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@npm ci
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

## Build for production
build: clean
	@echo "$(BLUE)Building production version...$(NC)"
	@npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

## Run development server
dev: check-deps
	@echo "$(BLUE)Starting development server...$(NC)"
	@npm run dev

## Run production server
prod: check-deps validate-edgerc build
	@echo "$(BLUE)Starting production server...$(NC)"
	@node $(BUILD_DIR)/index.js

## Run tests
test:
	@echo "$(BLUE)Running tests...$(NC)"
	@npm test

## Run linter
lint:
	@echo "$(BLUE)Running ESLint...$(NC)"
	@npm run lint

## Run TypeScript type checking
typecheck:
	@echo "$(BLUE)Running TypeScript type check...$(NC)"
	@npx tsc --noEmit

## Run all validation checks
validate: lint typecheck test
	@echo "$(GREEN)✓ All validation checks passed$(NC)"

## Clean build artifacts
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf $(BUILD_DIR)
	@rm -rf coverage
	@rm -rf .nyc_output
	@rm -f *.tsbuildinfo
	@echo "$(GREEN)✓ Clean complete$(NC)"

## Build Docker image
docker-build:
	@echo "$(BLUE)Building Docker image...$(NC)"
	@docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	@echo "$(GREEN)✓ Docker image built: $(DOCKER_IMAGE):$(DOCKER_TAG)$(NC)"

## Run Docker container
docker-run: docker-build
	@echo "$(BLUE)Running Docker container...$(NC)"
	@docker run -it --rm \
		-v ~/.edgerc:/home/alecs/.edgerc:ro \
		$(DOCKER_IMAGE):$(DOCKER_TAG)

## Run development Docker container
docker-dev:
	@echo "$(BLUE)Building development Docker image...$(NC)"
	@docker build -f Dockerfile.dev -t $(DOCKER_IMAGE):dev .
	@echo "$(BLUE)Running development container...$(NC)"
	@docker run -it --rm \
		-v $(PWD):/app \
		-v ~/.edgerc:/home/node/.edgerc:ro \
		$(DOCKER_IMAGE):dev

## Docker compose commands
docker-up:
	@docker-compose up -d alecs

docker-down:
	@docker-compose down

docker-logs:
	@docker-compose logs -f alecs

## Create release build
release: validate build
	@echo "$(BLUE)Creating release build...$(NC)"
	@VERSION=$$(node -p "require('./package.json').version"); \
	docker build -t $(DOCKER_IMAGE):$$VERSION -t $(DOCKER_IMAGE):latest .
	@echo "$(GREEN)✓ Release build complete$(NC)"

## Watch for changes (development)
watch:
	@echo "$(BLUE)Watching for changes...$(NC)"
	@npx nodemon --watch $(SRC_DIR) --ext ts --exec "npm run build && node $(BUILD_DIR)/index.js"

## Format code
format:
	@echo "$(BLUE)Formatting code...$(NC)"
	@npx prettier --write "$(SRC_DIR)/**/*.ts"
	@echo "$(GREEN)✓ Code formatted$(NC)"

## Check code formatting
format-check:
	@echo "$(BLUE)Checking code format...$(NC)"
	@npx prettier --check "$(SRC_DIR)/**/*.ts"

## Update dependencies
update-deps:
	@echo "$(BLUE)Checking for dependency updates...$(NC)"
	@npx npm-check-updates -u
	@echo "$(YELLOW)⚠️  Review changes to package.json before installing$(NC)"

## Security audit
audit:
	@echo "$(BLUE)Running security audit...$(NC)"
	@npm audit

## Fix security issues
audit-fix:
	@echo "$(BLUE)Fixing security issues...$(NC)"
	@npm audit fix

## Generate documentation
docs:
	@echo "$(BLUE)Generating documentation...$(NC)"
	@npx typedoc --out docs/api $(SRC_DIR)
	@echo "$(GREEN)✓ Documentation generated in docs/api$(NC)"

## Performance profiling
profile:
	@echo "$(BLUE)Running with profiling enabled...$(NC)"
	@node --prof $(BUILD_DIR)/index.js

## Memory profiling
memory-check:
	@echo "$(BLUE)Running memory profiling...$(NC)"
	@node --expose-gc --trace-gc-verbose $(BUILD_DIR)/index.js