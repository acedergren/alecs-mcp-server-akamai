# Changelog Update for v1.7.0

Add this to the top of CHANGELOG.md:

```markdown
## [1.7.0] - 2024-01-XX

### Added
- New `delegateSubzone()` function for complete DNS delegation workflow
- Intelligent ADD vs EDIT detection in `upsertRecord()`
- Automatic phantom/empty changelist cleanup
- Force mode option for DNS operations to handle blocking changelists
- Auto-submit option for immediate DNS change activation
- Provider-aware messaging in DNS delegation

### Changed
- Enhanced `upsertRecord()` with automatic retry logic
- Improved error messages with actionable guidance
- DNS operations now handle Edge DNS complexity internally
- Complete removal of emojis from codebase (replaced with text indicators)

### Fixed
- DNS NS record updates now use EDIT operation when records exist
- Proper handling of "zone must have at least 1 NS record" constraint
- Resolution of phantom changelist blocking issues

### Developer Experience
- DNS operations no longer require Akamai API expertise
- One-call solutions for complex workflows
- Clear progress indicators throughout operations
```