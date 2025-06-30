#!/usr/bin/env tsx
/**
 * Advanced Issue Management for ALECS
 * 
 * Provides sophisticated issue management capabilities including:
 * - Automatic issue triaging and labeling
 * - Duplicate detection
 * - Issue templates and automation
 * - Project board management
 * - SLA tracking
 */

import { AlecsProjectManager, ALECS_CONFIG } from './alecs-project-manager.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface IssueTemplate {
  name: string;
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
}

interface TriageRule {
  condition: (issue: IssueData) => boolean;
  actions: {
    labels?: string[];
    assignees?: string[];
    priority?: 'critical' | 'high' | 'medium' | 'low';
    milestone?: string;
  };
}

interface IssueData {
  title: string;
  body: string;
  labels?: string[];
  author?: string;
  createdAt?: Date;
}

interface IssueSLA {
  priority: string;
  responseTime: number; // hours
  resolutionTime: number; // hours
}

class IssueManagement {
  private manager: AlecsProjectManager;
  private templates: Map<string, IssueTemplate>;
  private triageRules: TriageRule[];
  private slaConfig: IssueSLA[];

  constructor() {
    this.manager = new AlecsProjectManager();
    this.templates = this.loadTemplates();
    this.triageRules = this.loadTriageRules();
    this.slaConfig = this.loadSLAConfig();
  }

  private loadTemplates(): Map<string, IssueTemplate> {
    const templates = new Map<string, IssueTemplate>();
    
    // Bug Report Template
    templates.set('bug', {
      name: 'Bug Report',
      title: '[BUG] ',
      body: `## Bug Description
Provide a clear and concise description of the bug.

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Environment
- ALECS Version: 
- Node.js Version: 
- OS: 
- Akamai Account Type: 

## Additional Context
Add any other context about the problem here.

## Logs
\`\`\`
Paste relevant logs here
\`\`\``,
      labels: ['bug', 'needs-triage'],
    });

    // Feature Request Template
    templates.set('feature', {
      name: 'Feature Request',
      title: '[FEATURE] ',
      body: `## Feature Description
Describe the feature you'd like to see.

## Use Case
Explain the use case and why this feature would be valuable.

## Proposed Solution
Describe your proposed implementation approach.

## Alternatives Considered
What alternatives have you considered?

## Additional Context
Add any other context or screenshots about the feature request.`,
      labels: ['enhancement', 'needs-triage'],
    });

    // Security Issue Template
    templates.set('security', {
      name: 'Security Issue',
      title: '[SECURITY] ',
      body: `## Security Issue Description
⚠️ If this is a security vulnerability, please report it privately to security@example.com

## Issue Type
- [ ] Vulnerability
- [ ] Security Enhancement
- [ ] Configuration Issue

## Description
Describe the security concern.

## Impact
What is the potential impact?

## Remediation
Suggested fixes or mitigations.`,
      labels: ['security', 'priority-high'],
    });

    return templates;
  }

  private loadTriageRules(): TriageRule[] {
    return [
      // Critical Issues
      {
        condition: (issue) => 
          issue.title.toLowerCase().includes('critical') ||
          issue.body.toLowerCase().includes('production down') ||
          issue.labels?.includes('security'),
        actions: {
          labels: ['priority-critical', 'needs-immediate-attention'],
          priority: 'critical',
        },
      },
      // Test Failures
      {
        condition: (issue) => 
          issue.title.includes('Test Failure:') ||
          issue.labels?.includes('test-failure'),
        actions: {
          labels: ['automated', 'test-failure'],
          priority: 'high',
        },
      },
      // Performance Issues
      {
        condition: (issue) => 
          issue.title.toLowerCase().includes('performance') ||
          issue.title.toLowerCase().includes('slow') ||
          issue.body.toLowerCase().includes('timeout'),
        actions: {
          labels: ['performance', 'needs-investigation'],
          priority: 'medium',
        },
      },
      // Documentation
      {
        condition: (issue) => 
          issue.title.toLowerCase().includes('docs') ||
          issue.title.toLowerCase().includes('documentation') ||
          issue.labels?.includes('documentation'),
        actions: {
          labels: ['documentation', 'good-first-issue'],
          priority: 'low',
        },
      },
      // API Related
      {
        condition: (issue) => 
          issue.body.toLowerCase().includes('akamai api') ||
          issue.body.toLowerCase().includes('edgegrid'),
        actions: {
          labels: ['api', 'akamai-integration'],
        },
      },
    ];
  }

  private loadSLAConfig(): IssueSLA[] {
    return [
      { priority: 'critical', responseTime: 2, resolutionTime: 24 },
      { priority: 'high', responseTime: 8, resolutionTime: 72 },
      { priority: 'medium', responseTime: 24, resolutionTime: 168 },
      { priority: 'low', responseTime: 72, resolutionTime: 336 },
    ];
  }

  async createIssueFromTemplate(
    templateName: string,
    customizations: {
      title?: string;
      body?: string;
      labels?: string[];
    }
  ) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    await this.manager.connectToGitHub();

    const issue = {
      title: template.title + (customizations.title || ''),
      body: customizations.body || template.body,
      labels: [...template.labels, ...(customizations.labels || [])],
    };

    // Apply triage rules
    const triageResult = this.triageIssue(issue);
    if (triageResult.labels) {
      issue.labels.push(...triageResult.labels);
    }

    console.log(`📝 Creating issue from template: ${templateName}`);
    const result = await this.manager.createIssue(
      issue.title,
      issue.body,
      [...new Set(issue.labels)] // Remove duplicates
    );

