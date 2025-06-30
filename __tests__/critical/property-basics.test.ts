/**
 * Critical Path Test: Basic Property Operations
 * What customers actually do: list and create properties
 */

import { propertyTools } from '../../src/tools/property-manager';

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
  const listProperties = propertyTools.find(t => t.name === 'list_properties')?.handler;
  
  it('should list properties without crashing', async () => {
    if (!listProperties) {
      throw new Error('list_properties tool not found');
    }
    
    const result = await listProperties({});
    
    // Just verify it returns something sensible
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].type).toBe('text');
  });

  it('should handle errors gracefully', async () => {
    // Mock an error
    const { AkamaiClient } = require('../../src/akamai-client');
    AkamaiClient.mockImplementation(() => ({
      request: jest.fn().mockRejectedValue(new Error('API Error'))
    }));
    
    if (!listProperties) {
      throw new Error('list_properties tool not found');
    }
    
    const result = await listProperties({});
    
    // Should return error message, not crash
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain('Error');
  });
});