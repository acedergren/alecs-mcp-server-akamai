/**
 * Diagnostics Domain - Index
 * 
 * Unified diagnostics operations export for registry auto-discovery
 * 
 * ARCHITECTURE NOTES:
 * - Uses standard domain pattern matching other domains
 * - Single export point to prevent circular imports
 * - Consolidates all diagnostics operations into one registry
 */

import { diagnosticsOperations } from './diagnostics';

export { diagnosticsOperations };