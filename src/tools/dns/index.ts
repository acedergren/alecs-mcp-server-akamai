/**
 * DNS Domain - Index
 * 
 * Unified DNS operations export for registry auto-discovery
 * 
 * ARCHITECTURE NOTES:
 * - Uses standard domain pattern matching other domains
 * - Single export point to prevent circular imports
 * - Consolidates all DNS operations into one registry
 */

import { dnsOperations } from './dns';

export { dnsOperations };