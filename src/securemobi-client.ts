import { AuthToken, Zone, Tenant, CreateTenantRequest, UpdateTenantRequest } from './types/securemobi-api';

const SECUREMOBI_API_BASE = 'https://api.int.mo2c.eivasa.net/v2';

/**
 * A client for interacting with the Securemobi API.
 */
export class SecuremobiClient {
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    if (!clientId || !clientSecret) {
      throw new Error('Securemobi client ID and secret are required.');
    }
  }

  /**
   * Fetches an OAuth2 token from the Securemobi API.
   * It handles token caching and renewal.
   */
  private async getAuthToken(): Promise<string> {
    if (this.authToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.authToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${SECUREMOBI_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Failed to get auth token: ${response.statusText}`);
    }

    const tokenData = await response.json() as AuthToken;
    this.authToken = tokenData.access_token;
    // Set expiry to 1 minute before it actually expires for safety
    this.tokenExpiry = new Date(new Date().getTime() + (tokenData.expires_in - 60) * 1000);

    return this.authToken;
  }

  /**
   * A generic method to make authenticated requests to the Securemobi API.
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, tenantId?: string): Promise<T> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Add X-Tenant-Id header if tenantId is provided
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }

    const response = await fetch(`${SECUREMOBI_API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List all tenants
   * @param tenantId Optional tenant ID to scope the request via X-Tenant-Id header
   */
  async listTenants(tenantId?: string): Promise<Tenant[]> {
    return this.makeRequest<Tenant[]>('/management/tenants', {}, tenantId);
  }

  /**
   * Create a new tenant
   * @param data Tenant creation data
   * @param scopeTenantId Optional tenant ID to scope the request via X-Tenant-Id header
   */
  async createTenant(data: CreateTenantRequest, scopeTenantId?: string): Promise<Tenant> {
    return this.makeRequest<Tenant>('/management/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }, scopeTenantId);
  }

  /**
   * Get a tenant by ID
   * @param tenantId ID of the tenant to retrieve
   * @param scopeTenantId Optional tenant ID to scope the request via X-Tenant-Id header
   */
  async getTenant(tenantId: string, scopeTenantId?: string): Promise<Tenant> {
    return this.makeRequest<Tenant>(`/management/tenants/${tenantId}`, {}, scopeTenantId);
  }

  /**
   * Update a tenant by ID
   * @param tenantId ID of the tenant to update
   * @param data Update data
   * @param scopeTenantId Optional tenant ID to scope the request via X-Tenant-Id header
   */
  async updateTenant(tenantId: string, data: UpdateTenantRequest, scopeTenantId?: string): Promise<Tenant> {
    return this.makeRequest<Tenant>(`/management/tenants/${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, scopeTenantId);
  }

  /**
   * Delete a tenant by ID
   * @param tenantId ID of the tenant to delete
   * @param scopeTenantId Optional tenant ID to scope the request via X-Tenant-Id header
   */
  async deleteTenant(tenantId: string, scopeTenantId?: string): Promise<{ success: boolean }> {
    await this.makeRequest(`/management/tenants/${tenantId}`, { method: 'DELETE' }, scopeTenantId);
    return { success: true };
  }

  // Add other methods for different Securemobi endpoints here.
  // e.g., createZone, getZone, etc.
} 