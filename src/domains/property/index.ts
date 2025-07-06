/**
 * Property Domain - Public API
 * 
 * This is the main entry point for all property-related operations.
 * Provides a clean, consistent API that consolidates functionality
 * from 12+ scattered property files.
 */

import {
  listProperties,
  getProperty,
  createProperty,
  createPropertyVersion,
  getPropertyVersion,
  listPropertyVersions,
  getPropertyRules,
  updatePropertyRules,
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  cancelPropertyActivation,
  removeProperty,
  listContracts,
  listGroups,
  listProducts,
} from './operations';

// Export all types
export * from './types';

/**
 * Property domain API - organized by resource
 * 
 * Usage:
 * ```typescript
 * import { property } from '../domains/property';
 * 
 * // List properties
 * const props = await property.list(client, { contractId: 'ctr_123' });
 * 
 * // Get specific property
 * const prop = await property.get(client, { propertyId: 'prp_456' });
 * 
 * // Create new version
 * const version = await property.version.create(client, { propertyId: 'prp_456' });
 * ```
 */
export const property = {
  // Core property operations
  list: listProperties,
  get: getProperty,
  create: createProperty,
  delete: removeProperty,
  
  // Version management
  version: {
    create: createPropertyVersion,
    get: getPropertyVersion,
    list: listPropertyVersions,
  },
  
  // Rules management
  rules: {
    get: getPropertyRules,
    update: updatePropertyRules,
  },
  
  // Activation management
  activation: {
    create: activateProperty,
    status: getActivationStatus,
    list: listPropertyActivations,
    cancel: cancelPropertyActivation,
  },
  
  // Supporting resources
  contracts: {
    list: listContracts,
  },
  
  groups: {
    list: listGroups,
  },
  
  products: {
    list: listProducts,
  },
} as const;

/**
 * Backwards compatibility exports
 * These maintain compatibility with existing code
 */
export {
  listProperties,
  getProperty,
  createProperty,
  createPropertyVersion,
  getPropertyVersion,
  listPropertyVersions,
  getPropertyRules,
  updatePropertyRules,
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  cancelPropertyActivation,
  removeProperty,
  listContracts,
  listGroups,
  listProducts,
};

// Additional operations will be added in subsequent phases:
// - Hostname management (addPropertyHostname, removePropertyHostname, listPropertyHostnames)
// - Edge hostname management (createEdgeHostname, listEdgeHostnames)
// - Clone operations (cloneProperty)
// - Rollback operations (rollbackPropertyVersion)
// - Search operations (searchProperties)
// - Bulk operations (bulkActivate, bulkUpdate)