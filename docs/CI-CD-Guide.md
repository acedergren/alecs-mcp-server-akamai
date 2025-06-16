# CI/CD Guide

This guide describes the continuous integration and deployment pipelines for the Akamai MCP Server project.

## Overview

The project uses GitHub Actions for automated testing, building, and releasing. The CI/CD pipeline ensures code quality, security, and reliable deployments across multiple platforms.

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Trigger**: Push to main branch, pull requests

**Jobs**:
- **Test Matrix**: Tests across Node.js 18.x and 20.x
- **Lint**: TypeScript type checking, ESLint, and Prettier formatting
- **Security**: npm audit and secret scanning
- **Docker Build**: Validates Docker image builds

### 2. Comprehensive Testing (`comprehensive-testing.yml`)

**Trigger**: Push to main/develop, nightly schedule

**Features**:
- Unit tests with coverage reporting
- Integration tests with mock Akamai APIs
- Conversational workflow testing
- Performance benchmarking
- Security scanning
- Docker validation

### 3. Release Pipeline (`release.yml`)

**Trigger**: Version tags (v*), manual dispatch

**Process**:
1. Validates version format and package.json match
2. Runs full test suite
3. Generates changelog from commits
4. Publishes to npm (non-prerelease only)
5. Builds and pushes Docker images to GitHub Container Registry
6. Creates GitHub release with artifacts

### 4. Multi-Platform Build (`multi-platform-build.yml`)

**Trigger**: Push to main/develop, pull requests

**Matrix**:
- OS: Ubuntu, macOS, Windows
- Node.js: 18.x, 20.x, 22.x
- Architecture: x64, arm64

### 5. Dependency Updates (`dependency-update.yml`)

**Trigger**: Weekly schedule (Monday 3 AM UTC), manual

**Actions**:
- Updates dependencies to latest minor versions
- Runs security audit
- Creates PR with changes
- Generates security report

## Local Development

### Running CI Checks Locally

```bash
# Run all checks
npm run lint
npm run format:check
npm run typecheck
npm test

# Fix issues automatically
npm run lint -- --fix
npm run format
```

### Pre-commit Hooks

Set up pre-commit hooks to catch issues early:

```bash
# Install husky
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint:check && npm run format:check"
```

## Security Practices

1. **Dependency Scanning**: Automated weekly scans with npm audit
2. **Secret Detection**: TruffleHog scans for exposed credentials
3. **SAST**: TypeScript strict mode and ESLint security rules
4. **Container Scanning**: Docker images scanned during build

## Performance Monitoring

The CI pipeline includes performance regression testing:

```javascript
// Performance thresholds (scripts/check-performance-regression.js)
- Tool Initialization: < 100ms
- API Call Average: < 500ms
- Bulk Operations: < 5000ms per 100 items
- Memory Usage: < 512MB
```

## Release Process

### Creating a Release

1. Update version in `package.json`
2. Commit with message: `chore: release v1.2.0`
3. Create and push tag: `git tag v1.2.0 && git push --tags`
4. GitHub Actions handles the rest

### Pre-release Versions

Use semantic versioning with pre-release tags:
- Alpha: `v1.2.0-alpha.1`
- Beta: `v1.2.0-beta.1`
- RC: `v1.2.0-rc.1`

Pre-releases are not published to npm by default.

## Docker Registry

Docker images are published to GitHub Container Registry:

```bash
# Pull latest image
docker pull ghcr.io/[owner]/akamai-mcp:latest

# Pull specific version
docker pull ghcr.io/[owner]/akamai-mcp:v1.2.0

# Pull architecture-specific
docker pull ghcr.io/[owner]/akamai-mcp:latest-arm64
```

## Troubleshooting

### Common CI Failures

1. **Type Errors**: Run `npm run typecheck` locally
2. **Lint Errors**: Run `npm run lint -- --fix`
3. **Format Issues**: Run `npm run format`
4. **Test Failures**: Check test logs in GitHub Actions

### Debugging Workflows

Enable debug logging:
1. Add secret `ACTIONS_STEP_DEBUG` = `true`
2. Re-run the failed workflow

## Best Practices

1. **Keep CI Fast**: Parallelize jobs where possible
2. **Cache Dependencies**: Use actions/cache for node_modules
3. **Fail Fast**: Run quick checks (lint, format) first
4. **Matrix Testing**: Test across multiple environments
5. **Artifact Retention**: Keep build artifacts for debugging

## Contributing

When contributing:
1. Ensure all CI checks pass locally
2. Add tests for new features
3. Update documentation
4. Follow conventional commits for clear changelogs