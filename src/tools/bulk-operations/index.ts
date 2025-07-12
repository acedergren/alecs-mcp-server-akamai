/**
 * Bulk Operations Domain
 * 
 * Enterprise-grade bulk operations for managing multiple Akamai properties at scale.
 * Supports bulk activation, cloning, rule updates, hostname management, and status tracking.
 */

// Export all bulk operations functions
export {
  bulkActivateProperties,
  bulkCloneProperties,
  bulkManageHostnames,
  bulkUpdatePropertyRules,
  getBulkOperationStatus
} from './bulk-operations';

// Export schemas and types
export {
  BulkOperationsToolSchemas,
  BulkOperationsEndpoints,
  formatBulkActivationResponse,
  formatBulkCloneResponse,
  formatBulkHostnamesResponse,
  formatBulkRulesUpdateResponse,
  formatBulkOperationStatus
} from './api';

// Create operations registry for unified discovery
export const bulkOperationsOperations = {
  bulk_activate_properties: {
    name: 'bulk_activate_properties',
    description: 'Bulk activate multiple properties across networks',
    inputSchema: BulkOperationsToolSchemas.bulkActivate,
    handler: bulkActivateProperties
  },
  bulk_clone_properties: {
    name: 'bulk_clone_properties',
    description: 'Clone properties in bulk with consistent settings',
    inputSchema: BulkOperationsToolSchemas.bulkClone,
    handler: bulkCloneProperties
  },
  bulk_manage_hostnames: {
    name: 'bulk_manage_hostnames',
    description: 'Add or remove hostnames across multiple properties',
    inputSchema: BulkOperationsToolSchemas.bulkHostnames,
    handler: bulkManageHostnames
  },
  bulk_update_property_rules: {
    name: 'bulk_update_property_rules',
    description: 'Update property rules across multiple properties',
    inputSchema: BulkOperationsToolSchemas.bulkRulesUpdate,
    handler: bulkUpdatePropertyRules
  },
  bulk_operation_status: {
    name: 'bulk_operation_status',
    description: 'Get status of bulk operations with detailed progress',
    inputSchema: BulkOperationsToolSchemas.bulkOperationStatus,
    handler: getBulkOperationStatus
  }
};

// Import for compatibility
import { 
  bulkActivateProperties,
  bulkCloneProperties,
  bulkManageHostnames,
  bulkUpdatePropertyRules,
  getBulkOperationStatus
} from './bulk-operations';

import { BulkOperationsToolSchemas } from './api';