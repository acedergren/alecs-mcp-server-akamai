/**
 * Akamai Hostname Routing Mappings Utility
 * 
 * Extracted from AkamaiOperation for better maintainability
 * Contains hostname routing patterns for cross-service operations
 */

/**
 * Hostname routing mapping configuration
 */
export interface HostnameRoutingMapping {
  /** JSON path to the hostname field (supports wildcards) */
  path: string;
  /** Whether to include context from related services */
  includeContext: boolean;
  /** Optional transformation function for the hostname */
  transform?: (hostname: string) => string;
}

/**
 * Common hostname routing patterns for cross-service operations
 * These patterns help identify hostnames in responses for intelligent routing
 */
export const COMMON_HOSTNAME_PATTERNS: Record<string, HostnameRoutingMapping[]> = {
  property: [
    { path: 'hostname', includeContext: true },
    { path: '*.hostname', includeContext: true },
    { path: 'hostnames.*', includeContext: true },
    { path: 'items.*.hostname', includeContext: true },
    { path: 'edgeHostname', includeContext: true },
    { path: '*.edgeHostname', includeContext: true },
  ],
  dns: [
    { path: 'name', includeContext: true },
    { path: '*.name', includeContext: true },
    { path: 'records.*.name', includeContext: true },
    { path: 'hostname', includeContext: true },
    { path: '*.hostname', includeContext: true },
  ],
  certificate: [
    { path: 'csr.cn', includeContext: true },
    { path: '*.sans.*', includeContext: true },
    { path: 'domains.*', includeContext: true },
    { path: 'certificateHostnames.*', includeContext: true },
  ],
  purge: [
    { path: 'hostname', includeContext: true },
    { path: '*.hostname', includeContext: true },
    { path: 'urls.*.hostname', includeContext: false }, // URL parsing needed
  ],
  reporting: [
    { path: 'hostname', includeContext: true },
    { path: '*.hostname', includeContext: true },
    { path: 'filters.hostname', includeContext: true },
  ],
  all: [
    // Combine all common hostname patterns for comprehensive routing
    { path: '**.hostname', includeContext: true },
    { path: '**.edgeHostname', includeContext: true },
    { path: '**.name', includeContext: true },
    { path: '**.domains.*', includeContext: true },
  ]
};

/**
 * Get hostname routing patterns for a specific domain
 */
export function getHostnamePatterns(domain: string): HostnameRoutingMapping[] {
  return COMMON_HOSTNAME_PATTERNS[domain] || COMMON_HOSTNAME_PATTERNS.all;
}

/**
 * Get all available hostname routing domains
 */
export function getAvailableHostnameDomains(): string[] {
  return Object.keys(COMMON_HOSTNAME_PATTERNS).filter(key => key !== 'all');
}

/**
 * Extract hostnames from an object using domain-specific patterns
 */
export function extractHostnames(data: any, domain: string): string[] {
  const patterns = getHostnamePatterns(domain);
  const hostnames: Set<string> = new Set();

  // Simple implementation - can be enhanced with path traversal
  for (const pattern of patterns) {
    const matches = extractValuesByPath(data, pattern.path);
    matches.forEach(value => {
      if (typeof value === 'string' && isValidHostname(value)) {
        hostnames.add(pattern.transform ? pattern.transform(value) : value);
      }
    });
  }

  return Array.from(hostnames);
}

/**
 * Simple path-based value extraction (supports basic wildcards)
 */
function extractValuesByPath(obj: any, path: string): any[] {
  const values: any[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return values;
  }

  const parts = path.split('.');
  
  function traverse(current: any, pathIndex: number): void {
    if (pathIndex >= parts.length) {
      values.push(current);
      return;
    }

    const part = parts[pathIndex];
    
    if (part === '*') {
      // Wildcard - traverse all properties
      if (Array.isArray(current)) {
        current.forEach(item => traverse(item, pathIndex + 1));
      } else if (current && typeof current === 'object') {
        Object.values(current).forEach(value => traverse(value, pathIndex + 1));
      }
    } else if (part === '**') {
      // Deep wildcard - traverse all nested objects
      traverseDeep(current, parts.slice(pathIndex + 1).join('.'));
    } else {
      // Exact property match
      if (current && current[part] !== undefined) {
        traverse(current[part], pathIndex + 1);
      }
    }
  }

  function traverseDeep(obj: any, remainingPath: string): void {
    if (!obj || typeof obj !== 'object') return;
    
    // Try current level
    const directMatches = extractValuesByPath(obj, remainingPath);
    values.push(...directMatches);
    
    // Recurse into nested objects
    Object.values(obj).forEach(value => {
      if (value && typeof value === 'object') {
        traverseDeep(value, remainingPath);
      }
    });
  }

  traverse(obj, 0);
  return values;
}

/**
 * Basic hostname validation
 */
function isValidHostname(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Basic hostname pattern check
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnamePattern.test(value) && value.length <= 253;
}