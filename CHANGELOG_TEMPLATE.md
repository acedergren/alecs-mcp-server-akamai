# Changelog Template

Use this template for future releases. Copy and paste at the top of CHANGELOG.md:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features that have been added

### Changed
- Changes to existing functionality
- **BREAKING**: Any breaking changes should be clearly marked

### Deprecated
- Features that will be removed in future versions

### Removed
- Features that have been removed

### Fixed
- Bug fixes

### Security
- Security updates or fixes

### Technical
- Internal changes that don't affect users directly
- Dependency updates
- Performance improvements

### Documentation
- Documentation updates
- Example updates
```

## Version Numbering Guide

Following Semantic Versioning (MAJOR.MINOR.PATCH):

- **MAJOR (X.0.0)**: Breaking changes, incompatible API changes
- **MINOR (0.X.0)**: New features, backwards compatible
- **PATCH (0.0.X)**: Bug fixes, backwards compatible

## Examples:

### Feature Release (Minor)
```markdown
## [2.1.0] - 2025-01-20

### Added
- Network Lists CSV export feature
- Bulk property activation tool
- Real-time metrics dashboard

### Fixed
- Memory leak in DNS record processing
- Timeout handling in long-running operations
```

### Bug Fix Release (Patch)
```markdown
## [2.0.1] - 2025-01-18

### Fixed
- Security server parameter validation
- DNS zone creation error handling
- Certificate deployment race condition
```

### Breaking Change Release (Major)
```markdown
## [3.0.0] - 2025-02-01

### Changed - BREAKING
- Renamed all tool names to kebab-case format
- Changed authentication method to OAuth 2.0
- Restructured API response format

### Migration Guide
1. Update all tool references in your code
2. Generate new OAuth credentials
3. Update response parsing logic
```