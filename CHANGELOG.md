# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-06-23

### 🎯 MAJOR RELEASE - Tool Consolidation & Enhanced UX

This is a breaking change release that fundamentally transforms ALECS from a collection of 180+ individual tools into a streamlined, business-focused platform with 25 consolidated tools.

### Added - Consolidated Tools Architecture

- **🎯 Business-Focused Tools**: 25 consolidated tools organized by business function
  - **Getting Started** (2 tools): Website onboarding, DNS management
  - **Property Management** (5 tools): Discovery, creation, configuration, activation, versions
  - **Certificate Management** (3 tools): Enrollment, monitoring, deployment
  - **Hostname Management** (3 tools): Assignment, edge hostnames, analysis
  - **Security** (3 tools): Network lists core, activation, bulk operations
  - **Analytics & Performance** (4 tools): Traffic, performance, advanced analytics, hostname analysis
  - **Cost Management** (2 tools): Analysis and optimization
  - **Troubleshooting** (2 tools): Incident response, diagnostics
  - **Workflow Assistants** (4 tools): AI-powered assistants for complex tasks

- **📊 Enhanced Tool Discovery**: Tools categorized by complexity and business context
  - **Complexity Levels**: Beginner, Intermediate, Advanced, Expert
  - **Business Focus**: Each tool includes business outcome descriptions
  - **Time Estimates**: Realistic time expectations for each operation
  - **Prerequisites**: Clear requirements before using each tool

- **🎨 Progressive Disclosure**: Start simple, dive deep when needed
  - Beginner tools for common tasks
  - Advanced tools for complex scenarios
  - Expert tools for edge cases and troubleshooting

- **🔑 Automatic API Token Generation**: Remote mode security enhancement
  - Auto-generates secure API tokens on remote server startup
  - Displays formatted connection details with embedded tokens
  - Provides ready-to-use WebSocket and SSE connection examples
  - Implements token-based authentication for both transports

### Changed - Server Architecture

- **🏗️ Two-Server Model**: Clean separation of concerns
  - **`alecs` (Main Server)**: 25 consolidated tools for production use
  - **`alecs-dev` (Development Server)**: All 180+ legacy tools for migration/development

- **📦 Simplified Deployment**: 
  - Default: Run consolidated server with `npm start` or `node dist/index.js`
  - Development: Use `npm run start:dev` or `node dist/index-dev.js`
  - Legacy modular servers still available for specialized deployments

- **🎯 Intuitive Command Structure**: 
  - `npm start` → Local mode (STDIO) - perfect for Claude Desktop
  - `npm run start:remote` → Remote mode (WebSocket + SSE) with auto-generated tokens
  - `npm run start:dev` → Development server (all 180+ tools)

- **⚡ Performance Improvements**:
  - Faster tool discovery with pagination support
  - Reduced memory footprint for main server
  - Streamlined tool execution with consolidated interfaces

### Removed - Deprecated Server Flavors

- **🗑️ Cleaned Up Legacy Servers**: Removed redundant server configurations
  - Removed: `index-minimal.ts`, `index-essential.ts`, `index-oauth.ts`
  - Consolidated functionality into main/dev server architecture
  - Updated package.json scripts to reflect new structure

### Enhanced - User Experience

- **🎯 Business-Context Driven**: Tools designed around business outcomes
  - "Launch my e-commerce site globally" vs "create property"
  - "We're under DDoS attack" vs "configure network lists"
  - "Our mobile checkout is slow" vs "analyze performance metrics"

- **🧭 Better Navigation**: Tools organized by user journey
  - Getting started flows for new users
  - Operational tools for day-to-day management
  - Advanced tools for complex scenarios
  - Emergency tools for incident response

- **📚 Enhanced Documentation**: 
  - Updated README with v2.0 architecture
  - Clear migration path from v1.x
  - Business-focused tool descriptions
  - Deployment option guidance

### Migration Guide

- **For Most Users**: Switch to main server (`alecs`) - no breaking changes in functionality
- **For Advanced Users**: Development server (`alecs-dev`) maintains all 180+ tools
- **For Integrations**: Tool names and schemas remain compatible in dev server
- **For New Deployments**: Use main server for better UX and performance

### Breaking Changes

- **Default Server**: Main server now runs consolidated tools by default
- **Script Names**: `start:full` → `start:dev`, `dev:full` → `dev:dev`
- **Tool Discovery**: Main server returns categorized tools with enhanced metadata
- **Tool Count**: Main server exposes 25 tools instead of 180+ (all functionality preserved through consolidation)

### Technical Details

- **Tool Registry**: New consolidated tool registry with enhanced metadata
- **Error Handling**: Improved error messages with troubleshooting guidance
- **Request Context**: Enhanced logging with business context tracking
- **Validation**: Comprehensive input validation with user-friendly error messages

### Backward Compatibility

