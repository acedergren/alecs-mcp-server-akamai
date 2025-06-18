# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.5.1] - 2025-01-18

### Added
- **Property Onboarding Agent**: Automated workflow for complete property onboarding
  - HTTPS-only configuration with Enhanced TLS by default
  - Automatic Default DV certificate provisioning
  - DNS automation with ACME challenge record creation for Edge DNS zones

## [1.3.3] - 2025-01-18

### Added
- **Valkey Caching Implementation**: High-performance Redis-compatible caching system
  - Smart cache refresh with stale-while-revalidate pattern
  - Cache stampede prevention with lock-based synchronization
  - Support for single, cluster, and sentinel Redis modes
  - Configurable TTLs for different data types
  - 100-800x performance improvement for cached operations
- **Enhanced Tree View Summary**: Comprehensive statistics before property tree display
  - Total groups and groups with properties count
  - Total property count across entire hierarchy
  - Contract breakdown showing property distribution
  - Warning for large hierarchies (100+ properties)

### Enhanced
- **Performance Optimization**: Dramatic speed improvements through intelligent caching
  - API calls reduced from 600-800ms to 1ms for cached data
  - Parallel batch processing for initial cache warming
  - Background refresh for frequently accessed data
- **Property Tree View**: Added upfront summary statistics for better overview
  - Contract-level property distribution
  - Group hierarchy statistics
  - Clear visual organization of large property sets

### Technical Details
- Added `src/services/valkey-cache-service.ts` for core caching functionality
- Added `src/services/akamai-cache-service.ts` for Akamai-specific caching
- Added `src/tools/universal-search-with-cache.ts` for cached property search
- Comprehensive performance audit documentation in `PERFORMANCE_AUDIT_REPORT.md`
- Caching strategy guide in `VALKEY_OPTIMIZATION_PLAN.md`
- Cache opportunity analysis in `CACHE_OPPORTUNITY_ANALYSIS.md`

  - Interactive DNS migration guidance for AWS, Cloudflare, Azure, and other providers
  - Origin hostname validation and prompting
  - Smart defaults: .edgekey.net edge hostnames, DEFAULT certificates
- **Property Onboarding Tools**: Three new MCP tools for streamlined onboarding
  - `onboard-property`: Complete automated onboarding workflow
  - `onboard-property-wizard`: Interactive wizard for missing parameters
  - `check-onboarding-status`: Status verification for onboarding progress

### Enhanced
- **Workflow Automation**: Reduced property onboarding from 12 manual steps to single command
- **DNS Integration**: Automatic ACME challenge record creation for Edge DNS zones
- **Provider Migration**: Specific migration guides for major DNS providers

### Technical Details
- Added `src/agents/property-onboarding.agent.ts` with complete workflow orchestration
- Added `src/tools/property-onboarding-tools.ts` for MCP tool exposure
- Integrated with existing property, DNS, and certificate management tools
- Maintains security best practices with HTTPS-only and Enhanced TLS defaults

## [1.3.2] - 2025-01-18

### Added
- **Tree View for Properties**: New hierarchical tree view display for group properties and subgroups
  - Automatically displays properties in tree format when listing by group
  - Shows property count, versions, and status for each group
  - Includes summary statistics for total properties and distribution
  - Supports nested subgroup display with clear visual hierarchy
- **Tree View Utilities**: New utility module for rendering hierarchical data structures
  - Flexible tree rendering with customizable icons and metadata
  - Support for empty group filtering and property status display
  - Reusable components for future tree view implementations

### Enhanced
- **Property Listing UX**: Improved user experience when viewing properties by group
  - Automatic tree view activation when groupId is specified
  - Clear distinction between direct properties and subgroup properties
  - Visual indicators for empty groups and property counts
- **Code Organization**: Added dedicated tree view utilities for consistent hierarchical displays

### Technical Details
- Added `src/utils/tree-view.ts` with comprehensive tree rendering utilities
- Enhanced `listProperties` function to support tree view with `includeSubgroups` parameter
- Added `listPropertiesTreeView` function for recursive group property queries
- Maintains backward compatibility with existing property listing behavior

## [1.3.1] - 2025-06-18

### Added
- **Enhanced Parameter Support**: Added valuable optional parameters across multiple APIs for improved functionality
  - **Property Manager**: Added `useFastFallback`, `fastPush`, and `complianceRecord` parameters to activations
  - **Edge DNS**: Added `sortBy`, `order`, `limit`, and `offset` parameters for pagination and sorting
  - **Certificate Provisioning**: Added `geography`, `signatureAlgorithm`, `autoRenewal`, and `sniOnly` options
  - **Fast Purge**: Added `priority`, `description`, `notifyEmails`, `waitForCompletion`, and `useQueue` parameters

### Enhanced
- **Parameter Validation**: Updated all Zod schemas with new optional parameters and sensible defaults
- **API Feature Parity**: Brought MCP server closer to full Akamai API capabilities
- **User Experience**: Implemented intelligent defaults to reduce configuration overhead
- **Compliance Support**: Added compliance tracking for regulated environments

### Fixed
- Missing optional parameters that limited advanced functionality
- Parameter validation schemas now include all documented API parameters
- Enhanced error handling with proper parameter validation

### Technical Details
- Modified 5 tool files to support new parameters:
  - `src/tools/property-manager-tools.ts`
  - `src/tools/dns-tools.ts`
  - `src/tools/cps-tools.ts`
  - `src/tools/fastpurge-tools.ts`
  - `src/utils/parameter-validation.ts`
- Added 20+ new optional parameters across 4 major APIs
- All changes maintain backward compatibility
- Comprehensive gap analysis completed with 20 critical gaps fixed

## [1.3.0] - 2025-06-17

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

## [1.2.5] - 2025-06-17

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

## [1.1.0] - 2025-06-15

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

## [1.0.0] - 2025-06-14

### Added
- Initial release with core Property Manager functionality
- Edge DNS management
- Multi-customer support
- Basic certificate management
- MCP protocol implementation