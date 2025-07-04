# SonarCloud Integration Guide

This guide explains how to use the SonarCloud integration for the ALECS MCP Server project to manage code quality, validate issues, and maintain high standards.

## Overview

The SonarCloud integration provides:
- 🔍 **Issue Validation**: Check which SonarCloud issues are still valid in your codebase
- 🚀 **Automated Cleanup**: Auto-close issues that have been fixed
- 📊 **Quality Metrics**: Monitor code quality metrics and quality gates
- 🎯 **Targeted Fixes**: Identify exactly where issues exist and how to fix them

## Setup

### 1. Configure SonarCloud Token

First, run the setup script:

```bash
./scripts/setup-sonarcloud.sh
```

Or manually configure:

1. Get your SonarCloud token:
   - Go to https://sonarcloud.io
   - Login with GitHub
   - Go to My Account > Security
   - Generate a new token

2. Add to `.env`:
   ```env
   SONARCLOUD_TOKEN=your-token-here
   SONARCLOUD_ORGANIZATION=alecs-mcp
   SONARCLOUD_PROJECT_KEY=alecs-mcp-server-akamai
   ```

### 2. Install Dependencies

```bash
npm install
```

## Usage

### Quick Validation

Validate all SonarCloud issues against your current codebase:

```bash
npm run sonarcloud:validate
```

This will:
- Fetch all open issues from SonarCloud
- Check each issue against the current code
- Generate a detailed report
- Show which issues have been fixed

### Auto-Close Fixed Issues

To automatically close issues that have been fixed:

```bash
npm run sonarcloud:validate:auto
```

### CLI Commands

The full CLI interface provides additional functionality:

```bash
# List all issues
npx tsx scripts/sonarcloud-cli.ts issues

# Filter issues by type
npx tsx scripts/sonarcloud-cli.ts issues --type BUG,VULNERABILITY

# Filter by severity
npx tsx scripts/sonarcloud-cli.ts issues --severity BLOCKER,CRITICAL

# Check quality gate status
npx tsx scripts/sonarcloud-cli.ts quality-gate

# Get project metrics
npx tsx scripts/sonarcloud-cli.ts metrics

# List all projects in organization
npx tsx scripts/sonarcloud-cli.ts projects
```

## Integration with Hooks

The SonarCloud integration works seamlessly with Claude hooks. When you commit code:

1. Pre-commit hooks ensure code quality
2. Post-commit hooks can trigger SonarCloud analysis
3. Issues are automatically validated

## Validation Report

After running validation, a report is generated (`sonarcloud-validation-report.md`) containing:

- **Summary**: Total issues, fixed, still present
- **Fixed Issues**: List of issues that can be closed
- **Existing Issues**: Issues that still need attention with:
  - Current code snippet
  - Specific location
  - Suggested fix

## Issue Types and Fixes

The validator understands common SonarCloud rules:

### TypeScript Issues
- **S6486**: Replace `any` type with specific types
- **S1128**: Remove unused imports
- **S125**: Remove commented-out code
- **S1186**: Add body to empty functions
- **S6749**: Use "const" assertions for arrays

### Code Quality
- **S1854**: Remove dead code
- **S3358**: Extract nested ternary operations
- **S2737**: Add proper error handling in catch blocks

## Workflow Example

1. **Initial Check**:
   ```bash
   # See current state
   npx tsx scripts/sonarcloud-cli.ts quality-gate
   npx tsx scripts/sonarcloud-cli.ts issues --severity CRITICAL,BLOCKER
   ```

2. **Validate Issues**:
   ```bash
   # Generate validation report
   npm run sonarcloud:validate
   ```

3. **Fix Issues**:
   - Review the validation report
   - Fix the issues that still exist
   - Use the suggestions provided

4. **Clean Up**:
   ```bash
   # Auto-close fixed issues
   npm run sonarcloud:validate:auto
   ```

5. **Verify**:
   ```bash
   # Check quality gate again
   npx tsx scripts/sonarcloud-cli.ts quality-gate
   ```

## Troubleshooting

### Connection Issues
- Verify your token is correct: `echo $SONARCLOUD_TOKEN`
- Check organization and project key match SonarCloud
- Ensure project has been analyzed at least once

### No Issues Found
- Project might not be analyzed yet
- Run a SonarCloud analysis first
- Check if project key is correct

### Permission Errors
- Token needs "Execute Analysis" permission
- For closing issues, needs "Administer Issues" permission

## Best Practices

1. **Regular Validation**: Run validation before major releases
2. **Incremental Fixes**: Address critical/blocker issues first
3. **Automated Workflow**: Use hooks to maintain quality
4. **Monitor Metrics**: Track improvement over time

## API Integration

The integration uses the official SonarCloud Web API:
- Full type safety with Zod schemas
- Automatic pagination for large result sets
- Proper error handling and retries
- Rate limit awareness

## Next Steps

1. Set up CI/CD integration for automatic analysis
2. Configure quality gates in SonarCloud
3. Add custom rules for project-specific patterns
4. Set up notifications for quality gate failures