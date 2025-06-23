# GitHub Actions Workflows

## Active Workflows

### Core CI/CD

- **ci-simple.yml** - Main CI pipeline (build, test, lint)
- **release-simple.yml** - Manual release workflow
- **deploy.yml** - Manual deployment to production/staging

### Automated

- **tag-release.yml** - Auto-creates tags when version changes
- **dependency-update.yml** - Weekly dependency updates

### Daily Jobs

- **daily.yml** - Daily maintenance tasks

## Archived Workflows

The following workflows have been moved to `archived/` to simplify CI/CD:

- auth-integration-test.yml
- claude-code-review.yml
- claude.yml
- docker-publish.yml (merged into release-simple.yml)
- e2e-tests.yml
- project-automation.yml
- security-pr-check.yml
- security-test-suite.yml
- test.yml (replaced by ci-simple.yml)
- update-docker-version.yml

To re-enable any workflow, move it back from `archived/` to the main workflows directory.

## KISS Principles Applied

1. **Single responsibility** - Each workflow does one thing well
2. **Non-blocking checks** - Lint/test failures don't block builds
3. **Manual control** - Releases and deploys are manual
4. **Minimal configuration** - Simple, readable YAML
5. **Fast feedback** - Build first, then run checks
