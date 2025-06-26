/**
 * MCP Evaluation Test Runner
 * 
 * Runs the MCP evaluation suites as Jest tests
 * This allows integration with CI/CD pipelines
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { runEvals, EvalSuiteResult } from './mcp-eval-framework';
import propertyManagementConfig from './property-management.eval';
import dnsManagementConfig from './dns-management.eval';
import { ALECSFullServer } from '../../src/index-full';
import { AkamaiClient } from '../../src/akamai-client';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-model')
}));

describe('MCP Evaluation Suite', () => {
  let server: ALECSFullServer;
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeAll(async () => {
    // Setup mock client
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    setupComprehensiveMocks(mockClient);
    
    // Initialize server
    server = new ALECSFullServer({
      name: 'alecs-eval-server',
      version: '1.6.0'
    });
    
    // Make server available to evals
    global.evalServer = server;
  });
  
  afterAll(() => {
    delete global.evalServer;
    jest.restoreAllMocks();
  });
  
  describe('Property Management Evaluations', () => {
    it('should pass all property management evaluations with high scores', async () => {
      const results = await runEvals(propertyManagementConfig);
      
      expect(results.failed).toBe(0);
      expect(results.averageScore).toBeGreaterThanOrEqual(4.0);
      
      // Check individual evaluation results
      results.results.forEach(result => {
        if (result.status === 'passed' && result.result) {
          expect(result.result.accuracy).toBeGreaterThanOrEqual(3.5);
          expect(result.result.completeness).toBeGreaterThanOrEqual(3.5);
          expect(result.result.relevance).toBeGreaterThanOrEqual(4.0);
        }
      });
      
      // Verify specific capabilities
      const searchEval = results.results.find(r => r.name.includes('Search'));
      expect(searchEval?.status).toBe('passed');
      expect(searchEval?.result?.relevance).toBeGreaterThanOrEqual(4.5);
    });
    
    it('should generate actionable recommendations', async () => {
      const results = await runEvals(propertyManagementConfig);
      
      expect(results.summary.overallRecommendations).toBeDefined();
      expect(results.summary.overallRecommendations.length).toBeGreaterThan(0);
      
      // Check for specific recommendation patterns
      const hasActionableRecs = results.summary.overallRecommendations.some(rec =>
        rec.includes('documentation') ||
        rec.includes('examples') ||
        rec.includes('error') ||
        rec.includes('performance')
      );
      expect(hasActionableRecs).toBe(true);
    });
  });
  
  describe('DNS Management Evaluations', () => {
    it('should pass all DNS management evaluations', async () => {
      const results = await runEvals(dnsManagementConfig);
      
      expect(results.failed).toBe(0);
      expect(results.averageScore).toBeGreaterThanOrEqual(4.0);
      
      // Check DNS-specific evaluations
      const zoneCreation = results.results.find(r => r.name.includes('Zone Creation'));
      expect(zoneCreation?.status).toBe('passed');
      expect(zoneCreation?.result?.clarity).toBeGreaterThanOrEqual(4.0);
      
      const recordManagement = results.results.find(r => r.name.includes('Record Management'));
      expect(recordManagement?.status).toBe('passed');
      expect(recordManagement?.result?.completeness).toBeGreaterThanOrEqual(4.0);
    });
    
    it('should validate advanced DNS features', async () => {
      const results = await runEvals(dnsManagementConfig);
      
      const advancedRecords = results.results.find(r => r.name.includes('Advanced'));
      expect(advancedRecords?.status).toBe('passed');
      
      const securityFeatures = results.results.find(r => r.name.includes('Security'));
      expect(securityFeatures?.status).toBe('passed');
      expect(securityFeatures?.result?.accuracy).toBeGreaterThanOrEqual(4.0);
    });
  });
  
  describe('Cross-Suite Analysis', () => {
    it('should identify common strengths across suites', async () => {
      const propertyResults = await runEvals(propertyManagementConfig);
      const dnsResults = await runEvals(dnsManagementConfig);
      
      // Find common strengths
      const commonStrengths = propertyResults.summary.topStrengths.filter(strength =>
        dnsResults.summary.topStrengths.includes(strength)
      );
      
      expect(commonStrengths.length).toBeGreaterThan(0);
      
      // Common strengths should include formatting and guidance
      const hasExpectedStrengths = commonStrengths.some(strength =>
        strength.includes('format') ||
        strength.includes('clear') ||
        strength.includes('next steps')
      );
      expect(hasExpectedStrengths).toBe(true);
    });
    
    it('should maintain consistent scoring across different tool types', async () => {
      const propertyResults = await runEvals(propertyManagementConfig);
      const dnsResults = await runEvals(dnsManagementConfig);
      
      // Scores should be within reasonable range of each other
      const scoreDifference = Math.abs(propertyResults.averageScore - dnsResults.averageScore);
      expect(scoreDifference).toBeLessThan(0.5);
      
      // Category scores should be consistent
      const propertyClarity = propertyResults.summary.byCategory.clarity;
      const dnsClarity = dnsResults.summary.byCategory.clarity;
      expect(Math.abs(propertyClarity - dnsClarity)).toBeLessThan(0.5);
    });
  });
  
  describe('Performance Benchmarks', () => {
    it('should complete evaluations within time limits', async () => {
      const startTime = Date.now();
      const results = await runEvals(propertyManagementConfig);
      const duration = Date.now() - startTime;
      
      // Should complete all evals within 2 minutes
      expect(duration).toBeLessThan(120000);
      
      // Individual evals should be reasonably fast
      results.results.forEach(result => {
        expect(result.duration).toBeLessThan(30000); // 30 seconds max per eval
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle evaluation failures gracefully', async () => {
      // Create config with a failing eval
      const failingConfig = {
        ...propertyManagementConfig,
        evals: [
          ...propertyManagementConfig.evals,
          {
            name: 'Failing Eval',
            description: 'This eval will fail',
            run: async () => {
              throw new Error('Simulated eval failure');
            }
          }
        ]
      };
      
      const results = await runEvals(failingConfig);
      
      // Should still complete other evals
      expect(results.totalEvals).toBe(propertyManagementConfig.evals.length + 1);
      expect(results.failed).toBe(1);
      expect(results.passed).toBe(propertyManagementConfig.evals.length);
      
      // Failed eval should be recorded
      const failedEval = results.results.find(r => r.name === 'Failing Eval');
      expect(failedEval?.status).toBe('failed');
      expect(failedEval?.error).toContain('Simulated eval failure');
    });
  });
});

/**
 * Setup comprehensive mocks for all MCP tools
 */