- **Full Compatibility**: All existing functionality available in `alecs-dev` server
- **No Data Loss**: All tools, schemas, and handlers preserved
- **Gradual Migration**: Users can switch between servers as needed
- **API Compatibility**: MCP protocol implementation remains unchanged

---

## [1.5.0] - 2025-06-23

### Added - Complete CI/CD and Docker Multi-Variant Build System

- **🐳 7 Docker Image Variants**: Comprehensive deployment options

  - `latest` - Main PM2 all-in-one (all servers in one container)
  - `full-latest` - Full server (180+ tools, single process)
  - `essential-latest` - Essential server (15 core tools)
  - `modular-latest` - Modular servers (Property/DNS/Security domain-specific)
  - `minimal-latest` - Minimal server (3 tools for testing)
  - `websocket-latest` - WebSocket transport for remote MCP access
  - `sse-latest` - SSE transport for HTTP-based MCP access

- **🏗️ Multi-Stage Docker Builds**: Optimized container sizes

  - Production-ready multi-stage builds for all variants
  - Smaller image sizes with security-focused non-root users
  - Health checks for all services
  - Proper volume mounts and environment variable support

- **🐙 GitHub Container Registry Integration**: Automated publishing
  - All 7 variants automatically built on release
  - Version-tagged images (e.g., `essential-1.5.0`)
  - Latest tags for easy deployment

### Added - Docker Compose Orchestration

- **📋 6 Docker Compose Files**: Ready-to-use deployment configurations

  - `docker-compose.yml` - Main PM2 all-in-one
  - `docker-compose.full.yml` - Full server deployment
  - `docker-compose.essential.yml` - Essential server deployment
  - `docker-compose.modular.yml` - Modular microservices architecture
  - `docker-compose.minimal.yml` - Minimal testing deployment
  - `docker-compose.remote.yml` - Remote access (WebSocket + SSE)

- **⚡ Makefile Integration**: Simple deployment commands
  - `make docker-build` - Build all variants
  - `make docker-run-*` - Run specific variants
  - Individual build commands for each variant

### Added - Simplified CI/CD (KISS Principles)

