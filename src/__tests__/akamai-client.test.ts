import { jest } from '@jest/globals';
import fs from 'fs';
import { AkamaiClient } from '../akamai-client';

// Mock the fs module
jest.mock('fs');

// Mock the EdgeGrid module
jest.mock('akamai-edgegrid', () => {
  return jest.fn().mockImplementation(() => ({
    auth: jest.fn(),
    send: jest.fn()
  }));
});

describe('AkamaiClient', () => {
  const mockEdgercContent = `
[default]
client_secret = /wI8atT8qXw0Obdv7CExxjpzGnucihoYjqg+mB16Z/Y=
host = akab-75c2ofi7bfoi73pw-kfahe6qj6g25irsv.luna.akamaiapis.net
access_token = akab-evep6tjwp7zybegw-h4k3no2xtjcpl4i5
client_token = akab-pwhh4bxfag3uwh7o-yhbnkdkakpyj3zua

[tceast]
client_secret = /wI8atT8qXw0Obdv7CExxjpzGnucihoYjqg+mB16Z/Y=
host = akab-75c2ofi7bfoi73pw-kfahe6qj6g25irsv.luna.akamaiapis.net
access_token = akab-evep6tjwp7zybegw-h4k3no2xtjcpl4i5
client_token = akab-pwhh4bxfag3uwh7o-yhbnkdkakpyj3zua
account_key = 1-5BYUG1:1-8BYUX

[oldformat]
client_secret = secret123
host = test.luna.akamaiapis.net
access_token = token123
client_token = client123
account-switch-key = OLD-FORMAT-KEY
`;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    // Mock fs.readFileSync to return our mock edgerc content
    (fs.readFileSync as jest.Mock).mockReturnValue(mockEdgercContent);
  });

  describe('Account Key Extraction', () => {
    it('should extract account_key from tceast section', () => {
      const client = new AkamaiClient('tceast');
      const config = client.getConfig();
      expect(config.accountSwitchKey).toBe('1-5BYUG1:1-8BYUX');
    });

    it('should not have account_key for default section', () => {
      const client = new AkamaiClient('default');
      const config = client.getConfig();
      expect(config.accountSwitchKey).toBeUndefined();
    });

    it('should support old format account-switch-key', () => {
      const client = new AkamaiClient('oldformat');
      const config = client.getConfig();
      expect(config.accountSwitchKey).toBe('OLD-FORMAT-KEY');
    });
  });

  describe('Request Method', () => {
    it('should include account_key as accountSwitchKey in query params', async () => {
      const client = new AkamaiClient('tceast');
      const mockSend = jest.fn((callback: any) => {
        callback(null, { statusCode: 200 }, JSON.stringify({ test: 'data' }));
      });
      
      // Access the private edgeGrid property for mocking
      (client as any).edgeGrid.send = mockSend;
      (client as any).edgeGrid.auth = jest.fn();

      await client.request({
        path: '/papi/v1/properties',
        queryParams: {
          contractId: 'ctr_1-3CV382',
          groupId: 'grp_18385'
        }
      });

      // Check that auth was called with correct options
      expect((client as any).edgeGrid.auth).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/papi/v1/properties',
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'PAPI-Use-Prefixes': 'true'
          }),
          qs: expect.objectContaining({
            accountSwitchKey: '1-5BYUG1:1-8BYUX',
            contractId: 'ctr_1-3CV382',
            groupId: 'grp_18385'
          })
        })
      );
    });

    it('should use qs property for query parameters', async () => {
      const client = new AkamaiClient('default');
      const mockSend = jest.fn((callback: any) => {
        callback(null, { statusCode: 200 }, JSON.stringify({ test: 'data' }));
      });
      
      (client as any).edgeGrid.send = mockSend;
      (client as any).edgeGrid.auth = jest.fn();

      await client.request({
        path: '/papi/v1/groups',
        method: 'GET'
      });

      // Should not have qs property when no query params
      expect((client as any).edgeGrid.auth).toHaveBeenCalledWith(
        expect.not.objectContaining({
          qs: expect.anything()
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 errors with detailed message', async () => {
      const client = new AkamaiClient('default');
      const errorResponse = {
        type: 'bad-request',
        title: 'Bad Request',
        detail: 'Missing required parameters',
        errors: [
          { title: 'contractId', detail: 'contractId is required' }
        ]
      };

      const mockSend = jest.fn((callback: any) => {
        callback(null, { statusCode: 400 }, JSON.stringify(errorResponse));
      });
      
      (client as any).edgeGrid.send = mockSend;
      (client as any).edgeGrid.auth = jest.fn();

      await expect(client.request({ path: '/papi/v1/properties' }))
        .rejects
        .toThrow('Akamai API Error (400): Bad Request');
    });

    it('should handle network errors', async () => {
      const client = new AkamaiClient('default');
      const mockSend = jest.fn((callback: any) => {
        const error = new Error('ENOTFOUND test.luna.akamaiapis.net');
        error.message = 'ENOTFOUND test.luna.akamaiapis.net';
        callback(error);
      });
      
      (client as any).edgeGrid.send = mockSend;
      (client as any).edgeGrid.auth = jest.fn();

      await expect(client.request({ path: '/test' }))
        .rejects
        .toThrow('Network connectivity issue');
    });
  });
});