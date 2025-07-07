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
      const mockListTenants = jest.fn().mockResolvedValue([mockTenant]);
      MockSecuremobiClient.mockImplementation(() => ({
        listTenants: mockListTenants,
      } as any));

      const result = await listTenants(mockAkamaiClient, {});
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenants).toEqual([mockTenant]);
      expect(mockListTenants).toHaveBeenCalledWith(undefined);
    });

    it('listTenants with scopeTenantId passes X-Tenant-Id header', async () => {
      const mockListTenants = jest.fn().mockResolvedValue([mockTenant]);
      MockSecuremobiClient.mockImplementation(() => ({
        listTenants: mockListTenants,
      } as any));

      const scopeTenantId = 'scope-tenant-123';
      const result = await listTenants(mockAkamaiClient, { scopeTenantId });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.scopeTenantId).toBe(scopeTenantId);
      expect(mockListTenants).toHaveBeenCalledWith(scopeTenantId);
    });

    it('createTenant returns created tenant', async () => {
      const mockCreateTenant = jest.fn().mockResolvedValue(mockTenant);
      MockSecuremobiClient.mockImplementation(() => ({
        createTenant: mockCreateTenant,
      } as any));

      const result = await createTenant(mockAkamaiClient, { name: 'Tenant One', description: 'desc' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(mockTenant);
      expect(mockCreateTenant).toHaveBeenCalledWith({ name: 'Tenant One', description: 'desc' }, undefined);
    });

    it('getTenant returns tenant', async () => {
      const mockGetTenant = jest.fn().mockResolvedValue(mockTenant);
      MockSecuremobiClient.mockImplementation(() => ({
        getTenant: mockGetTenant,
      } as any));

      const result = await getTenant(mockAkamaiClient, { tenantId: 'tenant-1' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(mockTenant);
      expect(mockGetTenant).toHaveBeenCalledWith('tenant-1', undefined);
    });

    it('updateTenant returns updated tenant', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated Name' };
      const mockUpdateTenant = jest.fn().mockResolvedValue(updatedTenant);
      MockSecuremobiClient.mockImplementation(() => ({
        updateTenant: mockUpdateTenant,
      } as any));

      const result = await updateTenant(mockAkamaiClient, { tenantId: 'tenant-1', name: 'Updated Name' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(updatedTenant);
      expect(mockUpdateTenant).toHaveBeenCalledWith('tenant-1', { name: 'Updated Name' }, undefined);
    });

    it('updateTenant with scopeTenantId passes X-Tenant-Id header', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated Name' };
      const mockUpdateTenant = jest.fn().mockResolvedValue(updatedTenant);
      MockSecuremobiClient.mockImplementation(() => ({
        updateTenant: mockUpdateTenant,
      } as any));

      const scopeTenantId = 'scope-tenant-123';
      const result = await updateTenant(mockAkamaiClient, { tenantId: 'tenant-1', name: 'Updated Name', scopeTenantId });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(responseData.tenant).toEqual(updatedTenant);
      expect(mockUpdateTenant).toHaveBeenCalledWith('tenant-1', { name: 'Updated Name' }, scopeTenantId);
    });

    it('deleteTenant returns success', async () => {
      const mockDeleteTenant = jest.fn().mockResolvedValue({ success: true });
      MockSecuremobiClient.mockImplementation(() => ({
        deleteTenant: mockDeleteTenant,
      } as any));

      const result = await deleteTenant(mockAkamaiClient, { tenantId: 'tenant-1' });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(mockDeleteTenant).toHaveBeenCalledWith('tenant-1', undefined);
    });

    it('deleteTenant with scopeTenantId passes X-Tenant-Id header', async () => {
      const mockDeleteTenant = jest.fn().mockResolvedValue({ success: true });
      MockSecuremobiClient.mockImplementation(() => ({
        deleteTenant: mockDeleteTenant,
      } as any));

      const scopeTenantId = 'scope-tenant-123';
      const result = await deleteTenant(mockAkamaiClient, { tenantId: 'tenant-1', scopeTenantId });
      expect(result.isError).toBe(false);
      
      const responseData = JSON.parse(result.content[0]?.text || '{}');
      expect(responseData.success).toBe(true);
      expect(mockDeleteTenant).toHaveBeenCalledWith('tenant-1', scopeTenantId);
    });
  });

  // Add tests for other tools here
}); 