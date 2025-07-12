/**
 * Edge Hostnames Domain Exports
 * 
 * Unified exports following the standard domain pattern
 * Updated: 2025-07-12 - Converted to functional exports with unified operations
 */

export * from './edge-hostnames';
export { EdgeHostnameToolSchemas, EdgeHostnameEndpoints } from './api';

// Import all functions for operations object
import {
  createEdgeHostname,
  listEdgeHostnames,
  getEdgeHostname,
  updateEdgeHostname,
  deleteEdgeHostname
} from './edge-hostnames';

/**
 * Unified operations object for registry integration
 */
export const edgeHostnameOperations = {
  edge_hostname_create: { handler: createEdgeHostname, description: "Create edge hostname" },
  edge_hostname_list: { handler: listEdgeHostnames, description: "List edge hostnames" },
  edge_hostname_get: { handler: getEdgeHostname, description: "Get edge hostname details" },
  edge_hostname_update: { handler: updateEdgeHostname, description: "Update edge hostname" },
  edge_hostname_delete: { handler: deleteEdgeHostname, description: "Delete edge hostname" }
};