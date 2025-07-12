/**
 * Property Domain - Index
 * 
 * Unified property operations export for registry auto-discovery
 * 
 * ARCHITECTURE NOTES:
 * - Uses standard domain pattern matching other domains
 * - Single export point to prevent circular imports
 * - Consolidates all property operations into one registry
 */

import { propertyOperations } from './properties';

export { propertyOperations };