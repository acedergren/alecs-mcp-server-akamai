# ALECS MCP Server Versioning Policy

## Semantic Versioning

This project follows [Semantic Versioning 2.0.0](https://semver.org/) with the following guidelines:

### Version Format: MAJOR.MINOR.PATCH

## Version Numbering Guidelines

### MAJOR (X.0.0) - Breaking Changes
Increment when making incompatible API changes:
- Removing MCP tools or changing their signatures
- Breaking changes to tool parameters or responses
- Major architectural changes that break backward compatibility
- Removing support for customer configurations
- Changes requiring users to modify their Claude Desktop configuration

### MINOR (1.X.0) - New Features & Improvements
Increment when adding functionality in a backward-compatible manner:
- Adding new MCP tools
- Adding new optional parameters to existing tools
- Major refactoring that maintains compatibility (e.g., JS to TypeScript)
- Adding new service modules (DNS, Security, etc.)
- Performance improvements
- Enhanced error handling and logging
- New authentication methods (while keeping existing ones)

### PATCH (1.3.X) - Bug Fixes & Minor Updates
Increment when making backward-compatible bug fixes:
- Fixing bugs in existing functionality
- Security patches
- Documentation updates
- Minor code cleanup
- Dependency updates (non-breaking)
- Test improvements

## Current Version: 1.3.0

### Version History

#### 1.3.0 (Current)
- **TypeScript Migration**: Complete refactor from JavaScript to TypeScript
- **Enhanced Testing**: Comprehensive testing infrastructure with Jest
- **Type Safety**: Added runtime and compile-time type validation
- **Improved Architecture**: Base client classes and better separation of concerns
- **Documentation**: Enhanced inline documentation with JSDoc

#### 1.2.0
- Added modular server architecture
- Introduced DNS management tools
- Added certificate management capabilities
- Performance optimizations

#### 1.1.0
- Multi-customer support via .edgerc sections
- Enhanced error handling
- Added property activation tools
- Improved logging system

#### 1.0.0
- Initial release
- Basic Property Manager support
- EdgeGrid authentication
- Core MCP server implementation

## Pre-release Versions

For pre-release versions, use:
- **Alpha**: `1.3.0-alpha.1` - Early testing, may have significant issues
- **Beta**: `1.3.0-beta.1` - Feature complete but may have bugs
- **RC**: `1.3.0-rc.1` - Release candidate, production-ready pending final testing

## Version Bumping Process

1. **Determine change type** based on the guidelines above
2. **Update version** in:
   - `package.json`
   - `src/index.ts` (server version)
   - Any other version references
3. **Update CHANGELOG.md** with changes
4. **Create git tag**: `git tag -a v1.3.0 -m "Release version 1.3.0"`
5. **Push tag**: `git push origin v1.3.0`

## Examples

### What constitutes each version bump:

**PATCH (1.3.0 → 1.3.1)**
- Fixed EdgeGrid authentication timeout issue
- Updated axios dependency from 1.6.0 to 1.6.1
- Fixed typo in error messages
- Added missing TypeScript types for internal functions

**MINOR (1.3.0 → 1.4.0)**
- Added Fast Purge tool suite
- Converted remaining JavaScript files to TypeScript
- Added request retry logic with exponential backoff
- New optional `timeout` parameter for all API calls
- Added support for new Akamai API endpoints

**MAJOR (1.3.0 → 2.0.0)**
- Changed tool naming convention from snake_case to kebab-case
- Removed deprecated `list_all_properties` tool
- Changed response format from `{ data: ... }` to `{ success: true, result: ... }`
- Dropped support for Node.js 16 (minimum now Node.js 18)
- Required customer parameter for all tools (was optional)

## Compatibility Promise

- **Within MAJOR version**: Full backward compatibility
- **MINOR updates**: Safe to update without code changes
- **PATCH updates**: Always safe to update
- **Pre-release versions**: No compatibility guarantees

## Version Support

- **Current MAJOR**: Full support with updates
- **Previous MAJOR**: Security updates for 6 months
- **Older versions**: Community support only