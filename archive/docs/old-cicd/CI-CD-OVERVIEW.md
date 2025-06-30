# CI/CD Overview

## Existing Workflows

### Continuous Integration

1. **test.yml** - Main CI pipeline
   - Runs on: push to main/develop, all PRs
   - Steps: Install → Lint → TypeScript → Test → Build

2. **e2e-tests.yml** - End-to-end testing
   - Runs on: push to main, PRs
   - Full integration tests with Akamai

3. **security-test-suite.yml** - Security testing
   - Comprehensive security scans

### Release Management

1. **tag-release.yml** - Automatic tagging and releases
   - Triggers when package.json version changes
   - Creates git tag and GitHub release

2. **docker-publish.yml** - Container publishing
   - Triggers on new tags (v*)
   - Publishes to GitHub Container Registry

### Deployment

1. **deploy.yml** - Manual deployment
   - Trigger: Manual workflow dispatch
   - Deploys to production or staging via SSH

## How to Release

1. **Update version** in package.json
2. **Commit and push** to main
3. **Automatic steps**:
   - CI tests run
   - Git tag created
   - GitHub release created
   - Docker image published
4. **Deploy** using Actions → Deploy workflow

## Required Secrets

For deployment to work, configure these secrets in GitHub:
- `DEPLOY_HOST` - Server hostname
- `DEPLOY_USER` - SSH username  
- `DEPLOY_KEY` - SSH private key

## Docker Images

Images are published to:
```
ghcr.io/acedergren/alecs-mcp-server-akamai:latest
ghcr.io/acedergren/alecs-mcp-server-akamai:VERSION
```