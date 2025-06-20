/**
 * Complete Tool Registration for ALECS Full Server
 * Registers all available tools with proper schemas
 */

import { type ZodSchema } from 'zod';

// Import all tool implementations
import {
  listProperties,
  getProperty,
  createProperty,
  listContracts,
  listGroups,
  listProducts,
} from './property-tools';

import {
  activateProperty,
  addPropertyHostname,
  removePropertyHostname,
  createPropertyVersion,
  createEdgeHostname,
  getPropertyRules,
  updatePropertyRules,
  listPropertyActivations,
  getActivationStatus,
} from './property-manager-tools';

import {
  searchProperties,
  listPropertyVersions,
  getPropertyVersion,
  listEdgeHostnames,
  getEdgeHostname,
  cloneProperty,
  removeProperty,
} from './property-manager-advanced-tools';

import {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
} from './dns-tools';

import {
  importFromCloudflare,
  parseZoneFile,
  bulkImportRecords,
} from './dns-migration-tools';

import {
  listCertificateEnrollments,
  createDVEnrollment,
  checkDVEnrollmentStatus,
  getDVValidationChallenges,
} from './cps-tools';

import {
  createEdgeHostnameEnhanced,
  getEdgeHostnameDetails,
} from './edge-hostname-management';

import {
  listPropertyVersionHostnames,
} from './property-manager-advanced-tools';

import {
  listCPCodes,
  createCPCode,
  getCPCode,
} from './cpcode-tools';

import {
  listIncludes,
  createInclude,
  getInclude,
} from './includes-tools';

import {
  bulkActivateProperties,
  bulkCloneProperties,
  bulkUpdatePropertyRules,
} from './bulk-operations-manager';

import { universalSearchWithCacheHandler } from './universal-search-with-cache';

import {
  onboardPropertyTool,
  checkOnboardingStatus,
} from './property-onboarding-tools';

// Import all schemas
import * as schemas from './tool-schemas';

// Tool definition type
export interface ToolDefinition {
  name: string;
  description: string;
  schema: ZodSchema;
  handler: (client: any, params: any) => Promise<any>;
}

