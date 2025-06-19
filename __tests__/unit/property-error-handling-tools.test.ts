/**
 * Tests for Property Error Handling Tools
 */

import { AkamaiClient } from '../../src/akamai-client';
import {
  getValidationErrors,
  acknowledgeWarnings,
  overrideErrors,
  getErrorRecoveryHelp,
  validatePropertyConfiguration
} from '../../src/tools/property-error-handling-tools';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('Property Error Handling Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient('test') as jest.Mocked<AkamaiClient>;
    mockClient.request = jest.fn();
  });

  describe('getValidationErrors', () => {
    it('should get validation errors and warnings successfully', async () => {
      const mockResponse = {
        versions: {
          items: [{
            propertyVersion: 1,
            ruleFormat: 'v2023-01-05',
            errors: [{
              type: 'validation_error',
              messageId: 'ERROR_001',
              title: 'Missing Required Behavior',
              detail: 'The property must include a CP Code behavior',
              errorLocation: '/rules/behaviors[0]'
            }],
            warnings: [{
              type: 'validation_warning',
              messageId: 'WARN_001',
              title: 'Performance Warning',
              detail: 'Consider using caching for better performance',
              errorLocation: '/rules/behaviors[1]'
            }]
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getValidationErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        validateRules: true,
        validateHostnames: true
      });

      expect(result.content[0]?.text).toContain('Property Validation Report');
      expect(result.content[0]?.text).toContain('**Errors:** 1 ❌');
      expect(result.content[0]?.text).toContain('**Warnings:** 1 ⚠️');
      expect(result.content[0]?.text).toContain('**Can Activate:** No ❌');
      expect(result.content[0]?.text).toContain('Missing Required Behavior');
      expect(result.content[0]?.text).toContain('Performance Warning');
    });

    it('should handle property with no errors or warnings', async () => {
      const mockResponse = {
        versions: {
          items: [{
            propertyVersion: 1,
            ruleFormat: 'v2023-01-05',
            errors: [],
            warnings: []
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getValidationErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('**Errors:** 0 ✅');
      expect(result.content[0]?.text).toContain('**Warnings:** 0 ✅');
      expect(result.content[0]?.text).toContain('**Can Activate:** Yes ✅');
      expect(result.content[0]?.text).toContain('✅ Ready for Activation');
    });

    it('should handle property version not found', async () => {
      const mockResponse = {
        versions: { items: [] }
      };

      mockClient.request.mockResolvedValue(mockResponse);

      const result = await getValidationErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 999,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Property version 999 not found');
    });
  });

  describe('acknowledgeWarnings', () => {
    it('should acknowledge warnings successfully', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await acknowledgeWarnings(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        warnings: ['WARN_001', 'WARN_002'],
        justification: 'Performance warnings acknowledged for testing',
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Warnings Acknowledged');
      expect(result.content[0]?.text).toContain('**Warnings Acknowledged:** 2');
      expect(result.content[0]?.text).toContain('Performance warnings acknowledged for testing');
      expect(result.content[0]?.text).toContain('1. **WARN_001**');
      expect(result.content[0]?.text).toContain('2. **WARN_002**');

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties/prp_12345/versions/1/acknowledge-warnings?contractId=ctr_12345&groupId=grp_12345',
        method: 'POST',
        body: {
          acknowledgedWarnings: [
            { messageId: 'WARN_001', justification: 'Performance warnings acknowledged for testing' },
            { messageId: 'WARN_002', justification: 'Performance warnings acknowledged for testing' }
          ]
        },
        customer: undefined
      });
    });

    it('should use default justification when none provided', async () => {
      mockClient.request.mockResolvedValue({});

      await acknowledgeWarnings(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        warnings: ['WARN_001'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties/prp_12345/versions/1/acknowledge-warnings?contractId=ctr_12345&groupId=grp_12345',
        method: 'POST',
        body: {
          acknowledgedWarnings: [
            { messageId: 'WARN_001', justification: 'Warning acknowledged by user' }
          ]
        },
        customer: undefined
      });
    });
  });

  describe('overrideErrors', () => {
    it('should override errors with proper justification', async () => {
      mockClient.request.mockResolvedValue({});

      const result = await overrideErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        errors: ['ERROR_001'],
        justification: 'Critical production fix - risk accepted',
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        approvedBy: 'admin@example.com'
      });

      expect(result.content[0]?.text).toContain('Errors Overridden');
      expect(result.content[0]?.text).toContain('⚠️ WARNING: ERRORS HAVE BEEN OVERRIDDEN');
      expect(result.content[0]?.text).toContain('Critical production fix - risk accepted');
      expect(result.content[0]?.text).toContain('admin@example.com');
      expect(result.content[0]?.text).toContain('High Risk Deployment');

      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/papi/v1/properties/prp_12345/versions/1/override-errors?contractId=ctr_12345&groupId=grp_12345',
        method: 'POST',
        body: {
          overriddenErrors: [{
            messageId: 'ERROR_001',
            justification: 'Critical production fix - risk accepted',
            approvedBy: 'admin@example.com'
          }]
        },
        customer: undefined
      });
    });
  });

  describe('validatePropertyConfiguration', () => {
    it('should run comprehensive validation successfully', async () => {
      // Mock multiple API calls for comprehensive validation
      mockClient.request
        .mockResolvedValueOnce({
          versions: {
            items: [{
              propertyVersion: 1,
              errors: [],
              warnings: []
            }]
          }
        })
        .mockResolvedValueOnce({}) // Rule validation
        .mockResolvedValueOnce({}) // Hostname validation
        .mockResolvedValueOnce({
          hostnames: {
            items: [{
              cnameFrom: 'www.example.com',
              certStatus: {
                production: [{ status: 'ACTIVE' }],
                staging: [{ status: 'ACTIVE' }]
              }
            }]
          }
        }); // Certificate validation

      const result = await validatePropertyConfiguration(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        includeHostnameValidation: true,
        includeRuleValidation: true,
        includeCertificateValidation: true
      });

      expect(result.content[0]?.text).toContain('Comprehensive Property Validation');
      expect(result.content[0]?.text).toContain('1. Basic Property Validation');
      expect(result.content[0]?.text).toContain('2. Rule Tree Validation');
      expect(result.content[0]?.text).toContain('3. Hostname Validation');
      expect(result.content[0]?.text).toContain('4. Certificate Validation');
      expect(result.content[0]?.text).toContain('**Total Errors:** 0');
      expect(result.content[0]?.text).toContain('**Overall Status:** PASS ✅');
    });

    it('should handle validation failures', async () => {
      // Mock API calls with some failures
      mockClient.request
        .mockRejectedValueOnce(new Error('Basic validation failed'))
        .mockRejectedValueOnce(new Error('Rule validation failed'))
        .mockResolvedValueOnce({}) // Hostname validation passes
        .mockResolvedValueOnce({
          hostnames: {
            items: [{
              cnameFrom: 'www.example.com',
              certStatus: {
                production: [{ status: 'INACTIVE' }],
                staging: [{ status: 'ACTIVE' }]
              }
            }]
          }
        }); // Certificate has issues

      const result = await validatePropertyConfiguration(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        includeHostnameValidation: true,
        includeRuleValidation: true,
        includeCertificateValidation: true
      });

      expect(result.content[0]?.text).toContain('**Total Errors:** 1');
      expect(result.content[0]?.text).toContain('**Total Warnings:** 1');
      expect(result.content[0]?.text).toContain('**Overall Status:** FAIL ❌');
      expect(result.content[0]?.text).toContain('✅ Basic validation completed');
      expect(result.content[0]?.text).toContain('❌ Rule tree validation failed');
      expect(result.content[0]?.text).toContain('✅ Hostname validation passed');
      expect(result.content[0]?.text).toContain('⚠️ Certificate issues detected');
    });
  });

  describe('getErrorRecoveryHelp', () => {
    it('should provide comprehensive error recovery guidance', async () => {
      // Mock the getValidationErrors call
      const mockValidationResponse = {
        versions: {
          items: [{
            propertyVersion: 1,
            ruleFormat: 'v2023-01-05',
            errors: [{
              type: 'hostname_error',
              messageId: 'ERROR_001',
              title: 'Hostname Configuration Issue'
            }],
            warnings: []
          }]
        }
      };

      mockClient.request.mockResolvedValue(mockValidationResponse);

      const result = await getErrorRecoveryHelp(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Error Recovery Assistant');
      expect(result.content[0]?.text).toContain('Common Error Resolution Patterns');
      expect(result.content[0]?.text).toContain('Hostname Configuration Issues');
      expect(result.content[0]?.text).toContain('Rule Tree Configuration Issues');
      expect(result.content[0]?.text).toContain('Diagnostic Steps');
      expect(result.content[0]?.text).toContain('Recovery Workflow');
      expect(result.content[0]?.text).toContain('Emergency Procedures');
      expect(result.content[0]?.text).toContain('getPropertyRules');
      expect(result.content[0]?.text).toContain('listPropertyVersionHostnames');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully in validation', async () => {
      mockClient.request.mockRejectedValue(new Error('API Error'));

      const result = await getValidationErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Error: API Error');
    });

    it('should handle API errors gracefully in warning acknowledgment', async () => {
      mockClient.request.mockRejectedValue(new Error('Network timeout'));

      const result = await acknowledgeWarnings(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        warnings: ['WARN_001'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('Error: Network timeout');
    });

    it('should handle comprehensive validation with partial failures', async () => {
      // Mock mixed success/failure responses
      mockClient.request
        .mockResolvedValueOnce({
          versions: { items: [{ errors: [], warnings: [] }] }
        })
        .mockRejectedValueOnce(new Error('Rule validation failed'))
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Certificate check failed'));

      const result = await validatePropertyConfiguration(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345',
        includeHostnameValidation: true,
        includeRuleValidation: true,
        includeCertificateValidation: true
      });

      expect(result.content[0]?.text).toContain('Comprehensive Property Validation');
      expect(result.content[0]?.text).toContain('✅ Basic validation completed');
      expect(result.content[0]?.text).toContain('❌ Rule tree validation failed');
      expect(result.content[0]?.text).toContain('✅ Hostname validation passed');
      expect(result.content[0]?.text).toContain('⚠️ Certificate validation incomplete');
    });
  });

  describe('comprehensive workflow scenarios', () => {
    it('should handle end-to-end error resolution workflow', async () => {
      // Step 1: Get validation errors
      mockClient.request.mockResolvedValueOnce({
        versions: {
          items: [{
            propertyVersion: 1,
            errors: [{
              messageId: 'ERROR_001',
              title: 'Configuration Error'
            }],
            warnings: [{
              messageId: 'WARN_001',
              title: 'Performance Warning'
            }]
          }]
        }
      });

      const validationResult = await getValidationErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      // Step 2: Acknowledge warnings
      mockClient.request.mockResolvedValueOnce({});

      const acknowledgeResult = await acknowledgeWarnings(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        warnings: ['WARN_001'],
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      // Step 3: Get recovery help
      mockClient.request.mockResolvedValueOnce({
        versions: { items: [{ errors: [], warnings: [] }] }
      });

      const recoveryResult = await getErrorRecoveryHelp(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(validationResult.content[0]?.text).toContain('**Can Activate:** No ❌');
      expect(acknowledgeResult.content[0]?.text).toContain('Warnings Acknowledged');
      expect(recoveryResult.content[0]?.text).toContain('Error Recovery Assistant');
    });

    it('should provide appropriate guidance based on validation results', async () => {
      // Test scenario with warnings only (no errors)
      mockClient.request.mockResolvedValueOnce({
        versions: {
          items: [{
            propertyVersion: 1,
            errors: [],
            warnings: [{
              messageId: 'WARN_001',
              title: 'Performance Warning'
            }]
          }]
        }
      });

      const result = await getValidationErrors(mockClient, {
        propertyId: 'prp_12345',
        version: 1,
        contractId: 'ctr_12345',
        groupId: 'grp_12345'
      });

      expect(result.content[0]?.text).toContain('**Can Activate:** Yes ✅');
      expect(result.content[0]?.text).toContain('Warning Management');
      expect(result.content[0]?.text).toContain('acknowledgeAllWarnings true');
    });
  });
});