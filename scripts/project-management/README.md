# ALECS Project Management Scripts

This directory contains internal scripts for managing the ALECS MCP Server project. These scripts are NOT part of the ALECS functionality - they are development tools that help maintain the project.

## Prerequisites

These scripts assume you have the GitHub MCP server installed and configured:

```bash
npm install -g @modelcontextprotocol/github-server
```

Configure it in your Claude Desktop config:
```json
{
  "mcpServers": {
    "github": {
      "command": "github-mcp-server",
      "env": {
        "GITHUB_TOKEN": "your-github-token"
      }
    }
  }
}
```

## Available Scripts

### 1. Project Manager (`alecs-project-manager.ts`)

Core project management functionality:

```bash
# Create an issue
tsx scripts/project-management/alecs-project-manager.ts create-issue "Bug: Test failing" "Details here" "bug,high-priority"

# Track test failure
tsx scripts/project-management/alecs-project-manager.ts track-test-failure "dns-tools.test.ts" "Timeout error"

# Create release checklist
tsx scripts/project-management/alecs-project-manager.ts release-checklist 1.2.0

# Track dependency update
tsx scripts/project-management/alecs-project-manager.ts track-dependency "typescript" "5.2.0" "5.3.0"

# Check CI status
tsx scripts/project-management/alecs-project-manager.ts check-ci main
```

### 2. Automatic Test Tracking (`auto-track-tests.ts`)

Automatically creates GitHub issues for test failures:

```bash
# Pipe test output to tracker
npm test 2>&1 | tsx scripts/project-management/auto-track-tests.ts track

# Or use with saved output
npm test > test-output.log 2>&1
tsx scripts/project-management/auto-track-tests.ts track test-output.log

# Clear the cache (to retrack previously seen failures)
tsx scripts/project-management/auto-track-tests.ts clear-cache
```

### 3. Release Automation (`release-automation.ts`)

Automates the release process:

```bash
# Create a new release
tsx scripts/project-management/release-automation.ts release 1.2.0

# Generate changelog only
tsx scripts/project-management/release-automation.ts changelog

# Release from specific tag
tsx scripts/project-management/release-automation.ts release 1.2.0 v1.1.0
```

### 4. CI/CD Integration (`ci-integration.ts`)

Monitors CI pipelines and creates issues for failures:

```bash
# Monitor workflows
tsx scripts/project-management/ci-integration.ts monitor main

# Generate CI health report
tsx scripts/project-management/ci-integration.ts report 30

# Setup webhook instructions
tsx scripts/project-management/ci-integration.ts setup-webhook
```

### 5. Issue Management (`issue-management.ts`)

Advanced issue management with templates, triaging, and SLA tracking:

```bash
# Create issue from template
tsx scripts/project-management/issue-management.ts create bug "Login fails"

# Test triage rules
tsx scripts/project-management/issue-management.ts triage "Critical: Production Down"

# Generate issue report
tsx scripts/project-management/issue-management.ts report

# View templates
tsx scripts/project-management/issue-management.ts templates

# Check SLA configuration
tsx scripts/project-management/issue-management.ts sla

# Setup automation
tsx scripts/project-management/issue-management.ts setup-automation
```

### 6. Project Board Manager (`project-board-manager.ts`)

Manages GitHub project boards and sprint planning:

```bash
# Move issue between columns
tsx scripts/project-management/project-board-manager.ts move 123 "To Do" "In Progress"

# Create a new sprint
tsx scripts/project-management/project-board-manager.ts create-sprint "Sprint 23"

# Generate sprint report
tsx scripts/project-management/project-board-manager.ts sprint-report

# View burndown data
tsx scripts/project-management/project-board-manager.ts burndown

# Setup daily standup
tsx scripts/project-management/project-board-manager.ts standup

# View board status
tsx scripts/project-management/project-board-manager.ts status
```

### 7. Pull Request Automation (`pr-automation.ts`)

Comprehensive PR workflow automation:

