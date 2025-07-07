/**
 * DNS Domain Module - Consolidated Export
 * 
 * CODE KAI: Single entry point for all DNS operations
 * Provides a clean, unified API for DNS management
 */

// Export all types
export * from './types';

// Export schemas for validation
export * from './schemas';

// Export consolidated operations
export { dnsOperations } from './operations';

// Export individual operations for backwards compatibility
export {
  // Zone operations
  listZones,
  getZone,
  createZone,
  deleteZone,
  getZoneStatus,
  activateZone,
  convertZoneToPrimary,
  
  // Record operations
  listRecords,
  upsertRecord,
  deleteRecord,
  createMultipleRecordSets,
  bulkImportRecords,
  
  // DNSSEC operations
  enableDNSSEC,
  disableDNSSEC,
  getDNSSECStatus,
  rotateDNSSECKeys,
  
  // Migration operations
  importZoneViaAXFR,
  parseZoneFile,
  generateMigrationInstructions,
  
  // Administrative operations
  getAuthoritativeNameservers,
  listDNSContracts,
  getSupportedRecordTypes,
  
  // Changelist operations
  listChangelists,
  searchChangelists,
  getChangelistDiff,
  
  // Version operations
  getZoneVersion,
  getVersionRecordSets,
  getVersionMasterZoneFile,
  reactivateZoneVersion,
  
  // Zone transfer operations
  getZoneTransferStatus,
  
  // TSIG operations
  listTSIGKeys,
  createTSIGKey,
  updateTSIGKeyForZones,
  
  // Bulk operations
  bulkCreateZones,
} from './operations';

/**
 * DNS Domain API
 * 
 * Unified interface for all DNS operations.
 * Provides type-safe, performance-optimized access to Akamai Edge DNS.
 * 
 * @example
 * ```typescript
 * import { dnsOperations } from './domains/dns';
 * 
 * // List all zones
 * const zones = await dnsOperations.listZones(client, {
 *   customer: 'example'
 * });
 * 
 * // Create a new zone
 * const zone = await dnsOperations.createZone(client, {
 *   zone: 'example.com',
 *   type: 'PRIMARY',
 *   contractId: 'ctr_123',
 *   customer: 'example'
 * });
 * 
 * // Add DNS records
 * await dnsOperations.upsertRecord(client, {
 *   zone: 'example.com',
 *   name: 'www',
 *   type: 'A',
 *   ttl: 300,
 *   rdata: ['192.0.2.1'],
 *   customer: 'example'
 * });
 * ```
 */
export default {
  ...exports
};