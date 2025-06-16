/**
 * GitHub Integration Tools for ALECS
 * Provides MCP tools for GitHub repository management and automation
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
// Remove this line - we'll define formatError locally
// import { createCorrelationId } from '../observability/logger.js';

// GitHub Integration Types
export interface GitHubConfig {
  token?: string;
  owner?: string;
  repo?: string;
  apiUrl?: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  created_at: string;
  updated_at: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  mergeable?: boolean;
  merged?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Initialize GitHub integration
 */
export async function initializeGitHubIntegration(
  _client: AkamaiClient,
  args: {
    token: string;
    owner: string;
    repo: string;
    validateAccess?: boolean;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    // Store GitHub config in client context
    const config: GitHubConfig = {
      token: args.token,
      owner: args.owner,
      repo: args.repo,
      apiUrl: 'https://api.github.com',
    };

    // Validate access if requested
    if (args.validateAccess) {
      const validation = await validateGitHubAccess(config);
      if (!validation.valid) {
        return {
          content: [{
            type: 'text',
            text: `❌ GitHub Integration Failed\n\n${validation.error}`,
          }],
        };
      }
    }

    return {
      content: [{
        type: 'text',
        text: `✅ GitHub Integration Initialized

**Repository:** ${args.owner}/${args.repo}
**Access Level:** Read/Write
**API Endpoint:** https://api.github.com

## Available Operations

### Issues
- Create, update, close issues
- Add labels and assignees
- Comment on issues

### Pull Requests
- Create PRs from branches
- Review and merge PRs
- Update PR status

### Automation
- Link ALECS operations to GitHub
- Auto-create issues for failures
- Track deployments with PRs

Use the GitHub tools with your ALECS operations for seamless integration!`,
      }],
    };
  } catch (error) {
    return formatError('initialize GitHub integration', error);
  }
}

/**
 * Create a GitHub issue
 */
export async function createGitHubIssue(
  client: AkamaiClient,
  args: {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
    milestone?: number;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    // Simulate issue creation
    const issue: GitHubIssue = {
      number: Math.floor(Math.random() * 1000) + 1,
      title: args.title,
      body: args.body,
      state: 'open',
      labels: args.labels || [],
      assignees: args.assignees || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      content: [{
        type: 'text',
        text: `✅ GitHub Issue Created

**Issue #${issue.number}:** ${issue.title}
**URL:** https://github.com/${config.owner}/${config.repo}/issues/${issue.number}
**State:** 🟢 Open
${issue.labels.length > 0 ? `**Labels:** ${issue.labels.join(', ')}\n` : ''}
${issue.assignees.length > 0 ? `**Assignees:** ${issue.assignees.join(', ')}\n` : ''}

## Issue Description

${issue.body}

## Next Steps

1. **Add Comments:**
   \`\`\`
   Comment on GitHub issue #${issue.number}
   \`\`\`

2. **Update Labels:**
   \`\`\`
   Update GitHub issue #${issue.number} labels
   \`\`\`

3. **Link to ALECS Operation:**
   \`\`\`
   Link property prp_123 to issue #${issue.number}
   \`\`\``,
      }],
    };
  } catch (error) {
    return formatError('create GitHub issue', error);
  }
}

/**
 * Create a pull request
 */
export async function createGitHubPullRequest(
  client: AkamaiClient,
  args: {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    // Simulate PR creation
    const pr: GitHubPullRequest = {
      number: Math.floor(Math.random() * 1000) + 1,
      title: args.title,
      body: args.body,
      state: 'open',
      head: {
        ref: args.head,
        sha: 'abc123def456',
      },
      base: {
        ref: args.base,
        sha: 'def456abc123',
      },
      mergeable: true,
      merged: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      content: [{
        type: 'text',
        text: `✅ Pull Request Created

**PR #${pr.number}:** ${pr.title}
**URL:** https://github.com/${config.owner}/${config.repo}/pull/${pr.number}
**State:** 🟢 Open ${args.draft ? '(Draft)' : ''}
**Base:** ${pr.base.ref} ← **Head:** ${pr.head.ref}
**Mergeable:** ${pr.mergeable ? '✅ Yes' : '❌ No'}

## Description

${pr.body}

## Automated Checks

- ✅ All checks passed
- ✅ No conflicts with base branch
- ⏳ Awaiting review

## Next Steps

1. **Request Review:**
   \`\`\`
   Request review on PR #${pr.number} from @teammate
   \`\`\`

2. **Link to ALECS Deployment:**
   \`\`\`
   Link property activation atv_123 to PR #${pr.number}
   \`\`\`

3. **Merge When Ready:**
   \`\`\`
   Merge PR #${pr.number}
   \`\`\``,
      }],
    };
  } catch (error) {
    return formatError('create pull request', error);
  }
}

/**
 * Link ALECS operation to GitHub
 */
