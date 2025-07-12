/**
 * Utilities Domain Exports
 * 
 * Unified exports following the standard domain pattern
 * Updated: 2025-07-12 - Converted from class-based to functional exports
 */

export * from './utilities';
export { UtilityToolSchemas, UtilityEndpoints } from './api';

// Import all functions for operations object
import {
  fastPurgeByURL,
  fastPurgeByCPCode,
  fastPurgeByTag,
  fastPurgeStatus,
  createCPCode,
  listCPCodes,
  createInclude,
  listIncludes,
  listContracts,
  listProducts,
  getTrafficReport
} from './utilities';

/**
 * Unified operations object for registry integration
 */
export const utilityOperations = {
  // FastPurge Operations
  fastpurge_url: { handler: fastPurgeByURL, description: "Purge content by URL" },
  fastpurge_cpcode: { handler: fastPurgeByCPCode, description: "Purge content by CP code" },
  fastpurge_tag: { handler: fastPurgeByTag, description: "Purge content by cache tag" },
  fastpurge_status: { handler: fastPurgeStatus, description: "Check purge operation status" },
  
  // CP Code Operations
  cpcode_create: { handler: createCPCode, description: "Create new CP code" },
  cpcode_list: { handler: listCPCodes, description: "List CP codes" },
  
  // Include Operations
  include_create: { handler: createInclude, description: "Create property include" },
  include_list: { handler: listIncludes, description: "List property includes" },
  
  // Contract/Product Operations
  contract_list: { handler: listContracts, description: "List contracts" },
  product_list: { handler: listProducts, description: "List products" },
  
  // Reporting Operations
  traffic_report: { handler: getTrafficReport, description: "Get traffic report" }
};