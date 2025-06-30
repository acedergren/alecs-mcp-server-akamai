/**
 * Comprehensive Response Factory for Akamai API Mocking
 * Generates consistent, realistic API responses for testing
 */

export class AkamaiResponseFactory {
  /**
   * Property Manager API Responses
   */
  static propertyListResponse(count: number = 3) {
    return {
      properties: {
        items: Array.from({ length: count }, (_, i) => ({
          propertyId: `prp_${100000 + i}`,
          propertyName: `test-property-${i}`,
          contractId: `ctr_C-${1000000 + i}`,
          groupId: `grp_${10000 + i}`,
          productId: 'prd_Web_Accel',
          latestVersion: 1,
          productionVersion: 1,
          stagingVersion: 1,
          assetId: `ast_${200000 + i}`,
          note: `Test property ${i}`,
        })),
      },
    };
  }

  static propertyResponse(propertyId: string = 'prp_123456') {
    return {
      property: {
        propertyId,
        propertyName: 'test-property',
        contractId: 'ctr_C-1000000',
        groupId: 'grp_10000',
        productId: 'prd_Web_Accel',
        latestVersion: 1,
        productionVersion: 1,
        stagingVersion: 1,
        assetId: 'ast_200000',
        note: 'Test property',
      },
    };
  }

  static propertyCreationResponse(propertyName: string = 'new-property') {
    return {
      content: [{
        type: 'text',
        text: `# 🚀 Property Created Successfully

**Property Name:** ${propertyName}
**Property ID:** prp_789012
**Contract:** ctr_C-1000000
**Group:** grp_10000
**Product:** Web Application Accelerator

## Next Steps
1. Configure hostnames for your property
2. Set up rule configurations
3. Test on staging network
4. Activate to production

Your property is ready for configuration!`,
      }],
    };
  }

  static contractsResponse(count: number = 2) {
    return {
      contracts: {
        items: Array.from({ length: count }, (_, i) => ({
          contractId: `ctr_C-${1000000 + i}`,
          contractTypeName: 'AKAMAI_INTERNAL',
        })),
      },
    };
  }

  static groupsResponse(contractId: string = 'ctr_C-1000000') {
    return {
      groups: {
        items: [
          {
            groupId: 'grp_10000',
            groupName: 'Test Group',
            contractIds: [contractId],
          },
          {
            groupId: 'grp_10001',
            groupName: 'Production Group',
            contractIds: [contractId],
          },
        ],
      },
    };
  }

  /**
   * FastPurge API Responses
   */
  static fastPurgeResponse(type: 'success' | 'confirmation_required' | 'high_impact') {
    switch (type) {
      case 'confirmation_required':
        return {
          content: [{
            type: 'text',
            text: 'WARNING: High-Impact CP Code Purge Operation\n\nThis CP code serves significant traffic. Add "confirmed": true to proceed.',
          }],
        };
      
      case 'high_impact':
        return {
          content: [{
            type: 'text',
            text: 'WARNING: High-Impact CP Code Purge Operation\n\nThis operation will affect multiple properties.',
          }],
        };
      
      case 'success':
      default:
        return {
          content: [{
            type: 'text',
            text: 'Purge request submitted successfully\n\nPurge ID: 12345-67890\nStatus: ACCEPTED\nEstimated completion: 5-10 minutes',
          }],
        };
    }
  }

  static fastPurgeStatusResponse(status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED') {
    return {
      content: [{
        type: 'text',
        text: `Purge Status: ${status}\n\nPurge ID: 12345-67890\nSubmitted: ${new Date().toISOString()}\nProgress: ${status === 'DONE' ? '100%' : status === 'IN_PROGRESS' ? '60%' : '0%'}`,
      }],
    };
  }

  /**
   * DNS API Responses
   */
  static dnsZonesResponse(count: number = 2) {
    return {
      zones: Array.from({ length: count }, (_, i) => ({
        zone: `example${i > 0 ? i : ''}.com`,
        type: 'primary',
        masters: [],
        comment: `Test zone ${i}`,
        signAndServe: false,
      })),
    };
  }

  static dnsRecordsResponse(zone: string = 'example.com') {
    return {
      recordsets: [
        {
          name: zone,
          type: 'A',
          ttl: 300,
          rdata: ['192.0.2.1'],
        },
        {
          name: `www.${zone}`,
          type: 'CNAME',
          ttl: 300,
          rdata: [zone],
        },
        {
          name: zone,
          type: 'MX',
          ttl: 3600,
          rdata: ['10 mail.example.com'],
        },
      ],
    };
  }

