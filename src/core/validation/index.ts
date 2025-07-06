/**
 * Consolidated Validation Module - CODE KAI Implementation
 * 
 * KEY: Single source of truth for all validation logic
 * APPROACH: Type-safe validators with clear error messages
 * IMPLEMENTATION: Zero dependencies, performance optimized
 * 
 * This module consolidates duplicate validation functions found across:
 * - property-tools.ts (isValidHostname)
 * - network-lists-tools.ts (validateIPAddress, validateGeoCode, validateASN)
 * - dns-tools.ts (isValidHostname - duplicate!)
 * - Multiple other files with same validators
 */

/**
 * Hostname validation following RFC 1123
 * Used by: property, dns, certificates domains
 */
export function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) {
    return false;
  }
  
  // Check for valid characters and format
  const hostnameRegex = /^(?!-)(?!.*--)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*$/;
  const wildcardRegex = /^\*(\.[a-zA-Z0-9-]{1,63}(?<!-))+$/;
  
  return hostnameRegex.test(hostname) || wildcardRegex.test(hostname);
}

/**
 * IP address validation (IPv4 and IPv6)
 * Used by: network-lists, dns, security domains
 */
export function isValidIPAddress(ip: string): boolean {
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Regex.test(ip)) {
    return true;
  }
  
  // IPv6 validation (simplified)
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Regex.test(ip);
}

/**
 * CIDR notation validation
 * Used by: network-lists, security domains
 */
export function isValidCIDR(cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return false;
  }
  
  const [ip, prefix] = parts;
  const prefixNum = parseInt(prefix, 10);
  
  // Check if IP is valid
  if (!isValidIPAddress(ip)) {
    return false;
  }
  
  // Check prefix range
  const isIPv4 = ip.includes('.');
  const maxPrefix = isIPv4 ? 32 : 128;
  
  return !isNaN(prefixNum) && prefixNum >= 0 && prefixNum <= maxPrefix;
}

/**
 * Geographic code validation (ISO 3166-1 alpha-2)
 * Used by: network-lists, reporting domains
 */
export function isValidGeoCode(code: string): boolean {
  // Must be exactly 2 uppercase letters
  return /^[A-Z]{2}$/.test(code);
}

/**
 * ASN (Autonomous System Number) validation
 * Used by: network-lists, security domains
 */
export function isValidASN(asn: string | number): boolean {
  const asnNum = typeof asn === 'string' ? parseInt(asn, 10) : asn;
  return !isNaN(asnNum) && asnNum >= 1 && asnNum <= 4294967295; // Valid ASN range
}

/**
 * Email validation
 * Used by: certificates, property activation domains
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * URL validation
 * Used by: fastpurge, property rules domains
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Contract ID validation
 * Used by: all domains
 */
export function isValidContractId(contractId: string): boolean {
  return /^ctr_[A-Z0-9-]+$/i.test(contractId);
}

/**
 * Group ID validation
 * Used by: all domains
 */
export function isValidGroupId(groupId: string): boolean {
  return /^grp_\d+$/.test(groupId);
}

/**
 * Property ID validation
 * Used by: property domain
 */
export function isValidPropertyId(propertyId: string): boolean {
  return /^prp_\d+$/.test(propertyId);
}

/**
 * CP Code validation
 * Used by: property, reporting domains
 */
export function isValidCPCode(cpCode: string | number): boolean {
  const cpCodeNum = typeof cpCode === 'string' ? parseInt(cpCode, 10) : cpCode;
  return !isNaN(cpCodeNum) && cpCodeNum > 0;
}

/**
 * Cache tag validation
 * Used by: fastpurge domain
 */
export function isValidCacheTag(tag: string): boolean {
  // Cache tags must be 1-128 characters, alphanumeric plus hyphen/underscore
  return /^[a-zA-Z0-9_-]{1,128}$/.test(tag);
}

/**
 * DNS record type validation
 * Used by: dns domain
 */
export function isValidDNSRecordType(type: string): boolean {
  const validTypes = [
    'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR',
    'SOA', 'AFSDB', 'DNSKEY', 'DS', 'HINFO', 'LOC', 'NAPTR', 'RP',
    'RRSIG', 'SPF', 'SSHFP', 'TLSA'
  ];
  return validTypes.includes(type.toUpperCase());
}

/**
 * Network validation (staging/production)
 * Used by: all activation operations
 */
export function isValidNetwork(network: string): boolean {
  return ['staging', 'production', 'STAGING', 'PRODUCTION'].includes(network);
}

/**
 * Product ID validation
 * Used by: property domain
 */
export function isValidProductId(productId: string): boolean {
  return /^prd_[A-Z0-9_-]+$/i.test(productId);
}

/**
 * Edge hostname validation
 * Used by: property, certificates domains
 */
export function isValidEdgeHostname(hostname: string): boolean {
  const edgeSuffixes = [
    '.edgesuite.net',
    '.edgekey.net',
    '.akamaized.net',
    '.akamaihd.net',
    '.akamai.net'
  ];
  
  return edgeSuffixes.some(suffix => hostname.endsWith(suffix)) && 
         isValidHostname(hostname);
}

/**
 * Validation error builder for consistent error messages
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public value: unknown,
    public expected: string
  ) {
    super(`Invalid ${field}: "${value}". Expected: ${expected}`);
    this.name = 'ValidationError';
  }
}

/**
 * Batch validation helper
 */
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => boolean,
  itemName: string
): { valid: T[]; invalid: T[] } {
  const valid: T[] = [];
  const invalid: T[] = [];
  
  for (const item of items) {
    if (validator(item)) {
      valid.push(item);
    } else {
      invalid.push(item);
    }
  }
  
  return { valid, invalid };
}

/**
 * Export all validators as a single object for easy importing
 */
export const validators = {
  hostname: isValidHostname,
  ipAddress: isValidIPAddress,
  cidr: isValidCIDR,
  geoCode: isValidGeoCode,
  asn: isValidASN,
  email: isValidEmail,
  url: isValidURL,
  contractId: isValidContractId,
  groupId: isValidGroupId,
  propertyId: isValidPropertyId,
  cpCode: isValidCPCode,
  cacheTag: isValidCacheTag,
  dnsRecordType: isValidDNSRecordType,
  network: isValidNetwork,
  productId: isValidProductId,
  edgeHostname: isValidEdgeHostname,
} as const;