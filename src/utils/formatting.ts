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
  showRaw = false,
): string {
  if (!contractId) {
    return 'Unknown';
  }

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
  contractMap?: Record<string, string>,
): string {
  if (!contractIds || contractIds.length === 0) {
    return 'None';
  }

  return contractIds.map((id) => formatContractDisplay(id, contractMap?.[id])).join(', ');
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
  showRaw = false,
): string {
  if (!groupId) {
    return 'Unknown';
  }

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
  propertyName?: string,
): string {
  if (!propertyId) {
    return 'Unknown';
  }

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
export function formatCPCodeDisplay(cpcodeId: string | undefined, cpcodeName?: string): string {
  if (!cpcodeId) {
    return 'Unknown';
  }

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
  if (!identifier) {
    return identifier;
  }
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
  if (!contractType) {
    return undefined;
  }

  // Common contract type mappings
  const typeMap: Record<string, string> = {
    AKAMAI_INTERNAL: 'Internal',
    DIRECT_CUSTOMER: 'Direct',
    INDIRECT_CUSTOMER: 'Indirect',
    PARENT_CUSTOMER: 'Parent',
    OTHER: 'Other',
  };

  return (
    typeMap[contractType] ||
    contractType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * Format an edge hostname ID for user-friendly display
 * @param edgeHostnameId - The raw edge hostname ID (e.g., 'ehn_12345')
 * @param edgeHostnameDomain - Optional edge hostname domain
 * @param showRaw - Whether to show the raw ID
 * @returns Formatted edge hostname display string
 */
export function formatEdgeHostnameDisplay(
  edgeHostnameId: string | undefined,
  edgeHostnameDomain?: string,
  showRaw = true,
): string {
  if (!edgeHostnameId) {
    return 'Unknown';
  }

  // Remove the 'ehn_' prefix for cleaner display
  const cleanId = edgeHostnameId.replace(/^ehn_/, '');

  if (edgeHostnameDomain) {
    return showRaw ? `${edgeHostnameDomain} (${edgeHostnameId})` : edgeHostnameDomain;
  }

  return showRaw ? `Edge Hostname ${cleanId} (${edgeHostnameId})` : `Edge Hostname ${cleanId}`;
}

/**
 * Format an activation ID for user-friendly display
 * @param activationId - The activation ID
 * @param propertyName - Optional property name
 * @param network - Optional network (STAGING/PRODUCTION)
 * @param status - Optional activation status
 * @returns Formatted activation display string
 */
export function formatActivationDisplay(
  activationId: string | undefined,
  propertyName?: string,
  network?: string,
  status?: string,
): string {
  if (!activationId) {
    return 'Unknown';
  }

  const parts = [];
  
  if (propertyName) {
    parts.push(propertyName);
  }
  
  if (network) {
    parts.push(network.toLowerCase());
  }
  
  if (status) {
    parts.push(status.toLowerCase());
  }
  
  const description = parts.length > 0 ? parts.join(' ') : 'activation';
  return `${description} (${activationId})`;
}

/**
 * Format a network list ID for user-friendly display
 * @param networkListId - The raw network list ID (e.g., 'nkl_12345')
 * @param networkListName - Optional network list name
 * @param showRaw - Whether to show the raw ID
 * @returns Formatted network list display string
 */
export function formatNetworkListDisplay(
  networkListId: string | undefined,
  networkListName?: string,
  showRaw = true,
): string {
  if (!networkListId) {
    return 'Unknown';
  }

  // Remove the 'nkl_' prefix for cleaner display
  const cleanId = networkListId.replace(/^nkl_/, '');

  if (networkListName) {
    return showRaw ? `${networkListName} (${networkListId})` : networkListName;
  }

  return showRaw ? `Network List ${cleanId} (${networkListId})` : `Network List ${cleanId}`;
}

/**
 * Format an AppSec configuration ID for user-friendly display
 * @param configId - The configuration ID
 * @param configName - Optional configuration name
 * @param showRaw - Whether to show the raw ID
 * @returns Formatted configuration display string
 */
export function formatAppSecConfigDisplay(
  configId: string | undefined,
  configName?: string,
  showRaw = true,
): string {
  if (!configId) {
    return 'Unknown';
  }

  if (configName) {
    return showRaw ? `${configName} (${configId})` : configName;
  }

  return showRaw ? `Security Config ${configId}` : `Security Config ${configId}`;
}

/**
 * Format JSON data for display
 * @param data - The data to format
 * @param indent - Number of spaces for indentation (default: 2)
 * @returns Formatted JSON string
 */
export function formatJson(data: unknown, indent = 2): string {
  return JSON.stringify(data, null, indent);
}

/**
 * Format data as a simple table
 * @param data - Array of objects to format as table
 * @param columns - Optional column configuration
 * @returns Formatted table string
 */
export function formatTable(data: unknown[], columns?: Array<{ key: string; header: string }>): string {
  if (!data || data.length === 0) {
    return 'No data';
  }

  // If no columns specified, use all keys from first item
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0] as Record<string, unknown>);
  const headers = columns ? columns.map((c) => c.header) : keys;

  // Build simple table
  const rows = [
    headers.join(' | '),
    headers.map((h) => '-'.repeat(h.length)).join('-|-'),
    ...data.map((item) => keys.map((key) => String((item as any)[key] || '')).join(' | ')),
  ];

  return rows.join('\n');
}
