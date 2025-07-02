/**
 * Critical Path Test: Basic Property Operations
 * What customers actually do: list and create properties
 */

import { getAllToolDefinitions } from '../../src/tools/all-tools-registry';

// Mock the Akamai client
jest.mock('../../src/akamai-client', () => ({
  AkamaiClient: jest.fn().mockImplementation(() => ({
    request: jest.fn().mockResolvedValue({
      properties: {
        items: [
          {
            propertyId: 'prp_123456',
            propertyName: 'example.com',
            latestVersion: 1,
            stagingVersion: 1,
            productionVersion: null,
          }
        ]
      }
    })
  }))
}));

describe('Critical: Property Operations', () => {
  const allTools = getAllToolDefinitions();
  const listProperties = allTools.find((t: any) => t.name === 'list-properties')?.handler;
  
  it('should list properties without crashing', async () => {
    if (!listProperties) {
      throw new Error('list-properties tool not found');
    }
    
    const { AkamaiClient } = require('../../src/akamai-client');
    const mockClient = new AkamaiClient();
    
    const result = await listProperties(mockClient, {});
    
    // Just verify it returns something sensible
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0]?.type).toBe('text');
  });

  it('should handle errors gracefully', async () => {
    // Mock an error
    const { AkamaiClient } = require('../../src/akamai-client');
    AkamaiClient.mockImplementation(() => ({
      request: jest.fn().mockRejectedValue(new Error('API Error'))
    }));
    
    if (!listProperties) {
      throw new Error('list-properties tool not found');
    }
    
    const mockClient = new AkamaiClient();
    const result = await listProperties(mockClient, {});
    
    // Should return error message, not crash
    expect(result).toBeDefined();
    expect(result.content[0]?.text).toContain('Error');
  });
});