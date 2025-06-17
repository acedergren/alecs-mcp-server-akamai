/**
 * Property-based testing generators using fast-check
 * Provides arbitrary value generators for comprehensive testing
 */

import * as fc from 'fast-check';
import { 
  Property, 
  PropertyVersion, 
  DnsZone, 
  DnsRecord,
  NetworkEnvironment 
} from '../../../src/types';

/**
 * Generate valid Akamai property ID
 */
export const propertyIdArb = fc.string({ minLength: 6, maxLength: 6 })
  .map(s => `prp_${s.replace(/[^0-9]/g, '1')}`);

/**
 * Generate valid contract ID
 */
export const contractIdArb = fc.integer({ min: 1000000, max: 9999999 })
  .map(n => `ctr_C-${n}`);

/**
 * Generate valid group ID
 */
export const groupIdArb = fc.integer({ min: 10000, max: 99999 })
  .map(n => `grp_${n}`);

/**
 * Generate valid product ID
 */
export const productIdArb = fc.constantFrom(
  'prd_Web_Accel',
  'prd_Ion',
  'prd_Dynamic_Site_Accelerator',
  'prd_Download_Delivery',
  'prd_Rich_Media_Accel'
);

/**
 * Generate valid hostname
 */
export const hostnameArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
  fc.constantFrom('com', 'net', 'org', 'io', 'dev')
).map(([subdomain, tld]) => `${subdomain}.example.${tld}`);

/**
 * Generate valid email
 */
export const emailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z0-9]+$/.test(s)),
  fc.constantFrom('example.com', 'test.com', 'akamai.com')
).map(([user, domain]) => `${user}@${domain}`);

/**
 * Generate network environment
 */
export const networkEnvironmentArb = fc.constantFrom<NetworkEnvironment>(
  NetworkEnvironment.STAGING,
  NetworkEnvironment.PRODUCTION
);

/**
 * Generate property status
 */
export const propertyStatusArb = fc.constantFrom(
  'ACTIVE',
  'INACTIVE',
  'PENDING'
);

/**
 * Generate activation status
 */
export const activationStatusArb = fc.constantFrom(
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'ZONE_1',
  'ZONE_2',
  'ZONE_3',
  'ABORTED',
  'FAILED',
  'DEACTIVATED'
);

/**
 * Generate DNS record type
 */
export const dnsRecordTypeArb = fc.constantFrom(
  'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV', 'CAA'
);

/**
 * Generate IP address
 */
export const ipAddressArb = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 1, max: 255 })
).map(octets => octets.join('.'));

/**
 * Generate IPv6 address
 */
export const ipv6AddressArb = fc.array(
  fc.integer({ min: 0, max: 65535 }).map(n => n.toString(16)),
  { minLength: 8, maxLength: 8 }
).map(parts => parts.join(':'));

/**
 * Generate CIDR block
 */
export const cidrBlockArb = fc.tuple(
  ipAddressArb,
  fc.integer({ min: 8, max: 32 })
).map(([ip, prefix]) => `${ip}/${prefix}`);

/**
 * Generate complete Property object
 */
export const propertyArb: fc.Arbitrary<Property> = fc.record({
  propertyId: propertyIdArb,
  propertyName: fc.string({ minLength: 1, maxLength: 50 }),
  contractId: contractIdArb,
  groupId: groupIdArb,
  productId: productIdArb,
  latestVersion: fc.integer({ min: 1, max: 100 }),
  productionVersion: fc.option(fc.integer({ min: 1, max: 100 })),
  stagingVersion: fc.option(fc.integer({ min: 1, max: 100 })),
  hostnames: fc.array(hostnameArb, { minLength: 1, maxLength: 5 }),
  createdDate: fc.date().map(d => d.toISOString()),
  modifiedDate: fc.date().map(d => d.toISOString()),
});

/**
 * Generate PropertyVersion object
 */
export const propertyVersionArb: fc.Arbitrary<PropertyVersion> = fc.record({
  propertyId: propertyIdArb,
  version: fc.integer({ min: 1, max: 100 }),
  note: fc.option(fc.string({ maxLength: 200 })),
  productId: productIdArb,
  productionStatus: propertyStatusArb as fc.Arbitrary<'ACTIVE' | 'INACTIVE' | 'PENDING'>,
  stagingStatus: propertyStatusArb as fc.Arbitrary<'ACTIVE' | 'INACTIVE' | 'PENDING'>,
  ruleFormat: fc.constantFrom('v2023-01-05', 'v2023-05-30', 'v2023-10-30'),
  createdByUser: emailArb,
  createdDate: fc.date().map(d => d.toISOString()),
});

