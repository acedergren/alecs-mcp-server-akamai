/**
 * GTM Domain - Index
 * 
 * Unified GTM operations export for registry auto-discovery
 * 
 * ARCHITECTURE NOTES:
 * - Uses standard domain pattern matching other domains
 * - Single export point to prevent circular imports
 * - Consolidates all GTM operations into one registry
 */

import { gtmOperations } from './gtm';

export { gtmOperations };