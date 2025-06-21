/**
 * Complete Tool Registry for ALECS MCP Server
 * Contains all available tool imports and registrations
 */

// Property Management Tools
export {
  listProperties,
  listPropertiesTreeView,
  getProperty,
  createProperty,
  listContracts,
  listGroups,
  listProducts,
} from './property-tools';

export {
  activateProperty,
  addPropertyHostname,
  removePropertyHostname,
  createPropertyVersion,
  createPropertyVersionEnhanced,
  createEdgeHostname,
  getPropertyRules,
  updatePropertyRules,
  updatePropertyWithDefaultDV,
  updatePropertyWithCPSCertificate,
  listPropertyVersionsEnhanced,
  listPropertyActivations,
  getActivationStatus,
  rollbackPropertyVersion,
  getVersionDiff,
  batchVersionOperations,
} from './property-manager-tools';

export {
  searchProperties,
  listPropertyVersions,
  getPropertyVersion,
  getLatestPropertyVersion,
  listPropertyVersionHostnames,
  listAllHostnames,
  listEdgeHostnames,
  getEdgeHostname,
  cloneProperty,
  removeProperty,
  cancelPropertyActivation,
} from './property-manager-advanced-tools';

// DNS Management Tools
export {
  listZones,
  getZone,
  createZone,
  listRecords,
  upsertRecord,
  deleteRecord,
  activateZoneChanges,
} from './dns-tools';

export {
  createMultipleRecordSets,
  getRecordSet,
  submitBulkZoneCreateRequest,
  getZonesDNSSECStatus,
  updateTSIGKeyForZones,
  getZoneVersion,
  getVersionRecordSets,
  getVersionMasterZoneFile,
  reactivateZoneVersion,
  getSecondaryZoneTransferStatus,
  getZoneContract,
} from './dns-advanced-tools';

export {
  importFromCloudflare,
  importZoneViaAXFR,
  parseZoneFile,
  bulkImportRecords,
  convertZoneToPrimary,
  generateMigrationInstructions,
} from './dns-migration-tools';

// Certificate Management Tools
export {
  listCertificateEnrollments,
  createDVEnrollment,
  checkDVEnrollmentStatus,
  getDVValidationChallenges,
  linkCertificateToProperty,
} from './cps-tools';

export {
  enrollCertificateWithValidation,
  monitorCertificateEnrollment,
  getCertificateDeploymentStatus,
  getCertificateValidationHistory,
  validateCertificateEnrollment,
  deployCertificateToNetwork,
  renewCertificate,
  cleanupValidationRecords,
} from './certificate-enrollment-tools';

// Hostname Management Tools
export {
  discoverHostnamesIntelligent,
  analyzeHostnameConflicts,
  analyzeWildcardCoverage,
  identifyOwnershipPatterns,
} from './hostname-discovery-engine';

export {
  createHostnameProvisioningPlan,
  findOptimalPropertyAssignment,
  generateEdgeHostnameRecommendations,
  analyzeHostnameOwnership,
  validateHostnamesBulk,
} from './hostname-management-advanced';

export {
  createEdgeHostnameEnhanced,
  createBulkEdgeHostnames,
  getEdgeHostnameDetails,
  associateCertificateWithEdgeHostname,
  validateEdgeHostnameCertificate,
} from './edge-hostname-management';

// Rule Tree Management Tools
export {
  createRuleFromTemplate,
  updatePropertyRulesEnhanced,
  mergeRuleTrees,
  optimizeRuleTree,
  validateRuleTree,
} from './rule-tree-management';

// Bulk Operations Tools
export {
  bulkActivateProperties,
  bulkCloneProperties,
  bulkManageHostnames,
  bulkUpdatePropertyRules,
  getBulkOperationStatus,
} from './bulk-operations-manager';

// Include Management Tools
export {
  listIncludes,
  getInclude,
  createInclude,
  updateInclude,
  createIncludeVersion,
  activateInclude,
  listIncludeActivations,
  getIncludeActivationStatus,
} from './includes-tools';

// CP Code Tools
export { listCPCodes, getCPCode, createCPCode, searchCPCodes } from './cpcode-tools';

// Product Tools
export { getProduct } from './product-tools';

// Universal Search Tools
export { universalSearchWithCacheHandler } from './universal-search-with-cache';

// Property Onboarding Tools
export {
  onboardPropertyTool,
  onboardPropertyWizard,
  checkOnboardingStatus,
} from './property-onboarding-tools';

// Advanced Property Operations
export {
  bulkUpdateProperties,
  searchPropertiesAdvanced,
  compareProperties,
  detectConfigurationDrift,
  checkPropertyHealth,
} from './property-operations-advanced';

// Secure by Default Tools
export {
  onboardSecureByDefaultProperty,
  checkSecureByDefaultStatus,
  quickSecureByDefaultSetup,
} from './secure-by-default-onboarding';