  /**
   * Certificate API Responses
   */
  static certificateEnrollmentsResponse() {
    return {
      enrollments: [
        {
          enrollment: 'cps_12345',
          'common-name': 'example.com',
          'sans': ['www.example.com', 'api.example.com'],
          'validation-type': 'dv',
          'certificate-type': 'san',
          status: 'active',
        },
      ],
    };
  }

  /**
   * Error Responses
   */
  static errorResponse(status: number, message: string, detail?: string) {
    return {
      status,
      title: this.getErrorTitle(status),
      detail: detail || message,
      instance: `/error/${status}`,
      type: 'https://problems.akamai.com/errors',
      errors: [{
        type: 'https://problems.akamai.com/errors',
        title: this.getErrorTitle(status),
        detail: detail || message,
      }],
    };
  }

  static authErrorResponse() {
    return this.errorResponse(401, 'Authentication failed', 'Invalid or expired credentials');
  }

  static forbiddenErrorResponse() {
    return this.errorResponse(403, 'Access denied', 'Insufficient permissions for this operation');
  }

  static rateLimitErrorResponse() {
    return this.errorResponse(429, 'Rate limit exceeded', 'Too many requests. Please retry after some time.');
  }

  static notFoundErrorResponse(resource: string = 'resource') {
    return this.errorResponse(404, `${resource} not found`, `The requested ${resource} does not exist`);
  }

  static serverErrorResponse() {
    return this.errorResponse(500, 'Internal server error', 'An unexpected error occurred');
  }

  /**
   * MCP Format Responses
   */
  static mcpTextResponse(text: string) {
    return {
      content: [{
        type: 'text' as const,
        text,
      }],
    };
  }

  static mcpJsonResponse(data: any) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      }],
    };
  }

  static mcpErrorResponse(error: string) {
    return {
      content: [{
        type: 'text' as const,
        text: `❌ Error: ${error}`,
      }],
    };
  }

  /**
   * Validation and Rule Tree Responses
   */
  static validationSuccessResponse() {
    return {
      content: [{
        type: 'text',
        text: `# Rule Tree Validation Report
**Property:** test-property (prp_12345)
**Version:** 1
**Validation Result:** [DONE] VALID

## Rule Statistics
- **Total Rules:** 1
- **Total Behaviors:** 3
- **Total Criteria:** 0
- **Max Depth:** 0
- **Complexity Score:** 5/100
- **Est. Evaluation Time:** 1ms

## Next Steps
[DONE] Rule tree is valid and ready for use`,
      }],
    };
  }

  static validationErrorResponse(error: string) {
    return {
      content: [{
        type: 'text',
        text: `# Rule Tree Validation Report
**Property:** Unknown (prp_12345)
**Version:** undefined
**Validation Result:** [ERROR] INVALID

## [ERROR] Errors (1)
1. **ERROR** at \`\`
   - ${error}
   - **Fix:** Add required behavior or configuration

## Next Steps
1. Fix the errors listed above
2. Re-validate the rule tree`,
      }],
    };
  }

  /**
   * Activation Responses
   */
  static activationResponse(network: 'STAGING' | 'PRODUCTION' = 'STAGING') {
    return {
      content: [{
        type: 'text',
        text: `# [ACTIVATION STARTED] atv_67890
**Property:** test-property (prp_12345)
**Version:** v2
**Network:** ${network}
**Status:** PENDING

## Progress Tracking
Use the progress token to monitor: progress_29074ed6e72403af9073595ab7a28574

## Estimated Time
- **${network}:** ${network === 'STAGING' ? '5-10' : '15-30'} minutes

## Next Steps
1. Check status: \`Get activation status for property prp_12345 activation atv_67890\`
2. View activation details when complete`,
      }],
    };
  }

  /**
   * Helper Methods
   */
  private static getErrorTitle(status: number): string {
    switch (status) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 429: return 'Too Many Requests';
      case 500: return 'Internal Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Unavailable';
      default: return 'Error';
    }
  }

  /**
   * Generate default response for unknown endpoints
   */
  static defaultResponse(endpoint?: string) {
    return {
      message: `Mock response for ${endpoint || 'unknown endpoint'}`,
      timestamp: new Date().toISOString(),
      success: true,
    };
  }
}