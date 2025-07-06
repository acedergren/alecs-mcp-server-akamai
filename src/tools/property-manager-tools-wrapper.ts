/**
 * Property Manager Tools - Backwards Compatibility Wrapper
 * 
 * This file provides backwards compatibility for all imports from property-manager-tools.ts
 * while delegating to the new consolidated property domain.
 */

export {
  createPropertyVersion,
  getPropertyVersion,
  listPropertyVersions,
  getPropertyRules,
  updatePropertyRules,
  activateProperty,
  getActivationStatus,
  listPropertyActivations,
  cancelPropertyActivation,
} from '../domains/property/compatibility';

// Re-export types if any were exported from original file
export type { PropertyVersion, PropertyRules, PropertyActivation } from '../domains/property/types';