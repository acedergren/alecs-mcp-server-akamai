/**
 * Network Lists Tools Test Suite
 * Tests for the network lists functionality
 */

import { describe, it, expect } from '@jest/globals';
import { listCommonGeographicCodes, validateGeographicCodes, getASNInformation } from '../tools/security/network-lists-geo-asn';

describe('Network Lists - Geographic and ASN Tools', () => {
  describe('listCommonGeographicCodes', () => {
    it('should return common geographic codes', async () => {
      const result = await listCommonGeographicCodes();
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Common Geographic Codes Reference');
      expect(result.content[0]?.text).toContain('US: United States');
      expect(result.content[0]?.text).toContain('GB: United Kingdom');
    });
  });

  describe('validateGeographicCodes', () => {
    it('should validate valid geographic codes', async () => {
      const codes = ['US', 'GB', 'DE', 'US-CA'];
      const result = await validateGeographicCodes(codes);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Geographic Code Validation');
      expect(result.content[0]?.text).toContain('Valid Codes');
    });

    it('should identify invalid geographic codes', async () => {
      const codes = ['INVALID', 'XYZ', 'US-INVALID'];
      const result = await validateGeographicCodes(codes);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Geographic Code Validation');
      expect(result.content[0]?.text).toContain('Invalid Codes');
    });

    it('should handle mixed valid and invalid codes', async () => {
      const codes = ['US', 'INVALID', 'GB', 'XYZ'];
      const result = await validateGeographicCodes(codes);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('Geographic Code Validation');
      expect(result.content[0]?.text).toContain('Valid Codes');
      expect(result.content[0]?.text).toContain('Invalid Codes');
    });
  });

  describe('getASNInformation', () => {
    it('should provide information for known ASNs', async () => {
      const asns = ['16509', 'AS15169', '8075'];
      const result = await getASNInformation(asns);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('ASN Information Lookup');
      expect(result.content[0]?.text).toContain('Amazon');
      expect(result.content[0]?.text).toContain('Google');
      expect(result.content[0]?.text).toContain('Microsoft');
    });

    it('should handle unknown ASNs', async () => {
      const asns = ['99999', 'AS88888'];
      const result = await getASNInformation(asns);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('ASN Information Lookup');
      expect(result.content[0]?.text).toContain('Unknown ASN');
    });

    it('should identify invalid ASN formats', async () => {
      const asns = ['invalid', 'AS-invalid', ''];
      const result = await getASNInformation(asns);
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]?.type).toBe('text');
      expect(result.content[0]?.text).toContain('ASN Information Lookup');
      expect(result.content[0]?.text).toContain('Invalid ASNs');
    });
  });
});

describe('Network Lists - Validation Functions', () => {
  // Import validation functions to test directly
  const validateIPAddress = (ip: string): boolean => {
    const ipv4CidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
    const ipv6CidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;
    return ipv4CidrRegex.test(ip) || ipv6CidrRegex.test(ip);
  };

  const validateGeoCode = (code: string): boolean => {
    const geoCodeRegex = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
    return geoCodeRegex.test(code);
  };

  const validateASN = (asn: string): boolean => {
    const asnRegex = /^(AS)?\d+$/i;
    return asnRegex.test(asn);
  };

  describe('IP Address Validation', () => {
    it('should validate IPv4 addresses', () => {
      expect(validateIPAddress('192.168.1.1')).toBe(true);
      expect(validateIPAddress('10.0.0.0')).toBe(true);
      expect(validateIPAddress('255.255.255.255')).toBe(true);
      expect(validateIPAddress('0.0.0.0')).toBe(true);
    });

    it('should validate IPv4 CIDR blocks', () => {
      expect(validateIPAddress('192.168.1.0/24')).toBe(true);
      expect(validateIPAddress('10.0.0.0/8')).toBe(true);
      expect(validateIPAddress('172.16.0.0/12')).toBe(true);
      expect(validateIPAddress('192.168.1.1/32')).toBe(true);
    });

    it('should reject invalid IPv4 addresses', () => {
      expect(validateIPAddress('256.1.1.1')).toBe(false);
      expect(validateIPAddress('192.168.1')).toBe(false);
      expect(validateIPAddress('192.168.1.1.1')).toBe(false);
      expect(validateIPAddress('192.168.1.1/33')).toBe(false);
    });

    it('should validate basic IPv6 addresses', () => {
      expect(validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
      expect(validateIPAddress('::1')).toBe(true);
      expect(validateIPAddress('::')).toBe(true);
    });
  });

  describe('Geographic Code Validation', () => {
    it('should validate country codes', () => {
      expect(validateGeoCode('US')).toBe(true);
      expect(validateGeoCode('GB')).toBe(true);
      expect(validateGeoCode('DE')).toBe(true);
    });

    it('should validate subdivision codes', () => {
      expect(validateGeoCode('US-CA')).toBe(true);
      expect(validateGeoCode('US-NY')).toBe(true);
      expect(validateGeoCode('GB-ENG')).toBe(true);
    });

    it('should reject invalid geographic codes', () => {
      expect(validateGeoCode('USA')).toBe(false);
      expect(validateGeoCode('U')).toBe(false);
      expect(validateGeoCode('us')).toBe(false);
      expect(validateGeoCode('US-')).toBe(false);
      expect(validateGeoCode('US-TOOLONG')).toBe(false);
    });
  });

  describe('ASN Validation', () => {
    it('should validate ASN numbers', () => {
      expect(validateASN('16509')).toBe(true);
      expect(validateASN('15169')).toBe(true);
      expect(validateASN('1')).toBe(true);
      expect(validateASN('4294967295')).toBe(true);
    });

    it('should validate ASN numbers with AS prefix', () => {
      expect(validateASN('AS16509')).toBe(true);
      expect(validateASN('AS15169')).toBe(true);
      expect(validateASN('as1234')).toBe(true);
    });

    it('should reject invalid ASN formats', () => {
      expect(validateASN('ASN16509')).toBe(false);
      expect(validateASN('16509A')).toBe(false);
      expect(validateASN('AS')).toBe(false);
      expect(validateASN('INVALID')).toBe(false);
    });
  });
});