- **🔧 Streamlined Workflows**: Reduced from 14 to 5 essential workflows

  - Non-blocking CI checks for faster iteration
  - Build-first approach (build failures block, linting doesn't)
  - Unified release workflow with version bump, tag, and Docker publishing

- **📦 Archived Complex Workflows**: Moved 9 complex workflows to archive
  - Kept for easy restoration if needed
  - Maintained simplicity while preserving functionality

### Improved - Developer Experience

- **📚 Comprehensive Documentation**: Complete Docker build guide

  - Detailed explanations of each image variant
  - Deployment examples for different scenarios
  - Environment variable reference
  - Health check endpoints

- **🎯 Clear Use Cases**: Guidance for choosing the right variant
  - Development: Main PM2 or Full server
  - Production: Essential or Modular
  - Testing: Minimal
  - Remote Access: WebSocket + SSE
  - Microservices: Modular architecture

### Technical Details

- **Server Architecture**: Support for all ALECS deployment patterns

  - Essential (15 tools): Property, DNS, Certificates, FastPurge, Reporting
  - Full (180+ tools): Complete feature set in single process
  - Modular: Domain-specific servers (Property:3010, DNS:3011, Security:3012)
  - Minimal (3 tools): Basic connectivity testing

- **CI/CD Improvements**: Following KISS (Keep It Simple, Stupid) principles
  - Fast feedback loops
  - Manual control over releases and deployments
  - Simple workflows that do one thing well

## [1.4.3] - 2025-06-22

### Changed - Workflow Assistants: Enhanced Business Process Automation

- **🔄 Renamed Domain Assistants to Workflow Assistants**: Better reflects their true purpose
  - Infrastructure Assistant → Infrastructure Workflow Assistant
  - DNS Assistant → DNS Workflow Assistant
  - Security Assistant → Security Workflow Assistant
  - Performance Assistant → Performance Workflow Assistant
- **🎯 Enhanced Intent Recognition**: Improved natural language processing
  - Better understanding of business requirements
  - More accurate workflow selection
  - Context-aware recommendations
- **📊 Workflow Orchestration**: Seamless integration between assistants
  - Multi-step workflow automation
  - Cross-functional task coordination
  - Intelligent handoffs between assistants

### Added - User Experience Improvements

- **🚀 Faster Response Times**: Optimized assistant performance
  - Sub-second response for most queries
  - Parallel workflow execution
  - Improved caching for common patterns
- **💡 Better Elicitation**: More intuitive information gathering
  - Progressive disclosure of options
  - Smart defaults based on context
  - Reduced back-and-forth questioning
- **📈 Enhanced Business Insights**: Clearer value propositions
  - ROI calculations for recommendations
  - Time-to-value estimates
  - Risk assessment for changes

### What This Means for Users

- **Clearer Mental Model**: "Workflow" better describes what these assistants do - they orchestrate
  complex multi-step processes
- **Improved Discovery**: Users can more easily find the right assistant for their business process
- **Better Integration**: Workflow assistants now work together more seamlessly for complex tasks
- **Faster Results**: Enhanced performance means quicker responses and faster task completion

## [1.4.0] - 2025-06-18

### Added - Enterprise Features

- **🛡️ Security Features**: Enterprise-grade security implementation
  - Rate limiting with configurable windows
  - HTTPS enforcement across all endpoints
  - Secure credential management
- **🧪 Comprehensive Testing**: Full test suite
  - Unit tests for all components
  - Integration tests for multi-customer scenarios
  - E2E tests for workflow validation
  - Manual testing tools for development

### Enhanced - Akamai Tool Capabilities

- **🌐 Property Management**: Enhanced property operations
  - Complete lifecycle management
  - Rule tree optimization
  - Version control and rollback
- **🔒 Certificate Management**: Secure certificate operations
  - Certificate enrollment automation
  - DV certificate provisioning
  - Certificate deployment coordination
- **🌍 DNS Management**: Advanced DNS operations
  - DNS zone management
  - Record operations with validation
  - ACME challenge handling for certificates
- **⚡ Fast Purge**: Intelligent cache invalidation
  - Rate-limited purge operations
  - Bulk purge capabilities
  - Audit logging for compliance

### Improved - Multi-Customer Architecture

- **🏢 Customer Context**: Enhanced customer isolation
  - Customer ID management
  - Proper resource isolation per customer
  - Cross-customer access prevention
- **🔑 Credential Management**: Secure multi-customer credential handling
  - Per-customer EdgeGrid authentication
  - Customer-specific configurations
  - Isolated credential storage
- **📊 Resource Discovery**: Intelligent discovery endpoints
  - Customer-specific tool listings
  - Advanced search capabilities
  - Metadata enrichment

### Technical Improvements

- **🚦 Rate Limiting**: Advanced rate limiting implementation
  - Per-customer rate limits
  - Token bucket algorithm
  - Configurable windows and limits
- **🔧 Configuration**: Enhanced configuration management
  - Environment-based configuration
  - Multi-customer support
  - Flexible deployment options
- **📝 Logging & Monitoring**: Enhanced observability
  - Detailed operation logging
  - Performance metrics
  - Security event tracking

### Developer Experience

- **📚 Documentation**: Comprehensive documentation
  - Integration guides
  - API reference documentation
  - Best practices guides
  - Troubleshooting guides
- **🧪 Testing Tools**: Development utilities
  - Mock servers for testing
  - Test data generators
  - Validation utilities
- **🔍 Discovery**: Enhanced discovery
  - Tool capability discovery
  - API documentation generation
  - Interactive exploration tools

## [1.3.0] - 2025-06-01

### Added

- Remote access capability for MCP server operations
- Secure token-based authentication system
- E2E testing framework with comprehensive test coverage
- Maya Chen's UX transformation with 4 intelligent domain assistants
- Workflow orchestration for complex multi-step operations
- GitHub Actions CI/CD pipeline for automated testing

### Changed

- Consolidated 180+ individual tools into 4 business-focused assistants
- Improved natural language understanding for user intents
- Enhanced error handling and user feedback
- Optimized performance for faster response times

### Security

- Implemented secure token management with encryption
- Added rate limiting for API endpoints
- Enhanced input validation and sanitization
- Secure storage for sensitive credentials

## [1.2.0] - 2025-05-15

### Added

- Multi-customer support architecture
- Customer context isolation
- EdgeGrid authentication per customer
- Bulk operations for property management
- Advanced DNS migration tools

### Changed

- Refactored core architecture for modularity
- Improved error messages and logging
- Enhanced performance for large-scale operations
- Updated documentation with examples

### Fixed

- Memory leaks in long-running operations
- Race conditions in concurrent requests
- Edge case handling in DNS operations

## [1.1.0] - 2025-05-01

### Added

- FastPurge integration for cache invalidation
- Network Lists management tools
- AppSec configuration capabilities
- Performance monitoring and analytics
- Real-time metrics dashboard

### Changed

- Improved tool discovery mechanism
- Enhanced search functionality
- Better caching strategies
- Updated dependencies

### Fixed

- Certificate validation issues
- DNS record update conflicts
- Property activation delays

## [1.0.0] - 2025-04-15

### Added

- Initial release of ALECS MCP Server
- Core Akamai property management tools
- DNS zone and record management
- Certificate enrollment and management
- Edge hostname configuration
- Basic reporting capabilities
- MCP protocol implementation
- Multi-server architecture support

### Security

- EdgeGrid authentication implementation
- Secure credential management
- Environment-based configuration

### Documentation

- Comprehensive README
- API documentation
- Integration guides
- Example configurations