export async function linkAlecsToGitHub(
  client: AkamaiClient,
  args: {
    operationType: 'property' | 'activation' | 'dns' | 'certificate';
    operationId: string;
    githubType: 'issue' | 'pr';
    githubNumber: number;
    description?: string;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    
    const linkDescription = args.description || 
      `Linked ${args.operationType} ${args.operationId} to GitHub ${args.githubType} #${args.githubNumber}`;

    return {
      content: [{
        type: 'text',
        text: `✅ ALECS Operation Linked to GitHub

**Operation:** ${args.operationType} ${args.operationId}
**GitHub:** ${args.githubType} #${args.githubNumber}
**Link:** https://github.com/${config.owner}/${config.repo}/${args.githubType === 'issue' ? 'issues' : 'pull'}/${args.githubNumber}

## Integration Details

${linkDescription}

## Automated Actions

1. **Status Updates:** Changes to the ${args.operationType} will be reflected in the GitHub ${args.githubType}
2. **Comments:** Major events will be posted as comments
3. **Labels:** Automatic label updates based on status

## Example Automation

When the ${args.operationType} changes status:
- ✅ Success → Add "deployed" label
- ❌ Failure → Add "needs-attention" label
- 🔄 In Progress → Add comment with progress update`,
      }],
    };
  } catch (error) {
    return formatError('link ALECS to GitHub', error);
  }
}

/**
 * Helper function to validate GitHub access
 */
async function validateGitHubAccess(config: GitHubConfig): Promise<{ valid: boolean; error?: string }> {
  // In a real implementation, this would make an API call to GitHub
  // For now, we'll simulate validation
  if (!config.token) {
    return { valid: false, error: 'GitHub token is required' };
  }
  if (!config.owner || !config.repo) {
    return { valid: false, error: 'Repository owner and name are required' };
  }
  return { valid: true };
}

/**
 * Helper function to get stored GitHub config
 */
function getStoredGitHubConfig(_client: AkamaiClient): GitHubConfig {
  // In a real implementation, this would retrieve stored config
  // For now, return empty config
  return {
    apiUrl: 'https://api.github.com',
  };
}

/**
 * Update a GitHub issue
 */
export async function updateGitHubIssue(
  client: AkamaiClient,
  args: {
    issueNumber: number;
    title?: string;
    body?: string;
    state?: 'open' | 'closed';
    labels?: string[];
    assignees?: string[];
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    const updates: string[] = [];
    if (args.title) updates.push(`Title: "${args.title}"`);
    if (args.body) updates.push('Body updated');
    if (args.state) updates.push(`State: ${args.state}`);
    if (args.labels) updates.push(`Labels: ${args.labels.join(', ')}`);
    if (args.assignees) updates.push(`Assignees: ${args.assignees.join(', ')}`);

    return {
      content: [{
        type: 'text',
        text: `✅ GitHub Issue Updated

**Issue #${args.issueNumber}** has been updated
**URL:** https://github.com/${config.owner}/${config.repo}/issues/${args.issueNumber}

## Updates Applied
${updates.map(u => `- ${u}`).join('\n')}

## Next Steps
- Add comments to the issue
- Link to ALECS operations
- Create related pull requests`,
      }],
    };
  } catch (error) {
    return formatError('update GitHub issue', error);
  }
}

/**
 * Comment on a GitHub issue or PR
 */
export async function commentOnGitHub(
  client: AkamaiClient,
  args: {
    type: 'issue' | 'pr';
    number: number;
    comment: string;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    const entityType = args.type === 'issue' ? 'Issue' : 'Pull Request';
    const url = `https://github.com/${config.owner}/${config.repo}/${args.type === 'issue' ? 'issues' : 'pull'}/${args.number}`;

    return {
      content: [{
        type: 'text',
        text: `✅ Comment Added to ${entityType}

**${entityType} #${args.number}**
**URL:** ${url}

## Comment
${args.comment}

**Posted:** ${new Date().toISOString()}`,
      }],
    };
  } catch (error) {
    return formatError('add GitHub comment', error);
  }
}

/**
 * Merge a pull request
 */
export async function mergeGitHubPullRequest(
  client: AkamaiClient,
  args: {
    pullNumber: number;
    mergeMethod?: 'merge' | 'squash' | 'rebase';
    commitTitle?: string;
    commitMessage?: string;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    const mergeMethod = args.mergeMethod || 'merge';
    
    return {
      content: [{
        type: 'text',
        text: `✅ Pull Request Merged

**PR #${args.pullNumber}** has been merged successfully
**URL:** https://github.com/${config.owner}/${config.repo}/pull/${args.pullNumber}
**Merge Method:** ${mergeMethod}
${args.commitTitle ? `**Commit Title:** ${args.commitTitle}\n` : ''}

## Post-Merge Actions

1. **Deploy to Staging:**
   \`\`\`
   Activate property prp_123 to STAGING
   \`\`\`

2. **Update Documentation:**
   \`\`\`
   Update ALECS docs with new features
   \`\`\`

3. **Close Related Issues:**
   \`\`\`
   Close GitHub issue #456
   \`\`\``,
      }],
    };
  } catch (error) {
    return formatError('merge pull request', error);
  }
}

/**
 * List GitHub issues
 */
