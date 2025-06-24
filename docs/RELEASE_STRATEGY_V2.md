# ALECS v2.0 Release Strategy

## Overview

Due to the significant breaking changes in v2.0, we're implementing a phased beta release strategy
to ensure smooth adoption and gather feedback.

## Release Timeline

### Phase 1: Private Beta (Week 1-2)

- **Version**: 2.0.0-beta.1
- **Audience**: Internal team + selected power users
- **Goals**:
  - Test core functionality
  - Identify critical bugs
  - Validate tool consolidation approach
  - Test migration guide

### Phase 2: Public Beta (Week 3-4)

- **Version**: 2.0.0-beta.2, beta.3
- **Audience**: All users (opt-in)
- **Goals**:
  - Broader testing coverage
  - Performance validation
  - Migration feedback
  - Tool discovery UX feedback

### Phase 3: Release Candidate (Week 5-6)

- **Version**: 2.0.0-rc.1
- **Audience**: Early adopters
- **Goals**:
  - Final bug fixes
  - Documentation completion
  - Performance optimization
  - No new features

### Phase 4: General Availability

- **Version**: 2.0.0
- **Audience**: All users
- **Goals**:
  - Stable release
  - Full documentation
  - Migration tools ready
  - v1.x deprecation notice

## Release Channels

### NPM Tags

```bash
# Beta releases
npm install alecs-mcp-server-akamai@beta

# Release candidates
npm install alecs-mcp-server-akamai@rc

# Stable (default)
npm install alecs-mcp-server-akamai@latest

# v1.x maintenance
npm install alecs-mcp-server-akamai@v1-latest
```

### Docker Tags

```bash
# Beta
ghcr.io/acedergren/alecs-mcp-server-akamai:beta
ghcr.io/acedergren/alecs-mcp-server-akamai:2.0.0-beta.1

# Release candidate
ghcr.io/acedergren/alecs-mcp-server-akamai:rc
ghcr.io/acedergren/alecs-mcp-server-akamai:2.0.0-rc.1

# Stable
ghcr.io/acedergren/alecs-mcp-server-akamai:latest
ghcr.io/acedergren/alecs-mcp-server-akamai:2.0.0

# Development server
ghcr.io/acedergren/alecs-mcp-server-akamai:dev-latest
ghcr.io/acedergren/alecs-mcp-server-akamai:dev-2.0.0
```

## Communication Plan

### Beta Announcement Template

````markdown
# 🚀 ALECS v2.0 Beta Now Available!

We're excited to announce the beta release of ALECS v2.0, featuring a major architectural overhaul
focused on improved performance and user experience.

## What's New

- **Consolidated Tools**: From 180+ to 25 business-focused tools
- **Faster Performance**: 80% faster startup, 60% less memory
- **Better Discovery**: Tools organized by business function
- **New Features**: Property cache, visual UI, configurable overrides

## Breaking Changes

This is a major release with breaking changes. Please review:

- [Migration Guide](docs/MIGRATION_GUIDE_V2.md)
- [Beta Testing Guide](docs/BETA_TESTING_GUIDE.md)

## Try the Beta

```bash
npm install -g alecs-mcp-server-akamai@beta
# or
docker run ghcr.io/acedergren/alecs-mcp-server-akamai:beta
```
````

## We Need Your Feedback!

Please test and report issues:
[GitHub Issues](https://github.com/acedergren/alecs-mcp-server-akamai/issues)

````

### Release Notes Template

```markdown
# ALECS v2.0.0

## 🎉 Major Release

After extensive beta testing, we're proud to release ALECS v2.0 with significant improvements in performance, usability, and architecture.

### Highlights
- 25 consolidated business-focused tools
- 80% faster startup time
- 60% lower memory usage
- Enhanced tool discovery
- Property cache with Valkey/Redis
- Configurable customer overrides

### Migration
- [Migration Guide](docs/MIGRATION_GUIDE_V2.md) for upgrading from v1.x
- Dev server available with all 180+ legacy tools
- Gradual migration path supported

### Installation
```bash
npm install -g alecs-mcp-server-akamai@latest
docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:latest
````

### Deprecation Notice

v1.x will be maintained for 6 months with security updates only.

Full changelog: [CHANGELOG.md](CHANGELOG.md)

````

## Success Metrics

### Beta Success Criteria
- [ ] 90% of consolidated tools working correctly
- [ ] No critical bugs in core functionality
- [ ] Migration guide validated by 5+ users
- [ ] Performance improvements confirmed
- [ ] Docker images working on amd64/arm64

### Release Criteria
- [ ] All beta issues resolved
- [ ] Documentation complete
- [ ] Migration tools tested
- [ ] Performance benchmarks met
- [ ] Security scan passed

## Rollback Plan

If critical issues are found post-release:

1. **Immediate**: Pin v1.5.0 in documentation
2. **Day 1**: Release 2.0.1 with hotfix
3. **Week 1**: If unfixable, deprecate 2.0.0 and promote v1.5.x
4. **Communication**: GitHub, npm deprecate, Docker tags

## Post-Release

### Week 1-2
- Monitor GitHub issues
- Track adoption metrics
- Gather performance data
- Quick patches for critical issues

### Month 1
- v2.0.1 with accumulated fixes
- Update migration guide based on feedback
- Blog post about migration success stories

### Month 2-3
- v2.1.0 with new features based on feedback
- Deprecate v1.x branch
- Archive old Docker images

## Automation

### GitHub Actions Workflows
- `release-beta.yml` - Beta releases
- `release-simple.yml` - Production releases
- `test.yml` - CI testing
- `docker-publish.yml` - Multi-arch builds

### Release Commands
```bash
# Create beta release
gh workflow run release-beta.yml \
  -f beta_version=2.0.0-beta.1 \
  -f npm_tag=beta

# Create production release
gh workflow run release-simple.yml \
  -f version=major

# Emergency hotfix
gh workflow run release-simple.yml \
  -f version=patch
````

## Questions?

Contact: @acedergren on GitHub
