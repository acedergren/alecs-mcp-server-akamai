/**
 * Formatting utilities for improving user-facing displays
 */

/**
 * Format a contract ID for user-friendly display
 * @param contractId - The raw contract ID (e.g., 'ctr_C-1234567')
 * @param contractName - Optional contract name
 * @param showRaw - Whether to show the raw ID in parentheses
 * @returns Formatted contract display string
 */
export function formatContractDisplay(
  contractId: string | undefined,
  contractName?: string,
  showRaw: boolean = false
): string {
  if (!contractId) return 'Unknown';
  
  // Remove the 'ctr_' prefix for cleaner display
  const cleanId = contractId.replace(/^ctr_/, '');
  
  if (contractName) {
    // If we have a name, show it prominently
    return showRaw ? `${contractName} (${contractId})` : contractName;
  }
  
  // For contract IDs without names, show the clean version
  return showRaw ? `Contract ${cleanId} (${contractId})` : `Contract ${cleanId}`;
}

/**
 * Format multiple contract IDs for display
 * @param contractIds - Array of contract IDs
 * @param contractMap - Optional map of contract IDs to names
 * @returns Formatted display string
 */
export function formatContractList(
  contractIds: string[] | undefined,
  contractMap?: Record<string, string>
): string {
  if (!contractIds || contractIds.length === 0) return 'None';
  
  return contractIds.map(id => 
    formatContractDisplay(id, contractMap?.[id])
  ).join(', ');
}

/**
 * Format a group ID for user-friendly display
 * @param groupId - The raw group ID (e.g., 'grp_12345')
 * @param groupName - Optional group name
 * @param showRaw - Whether to show the raw ID
 * @returns Formatted group display string
 */
export function formatGroupDisplay(
  groupId: string | undefined,
  groupName?: string,
  showRaw: boolean = false
): string {
  if (!groupId) return 'Unknown';
  
  // Remove the 'grp_' prefix for cleaner display
  const cleanId = groupId.replace(/^grp_/, '');
  
  if (groupName) {
    return showRaw ? `${groupName} (${groupId})` : groupName;
  }
  
  return showRaw ? `Group ${cleanId} (${groupId})` : `Group ${cleanId}`;
}

/**
 * Format a property ID for user-friendly display
 * @param propertyId - The raw property ID (e.g., 'prp_12345')
 * @param propertyName - Optional property name
 * @returns Formatted property display string
 */
export function formatPropertyDisplay(
  propertyId: string | undefined,
  propertyName?: string
): string {
  if (!propertyId) return 'Unknown';
  
  // Remove the 'prp_' prefix for cleaner display
  const cleanId = propertyId.replace(/^prp_/, '');
  
  if (propertyName) {
    return `${propertyName} (${cleanId})`;
  }
  
  return `Property ${cleanId}`;
}

/**
 * Format a CP Code ID for user-friendly display
 * @param cpcodeId - The raw CP Code ID (e.g., 'cpc_12345')
 * @param cpcodeName - Optional CP Code name
 * @returns Formatted CP Code display string
 */
export function formatCPCodeDisplay(
  cpcodeId: string | undefined,
  cpcodeName?: string
): string {
  if (!cpcodeId) return 'Unknown';
  
  // Remove the 'cpc_' prefix - CP Codes are commonly referred by number only
  const cleanId = cpcodeId.replace(/^cpc_/, '');
  
  if (cpcodeName) {
    return `${cpcodeName} (${cleanId})`;
  }
  
  return cleanId; // CP Codes are typically just shown as numbers
}

/**
 * Parse a user-provided identifier and add the appropriate prefix if missing
 * @param identifier - User provided identifier
 * @param expectedPrefix - Expected prefix (e.g., 'ctr_', 'grp_', 'prp_')
 * @returns Properly formatted identifier
 */
export function ensurePrefix(identifier: string, expectedPrefix: string): string {
  if (!identifier) return identifier;
  if (identifier.startsWith(expectedPrefix)) {
    return identifier;
  }
  return `${expectedPrefix}${identifier}`;
}

/**
 * Extract contract name from contract type or description
 * Common patterns: "AKAMAI_INTERNAL", "DIRECT_CUSTOMER", etc.
 */
export function extractContractName(contractType?: string): string | undefined {
  if (!contractType) return undefined;
  
  // Common contract type mappings
  const typeMap: Record<string, string> = {
    'AKAMAI_INTERNAL': 'Internal',
    'DIRECT_CUSTOMER': 'Direct',
    'INDIRECT_CUSTOMER': 'Indirect',
    'PARENT_CUSTOMER': 'Parent',
    'OTHER': 'Other'
  };
  
  return typeMap[contractType] || contractType.replace(/_/g, ' ').toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
}