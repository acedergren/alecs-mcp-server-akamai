/**
 * Edge Hostname Management Service
 * Comprehensive edge hostname creation, management, and intelligent recommendations
 */

import { ErrorTranslator } from '@utils/errors';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Edge Hostname Types
export interface EdgeHostnameConfig {
  domainPrefix: string;
  domainSuffix: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
  secure: boolean;
  ipVersion: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  certificateEnrollmentId?: number;
  productId?: string;
  useCases?: EdgeHostnameUseCase[];
}

export interface EdgeHostnameUseCase {
  useCase: string;
  option: string;
  type: string;
}

export interface EdgeHostnameDetails {
  edgeHostnameId: string;
  edgeHostnameDomain: string;
  productId: string;
  domainPrefix: string;
  domainSuffix: string;
  secure: boolean;
  ipVersionBehavior: string;
  status: string;
  serialNumber?: string;
  slotNumber?: number;
  certificateDetails?: CertificateDetails;
  mapDetails?: MapDetails;
}

export interface CertificateDetails {
  enrollmentId?: number;
  commonName?: string;
  sans?: string[];
  status?: string;
  validFrom?: string;
  validTo?: string;
  certificateType?: string;
}

export interface MapDetails {
  serialNumber: string;
  slotNumber: number;
  mapAlgorithmVersion?: number;
}

export interface BulkEdgeHostnameRequest {
  hostnames: string[];
  secure: boolean;
  domainSuffix: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
  ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  certificateEnrollmentId?: number;
  productId?: string;
  contractId: string;
  groupId: string;
}

export interface EdgeHostnameRecommendation {
  hostname: string;
  recommendedPrefix: string;
  recommendedSuffix: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
  secure: boolean;
  ipVersion: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  certificateStrategy: 'DEFAULT_DV' | 'CPS' | 'SHARED_CERT';
  rationale: string;
  estimatedCost?: string;
}

/**
 * Create a new edge hostname with intelligent defaults
 */
