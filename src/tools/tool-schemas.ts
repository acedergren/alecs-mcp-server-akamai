/**
 * MCP 2025 Compliant Tool Schemas
 * All schemas follow the June 2025 MCP specification
 */

import { z } from 'zod';

// Base schema that all tools extend
const BaseToolSchema = z.object({
  customer: z.string().optional().describe('Customer section name from .edgerc'),
});

// Property Management Schemas
export const ListPropertiesSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
  groupId: z.string().optional().describe('Filter by group ID'),
  limit: z.number().optional().describe('Maximum number of results'),
  includeSubgroups: z.boolean().optional().describe('Include properties from subgroups'),
});

export const GetPropertySchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
});

export const CreatePropertySchema = BaseToolSchema.extend({
  propertyName: z.string().describe('Property name'),
  productId: z.string().describe('Product ID'),
  contractId: z.string().describe('Contract ID'),
  groupId: z.string().describe('Group ID'),
  ruleFormat: z.string().optional().describe('Rule format version'),
});

export const ListContractsSchema = BaseToolSchema.extend({
  searchTerm: z.string().optional().describe('Search term for filtering contracts'),
});

export const ListGroupsSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
});

export const ListProductsSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
});

// Property Version Management Schemas
export const CreatePropertyVersionSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  createFromVersion: z.number().optional().describe('Base version to create from'),
  createFromEtag: z.string().optional().describe('Base version etag'),
});

export const GetPropertyRulesSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const UpdatePropertyRulesSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  rules: z.any().describe('Property rules object'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const ActivatePropertySchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  network: z.enum(['staging', 'production']).describe('Activation network'),
  emails: z.array(z.string()).optional().describe('Notification emails'),
  note: z.string().optional().describe('Activation note'),
  acknowledgeWarnings: z.boolean().optional().describe('Acknowledge warnings'),
});

export const GetActivationStatusSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  activationId: z.string().describe('Activation ID'),
});

export const ListPropertyActivationsSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const ListPropertyVersionsSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const GetPropertyVersionSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

// Property Search and Advanced Operations Schemas
export const SearchPropertiesSchema = BaseToolSchema.extend({
  propertyName: z.string().optional().describe('Property name to search'),
  hostname: z.string().optional().describe('Hostname to search'),
  edgeHostname: z.string().optional().describe('Edge hostname to search'),
});

export const ClonePropertySchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Source property ID'),
  version: z.number().describe('Version to clone'),
  cloneName: z.string().describe('Name for cloned property'),
  contractId: z.string().optional().describe('Contract ID for clone'),
  groupId: z.string().optional().describe('Group ID for clone'),
});

export const RemovePropertySchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID to remove'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

// DNS Management Schemas
export const ListZonesSchema = BaseToolSchema.extend({
  contractIds: z.array(z.string()).optional().describe('Filter by contract IDs'),
  types: z.array(z.enum(['primary', 'secondary', 'alias'])).optional().describe('Filter by zone types'),
});

export const GetZoneSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
});

export const CreateZoneSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
  type: z.enum(['primary', 'secondary', 'alias']).describe('Zone type'),
  contractId: z.string().describe('Contract ID'),
  comment: z.string().optional().describe('Zone comment'),
  signAndServe: z.boolean().optional().describe('Enable DNSSEC'),
});

export const ListRecordsSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
  recordType: z.string().optional().describe('Filter by record type'),
});

export const CreateRecordSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
  name: z.string().describe('Record name'),
  type: z.string().describe('Record type (A, AAAA, CNAME, etc.)'),
  ttl: z.number().describe('TTL in seconds'),
  rdata: z.array(z.string()).describe('Record data values'),
});

export const DeleteRecordSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
  name: z.string().describe('Record name'),
  type: z.string().describe('Record type'),
});

export const ActivateZoneChangesSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
  comment: z.string().optional().describe('Activation comment'),
});

// DNS Migration Schemas
export const ImportFromCloudflareSchema = BaseToolSchema.extend({
  zoneId: z.string().describe('Cloudflare zone ID'),
  targetZone: z.string().describe('Target Akamai zone name'),
  contractId: z.string().describe('Contract ID'),
});

export const ParseZoneFileSchema = BaseToolSchema.extend({
  zoneContent: z.string().describe('Zone file content'),
  targetZone: z.string().describe('Target zone name'),
  contractId: z.string().describe('Contract ID'),
});

