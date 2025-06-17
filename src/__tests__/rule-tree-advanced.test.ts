/**
 * Tests for Advanced Rule Tree Management Tools
 */

import {
  validateRuleTree,
  createRuleTreeFromTemplate,
  analyzeRuleTreePerformance,
  detectRuleConflicts,
  listRuleTemplates
} from '../tools/rule-tree-advanced';
import { AkamaiClient } from '../akamai-client';

// Mock AkamaiClient
jest.mock('../akamai-client');

describe('Advanced Rule Tree Management Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('default') as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('validateRuleTree', () => {
    it('should validate a valid rule tree', async () => {
      // Mock property response
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 1
          }]
        }
      });

      // Mock rules response
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'cpCode', options: { value: { id: 12345 } } },
            { name: 'caching', options: { behavior: 'CACHE', defaultTtl: '1d' } }
          ],
          children: []
        }
      });

      const result = await validateRuleTree(mockClient, {
        propertyId: 'prp_12345',
        includeStatistics: true,
        includeOptimizations: true
      });

      expect(result.content[0]?.text).toContain('Rule Tree Validation Report');
      expect(result.content[0]?.text).toContain('✅ VALID');
      expect(result.content[0]?.text).toContain('Rule Statistics');
    });

    it('should detect missing origin behavior', async () => {
      const result = await validateRuleTree(mockClient, {
        propertyId: 'prp_12345',
        rules: {
          name: 'default',
          behaviors: [
            { name: 'caching', options: { behavior: 'CACHE' } }
          ]
        }
      });

      expect(result.content[0]?.text).toContain('❌ INVALID');
      expect(result.content[0]?.text).toContain('Default rule must contain origin behavior');
    });

    it('should detect behavior conflicts', async () => {
      const result = await validateRuleTree(mockClient, {
        propertyId: 'prp_12345',
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'caching', options: { behavior: 'CACHE' } },
            { name: 'noStore', options: {} }
          ]
        }
      });

      expect(result.content[0]?.text).toContain('Conflicting behaviors');
    });
  });

  describe('createRuleTreeFromTemplate', () => {
    it('should create rule tree from static website template', async () => {
      const result = await createRuleTreeFromTemplate(mockClient, {
        templateId: 'static-website-optimized',
        variables: {
          originHostname: 'origin.example.com',
          cacheTTL: '7d'
        }
      });

      expect(result.content[0]?.text).toContain('Rule Tree Template Applied');
      expect(result.content[0]?.text).toContain('Static Website Optimized');
      expect(result.content[0]?.text).toContain('origin.example.com');
    });

    it('should validate template variables', async () => {
      const result = await createRuleTreeFromTemplate(mockClient, {
        templateId: 'static-website-optimized',
        variables: {} // Missing required originHostname
      });

      expect(result.content[0]?.text).toContain('Template variable validation failed');
      expect(result.content[0]?.text).toContain('Missing required variable: originHostname');
    });

    it('should handle unknown template', async () => {
      const result = await createRuleTreeFromTemplate(mockClient, {
        templateId: 'unknown-template',
        variables: {}
      });

      expect(result.content[0]?.text).toContain('Error');
      expect(result.content[0]?.text).toContain("Template 'unknown-template' not found");
    });
  });

  describe('analyzeRuleTreePerformance', () => {
    it('should analyze rule tree performance', async () => {
      // Mock property response
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 1
          }]
        }
      });

      // Mock rules response
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'caching', options: { behavior: 'NO_CACHE' } }
          ],
          children: [
            {
              name: 'Static Assets',
              criteria: [
                { name: 'path', options: { values: ['*.css', '*.js'] } }
              ],
              behaviors: [
                { name: 'caching', options: { behavior: 'NO_CACHE' } }
              ]
            }
          ]
        }
      });

      const result = await analyzeRuleTreePerformance(mockClient, {
        propertyId: 'prp_12345',
        includeRecommendations: true
      });

      expect(result.content[0]?.text).toContain('Rule Tree Performance Analysis');
      expect(result.content[0]?.text).toContain('Performance Metrics');
      expect(result.content[0]?.text).toContain('Caching Analysis');
      expect(result.content[0]?.text).toMatch(/Recommendations|Next Steps/);
    });

    it('should identify performance bottlenecks', async () => {
      const result = await analyzeRuleTreePerformance(mockClient, {
        propertyId: 'prp_12345',
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } }
            // Missing gzipResponse
          ]
        }
      });

      expect(result.content[0]?.text).toContain('Performance Bottlenecks');
      expect(result.content[0]?.text).toContain('No compression enabled');
    });
  });

  describe('detectRuleConflicts', () => {
    it('should detect no conflicts in valid rule tree', async () => {
      // Mock property response
      mockClient.request.mockResolvedValueOnce({
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test-property',
            latestVersion: 1
          }]
        }
      });

      // Mock rules response
      mockClient.request.mockResolvedValueOnce({
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'cpCode', options: { value: { id: 12345 } } },
            { name: 'caching', options: { behavior: 'CACHE' } },
            { name: 'gzipResponse', options: { behavior: 'ALWAYS' } }
          ]
        }
      });

      const result = await detectRuleConflicts(mockClient, {
        propertyId: 'prp_12345'
      });

      expect(result.content[0]?.text).toContain('Rule Conflict Analysis');
      expect(result.content[0]?.text).toContain('No conflicts detected');
    });

    it('should detect behavior conflicts', async () => {
      const result = await detectRuleConflicts(mockClient, {
        propertyId: 'prp_12345',
        rules: {
          name: 'default',
          behaviors: [
            { name: 'origin', options: { hostname: 'origin.example.com' } },
            { name: 'gzipResponse', options: {} },
            { name: 'brotli', options: {} }
          ]
        }
      });

      expect(result.content[0]?.text).toContain('High Severity Conflicts');
      expect(result.content[0]?.text).toContain('Conflicting behaviors: gzipResponse and brotli');
    });
  });

  describe('listRuleTemplates', () => {
    it('should list all available templates', async () => {
      const result = await listRuleTemplates(mockClient, {});

      expect(result.content[0]?.text).toContain('Available Rule Templates');
      expect(result.content[0]?.text).toContain('Static Website Optimized');
      expect(result.content[0]?.text).toContain('API Acceleration');
      expect(result.content[0]?.text).toContain('Web Delivery');
    });

    it('should filter templates by category', async () => {
      const result = await listRuleTemplates(mockClient, {
        category: 'API'
      });

      expect(result.content[0]?.text).toMatch(/Category Filter.*API/);
      expect(result.content[0]?.text).toContain('API Acceleration');
      expect(result.content[0]?.text).not.toContain('Static Website Optimized');
    });

    it('should filter templates by tags', async () => {
      const result = await listRuleTemplates(mockClient, {
        tags: ['api', 'dynamic']
      });

      expect(result.content[0]?.text).toMatch(/Tag Filter.*api, dynamic/);
      expect(result.content[0]?.text).toContain('API Acceleration');
    });
  });
});