/**
 * Critical Path Test: Basic DNS Operations
 * What customers actually do: manage DNS records
 */

import { dnsTools } from '../../src/tools/dns-tools';

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
  const listZones = dnsTools.find(t => t.name === 'dns_list_zones')?.handler;
  const listRecords = dnsTools.find(t => t.name === 'dns_list_records')?.handler;
  
  it('should list DNS zones', async () => {
    if (!listZones) {
      throw new Error('dns_list_zones tool not found');
    }
    
    const result = await listZones({});
    
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('DNS Zones');
  });

  it('should list DNS records for a zone', async () => {
    if (!listRecords) {
      throw new Error('dns_list_records tool not found');
    }
    
    const result = await listRecords({ zone: 'example.com' });
    
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('DNS Records');
  });
});