export const BulkImportRecordsSchema = BaseToolSchema.extend({
  zone: z.string().describe('Zone name'),
  records: z.array(z.object({
    name: z.string(),
    type: z.string(),
    ttl: z.number(),
    rdata: z.array(z.string()),
  })).describe('Records to import'),
});

// Certificate Management Schemas
export const ListCertificateEnrollmentsSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
});

export const CreateDVEnrollmentSchema = BaseToolSchema.extend({
  cn: z.string().describe('Common name'),
  sans: z.array(z.string()).optional().describe('Subject alternative names'),
  contractId: z.string().describe('Contract ID'),
  validationType: z.enum(['dv', 'third-party']).describe('Validation type'),
  networkConfiguration: z.object({
    geography: z.enum(['core', 'china+core', 'russia+core']).optional(),
    secureNetwork: z.enum(['enhanced-tls', 'standard-tls']).optional(),
    mustHaveCiphers: z.array(z.string()).optional(),
    preferredCiphers: z.array(z.string()).optional(),
  }).optional().describe('Network configuration'),
});

export const CheckDVEnrollmentStatusSchema = BaseToolSchema.extend({
  enrollmentId: z.number().describe('Enrollment ID'),
});

export const GetDVValidationChallengesSchema = BaseToolSchema.extend({
  enrollmentId: z.number().describe('Enrollment ID'),
});

// Edge Hostname Management Schemas
export const CreateEdgeHostnameSchema = BaseToolSchema.extend({
  domainPrefix: z.string().describe('Domain prefix'),
  domainSuffix: z.string().describe('Domain suffix (e.g., edgekey.net)'),
  productId: z.string().describe('Product ID'),
  secureNetwork: z.enum(['enhanced-tls', 'standard-tls']).optional().describe('Security level'),
  ipVersionBehavior: z.enum(['ipv4', 'ipv6', 'ipv4+ipv6']).optional().describe('IP version'),
});

export const ListEdgeHostnamesSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
  groupId: z.string().optional().describe('Filter by group ID'),
});