/**
 * Generate DnsZone object
 */
export const dnsZoneArb: fc.Arbitrary<DnsZone> = fc.record({
  zone: hostnameArb,
  type: fc.constantFrom('PRIMARY', 'SECONDARY', 'ALIAS') as fc.Arbitrary<'PRIMARY' | 'SECONDARY' | 'ALIAS'>,
  contractId: contractIdArb,
  comment: fc.option(fc.string({ maxLength: 100 })),
  signAndServe: fc.boolean(),
  signAndServeAlgorithm: fc.option(fc.constantFrom('RSA_SHA256', 'RSA_SHA512')),
  activationState: fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING') as fc.Arbitrary<'ACTIVE' | 'INACTIVE' | 'PENDING'>,
  lastActivationDate: fc.option(fc.date().map(d => d.toISOString())),
  lastModifiedDate: fc.option(fc.date().map(d => d.toISOString())),
  versionId: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
});

/**
 * Generate DnsRecord object
 */
export const dnsRecordArb: fc.Arbitrary<DnsRecord> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 63 }).filter(s => /^[a-z0-9-]+$/.test(s)),
  type: dnsRecordTypeArb as fc.Arbitrary<DnsRecord['type']>,
  ttl: fc.integer({ min: 60, max: 86400 }),
  rdata: fc.array(fc.string({ minLength: 1, maxLength: 255 }), { minLength: 1, maxLength: 10 }),
  active: fc.option(fc.boolean()),
});

/**
 * Generate customer name
 */
export const customerNameArb = fc.string({ minLength: 3, maxLength: 20 })
  .filter(s => /^[a-z0-9-]+$/.test(s));

/**
 * Generate MCP tool parameters
 */
export const mcpParamsArb = <T extends Record<string, unknown>>(
  schema: Record<keyof T, fc.Arbitrary<any>>
): fc.Arbitrary<T> => {
  return fc.record(schema) as fc.Arbitrary<T>;
};

/**
 * Shrinkable arbitrary for better error messages
 */
export const shrinkableStringArb = (minLength: number = 1, maxLength: number = 100) =>
  fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0);

/**
 * Generate edge cases for testing
 */
export const edgeCaseGenerators = {
  // Empty values
  emptyString: fc.constant(''),
  nullValue: fc.constant(null),
  undefinedValue: fc.constant(undefined),
  
  // Boundary values
  maxInt: fc.constant(Number.MAX_SAFE_INTEGER),
  minInt: fc.constant(Number.MIN_SAFE_INTEGER),
  zero: fc.constant(0),
  negativeOne: fc.constant(-1),
  
  // Special strings
  specialChars: fc.constant('!@#$%^&*()_+-=[]{}|;:,.<>?'),
  unicode: fc.constant('🎉🔥💻🚀'),
  sqlInjection: fc.constant("'; DROP TABLE users; --"),
  xss: fc.constant('<script>alert("XSS")</script>'),
  
  // Large values
  largeString: fc.string({ minLength: 10000, maxLength: 10000 }),
  largeArray: fc.array(fc.anything(), { minLength: 1000, maxLength: 1000 }),
  
  // Invalid formats
  invalidEmail: fc.constant('not-an-email'),
  invalidUrl: fc.constant('not-a-url'),
  invalidJson: fc.constant('{ invalid json }'),
};

/**
 * Composite generators for complex scenarios
 */
export const scenarioGenerators = {
  // Valid property creation scenario
  validPropertyCreation: fc.record({
    propertyName: shrinkableStringArb(1, 50),
    productId: productIdArb,
    contractId: contractIdArb,
    groupId: groupIdArb,
    customer: fc.option(customerNameArb),
  }),
  
  // Valid DNS record creation
  validDnsRecordCreation: fc.record({
    zone: hostnameArb,
    name: shrinkableStringArb(1, 63).filter(s => /^[a-z0-9-]+$/.test(s)),
    type: dnsRecordTypeArb,
    ttl: fc.integer({ min: 60, max: 86400 }),
    rdata: fc.array(fc.string({ minLength: 1, maxLength: 255 }), { minLength: 1, maxLength: 10 }),
    customer: fc.option(customerNameArb),
  }),
  
  // Property activation scenario
  propertyActivation: fc.record({
    propertyId: propertyIdArb,
    version: fc.integer({ min: 1, max: 100 }),
    network: networkEnvironmentArb,
    emails: fc.array(emailArb, { minLength: 0, maxLength: 10 }),
    note: fc.option(fc.string({ maxLength: 500 })),
    customer: fc.option(customerNameArb),
  }),
};