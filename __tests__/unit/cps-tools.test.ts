import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AkamaiClient } from '../../src/akamai-client';
import {
  createDVEnrollment,
  getDVValidationChallenges,
  checkDVEnrollmentStatus,
  listCertificateEnrollments,
  linkCertificateToProperty
} from '../../src/tools/cps-tools';

// Mock the AkamaiClient
jest.mock('../../src/akamai-client');

describe('Certificate Provisioning System (CPS) Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      request: jest.fn(),
    } as any;
  });

  // Helper to get text content from result and strip ANSI codes
  const getTextContent = (result: any): string => {
    const content = result.content?.[0];
    if (content && 'text' in content) {
      // Strip ANSI escape codes
      return content.text.replace(/\u001b\[[0-9;]*m/g, '');
    }
    return '';
  };

  describe('createDVEnrollment', () => {
    it('should create a DV certificate enrollment', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollment: '/cps/v2/enrollments/12345',
      });

      const result = await createDVEnrollment(mockClient, {
        commonName: 'www.example.com',
        sans: ['api.example.com'],
        adminContact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        techContact: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+1234567891',
        },
        contractId: 'ctr_C-123456',
        enhancedTLS: true,
      });

      const text = getTextContent(result);
      expect(text).toContain('Created Default DV certificate enrollment');
      expect(text).toContain('**Enrollment ID:** 12345');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        path: '/cps/v2/enrollments',
        method: 'POST',
        queryParams: {
          contractId: 'ctr_C-123456'
        },
        body: expect.objectContaining({
          validationType: 'dv',
          csr: expect.objectContaining({
            cn: 'www.example.com',
            sans: ['api.example.com'],
          }),
        }),
      }));
    });

    it('should validate common name', async () => {
      const result = await createDVEnrollment(mockClient, {
        commonName: 'invalid',
        adminContact: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        techContact: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+1234567891',
        },
        contractId: 'ctr_C-123456',
      });

      const text = getTextContent(result);
      expect(text).toContain('Common name must be a valid domain');
      expect(mockClient.request).not.toHaveBeenCalled();
    });
  });

  describe('getDVValidationChallenges', () => {
    it('should get DNS validation challenges', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        status: 'pending',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        allowedDomains: [
          {
            name: 'www.example.com',
            status: 'PENDING',
            validationStatus: 'PENDING',
            validationDetails: {
              challenges: [
                {
                  type: 'dns-01',
                  status: 'PENDING',
                  token: 'abc123',
                  responseBody: 'xyz789_validation_string',
                },
              ],
            },
          },
          {
            name: 'api.example.com',
            status: 'PENDING',
            validationStatus: 'PENDING',
            validationDetails: {
              challenges: [
                {
                  type: 'dns-01',
                  status: 'PENDING',
                  token: 'def456',
                  responseBody: 'uvw456_validation_string',
                },
              ],
            },
          },
        ],
      });

      const result = await getDVValidationChallenges(mockClient, {
        enrollmentId: 12345,
      });

      const text = getTextContent(result);
      expect(text).toContain('DV Validation Challenges');
      expect(text).toContain('_acme-challenge.www.example.com');
      expect(text).toContain('xyz789_validation_string');
      expect(text).toContain('_acme-challenge.api.example.com');
      expect(text).toContain('uvw456_validation_string');
    });

    it('should show validated status when complete', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        status: 'active',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        allowedDomains: [
          {
            name: 'www.example.com',
            status: 'ACTIVE',
            validationStatus: 'VALIDATED',
            validationDetails: {
              challenges: [
                {
                  type: 'dns-01',
                  status: 'VALIDATED',
                },
              ],
            },
          },
        ],
      });

      const result = await getDVValidationChallenges(mockClient, {
        enrollmentId: 12345,
      });

      const text = getTextContent(result);
      expect(text).toContain('All Domains Validated');
    });
  });

  describe('checkDVEnrollmentStatus', () => {
    it('should check enrollment status', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        status: 'active',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        autoRenewalStartTime: '2024-12-01T00:00:00Z',
        allowedDomains: [
          {
            name: 'www.example.com',
            status: 'ACTIVE',
            validationStatus: 'VALIDATED',
          },
          {
            name: 'api.example.com',
            status: 'ACTIVE',
            validationStatus: 'VALIDATED',
          },
        ],
      });

      const result = await checkDVEnrollmentStatus(mockClient, {
        enrollmentId: 12345,
      });

      const text = getTextContent(result);
      expect(text).toContain('✅ active');
      expect(text).toContain('Certificate Active!');
      expect(text).toContain('Auto-Renewal Starts');
    });

    it('should show validation in progress', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        status: 'pending',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        allowedDomains: [
          {
            name: 'www.example.com',
            status: 'PENDING',
            validationStatus: 'PENDING',
          },
        ],
      });

      const result = await checkDVEnrollmentStatus(mockClient, {
        enrollmentId: 12345,
      });

      const text = getTextContent(result);
      expect(text).toContain('Validation In Progress');
    });
  });

  describe('listCertificateEnrollments', () => {
    it('should list certificate enrollments', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollments: [
          {
            enrollmentId: 12345,
            status: 'active',
            certificateType: 'san',
            validationType: 'dv',
            ra: 'lets-encrypt',
            allowedDomains: [
              { name: 'www.example.com' },
              { name: 'api.example.com' },
            ],
          },
          {
            enrollmentId: 12346,
            status: 'expiring-soon',
            certificateType: 'single',
            validationType: 'dv',
            ra: 'lets-encrypt',
            autoRenewalStartTime: '2024-03-01T00:00:00Z',
            allowedDomains: [
              { name: 'shop.example.com' },
            ],
          },
        ],
      });

      const result = await listCertificateEnrollments(mockClient, {});

      const text = getTextContent(result);
      expect(text).toContain('Certificate Enrollments (2 found)');
      expect(text).toContain('Active Certificates');
      expect(text).toContain('Expiring Soon');
      expect(text).toContain('www.example.com, api.example.com');
    });
  });

  describe('linkCertificateToProperty', () => {
    it('should link certificate to property', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          properties: {
            items: [{
              propertyId: 'prp_12345',
              propertyName: 'example.com',
              latestVersion: 3,
            }],
          },
        })
        .mockResolvedValueOnce({
          hostnames: {
            items: [
              {
                cnameFrom: 'www.example.com',
                cnameTo: 'www.example.com.edgekey.net',
              },
              {
                cnameFrom: 'api.example.com',
                cnameTo: 'api.example.com.edgekey.net',
              },
            ],
          },
        })
        .mockResolvedValueOnce({});

      const result = await linkCertificateToProperty(mockClient, {
        enrollmentId: 12345,
        propertyId: 'prp_12345',
      });

      const text = getTextContent(result);
      expect(text).toContain('Linked certificate enrollment 12345');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({
          hostnames: expect.arrayContaining([
            expect.objectContaining({
              certEnrollmentId: 12345,
            }),
          ]),
        }),
      }));
    });
  });
});