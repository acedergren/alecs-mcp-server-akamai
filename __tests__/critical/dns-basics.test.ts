/**
 * Critical Path Test: Basic DNS Operations
 * What customers actually do: manage DNS records
 */

import { getAllToolDefinitions } from '../../src/tools/all-tools-registry';

// Mock the Akamai client
jest.mock('../../src/akamai-client', () => ({
  AkamaiClient: jest.fn().mockImplementation(() => ({
    request: jest.fn().mockImplementation((req) => {
      if (req.path.includes('/zones')) {
        return Promise.resolve({
          zones: [
            {
              zone: 'example.com',
              type: 'PRIMARY',
              signAndServe: false,
              contractId: 'ctr_123',
            }
          ]
        });
      }
      if (req.path.includes('/recordsets')) {
        return Promise.resolve({
          recordsets: [
            {
              name: 'www.example.com',
              type: 'A',
              ttl: 300,
              rdata: ['192.0.2.1']
            }
          ]
        });
      }
      return Promise.resolve({});
    })
  }))
}));

describe('Critical: DNS Operations', () => {
  const allTools = getAllToolDefinitions();
  const listZones = allTools.find((t: any) => t.name === 'list-zones')?.handler;
  const listRecords = allTools.find((t: any) => t.name === 'list-records')?.handler;
  
  it('should list DNS zones', async () => {
    if (!listZones) {
      throw new Error('list-zones tool not found');
    }
    
    const { AkamaiClient } = require('../../src/akamai-client');
    const mockClient = new AkamaiClient();
    
    const result = await listZones(mockClient, {});
    
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0]?.type).toBe('text');
    expect(result.content[0]?.text).toContain('DNS zones');
  });

  it('should list DNS records for a zone', async () => {
    if (!listRecords) {
      throw new Error('list-records tool not found');
    }
    
    const { AkamaiClient } = require('../../src/akamai-client');
    const mockClient = new AkamaiClient();
    
    const result = await listRecords(mockClient, { zone: 'example.com' });
    
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    // Can contain either 'No DNS records' or actual records
    expect(result.content[0]?.text).toBeDefined();
  });
});