/**
 * Property Manager Advanced Tools - Backwards Compatibility Wrapper
 * 
 * This file provides backwards compatibility for all imports from property-manager-advanced-tools.ts
 * while delegating to the new consolidated property domain.
 */

export {
  listPropertyVersions,
  getPropertyVersion,
  removeProperty,
  cancelPropertyActivation,
} from '../domains/property/compatibility';

// These functions need to be implemented in the consolidated module in future phases
export async function listPropertyVersionHostnames(
  client: any,
  propertyId: string,
  version: number,
  customer?: string
): Promise<any> {
  // TODO: Implement in property domain
  throw new Error('listPropertyVersionHostnames not yet migrated to consolidated API');
}

export async function listEdgeHostnames(
  client: any,
  contractId?: string,
  groupId?: string,
  customer?: string
): Promise<any> {
  // TODO: Implement in property domain
  throw new Error('listEdgeHostnames not yet migrated to consolidated API');
}

export async function cloneProperty(
  client: any,
  sourcePropertyId: string,
  version: number,
  cloneName: string,
  contractId?: string,
  groupId?: string,
  customer?: string
): Promise<any> {
  // TODO: Implement in property domain
  throw new Error('cloneProperty not yet migrated to consolidated API');
}

export async function getLatestPropertyVersion(
  client: any,
  propertyId: string,
  contractId?: string,
  groupId?: string,
  customer?: string
): Promise<any> {
  // TODO: Implement in property domain
  throw new Error('getLatestPropertyVersion not yet migrated to consolidated API');
}