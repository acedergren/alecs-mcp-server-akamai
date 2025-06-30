# Documentation Automation

**Status:** ✅ Implemented  
**Last Updated:** 2025-06-30

## Overview

ALECS automatically updates documentation during deployment to keep it current with the latest architecture and feature changes.

## Automated Updates

### What Gets Updated
- `docs/README.md` - Main documentation index with current stats
- `docs/architecture/README.md` - Architecture diagrams and component details  
- `docs/api/README.md` - API reference with tool counts

### Update Triggers
- Every build (`npm run build`)
- Manual deployment (`npm run deploy:hooks`)
- CI/CD pipeline execution

## Implementation

### Scripts
- `scripts/update-docs.ts` - Core documentation updater
- `scripts/deploy-hooks.sh` - Deployment automation
- `scripts/validate-alecs-tools.ts` - Tool validation

### Automation Points
```json
{
  "scripts": {
    "build": "npm run clean && npm run build:ts && npm run docs:update",
    "docs:update": "tsx scripts/update-docs.ts",
    "deploy:hooks": "./scripts/deploy-hooks.sh"
  }
}
```

## What Gets Updated Automatically

### Current Statistics
- **Version:** From package.json
- **Tool Count:** Current count of ALECS tools (113+)
- **Server Count:** Number of service modules (5)
- **Last Updated:** Current date stamp

### Architecture Diagrams
- Service module counts in Mermaid diagrams
- Current tool distribution per server
- Latest component relationships

### API Documentation
- Tool counts per service
- Current server descriptions
- Updated workflow examples

## Manual Updates Still Needed

### Content That Stays Manual
- Getting started guides
- User tutorials
- Troubleshooting sections
- Examples and code snippets
- Deployment guides (unless structure changes)

### When to Manual Update
- New major features
- Workflow changes
- New integration patterns
- Breaking changes

## CI/CD Integration

### GitHub Actions (Example)
```yaml
name: Deploy ALECS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npm run build  # Includes docs:update
      - run: npm run deploy:hooks
      
      - name: Commit updated docs
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git diff --staged --quiet || git commit -m "📚 Auto-update documentation"
          git push
```

### Local Development
```bash
# Manual doc update
npm run docs:update

# Full deployment hooks
npm run deploy:hooks

# Build with doc update
npm run build
```

## Benefits

### ✅ Always Current
- Documentation reflects actual tool counts
- Architecture diagrams stay accurate
- Version info automatically updated

### ✅ No Manual Overhead
- Runs automatically on build
- No separate documentation maintenance
- Consistent formatting

### ✅ Deployment Validation
- Validates tools during deployment
- Catches missing components
- Ensures system health

## Monitoring

### Validation Outputs
- Tool count verification
- Server health checks
- Integration point validation
- Architecture consistency

### Error Handling
- Backup creation before updates
- Graceful failure handling
- Clear error reporting
- Rollback capability

## Future Enhancements

1. **API Documentation Generation** - Auto-generate from schemas
2. **Changelog Integration** - Auto-update from git history
3. **Performance Metrics** - Include deployment benchmarks
4. **Link Validation** - Check all documentation links
5. **Multi-Language Support** - Template system for i18n