/**
 * MCP User Journey Test: Property Onboarding
 * 
 * This test simulates a complete user journey for onboarding a new property
 * using proper MCP (Model Context Protocol) patterns and responses.
 * 
 * Journey steps:
 * 1. List available resources (groups, contracts)
 * 2. Create a property
 * 3. Configure edge hostnames with certificates
 * 4. Set up origin rules
 * 5. Activate to staging and production
 * 6. Verify deployment status
 */

import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import our server implementation
import { ALECSFullServer } from '../../../src/index-full';
import { AkamaiClient } from '../../../src/akamai-client';

// Mock the AkamaiClient to avoid real API calls
jest.mock('../../../src/akamai-client');

describe('MCP User Journey: Property Onboarding', () => {
  let server: ALECSFullServer;
  let mockClient: jest.Mocked<AkamaiClient>;
  
  // Test data
  const testData = {
    hostname: 'test.example.com',
    origin: 'origin.example.com',
    propertyId: 'prp_12345',
    contractIds: ['ctr_1-ABC123',
    groupId: 'grp_12345',
    productId: 'prd_Fresca',
    edgeHostname: 'test.example.com.edgesuite.net',
    activationId: 'atv_12345'
  };
  
  beforeAll(async () => {
    // Create mocked Akamai client
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    
    // Initialize the MCP server
    server = new ALECSFullServer({
      name: 'alecs-test-server',
      version: '1.6.0'
    });
    
    // Setup comprehensive mocks for the entire journey
    setupMocks();
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
  });
  
  function setupMocks() {
    // Mock all the API responses for the complete journey
    mockClient.request.mockImplementation(async (options) => {
      const path = options.path;
      
      // Groups endpoint
      if (path.includes('/papi/v1/groups')) {
        return {
          groups: {
            items: [{
              groupId: testData.groupId,
              groupName: 'Test Group',
              contractIds: [testData.contractId],
              parentGroupId: null
            }]
          }
        };
      }
      
      // Contracts endpoint
      if (path.includes('/papi/v1/contracts')) {
        return {
          contracts: {
            items: [{
              contractId: testData.contractId,
              contractTypeName: 'DIRECT_CUSTOMER',
              contractDisplayName: 'Test Contract'
            }]
          }
        };
      }
      
      // Products endpoint
      if (path.includes('/papi/v1/products')) {
        return {
          products: {
            items: [{
              productId: testData.productId,
              productName: 'Ion Standard',
              productDescription: 'Accelerate dynamic web content'
            }]
          }
        };
      }
      
      // Property creation
      if (path === '/papi/v1/properties' && options.method === 'POST') {
        return {
          propertyLink: `/papi/v1/properties/${testData.propertyId}`
        };
      }
      
      // Property details
      if (path.includes(`/papi/v1/properties/${testData.propertyId}`)) {
        return {
          properties: {
            items: [{
              propertyId: testData.propertyId,
              propertyName: testData.hostname,
              latestVersion: 1,
              productionVersion: null,
              stagingVersion: null,
              contractId: testData.contractId,
              groupId: testData.groupId
            }]
          }
        };
      }
      
      // Property rules
      if (path.includes('/rules')) {
        return {
          rules: {
            name: 'default',
            children: [],
            behaviors: [{
              name: 'origin',
              options: {
                hostname: testData.origin,
                forwardHostHeader: 'REQUEST_HOST_HEADER',
                httpPort: 80,
                httpsPort: 443
              }
            }],
            options: {},
            variables: []
          },
          ruleFormat: 'v2023-01-05'
        };
      }
      
      // Edge hostname creation
      if (path.includes('/hapi/v1/edge-hostnames') && options.method === 'POST') {
        return {
          edgeHostnameLink: `/hapi/v1/edge-hostnames/ehn_12345`,
          edgeHostnameId: 'ehn_12345'
        };
      }
      
      // Property activation
      if (path.includes('/activations') && options.method === 'POST') {
        return {
          activationLink: `/papi/v1/properties/${testData.propertyId}/activations/${testData.activationId}`
        };
      }
      
      // Activation status
      if (path.includes(`/activations/${testData.activationId}`)) {
        return {
          activations: {
            items: [{
              activationId: testData.activationId,
              status: 'ACTIVE',
              network: path.includes('STAGING') ? 'STAGING' : 'PRODUCTION',
              propertyVersion: 1,
              submitDate: new Date().toISOString(),
              updateDate: new Date().toISOString()
            }]
          }
        };
      }
      
      // Default DV certificate
      if (path.includes('/cps/v2/enrollments') && path.includes('default-dv')) {
        return {
          enrollment: {
            id: 1000,
            certificateType: 'DEFAULT_DV',
            validationStatus: 'VALIDATED',
            certificateStatus: 'DEPLOYED'
          }
        };
      }
      
      return {};
    });
  }
  
  describe('MCP Protocol Compliance', () => {
    it('should list available tools with proper MCP format', async () => {
      // Simulate MCP ListTools request
      const request: ListToolsRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      };
      
      // Get the list of tools from the server
      const tools = await server.getAvailableTools();
      
      // Verify MCP-compliant tool structure
      expect(tools).toBeDefined();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      // Check specific tools we need for onboarding
      const requiredTools = [
        'list-properties',
        'create-property',
        'get-property',
        'activate-property',
        'create-edge-hostname',
        'add-property-hostname'
      ];
      
      for (const toolName of requiredTools) {
        const tool = tools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      }
    });
  });
  
  describe('Complete Property Onboarding Journey', () => {
    it('should successfully onboard a property with MCP-compliant responses', async () => {
      // Step 1: List groups (MCP tool call)
      console.log('[MCP] Step 1: Calling list-groups tool...');
      const groupsRequest: CallToolRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'list-groups',
          arguments: {}
        },
        id: 1
      };
      
      const groupsResponse = await server.handleToolCall('list-groups', {});
      
      // Verify MCP response format
      expect(groupsResponse).toHaveProperty('content');
      expect(Array.isArray(groupsResponse.content)).toBe(true);
      expect(groupsResponse.content[0]).toHaveProperty('type', 'text');
      expect(groupsResponse.content[0]).toHaveProperty('text');
      
      // Verify content contains expected data
      const groupsText = groupsResponse.content[0].text;
      expect(groupsText).toContain(testData.groupId);
      expect(groupsText).toContain('Test Group');
      
      // Step 2: Create property
      console.log('[MCP] Step 2: Calling create-property tool...');
      const createPropertyRequest: CallToolRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create-property',
          arguments: {
            propertyName: testData.hostname,
            productId: testData.productId,
            contractId: testData.contractId,
            groupId: testData.groupId
          }
        },
        id: 2
      };
      
      const createResponse = await server.handleToolCall(
        'create-property',
        createPropertyRequest.params.arguments
      );
      
      expect(createResponse).toHaveProperty('content');
      expect(createResponse.content[0].text).toContain('successfully created');
      expect(createResponse.content[0].text).toContain(testData.propertyId);
      
      // Step 3: Get property details
      console.log('[MCP] Step 3: Calling get-property tool...');
      const getPropertyResponse = await server.handleToolCall('get-property', {
        propertyId: testData.propertyId
      });
      
      expect(getPropertyResponse.content[0].text).toContain(testData.hostname);
      expect(getPropertyResponse.content[0].text).toContain('Version 1');
      
      // Step 4: Create edge hostname
      console.log('[MCP] Step 4: Calling create-edge-hostname tool...');
      const edgeHostnameResponse = await server.handleToolCall('create-edge-hostname', {
        domainPrefix: testData.hostname.split('.')[0],
        domainSuffix: 'edgesuite.net',
        productId: testData.productId,
        secure: true
      });
      
      expect(edgeHostnameResponse.content[0].text).toContain('Edge hostname created');
      expect(edgeHostnameResponse.content[0].text).toContain('ehn_12345');
      
      // Step 5: Add hostname to property
      console.log('[MCP] Step 5: Calling add-property-hostname tool...');
      const addHostnameResponse = await server.handleToolCall('add-property-hostname', {
        propertyId: testData.propertyId,
        version: 1,
        hostnames: [{
          cnameType: 'EDGE_HOSTNAME',
          cnameFrom: testData.hostname,
          cnameTo: testData.edgeHostname
        }]
      });
      
      expect(addHostnameResponse.content[0].text).toContain('successfully');
      
      // Step 6: Activate to staging
      console.log('[MCP] Step 6: Calling activate-property tool (STAGING)...');
      const stagingActivationResponse = await server.handleToolCall('activate-property', {
        propertyId: testData.propertyId,
        version: 1,
        network: 'STAGING',
        note: 'Initial staging activation from MCP test'
      });
      
      expect(stagingActivationResponse.content[0].text).toContain('Activation initiated');
      expect(stagingActivationResponse.content[0].text).toContain('STAGING');
      expect(stagingActivationResponse.content[0].text).toContain(testData.activationId);
      
      // Step 7: Check activation status
      console.log('[MCP] Step 7: Calling get-activation-status tool...');
      const statusResponse = await server.handleToolCall('get-activation-status', {
        propertyId: testData.propertyId,
        activationId: testData.activationId
      });
      
      expect(statusResponse.content[0].text).toContain('ACTIVE');
      expect(statusResponse.content[0].text).toContain('deployment successful');
      
      // Step 8: Activate to production
      console.log('[MCP] Step 8: Calling activate-property tool (PRODUCTION)...');
      const productionActivationResponse = await server.handleToolCall('activate-property', {
        propertyId: testData.propertyId,
        version: 1,
        network: 'PRODUCTION',
        note: 'Initial production activation from MCP test'
      });
      
      expect(productionActivationResponse.content[0].text).toContain('Activation initiated');
      expect(productionActivationResponse.content[0].text).toContain('PRODUCTION');
    });
    
    it('should provide helpful guidance in MCP responses', async () => {
      // Test that responses include next steps and tips
      const response = await server.handleToolCall('list-properties', {});
      
      const text = response.content[0].text;
      
      // Check for helpful guidance patterns
      expect(text).toMatch(/Next steps?:|To |Tip:|Note:/i);
      
      // Check for actionable advice
      const hasActionableAdvice = 
        text.includes('create-property') ||
        text.includes('get-property') ||
        text.includes('activate') ||
        text.includes('configure');
        
      expect(hasActionableAdvice).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle tool errors with proper MCP error format', async () => {
      // Mock an error scenario
      mockClient.request.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );
      
      const errorResponse = await server.handleToolCall('create-property', {
        propertyName: 'fail.example.com',
        productId: 'invalid',
        contractId: 'invalid',
        groupId: 'invalid'
      });
      
      // MCP error responses should still have content
      expect(errorResponse).toHaveProperty('content');
      expect(errorResponse.content[0].type).toBe('text');
      expect(errorResponse.content[0].text).toContain('Error');
      expect(errorResponse.content[0].text).toContain('permissions');
    });
    
    it('should validate tool arguments', async () => {
      // Call tool with missing required arguments
      const response = await server.handleToolCall('create-property', {
        propertyName: 'test.com'
        // Missing required: productId, contractId, groupId
      });
      
      expect(response.content[0].text).toContain('Error');
      expect(response.content[0].text).toMatch(/required|missing|invalid/i);
    });
  });
  
  describe('MCP Response Formatting', () => {
    it('should format lists properly', async () => {
      const response = await server.handleToolCall('list-properties', {});
      const text = response.content[0].text;
      
      // Should have proper formatting
      expect(text).toMatch(/[•\-\*]/); // Bullet points
      expect(text).toMatch(/\n/); // Line breaks
      expect(text).toMatch(/\*\*/); // Bold text
    });
    
    it('should include metadata in responses', async () => {
      const response = await server.handleToolCall('get-property', {
        propertyId: testData.propertyId
      });
      
      const text = response.content[0].text;
      
      // Should include various metadata
      expect(text).toContain('Property ID:');
      expect(text).toContain('Version:');
      expect(text).toContain('Contract:');
      expect(text).toContain('Group:');
    });
  });
});