```bash
# Create PR from template
tsx scripts/project-management/pr-automation.ts create feature feature/new-api "Add new API endpoint"

# Run automated PR checks
tsx scripts/project-management/pr-automation.ts check 123

# Auto-assign reviewers based on files
tsx scripts/project-management/pr-automation.ts assign-reviewers 123 src/api/tool.ts src/tests/api.test.ts

# Generate PR metrics report
tsx scripts/project-management/pr-automation.ts report

# Get merge strategy recommendation
tsx scripts/project-management/pr-automation.ts merge-strategy 123

# Setup PR automation workflow
tsx scripts/project-management/pr-automation.ts setup-automation
```

### 8. Code Review Bot (`code-review-bot.ts`)

Automated code review assistance:

```bash
# Analyze code for issues
tsx scripts/project-management/code-review-bot.ts analyze src/api.ts src/utils.ts

# Check code complexity
tsx scripts/project-management/code-review-bot.ts complexity src/api.ts

# Generate review summary
tsx scripts/project-management/code-review-bot.ts summary

# View best practices
tsx scripts/project-management/code-review-bot.ts best-practices
```

### 9. Version Manager (`version-manager.ts`)

Advanced semantic versioning and migration management:

```bash
# Check current version and next options
tsx scripts/project-management/version-manager.ts current

# Validate a version number
tsx scripts/project-management/version-manager.ts validate 2.0.0

# Detect breaking changes
tsx scripts/project-management/version-manager.ts breaking-changes v1.0.0 v2.0.0

# Generate migration guide
tsx scripts/project-management/version-manager.ts migration-guide 1.0.0 2.0.0

# Create release candidate
tsx scripts/project-management/version-manager.ts release-candidate 2.0.0

# Check compatibility matrix
tsx scripts/project-management/version-manager.ts compatibility 2.0.0

# Generate release notes
tsx scripts/project-management/version-manager.ts release-notes 2.0.0
```

### 10. Release Coordinator (`release-coordinator.ts`)

Orchestrates the entire release process:

```bash
# Start release process with pre-flight checks
tsx scripts/project-management/release-coordinator.ts start 2.0.0

# Deploy to environment
tsx scripts/project-management/release-coordinator.ts deploy staging
tsx scripts/project-management/release-coordinator.ts deploy production

# Generate rollback plan
tsx scripts/project-management/release-coordinator.ts rollback-plan 2.0.0

# Generate release announcement
tsx scripts/project-management/release-coordinator.ts announce 2.0.0

# Finalize release (tag, publish, announce)
tsx scripts/project-management/release-coordinator.ts finalize 2.0.0

# Check release status
tsx scripts/project-management/release-coordinator.ts status
```

## Automation Workflows

### Daily Tasks

Add to cron or scheduled GitHub Action:

```bash
#!/bin/bash
# Daily CI monitoring
tsx scripts/project-management/ci-integration.ts monitor main
tsx scripts/project-management/ci-integration.ts monitor develop
```

### On Test Failure

Add to package.json scripts:

```json
{
  "scripts": {
    "test:track": "npm test 2>&1 | tsx scripts/project-management/auto-track-tests.ts track"
  }
}
```

### Release Process

1. Run release automation:
   ```bash
   tsx scripts/project-management/release-automation.ts release 1.2.0
   ```

2. Review and merge the PR

3. After merge:
   ```bash
   git checkout main
   git pull
   git tag v1.2.0
   git push origin v1.2.0
   npm publish
   ```

## Configuration

Update `ALECS_CONFIG` in `alecs-project-manager.ts`:

```typescript
const ALECS_CONFIG: ProjectConfig = {
  owner: 'your-github-org',
  repo: 'alecs-mcp-server',
  mainBranch: 'main',
  releaseBranch: 'release',
};
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Test Failure Tracking
on:
  workflow_run:
    workflows: ["Tests"]
    types: [completed]

jobs:
  track-failures:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: |
          npm install
          tsx scripts/project-management/ci-integration.ts monitor ${{ github.ref_name }}
```

