/**
 * Property Tools - Backwards Compatibility Wrapper
 * 
 * This file provides backwards compatibility for all imports from property-tools.ts
 * while delegating to the new consolidated property domain.
 * 
 * All functions maintain their original signatures but now use the
 * performance-optimized consolidated implementation.
 */

export {
  listProperties,
  getProperty,
  createProperty,
  removeProperty,
  listContracts,
  listGroups,
  listProducts,
} from '../domains/property/compatibility';

// Re-export types if any were exported from original file
export type { Property } from '../domains/property/types';