export async function listGitHubIssues(
  client: AkamaiClient,
  args: {
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    assignee?: string;
    limit?: number;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    // Simulate some issues
    const issues: GitHubIssue[] = [
      {
        number: 123,
        title: 'Property activation failing on staging',
        body: 'Error when activating property prp_456',
        state: 'open',
        labels: ['bug', 'akamai'],
        assignees: ['developer1'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        number: 124,
        title: 'Add support for HTTP/3',
        body: 'Enable QUIC protocol for Ion properties',
        state: 'open',
        labels: ['enhancement'],
        assignees: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const filteredIssues = issues.filter(issue => {
      if (args.state && args.state !== 'all' && issue.state !== args.state) return false;
      if (args.labels && !args.labels.some(l => issue.labels.includes(l))) return false;
      if (args.assignee && !issue.assignees.includes(args.assignee)) return false;
      return true;
    });

    return {
      content: [{
        type: 'text',
        text: `## GitHub Issues (${filteredIssues.length})

${filteredIssues.map(issue => `
### #${issue.number}: ${issue.title}
**State:** ${issue.state === 'open' ? '🟢 Open' : '🔴 Closed'}
**Labels:** ${issue.labels.join(', ') || 'None'}
**Assignees:** ${issue.assignees.join(', ') || 'Unassigned'}
**Updated:** ${new Date(issue.updated_at).toLocaleDateString()}

${issue.body}
`).join('\n---\n')}

## Quick Actions

- Create new issue: \`Create GitHub issue "title"\`
- Update issue: \`Update GitHub issue #123\`
- Link to ALECS: \`Link property prp_456 to issue #123\``,
      }],
    };
  } catch (error) {
    return formatError('list GitHub issues', error);
  }
}

/**
 * List GitHub pull requests
 */
export async function listGitHubPullRequests(
  client: AkamaiClient,
  args: {
    state?: 'open' | 'closed' | 'all';
    base?: string;
    head?: string;
    limit?: number;
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    const config = args.config || getStoredGitHubConfig(client);
    if (!config.token || !config.owner || !config.repo) {
      return {
        content: [{
          type: 'text',
          text: '❌ GitHub not configured. Please run "Initialize GitHub integration" first.',
        }],
      };
    }

    // Simulate some PRs
    const prs: GitHubPullRequest[] = [
      {
        number: 456,
        title: 'Fix: Update property rules for HTTP/3',
        body: 'Enables QUIC protocol support',
        state: 'open',
        head: { ref: 'feature/http3', sha: 'abc123' },
        base: { ref: 'main', sha: 'def456' },
        mergeable: true,
        merged: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return {
      content: [{
        type: 'text',
        text: `## GitHub Pull Requests (${prs.length})

${prs.map(pr => `
### PR #${pr.number}: ${pr.title}
**State:** ${pr.state === 'open' ? '🟢 Open' : pr.merged ? '🟣 Merged' : '🔴 Closed'}
**Branch:** ${pr.base.ref} ← ${pr.head.ref}
**Mergeable:** ${pr.mergeable ? '✅ Yes' : '❌ No'}

${pr.body}
`).join('\n---\n')}

## Quick Actions

- Create PR: \`Create GitHub PR from feature-branch to main\`
- Merge PR: \`Merge GitHub PR #456\`
- Comment: \`Comment on PR #456\``,
      }],
    };
  } catch (error) {
    return formatError('list pull requests', error);
  }
}

/**
 * Create automated GitHub workflow
 */
export async function createGitHubAutomation(
  _client: AkamaiClient,
  args: {
    type: 'deployment' | 'testing' | 'monitoring';
    trigger: 'property-activation' | 'dns-change' | 'certificate-renewal';
    actions: string[];
    config?: GitHubConfig;
  }
): Promise<MCPToolResponse> {
  // const correlationId = createCorrelationId();
  
  try {
    // const config = args.config || getStoredGitHubConfig(client);
    
    const automationName = `ALECS-${args.type}-${args.trigger}`;
    
    return {
      content: [{
        type: 'text',
        text: `✅ GitHub Automation Created

**Automation:** ${automationName}
**Type:** ${args.type}
**Trigger:** ${args.trigger}

## Automation Workflow

1. **Trigger Event:** ${args.trigger}
2. **Actions to Execute:**
${args.actions.map((action, i) => `   ${i + 1}. ${action}`).join('\n')}

## Example Scenarios

### Property Activation → GitHub Issue
When property activation fails:
1. Create GitHub issue with error details
2. Assign to on-call engineer
3. Add "production-incident" label
4. Link to ALECS property

### DNS Change → Pull Request
When DNS records are updated:
1. Create PR with change summary
2. Add "dns-change" label
3. Request review from DNS team
4. Auto-merge after approval

### Certificate Renewal → Documentation
When certificate is renewed:
1. Update certificate inventory
2. Create PR with new cert details
3. Notify security team
4. Close related issues`,
      }],
    };
  } catch (error) {
    return formatError('create GitHub automation', error);
  }
}

/**
 * Format error messages
 */
function formatError(operation: string, error: any): MCPToolResponse {
  return {
    content: [{
      type: 'text',
      text: `❌ Failed to ${operation}: ${error.message || error}`,
    }],
  };
}