## Best Practices

1. **Don't Track Everything**: Only track persistent failures, not transient ones
2. **Use Labels**: Consistent labeling helps with issue management
3. **Automate Carefully**: Review automated issues/PRs before they accumulate
4. **Clean Up**: Close resolved issues promptly
5. **Cache Management**: Clear test failure cache periodically

## Troubleshooting

### GitHub MCP Connection Issues

```bash
# Test connection
npx github-mcp-server test

# Check token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Script Failures

Enable debug logging:
```bash
DEBUG=* tsx scripts/project-management/alecs-project-manager.ts create-issue "Test" "Body"
```

## Advanced Features

### Issue Templates
The issue management system includes pre-configured templates:
- **Bug Report**: Structured bug reporting with environment details
- **Feature Request**: Feature proposals with use cases
- **Security Issue**: Security concerns with impact assessment

### Automatic Triaging
Issues are automatically triaged based on:
- Keywords in title/body (critical, production down)
- Issue type (test failure, performance)
- Labels applied

### SLA Tracking
Service Level Agreements by priority:
- **Critical**: 2h response, 24h resolution
- **High**: 8h response, 72h resolution
- **Medium**: 24h response, 168h resolution
- **Low**: 72h response, 336h resolution

### Sprint Management
Full sprint lifecycle support:
- Sprint creation with milestones
- Burndown tracking
- Velocity calculation
- Automated standups
- Sprint reports

### Pull Request Automation
Comprehensive PR workflow management:
- **PR Templates**: Feature, bugfix, and performance templates
- **Automated Checks**: Tests, coverage, linting, security
- **Smart Review Assignment**: Based on changed files and expertise
- **Merge Strategy**: Automatic recommendation (squash, rebase, merge)
- **PR Metrics**: Time to merge, review cycles, bottleneck analysis

### Code Review Automation
AI-assisted code review capabilities:
- **Static Analysis**: Detect common issues and anti-patterns
- **Security Scanning**: Identify potential vulnerabilities
- **Complexity Analysis**: Measure and track code complexity
- **Best Practices**: Enforce coding standards
- **Review Comments**: Auto-generate helpful review feedback

### Release Management
Comprehensive release coordination:
- **Semantic Versioning**: Enforce and validate version numbers
- **Breaking Change Detection**: Automatic analysis of API changes
- **Migration Guides**: Auto-generate upgrade documentation
- **Release Candidates**: RC branch and testing workflow
- **Multi-Environment Deploy**: Staged rollout with verification
- **Rollback Plans**: Pre-generated recovery procedures
- **Release Announcements**: Multi-channel notifications

### Version Control
Advanced version management features:
- **Compatibility Matrix**: Track supported versions
- **Dependency Analysis**: Impact assessment
- **Release History**: Audit trail
- **Version Validation**: Semantic versioning rules

## Complete Release Workflow Example

```bash
# 1. Start release process
tsx scripts/project-management/version-manager.ts current
tsx scripts/project-management/release-coordinator.ts start 2.0.0

# 2. If checks pass, create release PR
tsx scripts/project-management/release-automation.ts release 2.0.0

# 3. After PR approval, deploy to staging
tsx scripts/project-management/release-coordinator.ts deploy staging

# 4. Run acceptance tests
npm run test:staging

# 5. Deploy to production
tsx scripts/project-management/release-coordinator.ts deploy production

# 6. Finalize release
tsx scripts/project-management/release-coordinator.ts finalize 2.0.0

# 7. Announce release
tsx scripts/project-management/release-coordinator.ts announce 2.0.0
```

## Future Enhancements

- [ ] Slack/Discord notifications
- [ ] Automated PR reviews
- [x] Performance regression tracking
- [ ] Security vulnerability monitoring
- [ ] Documentation generation
- [ ] Dependency update automation
- [x] Issue templates and automation
- [x] Sprint planning and tracking
- [x] SLA monitoring
- [ ] Team capacity planning
- [ ] Risk assessment automation