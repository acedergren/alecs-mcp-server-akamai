import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

// API Parameter Schemas based on Akamai documentation
const AkamaiAPISchemas = {
  // Property Manager API
  'property.list': {
    query: z.object({
      contractId: z.string().optional(),
      groupId: z.string().optional(),
    }),
    required: [],
  },
  'property.get': {
    path: z.object({
      propertyId: z.string().regex(/^prp_\d+$/),
    }),
    query: z.object({
      contractId: z.string().regex(/^ctr_/),
      groupId: z.string().regex(/^grp_/),
    }),
    required: ['propertyId', 'contractId', 'groupId'],
  },
  'property.create': {
    query: z.object({
      contractId: z.string().regex(/^ctr_/),
      groupId: z.string().regex(/^grp_/),
    }),
    body: z.object({
      propertyName: z.string().min(1),
      productId: z.string().regex(/^prd_/),
      ruleFormat: z.string().optional().default('latest'),
    }),
    required: ['contractId', 'groupId', 'propertyName', 'productId'],
  },
  'property.activate': {
    path: z.object({
      propertyId: z.string().regex(/^prp_\d+$/),
    }),
    body: z.object({
      propertyVersion: z.number().int().positive(),
      network: z.enum(['STAGING', 'PRODUCTION']),
      activationType: z.enum(['ACTIVATE', 'DEACTIVATE']).default('ACTIVATE'),
      notifyEmails: z.array(z.string().email()),
      acknowledgeWarnings: z.array(z.string()).optional(),
      complianceRecord: z.object({
        nonComplianceReason: z.string().optional(),
      }).optional(),
    }),
    required: ['propertyId', 'propertyVersion', 'network', 'notifyEmails'],
  },
  // DNS API
  'dns.zone.create': {
    body: z.object({
      zone: z.string().regex(/^[a-z0-9.-]+$/i),
      type: z.enum(['PRIMARY', 'SECONDARY', 'ALIAS']).default('PRIMARY'),
      comment: z.string().optional(),
      signAndServe: z.boolean().optional().default(false),
      contractId: z.string().optional(),
      masters: z.array(z.string()).optional(),
    }),
    required: ['zone', 'type'],
  },
  'dns.record.create': {
    path: z.object({
      zone: z.string(),
      name: z.string(),
      type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'SOA', 'CAA']),
    }),
    body: z.object({
      name: z.string(),
      type: z.string(),
      ttl: z.number().int().min(0).default(300),
      rdata: z.array(z.string()).min(1),
    }),
    required: ['zone', 'name', 'type', 'rdata'],
  },
  // Certificate API
  'certs.enrollment.create': {
    body: z.object({
      csr: z.object({
        cn: z.string(),
        c: z.string().length(2),
        st: z.string(),
        l: z.string(),
        o: z.string(),
        ou: z.string().optional(),
        sans: z.array(z.string()).optional(),
      }),
      validationType: z.enum(['dv', 'ev', 'ov']).default('dv'),
      certificateType: z.enum(['san', 'single', 'wildcard']).default('san'),
      networkConfiguration: z.object({
        geography: z.enum(['core', 'china', 'russia']).default('core'),
        secureNetwork: z.enum(['standard-tls', 'enhanced-tls']).default('enhanced-tls'),
        mustHaveCiphers: z.string().default('ak-akamai-default'),
        preferredCiphers: z.string().optional(),
        disallowedTlsVersions: z.array(z.string()).optional(),
      }),
      signatureAlgorithm: z.enum(['SHA-256', 'SHA-384', 'SHA-512']).default('SHA-256'),
      techContact: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
      }),
      adminContact: z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
      }),
      org: z.object({
        name: z.string(),
        addressLineOne: z.string(),
        city: z.string(),
        region: z.string(),
        postalCode: z.string(),
        country: z.string().length(2),
        phone: z.string(),
      }),
    }),
    required: ['csr', 'validationType', 'techContact', 'adminContact', 'org'],
  },
  // Security API
  'security.config.create': {
    body: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      contractId: z.string().regex(/^[A-Z0-9-]+$/),
      groupId: z.number().int().positive(),
      hostnames: z.array(z.string()).min(1),
      notes: z.string().optional(),
    }),
    required: ['name', 'contractId', 'groupId', 'hostnames'],
  },
  // Purge API
  'purge.cache.invalidate.url': {
    path: z.object({
      network: z.enum(['staging', 'production']),
    }),
    body: z.object({
      objects: z.array(z.string().url()).min(1).max(5000),
    }),
    required: ['network', 'objects'],
  },
};

