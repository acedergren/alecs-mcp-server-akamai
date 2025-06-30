/**
 * 🚀 BASIC MCP INTEGRATION TEST
 * Simple integration test that validates core MCP functionality
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { AkamaiClient } from '../../src/akamai-client';
import { listProperties } from '../../src/tools/property-tools';
import { listContracts } from '../../src/tools/property-tools';
import { listZones } from '../../src/tools/dns-tools';

describe('Basic MCP Integration Tests', () => {
  let client: AkamaiClient;
  let server: Server;

  beforeAll(() => {
    // Initialize client
    client = new AkamaiClient();
    
    // Initialize server
    server = new Server({
      name: 'test-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
  });

  describe('Core Tool Functionality', () => {
    test('property tools should return valid MCP responses', async () => {
      const result = await listProperties(client, {});
      
      // Validate MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('contract tools should return valid MCP responses', async () => {
      const result = await listContracts(client, {});
      
      // Validate MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });

    test('DNS tools should return valid MCP responses', async () => {
      const result = await listZones(client, {});
      
      // Validate MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type');
      expect(result.content[0]).toHaveProperty('text');
    });
  });

  describe('Error Handling', () => {
    test('tools should handle errors gracefully', async () => {
      // Test with invalid property ID
      const { getProperty } = await import('../../src/tools/property-tools');
      const result = await getProperty(client, { propertyId: 'invalid-id' });
      
      expect(result).toHaveProperty('content');
      expect(result.content[0].text).toContain('No properties found');
    });
  });

  describe('Response Formatting', () => {
    test('responses should include helpful guidance', async () => {
      const result = await listProperties(client, {});
      const text = result.content[0].text;
      
      // Check for helpful guidance
      const hasGuidance = text.includes('Next') || 
                         text.includes('To ') || 
                         text.includes('Note') ||
                         text.includes('Tip');
      
      expect(hasGuidance).toBe(true);
    });
  });
});