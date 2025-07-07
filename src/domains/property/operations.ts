/**
 * Property Domain Operations - Consolidated Implementation
 * 
 * CODE KAI: Single implementation for all property operations
 * Eliminates duplication while maintaining full functionality
 */

import type { AkamaiClient } from '../../akamai-client';
import { 
  performanceOptimized, 
  PerformanceProfiles,
  CacheInvalidation 
} from '../../core/performance';
import { 
  isPropertyId,
  normalizeId 
} from '../../core/validation/akamai-ids';
import { validateCustomer } from '../../core/validation/customer';
import { handleApiError } from '../../core/errors';

/**
 * Property-specific errors
 */
class PropertyError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PropertyError';
  }
  
  static notFound(propertyId: string): PropertyError {
    return new PropertyError(`Property ${propertyId} not found`, 'PROPERTY_NOT_FOUND');
  }
  
  static invalidVersion(propertyId: string, version: number): PropertyError {
    return new PropertyError(
      `Version ${version} not found for property ${propertyId}`,
      'VERSION_NOT_FOUND'
    );
  }
}
import {
  Property,
  PropertyVersion,
  PropertyActivation,
  PropertyRules,
  ListPropertiesParams,
  ListPropertiesResponse,
  CreatePropertyParams,
  CreatePropertyResponse,
  ActivatePropertyParams,
  ActivatePropertyResponse,
} from './types';
import {
  ListPropertiesSchema,
  CreatePropertySchema,
  ActivatePropertySchema,
} from './schemas';

/**
 * List all properties with caching and pagination
 * Consolidates implementations from property-tools.ts and property-manager.ts
 */
export const listProperties = performanceOptimized(
  async (
    client: AkamaiClient, 
    params: ListPropertiesParams
  ): Promise<ListPropertiesResponse> => {
    // Validate parameters
    const validated = ListPropertiesSchema.parse(params);
    
    // Validate customer
    validateCustomer(validated.customer);
    
    // Build request parameters
    const requestParams: Record<string, string> = {};
    if (validated.contractId) {
      requestParams['contractId'] = normalizeId.contract(validated.contractId);
    }
    if (validated.groupId) {
      requestParams['groupId'] = normalizeId.group(validated.groupId);
    }
    
    try {
      const response = await client.request({
        path: '/papi/v1/properties',
        method: 'GET',
        queryParams: requestParams,
      }) as any;
      
      // Ensure consistent response format
      return {
        properties: {
          items: response.properties?.items || [],
        },
      };
    } catch (error) {
      handleApiError(error, 'listProperties');
    }
  },
  'property.list',
  PerformanceProfiles.LIST
);

/**
 * Get property details with smart caching
 */
export const getProperty = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { propertyId: string; customer?: string }
  ): Promise<Property> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    if (!isPropertyId(propertyId)) {
      throw PropertyError.notFound(propertyId);
    }
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'GET',
      }) as any;
      
      if (!response.properties?.items?.[0]) {
        throw PropertyError.notFound(propertyId);
      }
      
      return response.properties.items[0];
    } catch (error) {
      handleApiError(error, 'getProperty');
    }
  },
  'property.get',
  PerformanceProfiles.READ
);

/**
 * Create a new property
 * No caching, invalidates list cache
 */
