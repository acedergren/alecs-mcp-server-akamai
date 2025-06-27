import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AkamaiClient } from '../../src/akamai-client';
import {
  createDVEnrollment,
  getDVValidationChallenges,
  checkDVEnrollmentStatus,
  listCertificateEnrollments,
  linkCertificateToProperty,
  downloadCSR,
  uploadThirdPartyCertificate,
  updateCertificateEnrollment,
  deleteCertificateEnrollment,
  monitorCertificateDeployment
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
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
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
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
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
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
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
      expect(text).toContain('[DONE] active');
      expect(text).toContain('Certificate Enrollment Status');
      expect(text).toContain('Auto-Renewal Starts');
    });

    it('should show validation in progress', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
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
            cn: 'www.example.com',
            sans: ['api.example.com'],
            status: 'active',
            certificateType: 'san',
            validationType: 'dv',
            ra: 'lets-encrypt',
          },
          {
            enrollmentId: 12346,
            cn: 'shop.example.com',
            status: 'expiring-soon',
            certificateType: 'single',
            validationType: 'dv',
            ra: 'lets-encrypt',
          },
        ],
      });

      const result = await listCertificateEnrollments(mockClient, {});

      const text = getTextContent(result);
      expect(text).toContain('Certificate Enrollments (2 found)');
      expect(text).toContain('Active Certificates');
      expect(text).toContain('Expiring Soon');
      expect(text).toContain('www.example.com');
      expect(text).toContain('api.example.com');
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

  // A+ Feature Tests - Third-party Certificates and Lifecycle Management
  describe('downloadCSR', () => {
    it('should download CSR for third-party certificate enrollment', async () => {
      mockClient.request.mockResolvedValueOnce({
        csr: '-----BEGIN CERTIFICATE REQUEST-----\nMIICijCCAXICAQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUx\n-----END CERTIFICATE REQUEST-----',
        keyAlgorithm: 'RSA',
        signatureAlgorithm: 'SHA256withRSA',
        csrData: {
          commonName: 'www.example.com',
          subjectAlternativeNames: ['api.example.com', 'cdn.example.com'],
          organization: 'Example Corp',
          organizationalUnit: 'IT Department',
          locality: 'San Francisco',
          state: 'California',
          country: 'US'
        }
      });

      const result = await downloadCSR(mockClient, {
        enrollmentId: 12345
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate Signing Request (CSR) - Enrollment 12345');
      expect(text).toContain('RSA with SHA256withRSA');
      expect(text).toContain('www.example.com');
      expect(text).toContain('api.example.com');
      expect(text).toContain('-----BEGIN CERTIFICATE REQUEST-----');
      expect(text).toContain('Submit CSR to External CA');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/cps/v2/enrollments/12345/csr',
        method: 'GET',
        headers: {
          Accept: 'application/vnd.akamai.cps.csr.v1+json'
        }
      });
    });

    it('should handle CSR download errors', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('Enrollment not found'));

      const result = await downloadCSR(mockClient, {
        enrollmentId: 99999
      });

      const text = getTextContent(result);
      expect(text).toContain('Failed to download CSR');
      expect(text).toContain('Enrollment not found');
    });
  });

  describe('uploadThirdPartyCertificate', () => {
    it('should upload third-party certificate successfully', async () => {
      mockClient.request.mockResolvedValueOnce({
        status: 'success'
      });

      const result = await uploadThirdPartyCertificate(mockClient, {
        enrollmentId: 12345,
        certificate: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAKoK/OvD/A6EMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\n-----END CERTIFICATE-----',
        trustChain: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAKoK/OvD/A6EMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\n-----END CERTIFICATE-----'
      });

      const text = getTextContent(result);
      expect(text).toContain('Third-party certificate uploaded for enrollment 12345');
      expect(text).toContain('Certificate Upload Successful');
      expect(text).toContain('Certificate has been uploaded and is being processed');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/cps/v2/enrollments/12345/certificate',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/vnd.akamai.cps.certificate.v1+json',
          Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json'
        },
        body: expect.objectContaining({
          certificate: expect.stringContaining('-----BEGIN CERTIFICATE-----'),
          trustChain: expect.stringContaining('-----BEGIN CERTIFICATE-----')
        })
      });
    });

    it('should validate certificate format', async () => {
      const result = await uploadThirdPartyCertificate(mockClient, {
        enrollmentId: 12345,
        certificate: 'invalid-certificate-format'
      });

      const text = getTextContent(result);
      expect(text).toContain('Invalid certificate format');
      expect(text).toContain('must be in PEM format');
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should validate trust chain format', async () => {
      const result = await uploadThirdPartyCertificate(mockClient, {
        enrollmentId: 12345,
        certificate: '-----BEGIN CERTIFICATE-----\nvalid\n-----END CERTIFICATE-----',
        trustChain: 'invalid-trust-chain'
      });

      const text = getTextContent(result);
      expect(text).toContain('Invalid trust chain format');
      expect(text).toContain('must be in PEM format');
      expect(mockClient.request).not.toHaveBeenCalled();
    });
  });

  describe('updateCertificateEnrollment', () => {
    it('should update certificate enrollment configuration', async () => {
      // Mock current enrollment response
      mockClient.request
        .mockResolvedValueOnce({
          enrollmentId: 12345,
          csr: { cn: 'old.example.com' },
          adminContact: { firstName: 'Old', lastName: 'Admin' },
          networkConfiguration: { geography: 'core', quicEnabled: false }
        })
        .mockResolvedValueOnce({
          status: 'updated'
        });

      const result = await updateCertificateEnrollment(mockClient, {
        enrollmentId: 12345,
        commonName: 'new.example.com',
        sans: ['api.new.example.com'],
        networkConfiguration: {
          geography: 'china',
          quicEnabled: true,
          secureNetwork: 'enhanced-tls'
        }
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate enrollment 12345 updated successfully');
      expect(text).toContain('**Common Name:** Updated to new.example.com');
      expect(text).toContain('**SANs:** Updated to api.new.example.com');
      expect(text).toContain('Geography: china');
      expect(text).toContain('QUIC: Enabled');
      expect(mockClient.request).toHaveBeenCalledWith(expect.objectContaining({
        path: '/cps/v2/enrollments/12345',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/vnd.akamai.cps.enrollment.v11+json',
          Accept: 'application/vnd.akamai.cps.enrollment-status.v1+json'
        }
      }));
    });

    it('should handle update errors', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('Invalid enrollment ID'));

      const result = await updateCertificateEnrollment(mockClient, {
        enrollmentId: 99999,
        commonName: 'test.example.com'
      });

      const text = getTextContent(result);
      expect(text).toContain('Failed to update certificate enrollment');
      expect(text).toContain('Invalid enrollment ID');
    });
  });

  describe('deleteCertificateEnrollment', () => {
    it('should delete inactive certificate enrollment', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          enrollmentId: 12345,
          enrollment: '/cps/v2/enrollments/12345',
          pendingChanges: [],
          status: 'pending',
          certificateType: 'san',
          validationType: 'dv',
          ra: 'lets-encrypt',
          allowedDomains: [
            { name: 'www.example.com', status: 'PENDING', validationStatus: 'PENDING' }
          ]
        })
        .mockResolvedValueOnce({});

      const result = await deleteCertificateEnrollment(mockClient, {
        enrollmentId: 12345
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate enrollment 12345 deleted successfully');
      expect(text).toContain('pending → DELETED');
      expect(text).toContain('www.example.com');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/cps/v2/enrollments/12345',
        method: 'DELETE',
        headers: {
          Accept: 'application/json'
        }
      });
    });

    it('should warn before deleting active certificate', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
        status: 'active',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        allowedDomains: [
          { name: 'www.example.com', status: 'ACTIVE', validationStatus: 'VALIDATED' }
        ]
      });

      const result = await deleteCertificateEnrollment(mockClient, {
        enrollmentId: 12345
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate enrollment 12345 is currently ACTIVE');
      expect(text).toContain('This certificate is actively serving traffic');
      expect(text).toContain('Deletion blocked');
      expect(text).toContain('Use force option');
      // Should NOT call delete API
      expect(mockClient.request).toHaveBeenCalledTimes(1); // Only status check
    });

    it('should force delete active certificate when requested', async () => {
      mockClient.request
        .mockResolvedValueOnce({
          enrollmentId: 12345,
          enrollment: '/cps/v2/enrollments/12345',
          pendingChanges: [],
          status: 'active',
          certificateType: 'san',
          validationType: 'dv',
          ra: 'lets-encrypt',
          allowedDomains: [
            { name: 'www.example.com', status: 'ACTIVE', validationStatus: 'VALIDATED' }
          ]
        })
        .mockResolvedValueOnce({});

      const result = await deleteCertificateEnrollment(mockClient, {
        enrollmentId: 12345,
        force: true
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate enrollment 12345 deleted successfully');
      expect(text).toContain('Forced deletion completed');
      expect(mockClient.request).toHaveBeenCalledWith({
        path: '/cps/v2/enrollments/12345',
        method: 'DELETE',
        headers: {
          Accept: 'application/json'
        }
      });
    });
  });

  describe('monitorCertificateDeployment', () => {
    it('should monitor pending certificate deployment', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
        status: 'pending',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        allowedDomains: [
          { name: 'www.example.com', status: 'PENDING', validationStatus: 'PENDING' },
          { name: 'api.example.com', status: 'PENDING', validationStatus: 'PENDING' }
        ]
      });

      const result = await monitorCertificateDeployment(mockClient, {
        enrollmentId: 12345,
        maxWaitMinutes: 60,
        pollIntervalSeconds: 15
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate Deployment Monitor - Enrollment 12345');
      expect(text).toContain('**Max Wait Time:** 60 minutes');
      expect(text).toContain('**Poll Interval:** 15 seconds');
      expect(text).toContain('Certificate Lifecycle Stages');
      expect(text).toContain('PENDING     → Domain validation required');
      expect(text).toContain('DNS Validation Required');
      expect(text).toContain('Pending validation for 2 domains');
      expect(text).toContain('Get DV validation challenges');
    });

    it('should monitor active certificate deployment', async () => {
      mockClient.request.mockResolvedValueOnce({
        enrollmentId: 12345,
        enrollment: '/cps/v2/enrollments/12345',
        pendingChanges: [],
        status: 'active',
        certificateType: 'san',
        validationType: 'dv',
        ra: 'lets-encrypt',
        allowedDomains: [
          { name: 'www.example.com', status: 'ACTIVE', validationStatus: 'VALIDATED' }
        ]
      });

      const result = await monitorCertificateDeployment(mockClient, {
        enrollmentId: 12345
      });

      const text = getTextContent(result);
      expect(text).toContain('Certificate Deployment Monitor - Enrollment 12345');
      expect(text).toContain('Certificate Deployed Successfully');
      expect(text).toContain('Certificate is active and ready for traffic');
      expect(text).toContain('Link certificate 12345 to property');
    });

    it('should handle monitoring errors', async () => {
      mockClient.request.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await monitorCertificateDeployment(mockClient, {
        enrollmentId: 12345
      });

      const text = getTextContent(result);
      expect(text).toContain('Failed to monitor certificate deployment');
      expect(text).toContain('Network timeout');
    });
  });
});