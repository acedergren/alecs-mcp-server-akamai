import { SecuremobiClient } from '../../../src/securemobi-client';
import { AkamaiClient } from '../../../src/akamai-client';
import { listZones, listTenants, createTenant, getTenant, updateTenant, deleteTenant } from '../../../src/tools/securemobi-tools';
import { Zone, Tenant } from '../../../src/types/securemobi-api';

// Mock the SecuremobiClient and AkamaiClient
jest.mock('../../../src/securemobi-client');
jest.mock('../../../src/akamai-client');

const MockSecuremobiClient = SecuremobiClient as jest.MockedClass<typeof SecuremobiClient>;
const MockAkamaiClient = AkamaiClient as jest.MockedClass<typeof AkamaiClient>;

describe('Securemobi Management Tools', () => {
  let mockAkamaiClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    // Reset mocks before each test
    MockSecuremobiClient.mockClear();
    MockAkamaiClient.mockClear();
    
    // Create mock instances for each test
    mockAkamaiClient = new MockAkamaiClient('default') as jest.Mocked<AkamaiClient>;
    
    // Set up environment variables for tests
    process.env['SECUREMOBI_CLIENT_ID'] = 'test-id';
    process.env['SECUREMOBI_CLIENT_SECRET'] = 'test-secret';
  });

  describe('listZones', () => {
    it('should return a list of zones successfully', async () => {
      const mockZones: Zone[] = [
        { id: 'zone-1', name: 'example.com' },
        { id: 'zone-2', name: 'test.com' },
      ];

      // Mock SecuremobiClient constructor and listZones method
      MockSecuremobiClient.mockImplementation(() => ({
        listZones: jest.fn().mockResolvedValue(mockZones),
      } as any));

      const result = await listZones(mockAkamaiClient, {});

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.zones).toEqual(mockZones);
      expect(responseData.count).toBe(2);
    });

    it('should handle errors from the client', async () => {
      const errorMessage = 'API Error';
      MockSecuremobiClient.mockImplementation(() => ({
        listZones: jest.fn().mockRejectedValue(new Error(errorMessage)),
      } as any));

      const result = await listZones(mockAkamaiClient, {});

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain(errorMessage);
    });

    it('should handle missing credentials', async () => {
      delete process.env['SECUREMOBI_CLIENT_ID'];
      delete process.env['SECUREMOBI_CLIENT_SECRET'];

      const result = await listZones(mockAkamaiClient, {});

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('SecureMobi credentials not configured');
    });
  });

  describe('Tenant tools', () => {
    const mockTenant: Tenant = { id: 'tenant-1', name: 'Tenant One', description: 'desc' };

    it('listTenants returns tenants', async () => {
      MockSecuremobiClient.mockImplementation(() => ({
        listTenants: jest.fn().mockResolvedValue([mockTenant]),
      } as any));

      const result = await listTenants(mockAkamaiClient, {});
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenants).toEqual([mockTenant]);
    });

    it('createTenant returns created tenant', async () => {
      MockSecuremobiClient.mockImplementation(() => ({
        createTenant: jest.fn().mockResolvedValue(mockTenant),
      } as any));

      const result = await createTenant(mockAkamaiClient, { name: 'Tenant One', description: 'desc' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(mockTenant);
    });

    it('getTenant returns tenant', async () => {
      MockSecuremobiClient.mockImplementation(() => ({
        getTenant: jest.fn().mockResolvedValue(mockTenant),
      } as any));

      const result = await getTenant(mockAkamaiClient, { tenantId: 'tenant-1' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(mockTenant);
    });

    it('updateTenant returns updated tenant', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated Name' };
      MockSecuremobiClient.mockImplementation(() => ({
        updateTenant: jest.fn().mockResolvedValue(updatedTenant),
      } as any));

      const result = await updateTenant(mockAkamaiClient, { tenantId: 'tenant-1', name: 'Updated Name' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(updatedTenant);
    });

    it('deleteTenant returns success', async () => {
      MockSecuremobiClient.mockImplementation(() => ({
        deleteTenant: jest.fn().mockResolvedValue({ success: true }),
      } as any));

      const result = await deleteTenant(mockAkamaiClient, { tenantId: 'tenant-1' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
    });
  });

  // Add tests for other tools here
}); 