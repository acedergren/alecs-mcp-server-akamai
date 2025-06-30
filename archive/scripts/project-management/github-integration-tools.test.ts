/**
 * Unit tests for GitHub Integration Tools
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AkamaiClient } from '../akamai-client.js';
import {
  initializeGitHubIntegration,
  createGitHubIssue,
  createGitHubPullRequest,
  linkAlecsToGitHub,
  updateGitHubIssue,
  commentOnGitHub,
  mergeGitHubPullRequest,
  listGitHubIssues,
  listGitHubPullRequests,
  createGitHubAutomation
} from '../tools/github-integration-tools.js';

// Mock AkamaiClient
jest.mock('../akamai-client.js');

// Helper to extract text from response
const getResponseText = (result: any): string => {
  if (result?.content?.[0]?.text) {
    return result.content[0].text;
  }
  return '';
};

describe('GitHub Integration Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  const mockConfig = {
    token: 'ghp_test123',
    owner: 'test-org',
    repo: 'test-repo',
    apiUrl: 'https://api.github.com',
  };

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
      getGroupId: jest.fn(),
      switchAccount: jest.fn(),
    } as any;
    jest.clearAllMocks();
  });

  describe('initializeGitHubIntegration', () => {
    it('should initialize GitHub integration successfully', async () => {
      const result = await initializeGitHubIntegration(mockClient, {
        token: 'ghp_testtoken123',
        owner: 'test-org',
        repo: 'test-repo',
        validateAccess: true,
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Integration Initialized');
      expect(text).toContain('test-org/test-repo');
    });

    it('should handle validation failures', async () => {
      const result = await initializeGitHubIntegration(mockClient, {
        token: '',
        owner: 'test-org',
        repo: 'test-repo',
        validateAccess: true,
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Integration Failed');
      expect(text).toContain('GitHub token is required');
    });
  });

  describe('createGitHubIssue', () => {
    it('should create a GitHub issue', async () => {
      const result = await createGitHubIssue(mockClient, {
        title: 'Property activation failing',
        body: 'Error when activating property prp_123',
        labels: ['bug', 'akamai'],
        assignees: ['developer1'],
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Issue Created');
      expect(text).toContain('Property activation failing');
      expect(text).toContain('bug, akamai');
      expect(text).toContain('developer1');
    });

    it('should handle missing GitHub configuration', async () => {
      const result = await createGitHubIssue(mockClient, {
        title: 'Test Issue',
        body: 'Test Body',
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub not configured');
    });
  });

  describe('createGitHubPullRequest', () => {
    it('should create a pull request', async () => {
      const result = await createGitHubPullRequest(mockClient, {
        title: 'Fix: Update property rules for HTTP/3',
        body: 'Enables QUIC protocol support',
        head: 'feature/http3',
        base: 'main',
        draft: true,
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('Pull Request Created');
      expect(text).toContain('Fix: Update property rules for HTTP/3');
      expect(text).toContain('(Draft)');
      expect(text).toContain('main');
      expect(text).toContain('feature/http3');
    });
  });

  describe('linkAlecsToGitHub', () => {
    it('should link ALECS operation to GitHub issue', async () => {
      const result = await linkAlecsToGitHub(mockClient, {
        operationType: 'property',
        operationId: 'prp_123',
        githubType: 'issue',
        githubNumber: 456,
        description: 'Linked for tracking deployment',
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('ALECS Operation Linked to GitHub');
      expect(text).toContain('property prp_123');
      expect(text).toContain('issue #456');
      expect(text).toContain('Linked for tracking deployment');
    });

    it('should link activation to pull request', async () => {
      const result = await linkAlecsToGitHub(mockClient, {
        operationType: 'activation',
        operationId: 'atv_789',
        githubType: 'pr',
        githubNumber: 123,
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('activation atv_789');
      expect(text).toContain('pr #123');
      expect(text).toContain('/pull/123');
    });
  });

  describe('updateGitHubIssue', () => {
    it('should update GitHub issue', async () => {
      const result = await updateGitHubIssue(mockClient, {
        issueNumber: 123,
        title: 'Updated Title',
        state: 'closed',
        labels: ['resolved', 'production'],
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Issue Updated');
      expect(text).toContain('#123');
      expect(text).toContain('Title: "Updated Title"');
      expect(text).toContain('State: closed');
      expect(text).toContain('Labels: resolved, production');
    });
  });

  describe('commentOnGitHub', () => {
    it('should add comment to issue', async () => {
      const result = await commentOnGitHub(mockClient, {
        type: 'issue',
        number: 123,
        comment: 'Property activated successfully in production',
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('Comment Added to Issue');
      expect(text).toContain('#123');
      expect(text).toContain('Property activated successfully');
    });

    it('should add comment to pull request', async () => {
      const result = await commentOnGitHub(mockClient, {
        type: 'pr',
        number: 456,
        comment: 'All tests passing',
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('Comment Added to Pull Request');
      expect(text).toContain('#456');
      expect(text).toContain('/pull/456');
    });
  });

  describe('mergeGitHubPullRequest', () => {
    it('should merge pull request', async () => {
      const result = await mergeGitHubPullRequest(mockClient, {
        pullNumber: 789,
        mergeMethod: 'squash',
        commitTitle: 'feat: Add HTTP/3 support',
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('Pull Request Merged');
      expect(text).toContain('#789');
      expect(text).toContain('squash');
      expect(text).toContain('feat: Add HTTP/3 support');
    });
  });

  describe('listGitHubIssues', () => {
    it('should list GitHub issues with filters', async () => {
      const result = await listGitHubIssues(mockClient, {
        state: 'open',
        labels: ['bug'],
        assignee: 'developer1',
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Issues');
      expect(text).toContain('Property activation failing');
      expect(text).toContain('🟢 Open');
      expect(text).toContain('bug, akamai');
    });
  });

  describe('listGitHubPullRequests', () => {
    it('should list pull requests', async () => {
      const result = await listGitHubPullRequests(mockClient, {
        state: 'open',
        base: 'main',
        config: mockConfig,
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Pull Requests');
      expect(text).toContain('Fix: Update property rules');
      expect(text).toContain('🟢 Open');
      expect(text).toContain('main ← feature/http3');
    });
  });

  describe('createGitHubAutomation', () => {
    it('should create deployment automation', async () => {
      const result = await createGitHubAutomation(mockClient, {
        type: 'deployment',
        trigger: 'property-activation',
        actions: [
          'Create GitHub issue for failed activation',
          'Assign to on-call engineer',
          'Add production-incident label',
        ],
      });

      const text = getResponseText(result);
      expect(text).toContain('GitHub Automation Created');
      expect(text).toContain('ALECS-deployment-property-activation');
      expect(text).toContain('Create GitHub issue for failed activation');
    });

    it('should create DNS change automation', async () => {
      const result = await createGitHubAutomation(mockClient, {
        type: 'testing',
        trigger: 'dns-change',
        actions: [
          'Create PR with DNS changes',
          'Run DNS validation tests',
          'Request review from DNS team',
        ],
      });

      const text = getResponseText(result);
      expect(text).toContain('testing');
      expect(text).toContain('dns-change');
      expect(text).toContain('DNS Change → Pull Request');
    });
  });
});