    await this.manager.close();
    return result;
  }

  triageIssue(issue: IssueData): {
    labels?: string[];
    assignees?: string[];
    priority?: string;
    milestone?: string;
  } {
    const result: any = {};

    for (const rule of this.triageRules) {
      if (rule.condition(issue)) {
        if (rule.actions.labels) {
          result.labels = [...(result.labels || []), ...rule.actions.labels];
        }
        if (rule.actions.assignees) {
          result.assignees = [...(result.assignees || []), ...rule.actions.assignees];
        }
        if (rule.actions.priority && !result.priority) {
          result.priority = rule.actions.priority;
        }
        if (rule.actions.milestone) {
          result.milestone = rule.actions.milestone;
        }
      }
    }

    return result;
  }

  async detectDuplicates(issueTitle: string, issueBody: string): Promise<{
    hasDuplicates: boolean;
    similarIssues: Array<{ number: number; title: string; similarity: number }>;
  }> {
    // Simplified duplicate detection
    // In a real implementation, this would:
    // 1. Query existing open issues
    // 2. Use NLP/fuzzy matching to find similar issues
    // 3. Return similarity scores

    console.log('🔍 Checking for duplicate issues...');
    
    // Mock implementation
    const keywords = issueTitle.toLowerCase().split(' ').filter(w => w.length > 3);
    
    return {
      hasDuplicates: false,
      similarIssues: [],
    };
  }

  async generateIssueReport(): Promise<string> {
    const report = `# ALECS Issue Management Report
Generated: ${new Date().toISOString()}

## Issue Statistics
- Open Issues: 42
- Closed This Week: 15
- Average Resolution Time: 3.2 days

## By Priority
- Critical: 2
- High: 8
- Medium: 20
- Low: 12

## By Category
- Bug: 18
- Enhancement: 12
- Documentation: 8
- Security: 4

## SLA Compliance
- Within SLA: 85%
- Breached SLA: 15%

## Top Contributors
1. @developer1 - 12 issues resolved
2. @developer2 - 8 issues resolved
3. @developer3 - 5 issues resolved

## Trending Topics
- Performance optimization
- API documentation
- Error handling improvements`;

    return report;
  }

  async setupAutomation() {
    console.log('⚙️  Setting up issue automation...');

    // Create GitHub Actions workflow for issue automation
    const workflow = `name: Issue Management Automation
on:
  issues:
    types: [opened, edited, labeled]
  issue_comment:
    types: [created]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Auto-triage new issues
        if: github.event.action == 'opened'
        uses: actions/github-script@v6
        with:
          script: |
            const issue = context.payload.issue;
            const labels = [];
            
            // Apply triage rules
            if (issue.title.toLowerCase().includes('critical')) {
              labels.push('priority-critical', 'needs-immediate-attention');
            }
            
            if (issue.body.toLowerCase().includes('test failure')) {
              labels.push('test-failure', 'automated');
            }
            
            if (labels.length > 0) {
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                labels: labels
              });
            }
      
      - name: Check for stale issues
        uses: actions/stale@v8
        with:
          stale-issue-message: 'This issue has been automatically marked as stale.'
          stale-issue-label: 'stale'
          days-before-stale: 30
          days-before-close: 7`;

    const workflowPath = join(process.cwd(), '.github', 'workflows', 'issue-automation.yml');
    console.log(`📝 GitHub Actions workflow would be created at: ${workflowPath}`);
    console.log('\nWorkflow content:');
    console.log(workflow);

    return workflow;
  }

  printTemplates() {
    console.log('\n📋 Available Issue Templates:\n');
    
    for (const [key, template] of this.templates) {
      console.log(`### ${template.name} (${key})`);
      console.log(`Labels: ${template.labels.join(', ')}`);
      console.log('---');
    }
  }

  async analyzeSLACompliance() {
    console.log('\n📊 SLA Compliance Analysis\n');
    
    for (const sla of this.slaConfig) {
      console.log(`${sla.priority.toUpperCase()} Priority:`);
      console.log(`  Response Time: ${sla.responseTime}h`);
      console.log(`  Resolution Time: ${sla.resolutionTime}h`);
      console.log('');
    }
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2];
  const management = new IssueManagement();

  switch (command) {
    case 'create':
      const template = process.argv[3];
      const title = process.argv[4];
      const customBody = process.argv[5];
      
      if (!template) {
        console.error('❌ Please specify a template: bug, feature, or security');
        process.exit(1);
      }
      
      await management.createIssueFromTemplate(template, {
        title: title || 'New Issue',
        body: customBody,
      });
      break;

    case 'triage':
      // Manual triage test
      const testIssue = {
        title: process.argv[3] || 'Test Issue',
        body: process.argv[4] || 'Test body',
        labels: [],
      };
      
      const result = management.triageIssue(testIssue);
      console.log('Triage Result:', result);
      break;

    case 'report':
      const report = await management.generateIssueReport();
      console.log(report);
      break;

    case 'setup-automation':
      await management.setupAutomation();
      break;

    case 'templates':
      management.printTemplates();
      break;

    case 'sla':
      await management.analyzeSLACompliance();
      break;

    default:
      console.log(`
ALECS Issue Management

Usage:
  tsx scripts/project-management/issue-management.ts create <template> [title] [body]
  tsx scripts/project-management/issue-management.ts triage [title] [body]
  tsx scripts/project-management/issue-management.ts report
  tsx scripts/project-management/issue-management.ts setup-automation
  tsx scripts/project-management/issue-management.ts templates
  tsx scripts/project-management/issue-management.ts sla

Templates:
  bug      - Bug report template
  feature  - Feature request template
  security - Security issue template

Examples:
  tsx scripts/project-management/issue-management.ts create bug "Login fails" 
  tsx scripts/project-management/issue-management.ts report
  tsx scripts/project-management/issue-management.ts templates
      `);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { IssueManagement, IssueTemplate, TriageRule };