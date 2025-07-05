# SonarCloud GitHub Actions Integration Guide

## Overview

This guide explains how to effectively implement SonarCloud checks in GitHub Actions for the ALECS MCP Server project. The integration provides continuous code quality monitoring, automated issue detection, and quality gate enforcement.

## 🚀 Quick Setup

1. **Run the setup script**:
   ```bash
   ./scripts/setup-sonarcloud-gh-actions.sh
   ```

2. **Add the SONAR_TOKEN secret**:
   - Go to [SonarCloud Security](https://sonarcloud.io/account/security)
   - Generate a new token
   - Add it as `SONAR_TOKEN` in GitHub repository secrets

3. **Commit and push the workflows**:
   ```bash
   git add .github/workflows/
   git commit -m "feat: add SonarCloud GitHub Actions integration"
   git push
   ```

## 📋 Workflows Overview

### 1. Main SonarCloud Analysis (`sonarcloud.yml`)

**Triggers**:
- Push to main, develop, feature/*, fix/* branches
- Pull requests
- Daily scheduled run at 2 AM UTC

**Features**:
- Full code analysis with coverage
- ESLint integration
- Quality gate checking
- PR commenting with metrics
- Automatic issue validation on main branch

**Key Benefits**:
- Immediate feedback on code quality
- Blocks PRs that fail quality gates
- Tracks technical debt over time
- Auto-closes fixed issues

### 2. Quality Gate Enforcement (`quality-gate.yml`)

**Triggers**:
- Pull requests only
- Manual trigger

**Features**:
- TypeScript compilation check
- Linting verification
- Test execution
- Security vulnerability scanning
- New issue threshold (max 10 per PR)

**Key Benefits**:
- Prevents broken code from merging
- Enforces coding standards
- Maintains security posture
- Controls technical debt growth

### 3. Scheduled Deep Analysis (`scheduled-analysis.yml`)

**Triggers**:
- Weekly on Mondays at 9 AM UTC
- Manual trigger with options

**Features**:
- Comprehensive test coverage analysis
- Security audit with detailed reporting
- Code complexity measurement
- Duplicate code detection
- Automatic issue creation with weekly report
- Fixed issue validation and closure

**Key Benefits**:
- Regular health checks
- Trend analysis
- Proactive issue detection
- Automated cleanup

## 🛡️ Quality Gates Configuration

### Default Quality Gates

| Metric | Threshold | Action |
|--------|-----------|--------|
| New Bugs | 0 | Block PR |
| New Vulnerabilities | 0 | Block PR |
| New Security Hotspots | 0 | Review Required |
| Coverage on New Code | > 80% | Warn |
| Duplicated Lines | < 5% | Warn |
| Maintainability Rating | A | Warn |

### Custom Rules for ALECS

1. **TypeScript Strict Mode**: All new code must pass strict TypeScript checks
2. **No Any Types**: New code cannot introduce `any` types
3. **Import Organization**: Imports must be properly organized
4. **Documentation**: Public APIs must have JSDoc comments

## 📊 Metrics and Reporting

### PR Comments

Each PR automatically receives a comment with:
- Bug count
- Vulnerability count
- Code smell count
- Coverage percentage
- Duplication percentage
- Security hotspot count
- Direct link to detailed SonarCloud analysis

### Weekly Reports

Automated weekly reports include:
- Fixed vs new issues trend
- Coverage changes
- Complexity analysis
- Security audit results
- Top 10 most complex files
- Duplication hotspots

## 🔧 Configuration Files

### `sonar-project.properties`

```properties
sonar.projectKey=acedergren_alecs-mcp-server-akamai
sonar.organization=acedergren
sonar.sources=src
sonar.tests=src/__tests__
sonar.exclusions=**/*.test.ts,**/*.spec.ts,**/node_modules/**
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.typescript.tsconfigPath=tsconfig.json
```

### Required npm Scripts

```json
{
  "scripts": {
    "test:coverage": "jest --coverage --coverageReporters=lcov",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "sonarcloud:validate": "tsx scripts/validate-sonarcloud-issues.ts",
    "sonarcloud:validate:auto": "tsx scripts/validate-sonarcloud-issues.ts --auto-close"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Quality Gate Failing**
   - Check the specific metrics in SonarCloud
   - Focus on new code issues first
   - Run `npm run sonarcloud:validate` locally

2. **Coverage Not Reported**
   - Ensure tests generate `coverage/lcov.info`
   - Check test execution in workflow logs
   - Verify coverage exclusions are correct

3. **PR Not Updating**
   - Check if SONAR_TOKEN is valid
   - Verify branch protection rules
   - Check workflow permissions

### Debug Commands

```bash
# Check current issues locally
npm run sonarcloud:cli issues --status=OPEN --severity=BLOCKER,CRITICAL

# Validate which issues are fixed
npm run sonarcloud:validate

# Check quality gate status
npm run sonarcloud:cli quality-gate
```

## 📈 Best Practices

1. **Fix Issues Immediately**
   - Don't let technical debt accumulate
   - Address new issues in the same PR

2. **Monitor Trends**
   - Review weekly reports
   - Track coverage trends
   - Watch for complexity increases

3. **Use Auto-Close**
   - Let the system close fixed issues
   - Reduces manual overhead
   - Maintains accurate metrics

4. **Leverage PR Feedback**
   - Read the automated comments
   - Click through to detailed reports
   - Fix issues before review

## 🔗 Integration Points

### With Claude Hooks

The SonarCloud integration works seamlessly with Claude hooks:

```json
{
  "name": "sonarcloud-check",
  "description": "Validate code changes against SonarCloud rules",
  "run": "npm run sonarcloud:validate",
  "events": ["before-commit"]
}
```

### With Pre-commit Hooks

Add to `.husky/pre-push`:

```bash
#!/bin/sh
npm run sonarcloud:validate
```

### With VS Code

Install the SonarLint extension and connect to SonarCloud:
1. Install SonarLint
2. Connect to SonarCloud
3. Bind to project `acedergren_alecs-mcp-server-akamai`

## 📅 Maintenance Schedule

- **Daily**: Automatic analysis on main branch
- **Weekly**: Deep analysis with reports
- **Monthly**: Review and update quality gates
- **Quarterly**: Audit exclusion rules

## 🎯 Success Metrics

Track these KPIs:
1. **Issue Resolution Rate**: Fixed issues / Total issues
2. **Quality Gate Pass Rate**: Successful PRs / Total PRs
3. **Coverage Trend**: Month-over-month coverage change
4. **Technical Debt Ratio**: Debt time / Development time
5. **Mean Time to Fix**: Average time from detection to closure

## 🔮 Future Enhancements

1. **AI-Powered Fixes**: Integrate with Claude to suggest fixes
2. **Custom Rules**: Add ALECS-specific coding rules
3. **Performance Metrics**: Include runtime performance analysis
4. **Security Scanning**: Enhanced vulnerability detection
5. **Dependency Analysis**: Track and update dependencies automatically

---

For more information, visit:
- [SonarCloud Dashboard](https://sonarcloud.io/project/overview?id=acedergren_alecs-mcp-server-akamai)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SonarCloud Documentation](https://docs.sonarcloud.io/)