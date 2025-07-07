import { AuthToken, Zone, Tenant, CreateTenantRequest, UpdateTenantRequest } from './types/securemobi-api';

const SECUREMOBI_API_BASE = 'https://api.securemobi.net/v2';

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
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

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
   * Lists all zones.
   * See: https://developer.securemobi.net/reference/listallzones
   */
  async listZones(): Promise<Zone[]> {
    return this.makeRequest<Zone[]>('/zones');
  }

  /**
   * List all tenants
   */
  async listTenants(): Promise<Tenant[]> {
    return this.makeRequest<Tenant[]>('/tenants');
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantRequest): Promise<Tenant> {
    return this.makeRequest<Tenant>('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get a tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant> {
    return this.makeRequest<Tenant>(`/tenants/${tenantId}`);
  }

  /**
   * Update a tenant by ID
   */
  async updateTenant(tenantId: string, data: UpdateTenantRequest): Promise<Tenant> {
    return this.makeRequest<Tenant>(`/tenants/${tenantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete a tenant by ID
   */
  async deleteTenant(tenantId: string): Promise<{ success: boolean }> {
    await this.makeRequest(`/tenants/${tenantId}`, { method: 'DELETE' });
    return { success: true };
  }

  // Add other methods for different Securemobi endpoints here.
  // e.g., createZone, getZone, etc.
} 