// All tool definitions for easy registration
// Commented out due to module resolution issues - not used anywhere
/*
export const ALL_TOOL_DEFINITIONS: Record<string, { handler: any; description: string }> = {
  // Property Management
  'list-properties': {
    handler: listProperties,
    description: 'List all Akamai CDN properties in your account',
  },
  'get-property': {
    handler: getProperty,
    description: 'Get details of a specific property',
  },
  'create-property': {
    handler: createProperty,
    description: 'Create a new property',
  },
  'list-contracts': {
    handler: listContracts,
    description: 'List all Akamai contracts',
  },
  'list-groups': {
    handler: listGroups,
    description: 'List all groups in your account',
  },
  'list-products': {
    handler: listProducts,
    description: 'List available Akamai products',
  },

  // Property Version Management
  'create-property-version': {
    handler: createPropertyVersion,
    description: 'Create a new property version',
  },
  'get-property-rules': {
    handler: getPropertyRules,
    description: 'Get property rules configuration',
  },
  'update-property-rules': {
    handler: updatePropertyRules,
    description: 'Update property rules configuration',
  },
  'activate-property': {
    handler: activateProperty,
    description: 'Activate a property version',
  },
  'get-activation-status': {
    handler: getActivationStatus,
    description: 'Get property activation status',
  },
  'list-property-activations': {
    handler: listPropertyActivations,
    description: 'List property activation history',
  },
  'list-property-versions': {
    handler: listPropertyVersions,
    description: 'List all versions of a property',
  },
  'get-property-version': {
    handler: getPropertyVersion,
    description: 'Get details of a specific property version',
  },

  // Property Search and Advanced Operations
  'search-properties': {
    handler: searchProperties,
    description: 'Search properties by various criteria',
  },
  'clone-property': {
    handler: cloneProperty,
    description: 'Clone an existing property',
  },
  'remove-property': {
    handler: removeProperty,
    description: 'Remove a property',
  },

  // DNS Management
  'list-zones': {
    handler: listZones,
    description: 'List all DNS zones',
  },
  'get-zone': {
    handler: getZone,
    description: 'Get details of a specific DNS zone',
  },
  'create-zone': {
    handler: createZone,
    description: 'Create a new DNS zone',
  },
  'list-records': {
    handler: listRecords,
    description: 'List DNS records in a zone',
  },
  'create-record': {
    handler: upsertRecord,
    description: 'Create or update a DNS record',
  },
  'delete-record': {
    handler: deleteRecord,
    description: 'Delete a DNS record',
  },
  'activate-zone-changes': {
    handler: activateZoneChanges,
    description: 'Activate pending DNS zone changes',
  },

  // DNS Migration
  'import-from-cloudflare': {
    handler: importFromCloudflare,
    description: 'Import DNS zone from Cloudflare',
  },
  'parse-zone-file': {
    handler: parseZoneFile,
    description: 'Parse and import zone file',
  },
  'bulk-import-records': {
    handler: bulkImportRecords,
    description: 'Bulk import DNS records',
  },

  // Certificate Management
  'list-certificate-enrollments': {
    handler: listCertificateEnrollments,
    description: 'List certificate enrollments',
  },
  'create-dv-enrollment': {
    handler: createDVEnrollment,
    description: 'Create domain validated certificate enrollment',
  },
  'check-dv-enrollment-status': {
    handler: checkDVEnrollmentStatus,
    description: 'Check DV certificate enrollment status',
  },
  'get-dv-validation-challenges': {
    handler: getDVValidationChallenges,
    description: 'Get DV certificate validation challenges',
  },

  // Edge Hostname Management
  'create-edge-hostname': {
    handler: createEdgeHostname,
    description: 'Create an edge hostname',
  },
  'list-edge-hostnames': {
    handler: listEdgeHostnames,
    description: 'List edge hostnames',
  },
  'get-edge-hostname': {
    handler: getEdgeHostname,
    description: 'Get edge hostname details',
  },

  // Hostname Management
  'add-property-hostname': {
    handler: addPropertyHostname,
    description: 'Add hostname to property',
  },
  'remove-property-hostname': {
    handler: removePropertyHostname,
    description: 'Remove hostname from property',
  },
  'list-property-hostnames': {
    handler: listPropertyVersionHostnames,
    description: 'List hostnames for a property version',
  },

  // CP Code Management
  'list-cpcodes': {
    handler: listCPCodes,
    description: 'List CP codes',
  },
  'create-cpcode': {
    handler: createCPCode,
    description: 'Create a new CP code',
  },
  'get-cpcode': {
    handler: getCPCode,
    description: 'Get CP code details',
  },

  // Include Management
  'list-includes': {
    handler: listIncludes,
    description: 'List property includes',
  },
  'create-include': {
    handler: createInclude,
    description: 'Create a new include',
  },
  'get-include': {
    handler: getInclude,
    description: 'Get include details',
  },

  // Bulk Operations
  'bulk-activate-properties': {
    handler: bulkActivateProperties,
    description: 'Activate multiple properties',
  },
  'bulk-clone-properties': {
    handler: bulkCloneProperties,
    description: 'Clone multiple properties',
  },
  'bulk-update-property-rules': {
    handler: bulkUpdatePropertyRules,
    description: 'Update rules for multiple properties',
  },

  // Search
  'universal-search': {
    handler: universalSearchWithCacheHandler,
    description: 'Search across all Akamai resources',
  },

  // Property Onboarding
  'onboard-property': {
    handler: onboardPropertyTool,
    description: 'Onboard a new property with wizard',
  },
  'check-onboarding-status': {
    handler: checkOnboardingStatus,
    description: 'Check property onboarding status',
  },
};
*/
