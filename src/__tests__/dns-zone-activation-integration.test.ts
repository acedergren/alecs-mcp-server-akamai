/**
 * Integration tests for DNS zone activation workflow
 */

import { AkamaiClient } from '../akamai-client';
import {
  ensureCleanChangeList,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
  processMultipleZones
} from '../tools/dns-tools';
import { MCPToolResponse } from '../types';

// Mock the AkamaiClient
jest.mock('../akamai-client');

// Mock progress utilities
jest.mock('../utils/progress', () => ({
  Spinner: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    update: jest.fn()
  })),
  format: {
    cyan: (s: string) => s,
    green: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
    yellow: (s: string) => s
  },
  icons: {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    dns: '🌐',
    list: '📋',
    question: '❓'
  }
}));

describe('DNS Zone Activation Integration Tests', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  
  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('Complete Record Update Workflow', () => {
    it('should handle full workflow: create changelist, add record, submit', async () => {
      // Mock sequence for upsertRecord
      mockClient.request
        // ensureCleanChangeList: check for existing
        .mockResolvedValueOnce(null)
        // ensureCleanChangeList: create new
        .mockResolvedValueOnce(undefined)
        // upsertRecord: add record
        .mockResolvedValueOnce(undefined)
        // submit changelist
        .mockResolvedValueOnce({
          requestId: 'req-12345',
          expiryDate: '2024-01-15T11:00:00Z'
        });

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www.example.com',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1'],
        comment: 'Add www record'
      });

      expect(result.content[0].text).toContain('Successfully updated DNS record');
      expect(result.content[0].text).toContain('req-12345');
      expect(mockClient.request).toHaveBeenCalledTimes(4);
    });

    it('should handle existing changelist conflict with force option', async () => {
      const existingChangelist = {
        zone: 'example.com',
        lastModifiedDate: '2024-01-15T09:00:00Z',
        lastModifiedBy: 'other-user',
        recordSets: [
          { name: 'old', type: 'A', ttl: 300, rdata: ['192.0.2.100'] }
        ]
      };

      mockClient.request
        // Check for existing changelist
        .mockResolvedValueOnce(existingChangelist)
        // Discard existing changelist
        .mockResolvedValueOnce(undefined)
        // Create new changelist
        .mockResolvedValueOnce(undefined)
        // Add record
        .mockResolvedValueOnce(undefined)
        // Submit
        .mockResolvedValueOnce({
          requestId: 'req-67890',
          expiryDate: '2024-01-15T11:00:00Z'
        });

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www.example.com',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1'],
        force: true
      });

      expect(result.content[0].text).toContain('Successfully updated DNS record');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/config-dns/v2/changelists/example.com',
          method: 'DELETE'
        })
      );
    });
  });

  describe('Multiple Record Operations', () => {
    it('should handle multiple record updates in sequence', async () => {
      const records = [
        { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.1'] },
        { name: 'mail', type: 'MX', ttl: 600, rdata: ['10 mail.example.com'] },
        { name: 'ftp', type: 'CNAME', ttl: 300, rdata: ['www.example.com'] }
      ];

      // First record - create changelist
      mockClient.request
        .mockResolvedValueOnce(null) // no existing changelist
        .mockResolvedValueOnce(undefined); // create changelist

      // Add each record
      for (const record of records) {
        mockClient.request.mockResolvedValueOnce(undefined); // add record
      }

      // Final activation
      mockClient.request
        .mockResolvedValueOnce({
          zone: 'example.com',
          recordSets: records,
          lastModifiedDate: '2024-01-15T10:00:00Z',
          lastModifiedBy: 'test-user'
        }) // getChangeList
        .mockResolvedValueOnce({
          zone: 'example.com',
          recordSets: records,
          lastModifiedDate: '2024-01-15T10:00:00Z',
          lastModifiedBy: 'test-user'
        }) // getChangeList in submit
        .mockResolvedValueOnce({
          requestId: 'req-multi-12345',
          expiryDate: '2024-01-15T11:00:00Z'
        }); // submit

      // Create changelist
      await ensureCleanChangeList(mockClient, 'example.com');

      // Add records
      for (const record of records) {
        await mockClient.request({
          path: `/config-dns/v2/changelists/example.com/recordsets/${record.name}/${record.type}`,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: record
        });
      }

      // Activate all changes
      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com',
        comment: 'Multiple record updates'
      });

      expect(result.content[0].text).toContain('Successfully activated 3 changes');
    });
  });

  describe('Delete Record Workflow', () => {
    it('should delete a record and submit changes', async () => {
      mockClient.request
        // Check for existing changelist
        .mockResolvedValueOnce(null)
        // Create new changelist
        .mockResolvedValueOnce(undefined)
        // Delete record
        .mockResolvedValueOnce(undefined)
        // Submit
        .mockResolvedValueOnce({
          requestId: 'req-del-12345',
          expiryDate: '2024-01-15T11:00:00Z'
        });

      const result = await deleteRecord(mockClient, {
        zone: 'example.com',
        name: 'old.example.com',
        type: 'A',
        comment: 'Remove old record'
      });

      expect(result.content[0].text).toContain('Successfully deleted DNS record');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/config-dns/v2/changelists/example.com/recordsets/old.example.com/A',
          method: 'DELETE'
        })
      );
    });
  });

  describe('Validation Workflow', () => {
    it('should validate changes without submitting', async () => {
      const changelist = {
        zone: 'example.com',
        lastModifiedDate: '2024-01-15T10:00:00Z',
        lastModifiedBy: 'test-user',
        recordSets: [
          { name: 'test', type: 'A', ttl: 300, rdata: ['192.0.2.1'] }
        ]
      };

      mockClient.request
        // getChangeList
        .mockResolvedValueOnce(changelist)
        // getChangeList in submit
        .mockResolvedValueOnce(changelist)
        // validate
        .mockResolvedValueOnce({
          requestId: 'req-val-12345',
          expiryDate: '2024-01-15T11:00:00Z',
          validationResult: {
            errors: [],
            warnings: []
          }
        });

      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com',
        validateOnly: true
      });

      expect(result.content[0].text).toContain('Validation completed successfully');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            validateOnly: true
          })
        })
      );
    });

    it('should handle validation errors gracefully', async () => {
      const changelist = {
        zone: 'example.com',
        lastModifiedDate: '2024-01-15T10:00:00Z',
        lastModifiedBy: 'test-user',
        recordSets: [
          { name: 'test', type: 'A', ttl: 30, rdata: ['999.999.999.999'] }
        ]
      };

      mockClient.request
        .mockResolvedValueOnce(changelist)
        .mockResolvedValueOnce(changelist)
        .mockResolvedValueOnce({
          requestId: 'req-val-fail',
          expiryDate: '2024-01-15T11:00:00Z',
          validationResult: {
            errors: [
              { field: 'rdata', message: 'Invalid IP address: 999.999.999.999' }
            ],
            warnings: [
              { field: 'ttl', message: 'TTL value 30 is below recommended minimum of 300' }
            ]
          }
        });

      await expect(
        activateZoneChanges(mockClient, {
          zone: 'example.com',
          validateOnly: true
        })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('Multi-Zone Operations', () => {
    it('should process multiple zones with mixed results', async () => {
      const zones = ['zone1.com', 'zone2.com', 'zone3.com'];
      
      const operation = async (zone: string) => {
        if (zone === 'zone2.com') {
          throw new Error('Zone locked by another process');
        }
        
        // Simulate successful operation
        await mockClient.request({
          path: `/config-dns/v2/zones/${zone}`,
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      };

      mockClient.request
        .mockResolvedValueOnce({ zone: 'zone1.com', type: 'PRIMARY' })
        .mockResolvedValueOnce({ zone: 'zone3.com', type: 'PRIMARY' });

      const result = await processMultipleZones(mockClient, zones, operation, {
        continueOnError: true,
        delayBetweenZones: 10
      });

      expect(result.successful).toEqual(['zone1.com', 'zone3.com']);
      expect(result.failed).toEqual([
        { zone: 'zone2.com', error: 'Zone locked by another process' }
      ]);
    });
  });

  describe('Wait for Activation Integration', () => {
    it('should submit and wait for activation completion', async () => {
      const changelist = {
        zone: 'example.com',
        lastModifiedDate: '2024-01-15T10:00:00Z',
        lastModifiedBy: 'test-user',
        recordSets: [
          { name: 'www', type: 'A', ttl: 300, rdata: ['192.0.2.1'] }
        ]
      };

      const pendingStatus = {
        zone: 'example.com',
        activationState: 'PENDING' as const,
        propagationStatus: {
          percentage: 50,
          serversUpdated: 100,
          totalServers: 200
        }
      };

      const activeStatus = {
        zone: 'example.com',
        activationState: 'ACTIVE' as const,
        lastActivationTime: '2024-01-15T10:05:00Z',
        propagationStatus: {
          percentage: 100,
          serversUpdated: 200,
          totalServers: 200
        }
      };

      mockClient.request
        // getChangeList
        .mockResolvedValueOnce(changelist)
        // getChangeList in submit
        .mockResolvedValueOnce(changelist)
        // submit
        .mockResolvedValueOnce({
          requestId: 'req-wait-12345',
          expiryDate: '2024-01-15T11:00:00Z'
        })
        // waitForActivation polling
        .mockResolvedValueOnce(pendingStatus)
        .mockResolvedValueOnce(pendingStatus)
        .mockResolvedValueOnce(activeStatus);

      const result = await activateZoneChanges(mockClient, {
        zone: 'example.com',
        comment: 'Test with activation wait',
        waitForCompletion: true,
        timeout: 10000
      });

      expect(result.content[0].text).toContain('Successfully activated 1 changes');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/config-dns/v2/zones/example.com/status',
          method: 'GET'
        })
      );
    });
  });
});