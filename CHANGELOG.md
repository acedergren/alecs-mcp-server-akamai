# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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