// Register all tools with their schemas
export function getAllToolDefinitions(): ToolDefinition[] {
  return [
    // Property Management
    {
      name: 'list-properties',
      description: 'List all Akamai CDN properties in your account',
      schema: schemas.ListPropertiesSchema,
      handler: listProperties,
    },
    {
      name: 'get-property',
      description: 'Get details of a specific property',
      schema: schemas.GetPropertySchema,
      handler: getProperty,
    },
    {
      name: 'create-property',
      description: 'Create a new property',
      schema: schemas.CreatePropertySchema,
      handler: createProperty,
    },
    {
      name: 'list-contracts',
      description: 'List all Akamai contracts',
      schema: schemas.ListContractsSchema,
      handler: listContracts,
    },
    {
      name: 'list-groups',
      description: 'List all groups in your account',
      schema: schemas.ListGroupsSchema,
      handler: listGroups,
    },
    {
      name: 'list-products',
      description: 'List available Akamai products',
      schema: schemas.ListProductsSchema,
      handler: listProducts,
    },
    
    // Property Version Management
    {
      name: 'create-property-version',
      description: 'Create a new property version',
      schema: schemas.CreatePropertyVersionSchema,
      handler: createPropertyVersion,
    },
    {
      name: 'get-property-rules',
      description: 'Get property rules configuration',
      schema: schemas.GetPropertyRulesSchema,
      handler: getPropertyRules,
    },
    {
      name: 'update-property-rules',
      description: 'Update property rules configuration',
      schema: schemas.UpdatePropertyRulesSchema,
      handler: updatePropertyRules,
    },
    {
      name: 'activate-property',
      description: 'Activate a property version',
      schema: schemas.ActivatePropertySchema,
      handler: activateProperty,
    },
    {
      name: 'get-activation-status',
      description: 'Get property activation status',
      schema: schemas.GetActivationStatusSchema,
      handler: getActivationStatus,
    },
    {
      name: 'list-property-activations',
      description: 'List property activation history',
      schema: schemas.ListPropertyActivationsSchema,
      handler: listPropertyActivations,
    },
    {
      name: 'list-property-versions',
      description: 'List all versions of a property',
      schema: schemas.ListPropertyVersionsSchema,
      handler: listPropertyVersions,
    },
    {
      name: 'get-property-version',
      description: 'Get details of a specific property version',
      schema: schemas.GetPropertyVersionSchema,
      handler: getPropertyVersion,
    },
    
    // Property Search and Advanced Operations
    {
      name: 'search-properties',
      description: 'Search properties by various criteria',
      schema: schemas.SearchPropertiesSchema,
      handler: searchProperties,
    },
    {
      name: 'clone-property',
      description: 'Clone an existing property',
      schema: schemas.ClonePropertySchema,
      handler: cloneProperty,
    },
    {
      name: 'remove-property',
      description: 'Remove a property',
      schema: schemas.RemovePropertySchema,
      handler: removeProperty,
    },
    
    // DNS Management
    {
      name: 'list-zones',
      description: 'List all DNS zones',
      schema: schemas.ListZonesSchema,
      handler: listZones,
    },
    {
      name: 'get-zone',
      description: 'Get details of a specific DNS zone',
      schema: schemas.GetZoneSchema,
      handler: getZone,
    },
    {
      name: 'create-zone',
      description: 'Create a new DNS zone',
      schema: schemas.CreateZoneSchema,
      handler: createZone,
    },
    {
      name: 'list-records',
      description: 'List DNS records in a zone',
      schema: schemas.ListRecordsSchema,
      handler: listRecords,
    },
    {
      name: 'create-record',
      description: 'Create or update a DNS record',
      schema: schemas.CreateRecordSchema,
      handler: upsertRecord,
    },
    {
      name: 'delete-record',
      description: 'Delete a DNS record',
      schema: schemas.DeleteRecordSchema,
      handler: deleteRecord,
    },
    {
      name: 'activate-zone-changes',
      description: 'Activate pending DNS zone changes',
      schema: schemas.ActivateZoneChangesSchema,
      handler: activateZoneChanges,
    },
    
    // DNS Migration
    {
      name: 'import-from-cloudflare',
      description: 'Import DNS zone from Cloudflare',
      schema: schemas.ImportFromCloudflareSchema,
      handler: importFromCloudflare,
    },
    {
      name: 'parse-zone-file',
      description: 'Parse and import zone file',
      schema: schemas.ParseZoneFileSchema,
      handler: parseZoneFile,
    },
    {
      name: 'bulk-import-records',
      description: 'Bulk import DNS records',
      schema: schemas.BulkImportRecordsSchema,
      handler: bulkImportRecords,
    },
    
    // Certificate Management
    {
      name: 'list-certificate-enrollments',
      description: 'List certificate enrollments',
      schema: schemas.ListCertificateEnrollmentsSchema,
      handler: listCertificateEnrollments,
    },
    {
      name: 'create-dv-enrollment',
      description: 'Create domain validated certificate enrollment',
      schema: schemas.CreateDVEnrollmentSchema,
      handler: createDVEnrollment,
    },
    {
      name: 'check-dv-enrollment-status',
      description: 'Check DV certificate enrollment status',
      schema: schemas.CheckDVEnrollmentStatusSchema,
      handler: checkDVEnrollmentStatus,
    },
    {
      name: 'get-dv-validation-challenges',
      description: 'Get DV certificate validation challenges',
      schema: schemas.GetDVValidationChallengesSchema,
      handler: getDVValidationChallenges,
    },
    
    // Edge Hostname Management
    {
      name: 'create-edge-hostname',
      description: 'Create an edge hostname',
      schema: schemas.CreateEdgeHostnameSchema,
      handler: createEdgeHostname,
    },
    {
      name: 'list-edge-hostnames',
      description: 'List edge hostnames',
      schema: schemas.ListEdgeHostnamesSchema,
      handler: listEdgeHostnames,
    },
    {
      name: 'get-edge-hostname',
      description: 'Get edge hostname details',
      schema: schemas.GetEdgeHostnameSchema,
      handler: getEdgeHostname,
    },
    
    // Hostname Management
    {
      name: 'add-property-hostname',
      description: 'Add hostname to property',
      schema: schemas.AddPropertyHostnameSchema,
      handler: addPropertyHostname,
    },
    {
      name: 'remove-property-hostname',
      description: 'Remove hostname from property',
      schema: schemas.RemovePropertyHostnameSchema,
      handler: removePropertyHostname,
    },
    {
      name: 'list-property-hostnames',
      description: 'List hostnames for a property version',
      schema: schemas.ListPropertyHostnamesSchema,
      handler: listPropertyVersionHostnames,
    },
    
    // CP Code Management
    {
      name: 'list-cpcodes',
      description: 'List CP codes',
      schema: schemas.ListCPCodesSchema,
      handler: listCPCodes,
    },
    {
      name: 'create-cpcode',
      description: 'Create a new CP code',
      schema: schemas.CreateCPCodeSchema,
      handler: createCPCode,
    },
    {
      name: 'get-cpcode',
      description: 'Get CP code details',
      schema: schemas.GetCPCodeSchema,
      handler: getCPCode,
    },
    
    // Include Management
    {
      name: 'list-includes',
      description: 'List property includes',
      schema: schemas.ListIncludesSchema,
      handler: listIncludes,
    },
    {
      name: 'create-include',
      description: 'Create a new include',
      schema: schemas.CreateIncludeSchema,
      handler: createInclude,
    },
    {
      name: 'get-include',
      description: 'Get include details',
      schema: schemas.GetIncludeSchema,
      handler: getInclude,
    },
    
    // Bulk Operations
    {
      name: 'bulk-activate-properties',
      description: 'Activate multiple properties',
      schema: schemas.BulkActivatePropertiesSchema,
      handler: bulkActivateProperties,
    },
    {
      name: 'bulk-clone-properties',
      description: 'Clone multiple properties',
      schema: schemas.BulkClonePropertiesSchema,
      handler: bulkCloneProperties,
    },
    {
      name: 'bulk-update-property-rules',
      description: 'Update rules for multiple properties',
      schema: schemas.BulkUpdatePropertyRulesSchema,
      handler: bulkUpdatePropertyRules,
    },
    
    // Search
    {
      name: 'universal-search',
      description: 'Search across all Akamai resources',
      schema: schemas.UniversalSearchSchema,
      handler: universalSearchWithCacheHandler,
    },
    
    // Property Onboarding
    {
      name: 'onboard-property',
      description: 'Onboard a new property with wizard',
      schema: schemas.OnboardPropertySchema,
      handler: onboardPropertyTool,
    },
    {
      name: 'check-onboarding-status',
      description: 'Check property onboarding status',
      schema: schemas.CheckOnboardingStatusSchema,
      handler: checkOnboardingStatus,
    },
  ];
}