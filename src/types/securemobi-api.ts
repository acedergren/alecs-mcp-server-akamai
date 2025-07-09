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

// Configuration Types
export interface TenantConfiguration {
  id: string;
  tenantId: string;
  configType: 'system' | 'custom' | 'main' | 'sub';
  configuration: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  inheritedFrom?: string;
  overrides?: Record<string, any>;
}

export interface CreateConfigurationRequest {
  configuration: Record<string, any>;
  configType?: 'system' | 'custom';
  description?: string;
  inheritFromParent?: boolean;
}

export interface UpdateConfigurationRequest {
  configuration?: Record<string, any>;
  merge?: boolean;
  description?: string;
}

export interface ConfigurationResponse {
  success: boolean;
  configuration: TenantConfiguration;
  message?: string;
}

export interface ConfigurationListResponse {
  success: boolean;
  configurations: TenantConfiguration[];
  count: number;
  tenantId: string;
} 