export async function createEdgeHostnameEnhanced(
  client: AkamaiClient,
  args: {
    domainPrefix: string;
    domainSuffix?: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
    propertyId?: string;
    contractId?: string;
    groupId?: string;
    productId?: string;
    secure?: boolean;
    ipVersion?: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
    certificateEnrollmentId?: number;
    useCases?: EdgeHostnameUseCase[];
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Determine contract and group
    let contractId = args.contractId;
    let groupId = args.groupId;
    let productId = args.productId;

    if (!contractId || !groupId) {
      if (args.propertyId) {
        // Get from property
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${args.propertyId}`,
          method: 'GET',
        });

        const property = propertyResponse.properties?.items?.[0];
        if (!property) {
          throw new Error('Property not found');
        }

        contractId = contractId || property.contractId;
        groupId = groupId || property.groupId;
        productId = productId || property.productId;
      } else {
        throw new Error('Contract ID and Group ID are required when property ID is not provided');
      }
    }

    // Intelligent defaults
    const domainSuffix =
      args.domainSuffix || determineOptimalSuffix(args.domainPrefix, args.secure);
    const secure = args.secure !== false || domainSuffix === '.edgekey.net';
    const ipVersion = args.ipVersion || 'IPV4_IPV6'; // Default to dual-stack

    // Default use cases
    const useCases = args.useCases || [
      {
        useCase: 'Download_Mode',
        option: 'BACKGROUND',
        type: 'GLOBAL',
      },
    ];

    // Create edge hostname
    const response = await client.request({
      path: '/papi/v1/edgehostnames',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAPI-Use-Prefixes': 'true',
      },
      queryParams: {
        contractId: contractId || '',
        groupId: groupId || '',
        options: 'mapDetails',
      },
      body: {
        productId: productId || 'prd_Ion',
        domainPrefix: args.domainPrefix,
        domainSuffix: domainSuffix.replace(/^\./, ''),
        secure,
        secureNetwork: secure ? 'ENHANCED_TLS' : undefined,
        ipVersionBehavior: ipVersion,
        certEnrollmentId: args.certificateEnrollmentId,
        useCases,
      },
    });

    const edgeHostnameId = response.edgeHostnameLink?.split('/').pop()?.split('?')[0];
    const edgeHostname = `${args.domainPrefix}.${domainSuffix.replace(/^\./, '')}`;

    // Format response
    let responseText = '# ✅ Edge Hostname Created Successfully\n\n';
    responseText += `**Edge Hostname:** \`${edgeHostname}\`\n`;
    responseText += `**Edge Hostname ID:** ${edgeHostnameId}\n`;
    responseText += `**Type:** ${secure ? '🔒 Enhanced TLS (HTTPS)' : '🔓 Standard (HTTP)'}\n`;
    responseText += `**Network:** ${domainSuffix}\n`;
    responseText += `**IP Version:** ${ipVersion}\n`;

    if (args.certificateEnrollmentId) {
      responseText += `**Certificate Enrollment:** ${args.certificateEnrollmentId}\n`;
    }

    responseText += '\n## Technical Details\n';
    responseText += `- **Contract:** ${contractId}\n`;
    responseText += `- **Group:** ${groupId}\n`;
    responseText += `- **Product:** ${productId || 'prd_Ion'}\n`;

    if (response.mapDetails) {
      responseText += `- **Serial Number:** ${response.mapDetails.serialNumber}\n`;
      responseText += `- **Slot Number:** ${response.mapDetails.slotNumber}\n`;
    }

    responseText += '\n## DNS Configuration\n';
    responseText += 'Configure your DNS with the following CNAME record:\n';
    responseText += '```\n';
    responseText += 'Type:   CNAME\n';
    responseText += `Name:   ${args.domainPrefix}\n`;
    responseText += `Value:  ${edgeHostname}\n`;
    responseText += 'TTL:    300 (5 minutes)\n';
    responseText += '```\n';

    responseText += '\n## Next Steps\n';
    responseText += `1. Add hostnames to property: \`Add hostname ${args.domainPrefix}.example.com to property using edge hostname ${edgeHostname}\`\n`;
    responseText += '2. Configure DNS records as shown above\n';
    responseText += '3. Activate property to staging for testing\n';
    responseText += '4. Verify SSL certificate (if secure)\n';

    if (secure && !args.certificateEnrollmentId) {
      responseText += '\n## ⚠️ Certificate Required\n';
      responseText += 'This is a secure edge hostname but no certificate enrollment was specified.\n';
      responseText += 'You\'ll need to:\n';
      responseText += '1. Create a certificate enrollment\n';
      responseText += '2. Complete domain validation\n';
      responseText += '3. Associate the certificate with this edge hostname\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'create edge hostname',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Create multiple edge hostnames in bulk
 */
export async function createBulkEdgeHostnames(
  client: AkamaiClient,
  args: BulkEdgeHostnameRequest,
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const results = {
      successful: [] as Array<{ hostname: string; edgeHostname: string; edgeHostnameId: string }>,
      failed: [] as Array<{ hostname: string; error: string }>,
    };

    // Process each hostname
    for (const hostname of args.hostnames) {
      try {
        // Generate edge hostname prefix
        const prefix = generateEdgeHostnamePrefix(hostname);

        // Create edge hostname
        const response = await client.request({
          path: '/papi/v1/edgehostnames',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PAPI-Use-Prefixes': 'true',
          },
          queryParams: {
            contractId: args.contractId,
            groupId: args.groupId,
            options: 'mapDetails',
          },
          body: {
            productId: args.productId || 'prd_Ion',
            domainPrefix: prefix,
            domainSuffix: args.domainSuffix.replace(/^\./, ''),
            secure: args.secure,
            secureNetwork: args.secure ? 'ENHANCED_TLS' : undefined,
            ipVersionBehavior: args.ipVersion || 'IPV4_IPV6',
            certEnrollmentId: args.certificateEnrollmentId,
            useCases: [
              {
                useCase: 'Download_Mode',
                option: 'BACKGROUND',
                type: 'GLOBAL',
              },
            ],
          },
        });

        const edgeHostnameId = response.edgeHostnameLink?.split('/').pop()?.split('?')[0];
        const edgeHostname = `${prefix}.${args.domainSuffix.replace(/^\./, '')}`;

        results.successful.push({
          hostname,
          edgeHostname,
          edgeHostnameId,
        });
      } catch (error) {
        results.failed.push({
          hostname,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Format response
    let responseText = '# Bulk Edge Hostname Creation Results\n\n';
    responseText += `**Total Requested:** ${args.hostnames.length}\n`;
    responseText += `**Successful:** ${results.successful.length} ✅\n`;
    responseText += `**Failed:** ${results.failed.length} ❌\n`;
    responseText += `**Domain Suffix:** ${args.domainSuffix}\n`;
    responseText += `**Secure:** ${args.secure ? 'Yes' : 'No'}\n\n`;

    if (results.successful.length > 0) {
      responseText += `## ✅ Successfully Created (${results.successful.length})\n`;
      responseText += '| Hostname | Edge Hostname | ID |\n';
      responseText += '|----------|---------------|----|\n';

      results.successful.forEach((result) => {
        responseText += `| ${result.hostname} | ${result.edgeHostname} | ${result.edgeHostnameId} |\n`;
      });
      responseText += '\n';
    }

    if (results.failed.length > 0) {
      responseText += `## ❌ Failed Creations (${results.failed.length})\n`;
      results.failed.forEach((result) => {
        responseText += `- **${result.hostname}**: ${result.error}\n`;
      });
      responseText += '\n';
    }

    responseText += '## DNS Configuration Required\n';
    responseText += 'Configure CNAME records for each hostname:\n\n';
    responseText += '```\n';
    results.successful.forEach((result) => {
      responseText += `${result.hostname}  CNAME  ${result.edgeHostname}\n`;
    });
    responseText += '```\n\n';

    responseText += '## Next Steps\n';
    responseText += '1. Add hostnames to properties\n';
    responseText += '2. Configure DNS records as shown above\n';
    responseText += '3. Validate certificate coverage (if secure)\n';
    responseText += '4. Activate properties to staging\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'create bulk edge hostnames',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Get edge hostname details with certificate information
 */
export async function getEdgeHostnameDetails(
  client: AkamaiClient,
  args: {
    edgeHostnameId?: string;
    edgeHostnameDomain?: string;
    contractId?: string;
    groupId?: string;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    let edgeHostnameId = args.edgeHostnameId;

    // If domain provided instead of ID, find the ID
    if (!edgeHostnameId && args.edgeHostnameDomain) {
      const queryParams: any = {};
      if (args.contractId) {
queryParams.contractId = args.contractId;
}
      if (args.groupId) {
queryParams.groupId = args.groupId;
}

      const listResponse = await client.request({
        path: '/papi/v1/edgehostnames',
        method: 'GET',
        queryParams,
      });

      const found = listResponse.edgeHostnames?.items?.find(
        (eh: any) =>
          eh.edgeHostnameDomain === args.edgeHostnameDomain ||
          `${eh.domainPrefix}.${eh.domainSuffix}` === args.edgeHostnameDomain,
      );

      if (!found) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Edge hostname "${args.edgeHostnameDomain}" not found.\n\nTip: Use "List edge hostnames" to see available edge hostnames.`,
            },
          ],
        };
      }

      edgeHostnameId = found.edgeHostnameId;
    }

    if (!edgeHostnameId) {
      throw new Error('Either edgeHostnameId or edgeHostnameDomain must be provided');
    }

    // Get edge hostname details
    const response = await client.request({
      path: `/papi/v1/edgehostnames/${edgeHostnameId}`,
      method: 'GET',
      queryParams: {
        options: 'mapDetails,useCases',
      },
    });

    const eh = response.edgeHostnames?.items?.[0];
    if (!eh) {
      throw new Error('Edge hostname details not found');
    }

    // Format response
    let responseText = '# Edge Hostname Details\n\n';
    responseText += `## ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n\n`;

    responseText += '### Basic Information\n';
    responseText += `- **Edge Hostname ID:** ${eh.edgeHostnameId}\n`;
    responseText += `- **Domain:** ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;
    responseText += `- **Product:** ${eh.productId || 'Unknown'}\n`;
    responseText += `- **Secure (HTTPS):** ${eh.secure ? '🔒 Yes' : '🔓 No'}\n`;
    responseText += `- **IP Version:** ${eh.ipVersionBehavior || 'IPV4'}\n`;
    responseText += `- **Status:** ${eh.status || 'Active'}\n`;
    responseText += `- **Network:** ${eh.secureNetwork || 'Standard'}\n\n`;

    if (eh.mapDetails) {
      responseText += '### Mapping Details\n';
      responseText += `- **Serial Number:** ${eh.mapDetails.serialNumber || 'N/A'}\n`;
      responseText += `- **Slot Number:** ${eh.mapDetails.slotNumber || 'N/A'}\n`;
      responseText += `- **Map Algorithm Version:** ${eh.mapDetails.mapAlgorithmVersion || 'N/A'}\n\n`;
    }

    if (eh.certEnrollmentId) {
      responseText += '### Certificate Information\n';
      responseText += `- **Enrollment ID:** ${eh.certEnrollmentId}\n`;
      responseText += `- **Certificate Status:** ${eh.certStatus || 'Unknown'}\n\n`;
    }

    if (eh.useCases && eh.useCases.length > 0) {
      responseText += '### Use Cases\n';
      eh.useCases.forEach((uc: any) => {
        responseText += `- **${uc.useCase}**: ${uc.option} (${uc.type})\n`;
      });
      responseText += '\n';
    }

    // Find properties using this edge hostname
    const propertiesResponse = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      queryParams: {
        contractId: args.contractId || '',
        groupId: args.groupId || '',
      },
    });

    const usingProperties: string[] = [];
    for (const prop of propertiesResponse.properties?.items || []) {
      try {
        const hostnamesResponse = await client.request({
          path: `/papi/v1/properties/${prop.propertyId}/versions/${prop.latestVersion}/hostnames`,
          method: 'GET',
        });

        const usesThisEdgeHostname = hostnamesResponse.hostnames?.items?.some(
          (h: any) =>
            h.cnameTo === eh.edgeHostnameDomain ||
            h.cnameTo === `${eh.domainPrefix}.${eh.domainSuffix}`,
        );

        if (usesThisEdgeHostname) {
          usingProperties.push(`${prop.propertyName} (${prop.propertyId})`);
        }
      } catch {
        // Skip if we can't access the property
      }
    }

    if (usingProperties.length > 0) {
      responseText += '### Properties Using This Edge Hostname\n';
      usingProperties.forEach((prop) => {
        responseText += `- ${prop}\n`;
      });
      responseText += '\n';
    }

    responseText += '### DNS Configuration\n';
    responseText += 'Use this edge hostname as a CNAME target:\n';
    responseText += '```\n';
    responseText += `www.example.com  CNAME  ${eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`}\n`;
    responseText += '```\n\n';

    responseText += '## Actions\n';
    responseText += `- Add to property: \`Add hostname to property using edge hostname ${eh.edgeHostnameDomain}\`\n`;
    if (eh.secure && !eh.certEnrollmentId) {
      responseText += `- Associate certificate: \`Associate certificate with edge hostname ${eh.edgeHostnameId}\`\n`;
    }
    responseText += '- List all edge hostnames: `List edge hostnames`\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'get edge hostname details',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Generate intelligent edge hostname recommendations
 */
export async function generateEdgeHostnameRecommendations(
  _client: AkamaiClient,
  args: {
    hostnames: string[];
    purpose?: 'web' | 'api' | 'media' | 'download' | 'mixed';
    securityRequirement?: 'standard' | 'enhanced' | 'maximum';
    performanceRequirement?: 'standard' | 'optimized' | 'maximum';
    geographicScope?: 'global' | 'regional' | 'china';
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const recommendations: EdgeHostnameRecommendation[] = [];

    for (const hostname of args.hostnames) {
      const recommendation = generateSingleHostnameRecommendation(
        hostname,
        args.purpose,
        args.securityRequirement,
        args.performanceRequirement,
        args.geographicScope,
      );
      recommendations.push(recommendation);
    }

    // Group recommendations by strategy
    const byStrategy = recommendations.reduce(
      (acc, rec) => {
        const key = `${rec.recommendedSuffix}-${rec.secure}`;
        if (!acc[key]) {
acc[key] = [];
}
        acc[key].push(rec);
        return acc;
      },
      {} as Record<string, EdgeHostnameRecommendation[]>,
    );

    // Format response
    let responseText = '# Edge Hostname Recommendations\n\n';
    responseText += `**Total Hostnames:** ${args.hostnames.length}\n`;
    responseText += `**Purpose:** ${args.purpose || 'mixed'}\n`;
    responseText += `**Security Requirement:** ${args.securityRequirement || 'enhanced'}\n`;
    responseText += `**Performance Requirement:** ${args.performanceRequirement || 'optimized'}\n`;
    responseText += `**Geographic Scope:** ${args.geographicScope || 'global'}\n\n`;

    // Summary by recommendation type
    responseText += '## Summary\n';
    Object.entries(byStrategy).forEach(([key, recs]) => {
      const [suffix, secure] = key.split('-');
      responseText += `- **${suffix} (${secure === 'true' ? 'Secure' : 'Non-secure'})**: ${recs.length} hostnames\n`;
    });
    responseText += '\n';

    // Detailed recommendations
    responseText += '## Detailed Recommendations\n\n';

    // Group by suffix for better organization
    const suffixGroups = {
      '.edgekey.net': recommendations.filter((r) => r.recommendedSuffix === '.edgekey.net'),
      '.edgesuite.net': recommendations.filter((r) => r.recommendedSuffix === '.edgesuite.net'),
      '.akamaized.net': recommendations.filter((r) => r.recommendedSuffix === '.akamaized.net'),
    };

    Object.entries(suffixGroups).forEach(([suffix, recs]) => {
      if (recs.length === 0) {
return;
}

      responseText += `### ${suffix} (${recs.length} hostnames)\n\n`;

      recs.forEach((rec) => {
        responseText += `#### ${rec.hostname}\n`;
        responseText += `- **Edge Hostname:** \`${rec.recommendedPrefix}${rec.recommendedSuffix}\`\n`;
        responseText += `- **Secure:** ${rec.secure ? '🔒 Yes' : '🔓 No'}\n`;
        responseText += `- **Certificate Strategy:** ${rec.certificateStrategy}\n`;
        responseText += `- **IP Version:** ${rec.ipVersion}\n`;
        responseText += `- **Rationale:** ${rec.rationale}\n`;
        if (rec.estimatedCost) {
          responseText += `- **Estimated Cost:** ${rec.estimatedCost}\n`;
        }
        responseText += '\n';
      });
    });

    // Cost optimization summary
    responseText += '## Cost Optimization\n';
    const secureCount = recommendations.filter((r) => r.secure).length;
    const nonSecureCount = recommendations.length - secureCount;

    responseText += `- **Secure Edge Hostnames:** ${secureCount}\n`;
    responseText += `- **Non-Secure Edge Hostnames:** ${nonSecureCount}\n`;

    if (nonSecureCount > 0 && args.securityRequirement !== 'maximum') {
      responseText += '\n💡 **Cost Saving Tip:** Using non-secure edge hostnames for static content can reduce costs.\n';
    }

    // Certificate strategy summary
    const certStrategies = recommendations.reduce(
      (acc, rec) => {
        acc[rec.certificateStrategy] = (acc[rec.certificateStrategy] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    responseText += '\n## Certificate Strategy\n';
    Object.entries(certStrategies).forEach(([strategy, count]) => {
      responseText += `- **${strategy}**: ${count} hostnames\n`;
    });

    if (certStrategies['DEFAULT_DV'] && certStrategies['DEFAULT_DV'] > 0) {
      responseText += '\n✅ **DefaultDV Recommended:** Fastest deployment with automatic certificate provisioning.\n';
    }

    // Implementation commands
    responseText += '\n## Implementation Commands\n\n';
    responseText += '### Bulk Creation Script\n';
    responseText += '```bash\n';
    responseText += '# Create all recommended edge hostnames\n';
    recommendations.slice(0, 5).forEach((rec) => {
      responseText += 'akamai edge-hostname create \\\n';
      responseText += `  --prefix "${rec.recommendedPrefix}" \\\n`;
      responseText += `  --suffix "${rec.recommendedSuffix}" \\\n`;
      responseText += `  --secure ${rec.secure} \\\n`;
      responseText += `  --ip-version ${rec.ipVersion}\n\n`;
    });
    if (recommendations.length > 5) {
      responseText += `# ... and ${recommendations.length - 5} more\n`;
    }
    responseText += '```\n';

    responseText += '\n## Next Steps\n';
    responseText += '1. Review and adjust recommendations based on your specific requirements\n';
    responseText += '2. Create edge hostnames using the bulk creation commands\n';
    responseText += '3. Configure appropriate certificates for secure edge hostnames\n';
    responseText += '4. Update DNS records to point to the new edge hostnames\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'generate edge hostname recommendations',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Validate edge hostname and certificate association
 */
export async function validateEdgeHostnameCertificate(
  client: AkamaiClient,
  args: {
    edgeHostnameId: string;
    hostname?: string;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Get edge hostname details
    const ehResponse = await client.request({
      path: `/papi/v1/edgehostnames/${args.edgeHostnameId}`,
      method: 'GET',
    });

    const eh = ehResponse.edgeHostnames?.items?.[0];
    if (!eh) {
      throw new Error('Edge hostname not found');
    }

    const edgeHostnameDomain = eh.edgeHostnameDomain || `${eh.domainPrefix}.${eh.domainSuffix}`;

    // Format response
    let responseText = '# Edge Hostname Certificate Validation\n\n';
    responseText += `**Edge Hostname:** ${edgeHostnameDomain}\n`;
    responseText += `**Secure:** ${eh.secure ? 'Yes' : 'No'}\n\n`;

    if (!eh.secure) {
      responseText += '## ℹ️ Non-Secure Edge Hostname\n';
      responseText += 'This edge hostname is configured for HTTP-only traffic and does not require a certificate.\n';

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    }

    responseText += '## Certificate Status\n';

    if (eh.certEnrollmentId) {
      responseText += '✅ **Certificate Associated**\n';
      responseText += `- **Enrollment ID:** ${eh.certEnrollmentId}\n`;
      responseText += `- **Status:** ${eh.certStatus || 'Unknown'}\n\n`;

      // Try to get more certificate details
      try {
        const certResponse = await client.request({
          path: `/cps/v2/enrollments/${eh.certEnrollmentId}`,
          method: 'GET',
        });

        if (certResponse) {
          responseText += '### Certificate Details\n';
          responseText += `- **Common Name:** ${certResponse.cn || 'N/A'}\n`;
          responseText += `- **SANs:** ${certResponse.sans?.join(', ') || 'None'}\n`;
          responseText += `- **Status:** ${certResponse.status || 'Unknown'}\n`;
          responseText += `- **Valid From:** ${certResponse.validFrom || 'N/A'}\n`;
          responseText += `- **Valid To:** ${certResponse.validTo || 'N/A'}\n\n`;
        }
      } catch {
        // Certificate details not accessible
      }
    } else {
      responseText += '❌ **No Certificate Associated**\n\n';
      responseText += '### Required Actions\n';
      responseText += '1. Create a certificate enrollment\n';
      responseText += '2. Complete domain validation\n';
      responseText += '3. Associate the certificate with this edge hostname\n\n';

      responseText += '### Certificate Options\n';
      responseText += '- **DefaultDV (Recommended):** Automatic DV certificate from Let\'s Encrypt\n';
      responseText += '- **CPS Standard:** Akamai-managed DV certificate\n';
      responseText += '- **Third-Party:** Upload your own certificate\n';
    }

    if (args.hostname) {
      responseText += '## Hostname Coverage Check\n';
      responseText += `**Hostname:** ${args.hostname}\n`;

      if (eh.certEnrollmentId) {
        // Check if hostname would be covered
        responseText += '⚠️ **Note:** Certificate coverage verification requires checking the certificate\'s CN and SANs.\n';
      } else {
        responseText += '❌ **Not Covered:** No certificate is associated with this edge hostname.\n';
      }
    }

    responseText += '\n## DNS Validation\n';
    responseText += 'Ensure your DNS is configured correctly:\n';
    responseText += '```\n';
    responseText += `${args.hostname || 'your-hostname.com'}  CNAME  ${edgeHostnameDomain}\n`;
    responseText += '```\n';

    responseText += '\n## Next Steps\n';
    if (!eh.certEnrollmentId) {
      responseText += `1. Create DefaultDV certificate: \`Create DefaultDV certificate for ${edgeHostnameDomain}\`\n`;
      responseText += '2. Complete domain validation\n';
      responseText += '3. Associate certificate with edge hostname\n';
    } else {
      responseText += '1. Verify certificate status\n';
      responseText += '2. Ensure DNS is properly configured\n';
      responseText += '3. Test HTTPS connectivity\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'validate edge hostname certificate',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Associate certificate with edge hostname
 */
export async function associateCertificateWithEdgeHostname(
  client: AkamaiClient,
  args: {
    edgeHostnameId: string;
    certificateEnrollmentId: number;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Update edge hostname with certificate
    await client.request({
      path: `/papi/v1/edgehostnames/${args.edgeHostnameId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        certEnrollmentId: args.certificateEnrollmentId,
      },
    });

    // Get updated edge hostname details
    const ehResponse = await client.request({
      path: `/papi/v1/edgehostnames/${args.edgeHostnameId}`,
      method: 'GET',
    });

    const eh = ehResponse.edgeHostnames?.items?.[0];
    const edgeHostnameDomain = eh?.edgeHostnameDomain || 'Unknown';

    let responseText = '# ✅ Certificate Associated Successfully\n\n';
    responseText += `**Edge Hostname:** ${edgeHostnameDomain}\n`;
    responseText += `**Certificate Enrollment ID:** ${args.certificateEnrollmentId}\n`;
    responseText += '**Status:** Certificate association in progress\n\n';

    responseText += '## What Happens Next\n';
    responseText += '1. Certificate deployment begins automatically\n';
    responseText += '2. Deployment typically takes 20-30 minutes\n';
    responseText += '3. HTTPS will be available once deployment completes\n\n';

    responseText += '## Verification Steps\n';
    responseText += `1. Check certificate status: \`Validate edge hostname certificate ${args.edgeHostnameId}\`\n`;
    responseText += '2. Test HTTPS connectivity after deployment\n';
    responseText += '3. Monitor for any certificate warnings\n\n';

    responseText += '## Important Notes\n';
    responseText += '- Existing HTTP traffic is not affected\n';
    responseText += '- Certificate renewals are handled automatically\n';
    responseText += '- Ensure DNS records point to this edge hostname\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'associate certificate with edge hostname',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

// Helper Functions

function determineOptimalSuffix(
  domainPrefix: string,
  secure?: boolean,
): '.edgekey.net' | '.edgesuite.net' | '.akamaized.net' {
  // If explicitly secure, use edgekey
  if (secure === true) {
    return '.edgekey.net';
  }

  // If explicitly not secure, use edgesuite
  if (secure === false) {
    return '.edgesuite.net';
  }

  // Otherwise, make intelligent decision based on prefix
  if (
    domainPrefix.includes('api') ||
    domainPrefix.includes('secure') ||
    domainPrefix.includes('auth')
  ) {
    return '.edgekey.net';
  }

  if (
    domainPrefix.includes('static') ||
    domainPrefix.includes('cdn') ||
    domainPrefix.includes('assets')
  ) {
    return '.edgesuite.net';
  }

  // Default to edgekey for better security
  return '.edgekey.net';
}

function generateEdgeHostnamePrefix(hostname: string): string {
  // Remove common prefixes and domain
  let prefix = hostname;

  // Remove www. if present
  if (prefix.startsWith('www.')) {
    prefix = prefix.substring(4);
  }

  // For subdomains, keep the full structure
  // e.g., api.example.com -> api.example.com
  // e.g., secure.api.example.com -> secure.api.example.com

  return prefix;
}

function generateSingleHostnameRecommendation(
  hostname: string,
  purpose?: string,
  securityRequirement?: string,
  performanceRequirement?: string,
  geographicScope?: string,
): EdgeHostnameRecommendation {
  const prefix = generateEdgeHostnamePrefix(hostname);

  // Determine security needs
  let secure = true;
  let certificateStrategy: 'DEFAULT_DV' | 'CPS' | 'SHARED_CERT' = 'DEFAULT_DV';

  if (
    securityRequirement === 'standard' &&
    !hostname.includes('api') &&
    !hostname.includes('auth')
  ) {
    secure = false;
  } else if (securityRequirement === 'maximum') {
    certificateStrategy = 'CPS';
  }

  // Determine suffix based on requirements
  let suffix: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net' = '.edgekey.net';

  if (geographicScope === 'china') {
    suffix = '.akamaized.net';
  } else if (!secure && performanceRequirement !== 'maximum') {
    suffix = '.edgesuite.net';
  }

  // Determine IP version
  let ipVersion: 'IPV4' | 'IPV6' | 'IPV4_IPV6' = 'IPV4_IPV6';
  if (purpose === 'api' || performanceRequirement === 'maximum') {
    ipVersion = 'IPV4_IPV6';
  }

  // Generate rationale
  const rationales = [];

  if (hostname.includes('api')) {
    rationales.push('API endpoint requires secure delivery');
  }

  if (suffix === '.edgekey.net') {
    rationales.push('Enhanced TLS network for optimal security and performance');
  } else if (suffix === '.edgesuite.net') {
    rationales.push('Standard network for cost-effective delivery');
  } else if (suffix === '.akamaized.net') {
    rationales.push('China-optimized network for regional performance');
  }

  if (ipVersion === 'IPV4_IPV6') {
    rationales.push('Dual-stack support for maximum compatibility');
  }

  // Estimate cost
  let estimatedCost = secure ? 'Standard SSL pricing' : 'No SSL cost';
  if (certificateStrategy === 'CPS') {
    estimatedCost = 'Premium SSL pricing';
  }

  return {
    hostname,
    recommendedPrefix: prefix,
    recommendedSuffix: suffix,
    secure,
    ipVersion,
    certificateStrategy,
    rationale: rationales.join('; '),
    estimatedCost,
  };
}

// Export all functions
export const edgeHostnameTools = {
  createEdgeHostnameEnhanced,
  createBulkEdgeHostnames,
  getEdgeHostnameDetails,
  generateEdgeHostnameRecommendations,
  validateEdgeHostnameCertificate,
  associateCertificateWithEdgeHostname,
};
