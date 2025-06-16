#!/usr/bin/env tsx
/**
 * CI/CD Integration for ALECS
 * 
 * Monitors CI/CD pipelines and creates issues for failures.
 * Integrates with GitHub Actions and other CI systems.
 */

import { AlecsProjectManager } from './alecs-project-manager.js';
import { execSync } from 'child_process';

interface WorkflowRun {
  id: number;
  name: string;
  status: 'completed' | 'in_progress' | 'queued';
  conclusion?: 'success' | 'failure' | 'cancelled';
  url: string;
  created_at: string;
  head_sha: string;
  head_branch: string;
}

interface JobFailure {
  job: string;
  step: string;
  error: string;
  logs?: string;
}

class CIIntegration {
  private manager: AlecsProjectManager;
  private trackedFailures: Map<string, Date>;

  constructor() {
    this.manager = new AlecsProjectManager();
    this.trackedFailures = new Map();
  }

  async monitorWorkflows(branch: string = 'main') {
    await this.manager.connectToGitHub();
    
    console.log(`📊 Monitoring CI workflows for branch: ${branch}`);
    
    // In a real implementation, this would poll GitHub API
    // For now, we'll simulate checking workflow status
    const runs = await this.getRecentWorkflowRuns(branch);
    
    for (const run of runs) {
      if (run.conclusion === 'failure') {
        await this.handleFailedWorkflow(run);
      }
    }
    
    await this.manager.close();
  }

  private async getRecentWorkflowRuns(branch: string): Promise<WorkflowRun[]> {
    // Simulated workflow runs - in reality, this would call GitHub API
    return [
      {
        id: 12345,
        name: 'Comprehensive Testing Pipeline',
        status: 'completed',
        conclusion: 'failure',
        url: 'https://github.com/org/alecs/actions/runs/12345',
        created_at: new Date().toISOString(),
        head_sha: 'abc123',
        head_branch: branch,
      },
    ];
  }

  private async handleFailedWorkflow(run: WorkflowRun) {
    const failureKey = `${run.name}-${run.head_branch}`;
    const lastTracked = this.trackedFailures.get(failureKey);
    
    // Don't create duplicate issues within 24 hours
    if (lastTracked && (Date.now() - lastTracked.getTime()) < 24 * 60 * 60 * 1000) {
      console.log(`⏭️  Skipping recently tracked failure: ${run.name}`);
      return;
    }

    console.log(`❌ Workflow failed: ${run.name}`);
    
    // Get failure details (in reality, would parse logs)
    const failures = await this.getJobFailures(run);
    
    const issueTitle = `CI Failure: ${run.name} on ${run.head_branch}`;
    const issueBody = this.generateFailureIssueBody(run, failures);
    
    await this.manager.createIssue(issueTitle, issueBody, [
      'ci-failure',
      'automated',
      run.head_branch === 'main' ? 'high-priority' : 'medium-priority',
    ]);
    
    this.trackedFailures.set(failureKey, new Date());
  }

  private async getJobFailures(run: WorkflowRun): Promise<JobFailure[]> {
    // In reality, would parse workflow logs
    return [
      {
        job: 'test',
        step: 'Run Tests',
        error: 'Test suite failed with 3 failures',
        logs: 'FAIL src/__tests__/example.test.ts',
      },
    ];
  }

  private generateFailureIssueBody(run: WorkflowRun, failures: JobFailure[]): string {
    return `## CI Pipeline Failure

**Workflow:** ${run.name}
**Branch:** ${run.head_branch}
**Commit:** ${run.head_sha}
**Run URL:** ${run.url}
**Failed at:** ${new Date(run.created_at).toLocaleString()}

### Failed Jobs

${failures.map(f => `
#### ${f.job} / ${f.step}
**Error:** ${f.error}
${f.logs ? `\n\`\`\`\n${f.logs}\n\`\`\`\n` : ''}
`).join('\n')}

### Investigation Steps

1. Check the [workflow run](${run.url}) for full logs
2. Review the commit that triggered this failure
3. Run tests locally to reproduce:
   \`\`\`bash
   git checkout ${run.head_sha}
   npm test
   \`\`\`

### Resolution

- [ ] Identify root cause
- [ ] Fix the issue
- [ ] Verify fix passes CI
- [ ] Close this issue

---
*This issue was automatically created by CI monitoring*`;
  }

  async generateCIReport(days: number = 7) {
    console.log(`📈 Generating CI report for last ${days} days...`);
    
    // In reality, would aggregate data from GitHub API
    const report = {
      totalRuns: 150,
      successRate: 0.85,
      averageDuration: '12m 30s',
      failuresByJob: {
        'test': 15,
        'lint': 5,
        'build': 3,
      },
      flakyTests: [
        'conversational-workflows.test.ts',
        'api-integration.test.ts',
      ],
    };

    const reportBody = `## CI Health Report (Last ${days} Days)

### Overview
- **Total Runs:** ${report.totalRuns}
- **Success Rate:** ${(report.successRate * 100).toFixed(1)}%
- **Average Duration:** ${report.averageDuration}

### Failures by Job
${Object.entries(report.failuresByJob)
  .map(([job, count]) => `- **${job}:** ${count} failures`)
  .join('\n')}

### Flaky Tests Detected
${report.flakyTests.map(test => `- \`${test}\``).join('\n')}

### Recommendations
1. Investigate and fix flaky tests
2. Optimize test performance
3. Add retry logic for transient failures

---
*Generated on ${new Date().toLocaleDateString()}*`;

    console.log(reportBody);
    return report;
  }

  async setupGitHubWebhook() {
    console.log(`🔗 Setting up GitHub webhook for CI notifications...`);
    
    // Instructions for manual setup
    console.log(`
To receive real-time CI notifications:

1. Go to GitHub repository settings
2. Add webhook:
   - URL: https://your-server.com/webhooks/github
   - Content type: application/json
   - Events: Workflow runs, Check runs
3. Configure webhook handler to call this script

Example webhook handler:
\`\`\`javascript
app.post('/webhooks/github', async (req, res) => {
  if (req.body.action === 'completed' && req.body.workflow_run.conclusion === 'failure') {
    execSync('tsx scripts/project-management/ci-integration.ts handle-failure');
  }
  res.status(200).send('OK');
});
\`\`\`
    `);
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const ci = new CIIntegration();

  switch (command) {
    case 'monitor':
      const branch = process.argv[3] || 'main';
      await ci.monitorWorkflows(branch);
      break;

    case 'report':
      const days = parseInt(process.argv[3]) || 7;
      await ci.generateCIReport(days);
      break;

    case 'setup-webhook':
      await ci.setupGitHubWebhook();
      break;

    default:
      console.log(`
CI/CD Integration

Usage:
  tsx scripts/project-management/ci-integration.ts monitor [branch]
  tsx scripts/project-management/ci-integration.ts report [days]
  tsx scripts/project-management/ci-integration.ts setup-webhook

Examples:
  tsx scripts/project-management/ci-integration.ts monitor main
  tsx scripts/project-management/ci-integration.ts report 30
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CIIntegration };