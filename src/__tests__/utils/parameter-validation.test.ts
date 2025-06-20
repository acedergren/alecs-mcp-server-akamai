/**
 * Comprehensive unit tests for parameter validation
 * Tests all parameter schemas, boundary conditions, and validation rules
 */

import { describe, it, expect } from '@jest/globals';

import {
  validateParameters,
  PropertyManagerSchemas,
  DNSSchemas,
  CertificateSchemas,
  FastPurgeSchemas,
  NetworkListSchemas,
  AKAMAI_ID_PATTERNS,
  ensureAkamaiIdFormat,
  formatQueryParameters,
} from '../../utils/parameter-validation';

describe('Parameter Validation Tests', () => {
  describe('Akamai ID Pattern Validation', () => {
    it('should validate property IDs correctly', () => {
      // Valid property IDs
      expect(AKAMAI_ID_PATTERNS.property.test('prp_123456')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.property.test('prp_1')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.property.test('prp_999999999')).toBe(true);

      // Invalid property IDs
      expect(AKAMAI_ID_PATTERNS.property.test('prop_123')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.property.test('prp_')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.property.test('prp_abc')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.property.test('123456')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.property.test('')).toBe(false);
    });

    it('should validate contract IDs correctly', () => {
      // Valid contract IDs
      expect(AKAMAI_ID_PATTERNS.contract.test('ctr_C-1ABC234')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.contract.test('ctr_P-2XYZ789')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.contract.test('ctr_1-ABCDEF')).toBe(true);

      // Invalid contract IDs
      expect(AKAMAI_ID_PATTERNS.contract.test('contract_123')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.contract.test('ctr_')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.contract.test('ctr_abc')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.contract.test('C-1ABC234')).toBe(false);
    });

    it('should validate group IDs correctly', () => {
      // Valid group IDs
      expect(AKAMAI_ID_PATTERNS.group.test('grp_12345')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.group.test('grp_1')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.group.test('grp_999999')).toBe(true);

      // Invalid group IDs
      expect(AKAMAI_ID_PATTERNS.group.test('group_123')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.group.test('grp_')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.group.test('grp_abc')).toBe(false);
    });

    it('should validate product IDs correctly', () => {
      // Valid product IDs
      expect(AKAMAI_ID_PATTERNS.product.test('prd_fresca')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.product.test('prd_Site_Accel')).toBe(true);
      expect(AKAMAI_ID_PATTERNS.product.test('prd_Download_Delivery')).toBe(true);

      // Invalid product IDs
      expect(AKAMAI_ID_PATTERNS.product.test('product_fresca')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.product.test('prd_')).toBe(false);
      expect(AKAMAI_ID_PATTERNS.product.test('fresca')).toBe(false);
    });
  });

  describe('ensureAkamaiIdFormat', () => {
    it('should add prefix if missing', () => {
      expect(ensureAkamaiIdFormat('123456', 'property')).toBe('prp_123456');
      expect(ensureAkamaiIdFormat('C-1ABC234', 'contract')).toBe('ctr_C-1ABC234');
      expect(ensureAkamaiIdFormat('12345', 'group')).toBe('grp_12345');
    });

    it('should not duplicate prefix if already present', () => {
      expect(ensureAkamaiIdFormat('prp_123456', 'property')).toBe('prp_123456');
      expect(ensureAkamaiIdFormat('ctr_C-1ABC234', 'contract')).toBe('ctr_C-1ABC234');
      expect(ensureAkamaiIdFormat('grp_12345', 'group')).toBe('grp_12345');
    });

    it('should throw error for unsupported ID types', () => {
      expect(() => ensureAkamaiIdFormat('123', 'unknown' as any)).toThrow();
    });
  });

  describe('PropertyManagerSchemas', () => {
    describe('listProperties', () => {
      it('should validate valid parameters', () => {
        const valid = {
          customer: 'acme-corp',
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          limit: 50,
        };
        expect(() => validateParameters(PropertyManagerSchemas.listProperties, valid)).not.toThrow();
      });

      it('should allow optional parameters', () => {
        const minimal = {};
        expect(() => validateParameters(PropertyManagerSchemas.listProperties, minimal)).not.toThrow();
      });

      it('should reject invalid limit values', () => {
        const invalid = { limit: 1001 }; // Over max
        expect(() => validateParameters(PropertyManagerSchemas.listProperties, invalid)).toThrow();

        const negative = { limit: -1 };
        expect(() => validateParameters(PropertyManagerSchemas.listProperties, negative)).toThrow();

        const nonInteger = { limit: 5.5 };
        expect(() => validateParameters(PropertyManagerSchemas.listProperties, nonInteger)).toThrow();
      });
    });

    describe('activateProperty', () => {
      it('should validate complete activation parameters', () => {
        const valid = {
          propertyId: 'prp_123456',
          version: 1,
          network: 'STAGING',
          note: 'Test activation',
          notifyEmails: ['test@example.com'],
          acknowledgeAllWarnings: true,
          useFastFallback: false,
          fastPush: true,
          complianceRecord: {
            noncomplianceReason: 'Emergency deployment',
          },
        };
        expect(() => validateParameters(PropertyManagerSchemas.activateProperty, valid)).not.toThrow();
      });

      it('should require notification emails for production', () => {
        const prodWithoutEmails = {
          propertyId: 'prp_123456',
          version: 1,
          network: 'PRODUCTION',
          note: 'Production deployment',
        };
        expect(() => validateParameters(PropertyManagerSchemas.activateProperty, prodWithoutEmails)).toThrow();
      });

      it('should allow staging without notification emails', () => {
        const stagingWithoutEmails = {
          propertyId: 'prp_123456',
          version: 1,
          network: 'STAGING',
          note: 'Staging test',
        };
        expect(() => validateParameters(PropertyManagerSchemas.activateProperty, stagingWithoutEmails)).not.toThrow();
      });

      it('should validate email formats', () => {
        const invalidEmails = {
          propertyId: 'prp_123456',
          version: 1,
          network: 'PRODUCTION',
          note: 'Test',
          notifyEmails: ['not-an-email', 'test@example.com'],
        };
        expect(() => validateParameters(PropertyManagerSchemas.activateProperty, invalidEmails)).toThrow();
      });

      it('should reject invalid version numbers', () => {
        const invalidVersion = {
          propertyId: 'prp_123456',
          version: 0, // Version must be at least 1
          network: 'STAGING',
          note: 'Test',
        };
        expect(() => validateParameters(PropertyManagerSchemas.activateProperty, invalidVersion)).toThrow();
      });
    });

    describe('createProperty', () => {
      it('should validate property name constraints', () => {
        const validName = {
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          propertyName: 'valid-property_name.com',
          productId: 'prd_fresca',
        };
        expect(() => validateParameters(PropertyManagerSchemas.createProperty, validName)).not.toThrow();

        // Test max length (85 chars)
        const longName = {
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          propertyName: 'a'.repeat(86),
          productId: 'prd_fresca',
        };
        expect(() => validateParameters(PropertyManagerSchemas.createProperty, longName)).toThrow();

        // Test invalid characters
        const invalidChars = {
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          propertyName: 'property name with spaces',
          productId: 'prd_fresca',
        };
        expect(() => validateParameters(PropertyManagerSchemas.createProperty, invalidChars)).toThrow();
      });

      it('should validate and default rule format', () => {
        const withRuleFormat = {
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          propertyName: 'test-property',
          productId: 'prd_fresca',
          ruleFormat: 'v2023-10-30',
        };
        const validated = validateParameters(PropertyManagerSchemas.createProperty, withRuleFormat);
        expect(validated.ruleFormat).toBe('v2023-10-30');

        // Test default
        const withoutRuleFormat = {
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          propertyName: 'test-property',
          productId: 'prd_fresca',
        };
        const defaulted = validateParameters(PropertyManagerSchemas.createProperty, withoutRuleFormat);
        expect(defaulted.ruleFormat).toBe('v2023-10-30');

        // Test invalid format
        const invalidFormat = {
          contractId: 'ctr_C-123',
          groupId: 'grp_456',
          propertyName: 'test-property',
          productId: 'prd_fresca',
          ruleFormat: 'invalid-format',
        };
        expect(() => validateParameters(PropertyManagerSchemas.createProperty, invalidFormat)).toThrow();
      });
    });
  });

  describe('DNSSchemas', () => {
    describe('listZones', () => {
      it('should validate pagination parameters', () => {
        const valid = {
          sortBy: 'zone',
          order: 'ASC',
          limit: 100,
          offset: 0,
        };
        expect(() => validateParameters(DNSSchemas.listZones, valid)).not.toThrow();
      });

      it('should reject invalid sort options', () => {
        const invalidSort = {
          sortBy: 'invalid' as any,
          order: 'ASC',
        };
        expect(() => validateParameters(DNSSchemas.listZones, invalidSort)).toThrow();
      });

      it('should reject invalid order options', () => {
        const invalidOrder = {
          sortBy: 'zone',
          order: 'RANDOM' as any,
        };
        expect(() => validateParameters(DNSSchemas.listZones, invalidOrder)).toThrow();
      });

      it('should validate offset constraints', () => {
        const negativeOffset = { offset: -1 };
        expect(() => validateParameters(DNSSchemas.listZones, negativeOffset)).toThrow();

        const validOffset = { offset: 100 };
        expect(() => validateParameters(DNSSchemas.listZones, validOffset)).not.toThrow();
      });
    });

    describe('createZone', () => {
      it('should validate primary zone requirements', () => {
        const validPrimary = {
          zone: 'example.com',
          type: 'PRIMARY',
          contractId: 'ctr_C-123',
          comment: 'Test zone',
        };
        expect(() => validateParameters(DNSSchemas.createZone, validPrimary)).not.toThrow();
      });

      it('should require masters for secondary zones', () => {
        const secondaryWithoutMasters = {
          zone: 'example.com',
          type: 'SECONDARY',
          contractId: 'ctr_C-123',
        };
        expect(() => validateParameters(DNSSchemas.createZone, secondaryWithoutMasters)).toThrow();

        const secondaryWithMasters = {
          zone: 'example.com',
          type: 'SECONDARY',
          contractId: 'ctr_C-123',
          masters: ['192.168.1.1', '10.0.0.1'],
        };
        expect(() => validateParameters(DNSSchemas.createZone, secondaryWithMasters)).not.toThrow();
      });

      it('should require target for alias zones', () => {
        const aliasWithoutTarget = {
          zone: 'example.com',
          type: 'ALIAS',
          contractId: 'ctr_C-123',
        };
        expect(() => validateParameters(DNSSchemas.createZone, aliasWithoutTarget)).toThrow();

        const aliasWithTarget = {
          zone: 'example.com',
          type: 'ALIAS',
          contractId: 'ctr_C-123',
          target: 'target.example.com',
        };
        expect(() => validateParameters(DNSSchemas.createZone, aliasWithTarget)).not.toThrow();
      });

      it('should validate IP addresses for masters', () => {
        const invalidIPs = {
          zone: 'example.com',
          type: 'SECONDARY',
          contractId: 'ctr_C-123',
          masters: ['not-an-ip', '192.168.1.1'],
        };
        expect(() => validateParameters(DNSSchemas.createZone, invalidIPs)).toThrow();
      });

      it('should validate comment length', () => {
        const longComment = {
          zone: 'example.com',
          type: 'PRIMARY',
          contractId: 'ctr_C-123',
          comment: 'a'.repeat(2049), // Over 2048 limit
        };
        expect(() => validateParameters(DNSSchemas.createZone, longComment)).toThrow();
      });
    });

    describe('upsertRecord', () => {
      it('should validate TTL constraints', () => {
        const validTTL = {
          zone: 'example.com',
          name: 'test',
          type: 'A',
          ttl: 300,
          rdata: ['192.168.1.1'],
        };
        expect(() => validateParameters(DNSSchemas.upsertRecord, validTTL)).not.toThrow();

        // Test minimum TTL
        const tooLowTTL = {
          zone: 'example.com',
          name: 'test',
          type: 'A',
          ttl: 29, // Below minimum of 30
          rdata: ['192.168.1.1'],
        };
        expect(() => validateParameters(DNSSchemas.upsertRecord, tooLowTTL)).toThrow();

        // Test maximum TTL
        const tooHighTTL = {
          zone: 'example.com',
          name: 'test',
          type: 'A',
          ttl: 2147483648, // Above maximum
          rdata: ['192.168.1.1'],
        };
        expect(() => validateParameters(DNSSchemas.upsertRecord, tooHighTTL)).toThrow();
      });

      it('should validate record types', () => {
        const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'PTR'];
        validTypes.forEach(type => {
          const record = {
            zone: 'example.com',
            name: 'test',
            type,
            ttl: 300,
            rdata: ['test-data'],
          };
          expect(() => validateParameters(DNSSchemas.upsertRecord, record)).not.toThrow();
        });

        const invalidType = {
          zone: 'example.com',
          name: 'test',
          type: 'INVALID',
          ttl: 300,
          rdata: ['test-data'],
        };
        expect(() => validateParameters(DNSSchemas.upsertRecord, invalidType)).toThrow();
      });

      it('should require non-empty rdata', () => {
        const emptyRdata = {
          zone: 'example.com',
          name: 'test',
          type: 'A',
          ttl: 300,
          rdata: [],
        };
        expect(() => validateParameters(DNSSchemas.upsertRecord, emptyRdata)).toThrow();

        const emptyString = {
          zone: 'example.com',
          name: 'test',
          type: 'A',
          ttl: 300,
          rdata: [''],
        };
        expect(() => validateParameters(DNSSchemas.upsertRecord, emptyString)).toThrow();
      });
    });
  });

  describe('CertificateSchemas', () => {
    describe('createDVEnrollment', () => {
      const validContact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        addressLineOne: '123 Main St',
        city: 'New York',
        region: 'NY',
        postalCode: '10001',
        country: 'US',
        organizationName: 'ACME Corp',
      };

      it('should validate complete DV enrollment', () => {
        const valid = {
          contractId: 'ctr_C-123',
          cn: 'www.example.com',
          sans: ['api.example.com', 'app.example.com'],
          adminContact: validContact,
          techContact: validContact,
          org: {
            name: 'ACME Corp',
            addressLineOne: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
          validationType: 'dv',
          certificateType: 'san',
          networkConfiguration: {
            geography: 'core',
            secureNetwork: 'enhanced-tls',
            quicEnabled: true,
          },
        };
        expect(() => validateParameters(CertificateSchemas.createDVEnrollment, valid)).not.toThrow();
      });

      it('should validate hostname formats', () => {
        const invalidCN = {
          contractId: 'ctr_C-123',
          cn: 'not a valid hostname!',
          adminContact: validContact,
          techContact: validContact,
          org: {
            name: 'ACME Corp',
            addressLineOne: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
        };
        expect(() => validateParameters(CertificateSchemas.createDVEnrollment, invalidCN)).toThrow();
      });

      it('should validate email formats in contacts', () => {
        const invalidEmail = {
          ...validContact,
          email: 'not-an-email',
        };

        const enrollment = {
          contractId: 'ctr_C-123',
          cn: 'www.example.com',
          adminContact: invalidEmail,
          techContact: validContact,
          org: {
            name: 'ACME Corp',
            addressLineOne: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
        };
        expect(() => validateParameters(CertificateSchemas.createDVEnrollment, enrollment)).toThrow();
      });

      it('should validate country codes', () => {
        const invalidCountry = {
          ...validContact,
          country: 'USA', // Should be 2-letter code
        };

        const enrollment = {
          contractId: 'ctr_C-123',
          cn: 'www.example.com',
          adminContact: invalidCountry,
          techContact: validContact,
          org: {
            name: 'ACME Corp',
            addressLineOne: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'USA', // Should be 'US'
            phone: '+1234567890',
          },
        };
        expect(() => validateParameters(CertificateSchemas.createDVEnrollment, enrollment)).toThrow();
      });

      it('should apply defaults for optional parameters', () => {
        const minimal = {
          contractId: 'ctr_C-123',
          cn: 'www.example.com',
          adminContact: validContact,
          techContact: validContact,
          org: {
            name: 'ACME Corp',
            addressLineOne: '123 Main St',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
            phone: '+1234567890',
          },
        };

        const validated = validateParameters(CertificateSchemas.createDVEnrollment, minimal);
        expect(validated.validationType).toBe('dv');
        expect(validated.certificateType).toBe('san');
      });
    });
  });

  describe('FastPurgeSchemas', () => {
    describe('purgeByUrl', () => {
      it('should validate URL list constraints', () => {
        const validUrls = {
          urls: ['https://example.com/path1', 'https://example.com/path2'],
          network: 'staging',
          priority: 'high',
          description: 'Emergency purge',
          notifyEmails: ['ops@example.com'],
          waitForCompletion: false,
          useQueue: true,
        };
        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, validUrls)).not.toThrow();
      });

      it('should reject invalid URLs', () => {
        const invalidUrls = {
          urls: ['not-a-url', 'https://example.com/valid'],
        };
        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, invalidUrls)).toThrow();
      });

      it('should enforce URL count limits', () => {
        // Test minimum
        const noUrls = { urls: [] };
        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, noUrls)).toThrow();

        // Test maximum (3000)
        const tooManyUrls = { urls: Array(3001).fill('https://example.com/test') };
        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, tooManyUrls)).toThrow();
      });

      it('should validate priority values', () => {
        const validPriorities = ['high', 'normal', 'low'];
        validPriorities.forEach(priority => {
          const purge = { urls: ['https://example.com'], priority };
          expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, purge)).not.toThrow();
        });

        const invalidPriority = { urls: ['https://example.com'], priority: 'urgent' as any };
        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, invalidPriority)).toThrow();
      });

      it('should validate description length', () => {
        const longDescription = {
          urls: ['https://example.com'],
          description: 'a'.repeat(256), // Over 255 limit
        };
        expect(() => validateParameters(FastPurgeSchemas.purgeByUrl, longDescription)).toThrow();
      });

      it('should apply defaults correctly', () => {
        const minimal = { urls: ['https://example.com'] };
        const validated = validateParameters(FastPurgeSchemas.purgeByUrl, minimal);
        expect(validated.network).toBe('production');
        expect(validated.priority).toBe('normal');
        expect(validated.waitForCompletion).toBe(false);
        expect(validated.useQueue).toBe(true);
      });
    });

    describe('purgeByCpcode', () => {
      it('should validate CP code constraints', () => {
        const validCodes = {
          cpcodes: [12345, 67890],
          network: 'production',
          priority: 'normal',
          confirmed: true,
        };
        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, validCodes)).not.toThrow();
      });

      it('should reject non-numeric CP codes', () => {
        const invalidCodes = {
          cpcodes: ['abc' as any, 123],
        };
        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, invalidCodes)).toThrow();
      });

      it('should enforce CP code count limits', () => {
        // Test minimum
        const noCodes = { cpcodes: [] };
        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, noCodes)).toThrow();

        // Test maximum (100)
        const tooManyCodes = { cpcodes: Array(101).fill(12345) };
        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, tooManyCodes)).toThrow();
      });

      it('should require positive integers for CP codes', () => {
        const negativeCodes = { cpcodes: [-1, 123] };
        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, negativeCodes)).toThrow();

        const floatCodes = { cpcodes: [123.45, 678] };
        expect(() => validateParameters(FastPurgeSchemas.purgeByCpcode, floatCodes)).toThrow();
      });
    });
  });

  describe('NetworkListSchemas', () => {
    describe('createNetworkList', () => {
      it('should validate network list creation', () => {
        const valid = {
          name: 'Blocked IPs',
          type: 'IP',
          description: 'List of blocked IP addresses',
          elements: ['192.168.1.1', '10.0.0.0/24'],
        };
        expect(() => validateParameters(NetworkListSchemas.createNetworkList, valid)).not.toThrow();
      });

      it('should validate name constraints', () => {
        // Test empty name
        const emptyName = { name: '', type: 'IP' };
        expect(() => validateParameters(NetworkListSchemas.createNetworkList, emptyName)).toThrow();

        // Test max length (255)
        const longName = { name: 'a'.repeat(256), type: 'IP' };
        expect(() => validateParameters(NetworkListSchemas.createNetworkList, longName)).toThrow();
      });

      it('should validate network list types', () => {
        const validTypes = ['IP', 'GEO', 'ASN'];
        validTypes.forEach(type => {
          const list = { name: 'Test List', type };
          expect(() => validateParameters(NetworkListSchemas.createNetworkList, list)).not.toThrow();
        });

        const invalidType = { name: 'Test List', type: 'INVALID' };
        expect(() => validateParameters(NetworkListSchemas.createNetworkList, invalidType)).toThrow();
      });

      it('should validate description length', () => {
        const longDescription = {
          name: 'Test List',
          type: 'IP',
          description: 'a'.repeat(2049), // Over 2048 limit
        };
        expect(() => validateParameters(NetworkListSchemas.createNetworkList, longDescription)).toThrow();
      });
    });
  });

  describe('formatQueryParameters', () => {
    it('should format query parameters correctly', () => {
      const params = {
        contractId: 'ctr_C-123',
        groupId: 'grp_456',
        limit: 50,
        includeRules: true,
        search: 'test query',
      };

      const formatted = formatQueryParameters(params);
      expect(formatted).toEqual({
        contractId: 'ctr_C-123',
        groupId: 'grp_456',
        limit: 50,
        includeRules: true,
        search: 'test query',
      });
    });

    it('should filter out undefined values', () => {
      const params = {
        contractId: 'ctr_C-123',
        groupId: undefined,
        limit: null,
        search: '',
      };

      const formatted = formatQueryParameters(params);
      expect(formatted).toEqual({
        contractId: 'ctr_C-123',
      });
      expect(formatted.groupId).toBeUndefined();
      expect(formatted.limit).toBeUndefined();
      expect(formatted.search).toBeUndefined();
    });

    it('should preserve false boolean values', () => {
      const params = {
        includeRules: false,
        acknowledgeWarnings: true,
        fastPush: false,
      };

      const formatted = formatQueryParameters(params);
      expect(formatted).toEqual({
        includeRules: false,
        acknowledgeWarnings: true,
        fastPush: false,
      });
    });

    it('should preserve zero values', () => {
      const params = {
        offset: 0,
        limit: 100,
      };

      const formatted = formatQueryParameters(params);
      expect(formatted).toEqual({
        offset: 0,
        limit: 100,
      });
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle edge cases for numeric constraints', () => {
      // Test exact boundary values
      const exactMinTTL = { zone: 'example.com', name: 'test', type: 'A', ttl: 30, rdata: ['1.1.1.1'] };
      expect(() => validateParameters(DNSSchemas.upsertRecord, exactMinTTL)).not.toThrow();

      const exactMaxTTL = { zone: 'example.com', name: 'test', type: 'A', ttl: 2147483647, rdata: ['1.1.1.1'] };
      expect(() => validateParameters(DNSSchemas.upsertRecord, exactMaxTTL)).not.toThrow();

      // Test property versions
      const minVersion = { propertyId: 'prp_123', version: 1, network: 'STAGING', note: 'Test' };
      expect(() => validateParameters(PropertyManagerSchemas.activateProperty, minVersion)).not.toThrow();

      // Test page size limits
      const maxPageSize = { limit: 1000 };
      expect(() => validateParameters(PropertyManagerSchemas.listProperties, maxPageSize)).not.toThrow();
    });

    it('should handle special characters in strings', () => {
      // Test property names with allowed special characters
      const specialChars = {
        contractId: 'ctr_C-123',
        groupId: 'grp_456',
        propertyName: 'test-property_v2.0',
        productId: 'prd_fresca',
      };
      expect(() => validateParameters(PropertyManagerSchemas.createProperty, specialChars)).not.toThrow();

      // Test email with special characters
      const emailWithPlus = {
        propertyId: 'prp_123',
        version: 1,
        network: 'PRODUCTION',
        note: 'Test',
        notifyEmails: ['test+production@example.com'],
      };
      expect(() => validateParameters(PropertyManagerSchemas.activateProperty, emailWithPlus)).not.toThrow();
    });

    it('should handle empty arrays appropriately', () => {
      // Some arrays can be empty (optional)
      const emptyOptionalArray = {
        contractId: 'ctr_C-123',
        cn: 'www.example.com',
        sans: [], // Empty SANs array should be valid
        adminContact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          addressLineOne: '123 Main St',
          city: 'New York',
          region: 'NY',
          postalCode: '10001',
          country: 'US',
          organizationName: 'ACME Corp',
        },
        techContact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          addressLineOne: '123 Main St',
          city: 'New York',
          region: 'NY',
          postalCode: '10001',
          country: 'US',
          organizationName: 'ACME Corp',
        },
        org: {
          name: 'ACME Corp',
          addressLineOne: '123 Main St',
          city: 'New York',
          region: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '+1234567890',
        },
      };
      expect(() => validateParameters(CertificateSchemas.createDVEnrollment, emptyOptionalArray)).not.toThrow();
    });
  });
});
