/**
 * TypeScript definitions for the Securemobi API.
 * Based on the documentation at: https://developer.securemobi.net/reference/gettoken
 */

export interface Zone {
  id: string;
  name: string;
  // Add other zone properties as needed
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  // Add other tenant properties as needed
}

export interface CreateTenantRequest {
  name: string;
  description?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  description?: string;
} 