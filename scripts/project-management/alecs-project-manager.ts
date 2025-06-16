#!/usr/bin/env tsx
/**
 * ALECS Project Management Script
 * 
 * This script manages the ALECS project itself using GitHub MCP integration.
 * It assumes the user has the GitHub MCP server configured in their Claude Desktop.
 * 
 * Usage:
 *   tsx scripts/project-management/alecs-project-manager.ts <command> [options]
 * 
 * Commands:
 *   create-issue    - Create an issue for bugs/features
 *   track-release   - Track release progress
 *   update-docs     - Update documentation based on changes
 *   check-ci        - Check CI/CD status
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

interface ProjectConfig {
  owner: string;
  repo: string;
  mainBranch: string;
  releaseBranch: string;
}

const ALECS_CONFIG: ProjectConfig = {
  owner: 'your-org',  // Update with actual GitHub org
  repo: 'alecs-mcp-server',
  mainBranch: 'main',
  releaseBranch: 'release',
};

class AlecsProjectManager {
  private githubClient?: Client;

  async connectToGitHub() {
    console.log('🔗 Connecting to GitHub MCP server...');
    
    // Spawn the GitHub MCP server
    const githubProcess = spawn('npx', ['github-mcp-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const transport = new StdioClientTransport({
      child: githubProcess,
    });

    this.githubClient = new Client({
      name: 'alecs-project-manager',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await this.githubClient.connect(transport);
    console.log('✅ Connected to GitHub MCP server');
  }

  async createIssue(title: string, body: string, labels: string[]) {
    if (!this.githubClient) {
      throw new Error('GitHub client not connected');
    }

    console.log('📝 Creating issue...');
    
    const result = await this.githubClient.callTool('create_issue', {
      owner: ALECS_CONFIG.owner,
      repo: ALECS_CONFIG.repo,
      title,
      body,
      labels,
    });

    console.log('✅ Issue created:', result);
    return result;
  }

  async trackTestFailure(testName: string, errorMessage: string) {
    const issueTitle = `Test Failure: ${testName}`;
    const issueBody = `## Test Failure Report

**Test:** ${testName}
**Date:** ${new Date().toISOString()}

### Error Message
\`\`\`
${errorMessage}
\`\`\`

### Steps to Reproduce
1. Run \`npm test -- ${testName}\`
2. Observe failure

### Expected Behavior
Test should pass

### Environment
- Node.js: ${process.version}
- OS: ${process.platform}
- Branch: ${process.env.GITHUB_REF || 'local'}

---
*This issue was automatically created by ALECS Project Manager*`;

    return this.createIssue(issueTitle, issueBody, ['bug', 'test-failure', 'automated']);
  }

  async createReleaseChecklist(version: string) {
    const issueTitle = `Release Checklist: v${version}`;
    const issueBody = `## Release Checklist for v${version}

### Pre-release Tasks
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Security scan completed

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance benchmarks acceptable

### Documentation
- [ ] API documentation current
- [ ] README.md updated
- [ ] Migration guide (if needed)
- [ ] Release notes drafted

### Deployment
- [ ] Tag created
- [ ] NPM package published
- [ ] GitHub release created
- [ ] Announcement prepared

### Post-release
- [ ] Monitor for issues
- [ ] Update project board
- [ ] Plan next iteration

---
*This checklist was automatically created by ALECS Project Manager*`;

    return this.createIssue(issueTitle, issueBody, ['release', 'checklist']);
  }

  async trackDependencyUpdate(dependency: string, currentVersion: string, newVersion: string) {
    const issueTitle = `Dependency Update: ${dependency} ${currentVersion} → ${newVersion}`;
    const issueBody = `## Dependency Update Required

**Package:** ${dependency}
**Current Version:** ${currentVersion}
**New Version:** ${newVersion}

### Changelog
[View changelog](https://github.com/search?q=${dependency}+${newVersion})

### Impact Analysis
- [ ] Review breaking changes
- [ ] Update code if needed
- [ ] Run full test suite
- [ ] Update documentation

### Security
- [ ] Check for security advisories
- [ ] Review new dependencies
- [ ] Run security scan

---
*This issue was automatically created by ALECS Project Manager*`;

    return this.createIssue(issueTitle, issueBody, ['dependencies', 'maintenance']);
  }

  async createFeatureRequest(feature: string, description: string, rationale: string) {
    const issueTitle = `Feature Request: ${feature}`;
    const issueBody = `## Feature Request

**Feature:** ${feature}

### Description
${description}

### Rationale
${rationale}

### Proposed Implementation
- [ ] Design API
- [ ] Implement core functionality
- [ ] Add tests
- [ ] Update documentation
- [ ] Add examples

### Acceptance Criteria
- [ ] Feature works as described
- [ ] Tests provide >80% coverage
- [ ] Documentation is complete
- [ ] No performance regression

---
*This issue was automatically created by ALECS Project Manager*`;

    return this.createIssue(issueTitle, issueBody, ['enhancement', 'feature-request']);
  }

  async trackPerformanceRegression(metric: string, baseline: number, current: number) {
    const percentChange = ((current - baseline) / baseline * 100).toFixed(2);
    const issueTitle = `Performance Regression: ${metric} increased by ${percentChange}%`;
    const issueBody = `## Performance Regression Detected

**Metric:** ${metric}
**Baseline:** ${baseline}ms
**Current:** ${current}ms
**Change:** +${percentChange}%

### Analysis Needed
- [ ] Identify recent changes
- [ ] Profile the operation
- [ ] Find bottlenecks
- [ ] Implement optimization

### Acceptance Criteria
- [ ] Performance restored to baseline
- [ ] Or justified with documentation
- [ ] Performance test added

---
*This issue was automatically created by ALECS Project Manager*`;

    return this.createIssue(issueTitle, issueBody, ['performance', 'regression', 'automated']);
  }

  async createPullRequestForRelease(version: string) {
    if (!this.githubClient) {
      throw new Error('GitHub client not connected');
    }

    console.log('🔀 Creating release PR...');
    
    const result = await this.githubClient.callTool('create_pull_request', {
      owner: ALECS_CONFIG.owner,
      repo: ALECS_CONFIG.repo,
      title: `Release v${version}`,
      body: `## Release v${version}

This PR contains all changes for the v${version} release.

### Changes
See [CHANGELOG.md](./CHANGELOG.md) for full details.

### Pre-merge Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version bumped
- [ ] CHANGELOG updated

### Post-merge Steps
1. Tag the release
2. Publish to NPM
3. Create GitHub release
4. Announce release`,
      head: `release-v${version}`,
      base: ALECS_CONFIG.mainBranch,
    });

    console.log('✅ Pull request created:', result);
    return result;
  }

  async updateProjectBoard(issueNumber: number, columnName: string) {
    // This would update the project board status
    console.log(`📋 Moving issue #${issueNumber} to ${columnName}`);
    // Implementation would use GitHub Projects API
  }

  async generateReleaseNotes(fromTag: string, toTag: string) {
    if (!this.githubClient) {
      throw new Error('GitHub client not connected');
    }

    // Get commits between tags
    const commits = await this.githubClient.callTool('list_commits', {
      owner: ALECS_CONFIG.owner,
      repo: ALECS_CONFIG.repo,
      since: fromTag,
      until: toTag,
    });

    // Parse commits and generate release notes
    console.log('📝 Generating release notes...');
    // Implementation would parse commits and create formatted release notes
  }

  async checkCIStatus(ref: string = 'main') {
    if (!this.githubClient) {
      throw new Error('GitHub client not connected');
    }

    console.log(`🔍 Checking CI status for ${ref}...`);
    
    const result = await this.githubClient.callTool('get_workflow_runs', {
      owner: ALECS_CONFIG.owner,
      repo: ALECS_CONFIG.repo,
      branch: ref,
      per_page: 5,
    });

    console.log('CI Status:', result);
    return result;
  }

  async close() {
    if (this.githubClient) {
      await this.githubClient.close();
      console.log('👋 Disconnected from GitHub MCP server');
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const manager = new AlecsProjectManager();

  try {
    await manager.connectToGitHub();

    switch (command) {
      case 'create-issue':
        const title = process.argv[3] || 'New Issue';
        const body = process.argv[4] || 'Issue description';
        const labels = process.argv[5]?.split(',') || [];
        await manager.createIssue(title, body, labels);
        break;

      case 'track-test-failure':
        const testName = process.argv[3] || 'Unknown Test';
        const error = process.argv[4] || 'Test failed';
        await manager.trackTestFailure(testName, error);
        break;

      case 'release-checklist':
        const version = process.argv[3] || '1.0.0';
        await manager.createReleaseChecklist(version);
        break;

      case 'track-dependency':
        const dep = process.argv[3];
        const current = process.argv[4];
        const newVer = process.argv[5];
        if (dep && current && newVer) {
          await manager.trackDependencyUpdate(dep, current, newVer);
        }
        break;

      case 'feature-request':
        const feature = process.argv[3] || 'New Feature';
        const desc = process.argv[4] || 'Feature description';
        const rationale = process.argv[5] || 'Why this feature is needed';
        await manager.createFeatureRequest(feature, desc, rationale);
        break;

      case 'check-ci':
        const branch = process.argv[3] || 'main';
        await manager.checkCIStatus(branch);
        break;

      default:
        console.log(`
ALECS Project Manager

Usage: tsx scripts/project-management/alecs-project-manager.ts <command> [options]

Commands:
  create-issue <title> <body> <labels>     Create a GitHub issue
  track-test-failure <test> <error>        Track a test failure
  release-checklist <version>              Create release checklist
  track-dependency <dep> <old> <new>       Track dependency update
  feature-request <name> <desc> <why>      Create feature request
  check-ci [branch]                        Check CI status

Examples:
  tsx scripts/project-management/alecs-project-manager.ts create-issue "Bug: Test failing" "Details here" "bug,high-priority"
  tsx scripts/project-management/alecs-project-manager.ts release-checklist 1.2.0
  tsx scripts/project-management/alecs-project-manager.ts check-ci main
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await manager.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AlecsProjectManager, ALECS_CONFIG };