// MCP to API parameter mapping tests
describe('Parameter Mapping Validation', () => {
  let mcpFunctions: Map<string, any> = new Map();

  beforeAll(async () => {
    // Load MCP function definitions from the codebase
    const serverFiles = [
      'property-server.ts',
      'dns-server.ts',
      'certs-server.ts',
      'security-server.ts',
      'reporting-server.ts',
    ];

    for (const file of serverFiles) {
      const filePath = path.join(__dirname, '../../src/servers', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Extract tool definitions
        const toolMatches = content.matchAll(/name:\s*["']([^"']+)["'][\s\S]*?inputSchema:\s*({[\s\S]*?})\s*,/g);
        for (const match of toolMatches) {
          const [, name, schema] = match;
          try {
            // Parse the schema (simplified - in real implementation would use proper parser)
            mcpFunctions.set(name, { schema });
          } catch (e) {
            // Skip invalid schemas
          }
        }
      }
    }
  });

  describe('Required Parameters', () => {
    it('should include all required API parameters in MCP functions', () => {
      const missingParams: string[] = [];

      for (const [apiFunction, apiSchema] of Object.entries(AkamaiAPISchemas)) {
        const required = apiSchema.required || [];
        const mcpFunction = mcpFunctions.get(apiFunction);

        if (!mcpFunction) {
          missingParams.push(`${apiFunction}: MCP function not found`);
          continue;
        }

        for (const param of required) {
          // Check if parameter exists in MCP schema
          if (!mcpFunction.schema.includes(param)) {
            missingParams.push(`${apiFunction}: Missing required parameter '${param}'`);
          }
        }
      }

      expect(missingParams).toEqual([]);
    });
  });

  describe('Parameter Types', () => {
    it('should use correct parameter types matching API expectations', () => {
      const typeErrors: string[] = [];

      // Test specific type mappings
      const typeTests = [
        { function: 'property.activate', param: 'network', expectedType: 'enum', values: ['STAGING', 'PRODUCTION'] },
        { function: 'property.activate', param: 'propertyVersion', expectedType: 'number' },
        { function: 'dns.record.create', param: 'ttl', expectedType: 'number' },
        { function: 'dns.record.create', param: 'rdata', expectedType: 'array' },
        { function: 'certs.enrollment.create', param: 'validationType', expectedType: 'enum', values: ['dv', 'ev', 'ov'] },
      ];

      for (const test of typeTests) {
        const mcpFunction = mcpFunctions.get(test.function);
        if (!mcpFunction) continue;

        // Verify type in schema (simplified check)
        if (test.expectedType === 'enum' && test.values) {
          const hasEnum = test.values.every(v => mcpFunction.schema.includes(v));
          if (!hasEnum) {
            typeErrors.push(`${test.function}.${test.param}: Missing enum values ${test.values.join(', ')}`);
          }
        }
      }

      expect(typeErrors).toEqual([]);
    });
  });

  describe('Parameter Names and Casing', () => {
    it('should use correct parameter names and casing as per API specs', () => {
      const namingErrors: string[] = [];

      // Check common naming patterns
      const namingTests = [
        { param: 'propertyId', pattern: /^propertyId$/, notPattern: /property_id|PropertyId/ },
        { param: 'contractId', pattern: /^contractId$/, notPattern: /contract_id|ContractId/ },
        { param: 'groupId', pattern: /^groupId$/, notPattern: /group_id|GroupId/ },
        { param: 'cpCode', pattern: /^cpCode$/, notPattern: /cp_code|CPCode/ },
      ];

      for (const [name, func] of mcpFunctions) {
        for (const test of namingTests) {
          if (func.schema.includes(test.param)) {
            // Check if it uses the correct casing
            if (test.notPattern && test.notPattern.test(func.schema)) {
              namingErrors.push(`${name}: Incorrect casing for '${test.param}'`);
            }
          }
        }
      }

      expect(namingErrors).toEqual([]);
    });
  });

  describe('Authentication Headers', () => {
    it('should include authentication parameters for all API calls', () => {
      const authErrors: string[] = [];

      // All functions should have a 'customer' parameter for auth
      for (const [name, func] of mcpFunctions) {
        if (!func.schema.includes('customer')) {
          authErrors.push(`${name}: Missing 'customer' parameter for authentication`);
        }
      }

      expect(authErrors).toEqual([]);
    });
  });

  describe('Request Body Structure', () => {
    it('should match API request body structure', () => {
      const structureErrors: string[] = [];

      // Test specific body structures
      const bodyTests = [
        {
          function: 'property.activate',
          requiredFields: ['propertyVersion', 'network', 'notifyEmails'],
        },
        {
          function: 'dns.zone.create',
          requiredFields: ['zone', 'type'],
        },
        {
          function: 'certs.enrollment.create',
          requiredFields: ['csr', 'validationType', 'techContact', 'adminContact', 'org'],
        },
      ];

      for (const test of bodyTests) {
        const mcpFunction = mcpFunctions.get(test.function);
        if (!mcpFunction) continue;

        for (const field of test.requiredFields) {
          if (!mcpFunction.schema.includes(field)) {
            structureErrors.push(`${test.function}: Missing required body field '${field}'`);
          }
        }
      }

      expect(structureErrors).toEqual([]);
    });
  });

  describe('Optional Parameters with Defaults', () => {
    it('should handle optional parameters with correct defaults', () => {
      const defaultTests = [
        { function: 'property.create', param: 'ruleFormat', default: 'latest' },
        { function: 'dns.zone.create', param: 'type', default: 'PRIMARY' },
        { function: 'dns.record.create', param: 'ttl', default: 300 },
        { function: 'certs.enrollment.create', param: 'validationType', default: 'dv' },
      ];

      const defaultErrors: string[] = [];

      for (const test of defaultTests) {
        const mcpFunction = mcpFunctions.get(test.function);
        if (!mcpFunction) continue;

        // Check if default is mentioned in schema
        if (!mcpFunction.schema.includes(`${test.default}`)) {
          defaultErrors.push(`${test.function}.${test.param}: Missing default value '${test.default}'`);
        }
      }

      expect(defaultErrors).toEqual([]);
    });
  });
});

// Validation helper to check if MCP parameters map correctly to API parameters
export function validateParameterMapping(
  mcpFunctionName: string,
  mcpParams: Record<string, any>,
  apiEndpoint: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const apiSchema = AkamaiAPISchemas[mcpFunctionName];

  if (!apiSchema) {
    return { valid: false, errors: [`No API schema found for ${mcpFunctionName}`] };
  }

  // Validate required parameters
  const required = apiSchema.required || [];
  for (const param of required) {
    if (!(param in mcpParams)) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Validate parameter types
  if (apiSchema.body) {
    try {
      apiSchema.body.parse(mcpParams);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.push(...e.errors.map(err => `${err.path.join('.')}: ${err.message}`));
      }
    }
  }

  return { valid: errors.length === 0, errors };
}