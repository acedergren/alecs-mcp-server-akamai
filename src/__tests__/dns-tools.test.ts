import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AkamaiClient } from '../akamai-client';
import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord
} from '../tools/dns-tools';
import * as progress from '../utils/progress';

// Mock the AkamaiClient
jest.mock('../akamai-client');

// Mock the progress utils
jest.mock('../utils/progress', () => {
  const mockSpinner = {
    start: jest.fn(),
    stop: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    update: jest.fn(),
  };

  return {
    Spinner: jest.fn(() => mockSpinner),
    format: {
      bold: (text: string) => text,
      dim: (text: string) => text,
      cyan: (text: string) => text,
      green: (text: string) => text,
      red: (text: string) => text,
      yellow: (text: string) => text,
    },
    icons: {
      success: '✓',
      error: '✗',
      info: 'i',
      dns: 'DNS',
      bullet: '•',
    },
  };
});

describe('DNS Tools with Progress', () => {
  let mockClient: jest.Mocked<AkamaiClient>;
  let mockSpinner: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = new AkamaiClient('default') as jest.Mocked<AkamaiClient>;
    mockSpinner = new (progress.Spinner as any)();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listZones', () => {
    it('should list zones with progress spinner', async () => {
      const mockZones = {
        zones: [
          { zone: 'example.com', type: 'PRIMARY', comment: 'Test zone' },
          { zone: 'example.org', type: 'SECONDARY' }
        ]
      };

      mockClient.request.mockResolvedValue(mockZones);

      const result = await listZones(mockClient, {});

      // Verify spinner was used
      expect(mockSpinner.start).toHaveBeenCalledWith('Fetching DNS zones...');
      expect(mockSpinner.stop).toHaveBeenCalled();

      // Verify result
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 DNS zones');
      expect(result.content[0].text).toContain('example.com');
      expect(result.content[0].text).toContain('example.org');
    });

    it('should handle errors and update spinner', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));

      await expect(listZones(mockClient, {})).rejects.toThrow('API Error');

      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to fetch DNS zones');
    });

    it('should handle empty zone list', async () => {
      mockClient.request.mockResolvedValue({ zones: [] });

      const result = await listZones(mockClient, {});

      expect(result.content[0].text).toContain('No DNS zones found');
    });
  });

  describe('createZone', () => {
    it('should create zone with progress spinner', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await createZone(mockClient, {
        zone: 'newzone.com',
        type: 'PRIMARY'
      });

      expect(mockSpinner.start).toHaveBeenCalledWith('Creating PRIMARY zone: newzone.com');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Zone created: newzone.com');
      expect(result.content[0].text).toContain('Successfully created DNS zone: newzone.com');
    });

    it('should handle creation errors', async () => {
      mockClient.request.mockRejectedValue(new Error('Zone already exists'));

      await expect(createZone(mockClient, {
        zone: 'existing.com',
        type: 'PRIMARY'
      })).rejects.toThrow('Zone already exists');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to create zone: existing.com');
    });
  });

  describe('upsertRecord', () => {
    it('should update record with progress steps', async () => {
      mockClient.request.mockResolvedValue({
        requestId: 'req-12345',
        expiryDate: '2024-01-01T00:00:00Z'
      });

      const result = await upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'www',
        type: 'A',
        ttl: 300,
        rdata: ['192.0.2.1']
      });

      // Verify progress updates
      expect(mockSpinner.start).toHaveBeenCalledWith('Creating change list...');
      expect(mockSpinner.update).toHaveBeenCalledWith('Adding A record for www...');
      expect(mockSpinner.update).toHaveBeenCalledWith('Submitting changes...');
      expect(mockSpinner.succeed).toHaveBeenCalledWith('Record updated: www A');

      // Verify result formatting
      expect(result.content[0].text).toContain('Successfully updated DNS record');
      expect(result.content[0].text).toContain('www');
      expect(result.content[0].text).toContain('192.0.2.1');
      expect(result.content[0].text).toContain('req-12345');
    });

    it('should handle update errors', async () => {
      mockClient.request
        .mockResolvedValueOnce({}) // Change list creation
        .mockRejectedValueOnce(new Error('Invalid record data')); // Record update

      await expect(upsertRecord(mockClient, {
        zone: 'example.com',
        name: 'invalid',
        type: 'A',
        ttl: 300,
        rdata: ['invalid-ip']
      })).rejects.toThrow('Invalid record data');

      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to update DNS record');
    });
  });

  describe('Progress formatting', () => {
    it('should format zone list with colors and icons', async () => {
      const mockZones = {
        zones: [
          { zone: 'example.com', type: 'PRIMARY', comment: 'Production' }
        ]
      };

      mockClient.request.mockResolvedValue(mockZones);

      const result = await listZones(mockClient, {});
      const text = result.content[0].text;

      // Check for icon usage
      expect(text).toContain('✓'); // success icon
      expect(text).toContain('DNS'); // dns icon
    });
  });

  describe('Error handling with progress', () => {
    it('should cleanup spinner on unexpected errors', async () => {
      // Mock spinner to throw during stop
      mockSpinner.stop.mockImplementation(() => {
        throw new Error('Spinner error');
      });

      mockClient.request.mockResolvedValue({ zones: [] });

      // Should not throw spinner error
      const result = await listZones(mockClient, {});
      expect(result).toBeDefined();
    });
  });
});