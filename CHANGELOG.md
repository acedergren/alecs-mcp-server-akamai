# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-01-17

### Added
- **Interactive CLI**: New default startup mode with user-friendly service selection
- **TypeScript Migration**: Complete migration to TypeScript with full strict mode
- **Enhanced Type Safety**: Comprehensive interfaces and type definitions throughout
- **Improved Error Handling**: Proper handling of unknown errors in catch blocks
- **TypeScript Strict Mode**: All strict checks enabled including:
  - `noImplicitAny`
  - `strictNullChecks`
  - `strictFunctionTypes`
  - `strictBindCallApply`
  - `strictPropertyInitialization`
  - `noImplicitThis`
  - `useUnknownInCatchVariables`
  - `alwaysStrict`

### Changed
- **Default Start Mode**: `npm start` now launches interactive CLI instead of monolithic server
- **100% TypeScript**: All JavaScript files converted to TypeScript
- **Build Process**: Updated to handle TypeScript strict mode compilation
- **Error Handling**: All catch blocks now properly handle unknown error types

### Fixed
- Type safety issues throughout the codebase
- Improved IntelliSense and developer experience
- Better compile-time error detection
- Enhanced code maintainability

### Technical Details
- Converted 8 JavaScript files to TypeScript:
  - 5 files in `src/tools/analysis/`
  - 3 files in `tools/improvement/`
- Added 100+ type definitions and interfaces
- Fixed all strict mode errors:
  - `noImplicitAny`: 8 errors fixed
  - `strictNullChecks`: 4 errors fixed
  - `useUnknownInCatchVariables`: 39 errors fixed
- Test status: 379 tests passing, 59 skipped (4 due to MCP SDK ES module issues)

## [2.0.0] - 2025-01-17

### Changed - BREAKING
- **Modular Architecture**: Split monolithic server into 5 focused modules
  - `alecs-property` (32 tools): Property management with basic certificate support
  - `alecs-dns` (24 tools): DNS zones and records management
  - `alecs-certs` (22 tools): Full certificate lifecycle management
  - `alecs-security` (95 tools): WAF, network lists, bot management
  - `alecs-reporting` (25 tools): Analytics and performance monitoring
- **Memory Optimization**: Reduced memory usage by up to 80% per module
- **Improved Stability**: Isolated failures don't affect other modules
- **Tool Naming Convention**: All tool names now use kebab-case (e.g., `list-properties` instead of `list_properties`)

### Added
- **Modular Server Support**: New server architecture for better performance
- **Essential Server**: Lightweight option with ~60 core features only
- **Interactive Launcher**: Choose between essentials, modular, or full version at startup
- **CLI Tools**: New command-line interface for managing ALECS servers
  - `alecs install` - Install servers to Claude Desktop
  - `alecs remove` - Remove servers from Claude Desktop
  - `alecs list` - List installed servers
  - `alecs start` - Start server interactively
  - `alecs status` - Check server status
  - `alecs config` - Show Claude Desktop configuration
- **Terminal Installation Scripts**:
  - `scripts/add-to-claude.sh` - Bash script for quick server installation
  - `scripts/quick-add.sh` - One-liner commands reference
- **Test Coverage**: Comprehensive test suite with 99.1% pass rate (338/341 tests passing)
- **Modular Tests**: Individual test suites for each server module
- **Enhanced Documentation**: Updated README with modular configuration options

### Fixed
- **Claude Desktop Disconnections**: Resolved memory-related disconnections by reducing tool count
- **Security Server**: Fixed parameter ordering in network list functions
- **Tool Name Errors**: Fixed 26 tool names from underscore to kebab-case format
- **TypeScript Compilation**: Resolved unused imports and type mismatches
- **Test Suite**: Updated all tests for modular architecture

### Technical
- **Breaking Change**: Server file structure reorganized under `dist/servers/`
- **Configuration**: New Claude Desktop config format for modular servers
- **Backwards Compatible**: Monolithic server still available at `dist/index.js`
- **New NPM Scripts**:
  - `npm start` - Launches interactive server selector
  - `npm run start:property` - Start property server only
  - `npm run start:dns` - Start DNS server only
  - `npm run test:modular` - Run modular server tests
- **Package Updates**: Updated to latest MCP SDK 0.5.0

### Migration Guide
1. Update to modular servers by running: `./scripts/add-to-claude.sh all`
2. Or use the CLI: `npm install -g alecs-mcp-server-akamai && alecs install`
3. Choose only the modules you need for optimal performance
4. Property server includes basic certificate support for provisioning
5. Use certificate server for advanced certificate management
6. Restart Claude Desktop after configuration changes

## [1.2.0] - 2025-06-16

### Added

#### FastPurge Service
- **Core Service**: Enterprise-grade FastPurge v3 API integration with intelligent rate limiting and batching
- **Queue Management**: Per-customer isolation with priority-based processing (cache tags > CP codes > URLs)
- **Status Tracking**: Real-time operation monitoring with progress updates and intelligent polling
- **MCP Tools**: Six comprehensive tools for all FastPurge operations
- **Production Monitoring**: Built-in monitoring with metrics, alerting, and capacity planning
- **Resilience Features**: Circuit breaker pattern, exponential backoff, and automatic retry logic

#### Enhanced Property Manager
- **Version Management**: 
  - Version comparison with detailed diff analysis
  - Timeline tracking with event history
  - Safe rollback with validation
  - Batch version operations across properties
  - Version metadata management
- **Rule Tree Management**:
  - Comprehensive validation with performance scoring
  - Template system for consistent configurations
  - Performance analysis and optimization
  - Rule merging between properties
  - Conflict detection and resolution
- **Bulk Operations**:
  - Multi-property cloning with activation
  - Bulk activations with progress tracking
  - Batch rule updates with JSON patches
  - Bulk hostname management
  - Operation status tracking with rollback support
- **Advanced Search**:
  - Multi-criteria property search
  - Property comparison analysis
  - Health checks with performance metrics
  - Configuration drift detection

### Enhanced
- **Error Handling**: Comprehensive error translation with user-friendly messages
- **Performance**: Added performance monitoring and optimization tools
- **Documentation**: Added detailed guides for FastPurge and Property Manager advanced features

### Technical Improvements
- Implemented token bucket rate limiting (100 req/min, 50 burst)
- Added intelligent request batching (50KB limit)
- RFC 7807 compliant error responses
- File-based persistence for queue management
- Circuit breaker with configurable thresholds

## [1.1.0] - 2025-01-08

### Added
- Product mapping and intelligent product selection
- Secure property onboarding workflow
- Enhanced property search capabilities
- CP Code management tools
- DNS migration utilities

### Fixed
- Property activation issues
- Certificate validation errors
- DNS record update conflicts

## [1.0.0] - 2024-12-15

### Added
- Initial release with core Property Manager functionality
- Edge DNS management
- Multi-customer support
- Basic certificate management
- MCP protocol implementation