export const createProperty = performanceOptimized(
  async (
    client: AkamaiClient,
    params: CreatePropertyParams
  ): Promise<CreatePropertyResponse> => {
    // Validate parameters
    const validated = CreatePropertySchema.parse(params);
    
    validateCustomer(validated.customer);
    
    // Normalize IDs
    const contractId = normalizeId.contract(validated.contractId);
    const groupId = normalizeId.group(validated.groupId);
    const productId = normalizeId.product(validated.productId);
    
    try {
      const response = await client.request({
        path: '/papi/v1/properties',
        method: 'POST',
        body: {
          propertyName: validated.propertyName,
          productId,
          contractId,
          groupId,
          ruleFormat: validated.ruleFormat || 'latest',
        },
      }) as any;
      
      // Extract property ID from location header
      const propertyLink = response.propertyLink || response.headers?.location;
      const propertyId = propertyLink?.match(/properties\/(prp_\d+)/)?.[1];
      
      if (!propertyId) {
        throw new Error('Failed to extract property ID from response');
      }
      
      // Invalidate list cache for this customer
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:property.list:*`);
      
      return {
        propertyLink,
        propertyId,
      };
    } catch (error) {
      handleApiError(error, 'createProperty');
    }
  },
  'property.create',
  PerformanceProfiles.WRITE
);

/**
 * Create a new property version
 */
export const createPropertyVersion = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      createFromVersion?: number;
      createFromEtag?: string;
      customer?: string;
    }
  ): Promise<{ versionLink: string; propertyVersion: number }> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    // Get base version info if not provided
    let createFromVersion = params.createFromVersion;
    let createFromEtag = params.createFromEtag;
    
    if (!createFromVersion) {
      const property = await getProperty(client, { propertyId, customer: params.customer });
      createFromVersion = property.latestVersion;
    }
    
    if (!createFromEtag && createFromVersion) {
      const version = await getPropertyVersion(client, {
        propertyId,
        version: createFromVersion,
        customer: params.customer,
      });
      createFromEtag = version.etag;
    }
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions`,
        method: 'POST',
        body: {
          createFromVersion,
          createFromVersionEtag: createFromEtag,
        },
      }) as any;
      
      const versionLink = response.versionLink || response.headers?.location;
      const propertyVersion = parseInt(versionLink?.match(/versions\/(\d+)/)?.[1] || '0');
      
      // Invalidate property cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:property.get:*${propertyId}*`);
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:property.version.*:*${propertyId}*`);
      
      return {
        versionLink,
        propertyVersion,
      };
    } catch (error) {
      handleApiError(error, 'createPropertyVersion');
    }
  },
  'property.version.create',
  PerformanceProfiles.WRITE
);

/**
 * Get property version details
 */
export const getPropertyVersion = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      version: number;
      customer?: string;
    }
  ): Promise<PropertyVersion> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${params.version}`,
        method: 'GET',
      }) as any;
      
      if (!response.versions?.items?.[0]) {
        throw PropertyError.invalidVersion(propertyId, params.version);
      }
      
      return response.versions.items[0];
    } catch (error) {
      handleApiError(error, 'getPropertyVersion');
    }
  },
  'property.version.get',
  PerformanceProfiles.READ
);

/**
 * List property versions
 */
export const listPropertyVersions = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      customer?: string;
    }
  ): Promise<PropertyVersion[]> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions`,
        method: 'GET',
      }) as any;
      
      return response.versions?.items || [];
    } catch (error) {
      handleApiError(error, 'listPropertyVersions');
    }
  },
  'property.version.list',
  PerformanceProfiles.LIST
);

/**
 * Get property rules (rule tree)
 */
export const getPropertyRules = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      version: number;
      validateRules?: boolean;
      customer?: string;
    }
  ): Promise<PropertyRules> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${params.version}/rules`,
        method: 'GET',
        queryParams: {
          validateRules: params.validateRules ? 'true' : 'false',
        },
      }) as any;
      
      return response;
    } catch (error) {
      handleApiError(error, 'getPropertyRules');
    }
  },
  'property.rules.get',
  PerformanceProfiles.READ
);

/**
 * Update property rules
 */
export const updatePropertyRules = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      version: number;
      rules: PropertyRules;
      validateRules?: boolean;
      customer?: string;
    }
  ): Promise<{ errors?: any[]; warnings?: any[] }> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    // Get current version etag
    const currentRules = await getPropertyRules(client, {
      propertyId,
      version: params.version,
      customer: params.customer,
    });
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/versions/${params.version}/rules`,
        method: 'PUT',
        headers: {
          'If-Match': currentRules.etag || '',
        },
        body: {
          ...params.rules,
          ruleFormat: params.rules.ruleFormat || currentRules.ruleFormat,
        },
        queryParams: {
          validateRules: params.validateRules ? 'true' : 'false',
        },
      }) as any;
      
      // Invalidate rules cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:property.rules.*:*${propertyId}*`);
      
      return {
        errors: response.errors,
        warnings: response.warnings,
      };
    } catch (error) {
      handleApiError(error, 'updatePropertyRules');
    }
  },
  'property.rules.update',
  PerformanceProfiles.WRITE
);

/**
 * Activate property version
 */
export const activateProperty = performanceOptimized(
  async (
    client: AkamaiClient,
    params: ActivatePropertyParams
  ): Promise<ActivatePropertyResponse> => {
    // Validate parameters
    const validated = ActivatePropertySchema.parse(params);
    const propertyId = normalizeId.property(validated.propertyId);
    
    validateCustomer(validated.customer);
    
    // Normalize network to uppercase
    const network = validated.network.toUpperCase() as 'STAGING' | 'PRODUCTION';
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/activations`,
        method: 'POST',
        body: {
            propertyVersion: validated.version,
            network,
            note: validated.note || `Activation via ALECS MCP - ${new Date().toISOString()}`,
            notifyEmails: validated.emails || ['noreply@example.com'],
            acknowledgeAllWarnings: validated.acknowledgeWarnings || true,
            activationType: 'ACTIVATE',
          },
        }
      ) as any;
      
      const activationLink = response.activationLink || response.headers?.location;
      const activationId = activationLink?.match(/activations\/(atv_\d+)/)?.[1];
      
      if (!activationId) {
        throw new Error('Failed to extract activation ID from response');
      }
      
      // Invalidate activation cache
      await CacheInvalidation.invalidate(`${validated.customer || 'default'}:property.activation.*:*${propertyId}*`);
      
      return {
        activationLink,
        activationId,
      };
    } catch (error) {
      handleApiError(error, 'activateProperty');
    }
  },
  'property.activation.create',
  PerformanceProfiles.WRITE
);

/**
 * Get activation status with polling support
 */
export const getActivationStatus = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      activationId: string;
      customer?: string;
    }
  ): Promise<PropertyActivation> => {
    const propertyId = normalizeId.property(params.propertyId);
    const activationId = normalizeId.activation(params.activationId);
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/activations/${activationId}`,
        method: 'GET',
      }) as any;
      
      if (!response.activations?.items?.[0]) {
        throw new Error(`Activation ${activationId} not found`);
      }
      
      return response.activations.items[0];
    } catch (error) {
      handleApiError(error, 'getActivationStatus');
    }
  },
  'property.activation.status',
  PerformanceProfiles.STATUS
);