export const GetEdgeHostnameSchema = BaseToolSchema.extend({
  edgeHostnameId: z.number().describe('Edge hostname ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

// Hostname Management Schemas
export const AddPropertyHostnameSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  hostnames: z.array(z.string()).describe('Hostnames to add'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const RemovePropertyHostnameSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  hostnames: z.array(z.string()).describe('Hostnames to remove'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

export const ListPropertyHostnamesSchema = BaseToolSchema.extend({
  propertyId: z.string().describe('Property ID'),
  version: z.number().describe('Property version'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

// CP Code Management Schemas
export const ListCPCodesSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
  groupId: z.string().optional().describe('Filter by group ID'),
});

export const CreateCPCodeSchema = BaseToolSchema.extend({
  cpcodeName: z.string().describe('CP code name'),
  contractId: z.string().describe('Contract ID'),
  groupId: z.string().describe('Group ID'),
  productId: z.string().describe('Product ID'),
});

export const GetCPCodeSchema = BaseToolSchema.extend({
  cpcodeId: z.number().describe('CP code ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

// Include Management Schemas
export const ListIncludesSchema = BaseToolSchema.extend({
  contractId: z.string().optional().describe('Filter by contract ID'),
  groupId: z.string().optional().describe('Filter by group ID'),
});

export const CreateIncludeSchema = BaseToolSchema.extend({
  includeName: z.string().describe('Include name'),
  includeType: z.enum(['MICROSERVICES', 'COMMON_SETTINGS']).describe('Include type'),
  contractId: z.string().describe('Contract ID'),
  groupId: z.string().describe('Group ID'),
  productId: z.string().optional().describe('Product ID'),
});

export const GetIncludeSchema = BaseToolSchema.extend({
  includeId: z.string().describe('Include ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
});

// Bulk Operations Schemas
export const BulkActivatePropertiesSchema = BaseToolSchema.extend({
  activations: z.array(z.object({
    propertyId: z.string(),
    version: z.number(),
    network: z.enum(['staging', 'production']),
  })).describe('Properties to activate'),
  notificationEmails: z.array(z.string()).optional().describe('Notification emails'),
});

export const BulkClonePropertiesSchema = BaseToolSchema.extend({
  properties: z.array(z.object({
    sourcePropertyId: z.string(),
    cloneName: z.string(),
    version: z.number().optional(),
  })).describe('Properties to clone'),
  targetContractId: z.string().optional().describe('Target contract ID'),
  targetGroupId: z.string().optional().describe('Target group ID'),
});

export const BulkUpdatePropertyRulesSchema = BaseToolSchema.extend({
  propertyIds: z.array(z.string()).describe('Property IDs to update'),
  ruleUpdates: z.any().describe('Rule updates to apply'),
  createNewVersion: z.boolean().optional().describe('Create new version for each property'),
});

// Search Schema
export const UniversalSearchSchema = BaseToolSchema.extend({
  query: z.string().describe('Search query'),
  types: z.array(z.string()).optional().describe('Resource types to search'),
  limit: z.number().optional().describe('Maximum results per type'),
});

// Property Onboarding Schemas
export const OnboardPropertySchema = BaseToolSchema.extend({
  domain: z.string().describe('Domain to onboard'),
  productId: z.string().optional().describe('Product ID'),
  contractId: z.string().optional().describe('Contract ID'),
  groupId: z.string().optional().describe('Group ID'),
  certificateType: z.enum(['default-dv', 'cps-managed', 'third-party']).optional().describe('Certificate type'),
});

export const CheckOnboardingStatusSchema = BaseToolSchema.extend({
  domain: z.string().describe('Domain to check'),
  propertyId: z.string().optional().describe('Property ID if known'),
});

// Export all schemas as a map
export const TOOL_SCHEMAS = {
  'list-properties': ListPropertiesSchema,
  'get-property': GetPropertySchema,
  'create-property': CreatePropertySchema,
  'list-contracts': ListContractsSchema,
  'list-groups': ListGroupsSchema,
  'list-products': ListProductsSchema,
  'create-property-version': CreatePropertyVersionSchema,
  'get-property-rules': GetPropertyRulesSchema,
  'update-property-rules': UpdatePropertyRulesSchema,
  'activate-property': ActivatePropertySchema,
  'get-activation-status': GetActivationStatusSchema,
  'list-property-activations': ListPropertyActivationsSchema,
  'list-property-versions': ListPropertyVersionsSchema,
  'get-property-version': GetPropertyVersionSchema,
  'search-properties': SearchPropertiesSchema,
  'clone-property': ClonePropertySchema,
  'remove-property': RemovePropertySchema,
  'list-zones': ListZonesSchema,
  'get-zone': GetZoneSchema,
  'create-zone': CreateZoneSchema,
  'list-records': ListRecordsSchema,
  'create-record': CreateRecordSchema,
  'delete-record': DeleteRecordSchema,
  'activate-zone-changes': ActivateZoneChangesSchema,
  'import-from-cloudflare': ImportFromCloudflareSchema,
  'parse-zone-file': ParseZoneFileSchema,
  'bulk-import-records': BulkImportRecordsSchema,
  'list-certificate-enrollments': ListCertificateEnrollmentsSchema,
  'create-dv-enrollment': CreateDVEnrollmentSchema,
  'check-dv-enrollment-status': CheckDVEnrollmentStatusSchema,
  'get-dv-validation-challenges': GetDVValidationChallengesSchema,
  'create-edge-hostname': CreateEdgeHostnameSchema,
  'list-edge-hostnames': ListEdgeHostnamesSchema,
  'get-edge-hostname': GetEdgeHostnameSchema,
  'add-property-hostname': AddPropertyHostnameSchema,
  'remove-property-hostname': RemovePropertyHostnameSchema,
  'list-property-hostnames': ListPropertyHostnamesSchema,
  'list-cpcodes': ListCPCodesSchema,
  'create-cpcode': CreateCPCodeSchema,
  'get-cpcode': GetCPCodeSchema,
  'list-includes': ListIncludesSchema,
  'create-include': CreateIncludeSchema,
  'get-include': GetIncludeSchema,
  'bulk-activate-properties': BulkActivatePropertiesSchema,
  'bulk-clone-properties': BulkClonePropertiesSchema,
  'bulk-update-property-rules': BulkUpdatePropertyRulesSchema,
  'universal-search': UniversalSearchSchema,
  'onboard-property': OnboardPropertySchema,
  'check-onboarding-status': CheckOnboardingStatusSchema,
};