function setupComprehensiveMocks(mockClient: jest.Mocked<AkamaiClient>) {
  mockClient.request.mockImplementation(async (options) => {
    const path = options.path;
    
    // Property endpoints
    if (path.includes('/papi/v1/properties')) {
      if (options.method === 'POST') {
        return { propertyLink: '/papi/v1/properties/prp_12345' };
      }
      return {
        properties: {
          items: [{
            propertyId: 'prp_12345',
            propertyName: 'test.example.com',
            latestVersion: 1,
            productionVersion: 1,
            stagingVersion: 1
          }]
        }
      };
    }
    
    // Groups and contracts
    if (path.includes('/papi/v1/groups')) {
      return {
        groups: {
          items: [{
            groupId: 'grp_12345',
            groupName: 'Test Group',
            contractIds: ['ctr_1-ABC123']
          }]
        }
      };
    }
    
    if (path.includes('/papi/v1/contracts')) {
      return {
        contracts: {
          items: [{
            contractId: 'ctr_1-ABC123',
            contractTypeName: 'DIRECT_CUSTOMER'
          }]
        }
      };
    }
    
    // DNS endpoints
    if (path.includes('/config-dns/v2/zones')) {
      if (options.method === 'POST') {
        return {
          zone: 'eval-test.com',
          type: 'PRIMARY',
          contractId: 'ctr_1-ABC123'
        };
      }
      return {
        zones: [{
          zone: 'eval-test.com',
          type: 'PRIMARY',
          signAndServe: true
        }]
      };
    }
    
    if (path.includes('/config-dns/v2/zones/') && path.includes('/recordsets')) {
      return {
        recordsets: [{
          name: 'www.eval-test.com',
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.1']
        }]
      };
    }
    
    // Activation endpoints
    if (path.includes('/activations')) {
      return {
        activationLink: '/papi/v1/properties/prp_12345/activations/atv_12345'
      };
    }
    
    // Default response
    return { status: 'success' };
  });
}

// Type augmentation for global test server
declare global {
  var evalServer: ALECSFullServer;
}