/**
 * List property activations
 */
export const listPropertyActivations = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      customer?: string;
    }
  ): Promise<PropertyActivation[]> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}/activations`,
        method: 'GET',
      }) as any;
      
      return response.activations?.items || [];
    } catch (error) {
      handleApiError(error, 'listPropertyActivations');
    }
  },
  'property.activation.list',
  PerformanceProfiles.LIST
);

/**
 * Cancel property activation
 */
export const cancelPropertyActivation = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      activationId: string;
      customer?: string;
    }
  ): Promise<void> => {
    const propertyId = normalizeId.property(params.propertyId);
    const activationId = normalizeId.activation(params.activationId);
    
    validateCustomer(params.customer);
    
    try {
      await client.request({
        path: `/papi/v1/properties/${propertyId}/activations/${activationId}`,
        method: 'DELETE',
      });
      
      // Invalidate activation cache
      await CacheInvalidation.invalidate(`${params.customer || 'default'}:property.activation.*:*${propertyId}*`);
    } catch (error) {
      handleApiError(error, 'cancelPropertyActivation');
    }
  },
  'property.activation.cancel',
  PerformanceProfiles.WRITE
);

/**
 * Delete property (careful!)
 */
export const removeProperty = performanceOptimized(
  async (
    client: AkamaiClient,
    params: {
      propertyId: string;
      customer?: string;
    }
  ): Promise<void> => {
    const propertyId = normalizeId.property(params.propertyId);
    
    validateCustomer(params.customer);
    
    // Check if property has active versions
    const activations = await listPropertyActivations(client, {
      propertyId,
      customer: params.customer,
    });
    
    const activeVersions = activations.filter(a => 
      a.status === 'ACTIVE' && a.activationType === 'ACTIVATE'
    );
    
    if (activeVersions.length > 0) {
      throw new Error(
        `Cannot delete property ${propertyId}: Has ${activeVersions.length} active versions. ` +
        `Deactivate all versions first.`
      );
    }
    
    try {
      await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'DELETE',
      });
      
      // Clear all caches for this property
      await CacheInvalidation.invalidate(`*:*${propertyId}*`);
    } catch (error) {
      handleApiError(error, 'removeProperty');
    }
  },
  'property.delete',
  PerformanceProfiles.WRITE
);

/**
 * List contracts
 */
export const listContracts = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { customer?: string } = {}
  ): Promise<Array<{ contractId: string; contractTypeName: string }>> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/papi/v1/contracts',
        method: 'GET',
      }) as any;
      
      return response.contracts?.items || [];
    } catch (error) {
      handleApiError(error, 'listContracts');
    }
  },
  'property.contracts.list',
  PerformanceProfiles.LIST
);

/**
 * List groups
 */
export const listGroups = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { customer?: string } = {}
  ): Promise<Array<{ groupId: string; groupName: string; contractIds: string[] }>> => {
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      }) as any;
      
      return response.groups?.items || [];
    } catch (error) {
      handleApiError(error, 'listGroups');
    }
  },
  'property.groups.list',
  PerformanceProfiles.LIST
);

/**
 * List products
 */
export const listProducts = performanceOptimized(
  async (
    client: AkamaiClient,
    params: { contractId: string; customer?: string }
  ): Promise<Array<{ productId: string; productName: string }>> => {
    const contractId = normalizeId.contract(params.contractId);
    
    validateCustomer(params.customer);
    
    try {
      const response = await client.request({
        path: '/papi/v1/products',
        method: 'GET',
        queryParams: { contractId },
      }) as any;
      
      return response.products?.items || [];
    } catch (error) {
      handleApiError(error, 'listProducts');
    }
  },
  'property.products.list',
  PerformanceProfiles.LIST
);