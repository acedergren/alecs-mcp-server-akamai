/**
 * Enhanced Hostname and Edge Hostname Management Tools
 * Comprehensive hostname discovery, conflict detection, and intelligent provisioning
 */

import { ErrorTranslator } from '@utils/errors';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Hostname analysis types
export interface HostnameAnalysis {
  hostname: string;
  status: 'available' | 'in-use' | 'conflict' | 'invalid';
  currentProperty?: PropertyHostnameMapping;
  conflicts: HostnameConflict[];
  wildcardCoverage: WildcardCoverage[];
  recommendations: HostnameRecommendation[];
  validationIssues: string[];
}

export interface PropertyHostnameMapping {
  propertyId: string;
  propertyName: string;
  version: number;
  network: 'STAGING' | 'PRODUCTION' | 'BOTH' | 'NONE';
  edgeHostname: string;
  certificateStatus?: string;
}

export interface HostnameConflict {
  type: 'exact-match' | 'wildcard-overlap' | 'subdomain-hierarchy';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  conflictingProperty: string;
  description: string;
  resolution: string;
}

export interface WildcardCoverage {
  wildcardHostname: string;
  propertyId: string;
  propertyName: string;
  coverageType: 'full' | 'partial';
  certificateType: 'wildcard' | 'san';
}

export interface HostnameRecommendation {
  type: 'property-assignment' | 'edge-hostname' | 'certificate' | 'naming';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  rationale: string;
}

// Edge hostname types
export interface EdgeHostnameRecommendation {
  hostname: string;
  suggestedEdgeHostname: string;
  domainSuffix: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
  secure: boolean;
  ipVersion: 'IPV4' | 'IPV6' | 'IPV4_IPV6';
  certificateType: 'DEFAULT_DV' | 'CPS' | 'THIRD_PARTY';
  rationale: string;
}

export interface BulkHostnameValidation {
  totalHostnames: number;
  validHostnames: string[];
  invalidHostnames: Array<{
    hostname: string;
    reason: string;
  }>;
  conflicts: Array<{
    hostname: string;
    conflicts: HostnameConflict[];
  }>;
  recommendations: Array<{
    hostname: string;
    recommendations: HostnameRecommendation[];
  }>;
}

/**
 * Analyze hostname ownership and conflicts
 */
export async function analyzeHostnameOwnership(
  client: AkamaiClient,
  args: {
    hostnames: string[];
    includeWildcardAnalysis?: boolean;
    includeRecommendations?: boolean;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Get all properties and their hostnames
    const allHostnamesResponse = await client._request({
      path: '/papi/v1/hostnames',
      method: 'GET',
      queryParams: {
        includeEdgeHostnames: 'true',
        includeCertStatus: 'true',
      }
    });

    const existingHostnames = allHostnamesResponse.hostnames?.items || [];
    const analyses: HostnameAnalysis[] = [];

    // Analyze each requested hostname
    for (const hostname of args.hostnames) {
      const analysis: HostnameAnalysis = {
        hostname,
        status: 'available',
        conflicts: [],
        wildcardCoverage: [],
        recommendations: [],
        validationIssues: [],
      };

      // Validate hostname format
      if (!isValidHostname(hostname)) {
        analysis.status = 'invalid';
        analysis.validationIssues.push('Invalid hostname format');
      }

      // Check for exact matches
      const exactMatch = existingHostnames.find((h: any) => h.cnameFrom === hostname);

      if (exactMatch) {
        analysis.status = 'in-use';
        analysis.currentProperty = {
          propertyId: exactMatch.propertyId,
          propertyName: exactMatch.propertyName,
          version: exactMatch.propertyVersion,
          network: getNetworkStatus(exactMatch),
          edgeHostname: exactMatch.cnameTo,
          certificateStatus: exactMatch.certStatus,
        };
      }

      // Check for wildcard coverage
      if (args.includeWildcardAnalysis) {
        const wildcardCoverage = findWildcardCoverage(hostname, existingHostnames);
        analysis.wildcardCoverage = wildcardCoverage;

        if (wildcardCoverage.length > 0 && !exactMatch) {
          analysis.status = 'conflict';
          wildcardCoverage.forEach((coverage) => {
            analysis.conflicts.push({
              type: 'wildcard-overlap',
              severity: 'MEDIUM',
              conflictingProperty: coverage.propertyId,
              description: `Hostname is covered by wildcard ${coverage.wildcardHostname}`,
              resolution:
                'Consider using the existing wildcard certificate or create a specific hostname entry',
            });
          });
        }
      }

      // Check for subdomain hierarchy conflicts
      const hierarchyConflicts = findSubdomainConflicts(hostname, existingHostnames);
      analysis.conflicts.push(...hierarchyConflicts);

      // Generate recommendations
      if (args.includeRecommendations) {
        analysis.recommendations = generateHostnameRecommendations(analysis, existingHostnames);
      }

      analyses.push(analysis);
    }

    // Format response
    let responseText = '# Hostname Ownership Analysis\n\n';
    responseText += `**Total Hostnames Analyzed:** ${args.hostnames.length}\n`;
    responseText += `**Available:** ${analyses.filter((a) => a.status === 'available').length}\n`;
    responseText += `**In Use:** ${analyses.filter((a) => a.status === 'in-use').length}\n`;
    responseText += `**Conflicts:** ${analyses.filter((a) => a.status === 'conflict').length}\n`;
    responseText += `**Invalid:** ${analyses.filter((a) => a.status === 'invalid').length}\n\n`;

    // Group by status
    const statusGroups = {
      available: analyses.filter((a) => a.status === 'available'),
      'in-use': analyses.filter((a) => a.status === 'in-use'),
      conflict: analyses.filter((a) => a.status === 'conflict'),
      invalid: analyses.filter((a) => a.status === 'invalid'),
    };

    // Available hostnames
    if (statusGroups.available.length > 0) {
      responseText += `## ✅ Available Hostnames (${statusGroups.available.length})\n`;
      statusGroups.available.forEach((analysis) => {
        responseText += `- **${analysis.hostname}** - Ready for provisioning\n`;
        if (analysis.recommendations.length > 0) {
          analysis.recommendations.forEach((rec) => {
            responseText += `  - 💡 ${rec.recommendation}\n`;
          });
        }
      });
      responseText += '\n';
    }

    // In-use hostnames
    if (statusGroups['in-use'].length > 0) {
      responseText += `## 🔒 In-Use Hostnames (${statusGroups['in-use'].length})\n`;
      statusGroups['in-use'].forEach((analysis) => {
        const prop = analysis.currentProperty!;
        responseText += `- **${analysis.hostname}**\n`;
        responseText += `  - Property: ${prop.propertyName} (${prop.propertyId})\n`;
        responseText += `  - Edge Hostname: ${prop.edgeHostname}\n`;
        responseText += `  - Network: ${prop.network}\n`;
        if (prop.certificateStatus) {
          responseText += `  - Certificate: ${prop.certificateStatus}\n`;
        }
      });
      responseText += '\n';
    }

    // Conflicting hostnames
    if (statusGroups.conflict.length > 0) {
      responseText += `## ⚠️ Conflicting Hostnames (${statusGroups.conflict.length})\n`;
      statusGroups.conflict.forEach((analysis) => {
        responseText += `- **${analysis.hostname}**\n`;
        analysis.conflicts.forEach((conflict) => {
          responseText += `  - ${conflict.severity}: ${conflict.description}\n`;
          responseText += `    - Resolution: ${conflict.resolution}\n`;
        });
        if (analysis.wildcardCoverage.length > 0) {
          responseText += '  - Wildcard Coverage:\n';
          analysis.wildcardCoverage.forEach((wc) => {
            responseText += `    - ${wc.wildcardHostname} in ${wc.propertyName}\n`;
          });
        }
      });
      responseText += '\n';
    }

    // Invalid hostnames
    if (statusGroups.invalid.length > 0) {
      responseText += `## ❌ Invalid Hostnames (${statusGroups.invalid.length})\n`;
      statusGroups.invalid.forEach((analysis) => {
        responseText += `- **${analysis.hostname}**\n`;
        analysis.validationIssues.forEach((issue) => {
          responseText += `  - ${issue}\n`;
        });
      });
      responseText += '\n';
    }

    // Summary recommendations
    if (args.includeRecommendations) {
      responseText += '## 📋 Provisioning Recommendations\n';
      const availableCount = statusGroups.available.length;
      if (availableCount > 0) {
        if (availableCount > 5) {
          responseText += `- Consider bulk provisioning for ${availableCount} hostnames\n`;
          responseText += '- Group related hostnames into shared properties\n';
        }
        responseText += '- Use DefaultDV certificates for quick SSL provisioning\n';
        responseText += '- Enable Enhanced TLS for optimal performance\n';
      }
    }

    responseText += '\n## Next Steps\n';
    if (statusGroups.available.length > 0) {
      responseText += '1. Create edge hostnames for available domains\n';
      responseText += '2. Provision properties with appropriate templates\n';
      responseText += '3. Configure DNS CNAME records\n';
    }
    if (statusGroups.conflict.length > 0) {
      responseText += '1. Resolve conflicts before provisioning\n';
      responseText += '2. Consider consolidating with existing properties\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        }
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'analyze hostname ownership',
            parameters: args,
            timestamp: new Date(),
          }),
        }
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
    preferredSuffix?: '.edgekey.net' | '.edgesuite.net' | '.akamaized.net';
    forceSecure?: boolean;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const recommendations: EdgeHostnameRecommendation[] = [];

    for (const hostname of args.hostnames) {
      // Extract base domain components
      const parts = hostname.split('.');
      const isApi = parts[0] === 'api' || parts[0]?.includes('api') || false;
      const isStatic = parts[0] === 'static' || parts[0] === 'cdn' || parts[0] === 'assets';

      // Determine suffix
      let suffix = args.preferredSuffix || '.edgekey.net';
      let secure = args.forceSecure !== false;
      let certificateType: 'DEFAULT_DV' | 'CPS' | 'THIRD_PARTY' = 'DEFAULT_DV';

      // Intelligent recommendations based on hostname patterns
      if (isApi) {
        secure = true;
        certificateType = 'DEFAULT_DV';
        suffix = '.edgekey.net'; // Always use edgekey for APIs
      } else if (isStatic) {
        // Static content can use edgesuite for cost optimization
        if (!args.forceSecure) {
          suffix = '.edgesuite.net';
          secure = false;
        }
      }

      // Generate edge hostname
      const edgeHostname = generateEdgeHostname(hostname, suffix);

      recommendations.push({
        hostname,
        suggestedEdgeHostname: edgeHostname,
        domainSuffix: suffix,
        secure,
        ipVersion: 'IPV4_IPV6', // Default to dual-stack
        certificateType,
        rationale: generateEdgeHostnameRationale(hostname, suffix, secure),
      });
    }

    // Format response
    let responseText = '# Edge Hostname Recommendations\n\n';
    responseText += `**Total Hostnames:** ${args.hostnames.length}\n\n`;

    // Group by suffix
    const bySuffix = recommendations.reduce(
      (acc, rec) => {
        const suffix = rec.domainSuffix as string;
        if (!acc[suffix]) {
acc[suffix] = [];
}
        acc[suffix].push(rec);
        return acc;
      },
      {} as Record<string, EdgeHostnameRecommendation[]>,
    );

    Object.entries(bySuffix).forEach(([suffix, recs]) => {
      responseText += `## ${suffix} (${recs.length} hostnames)\n\n`;

      recs.forEach((rec) => {
        responseText += `### ${rec.hostname}\n`;
        responseText += `- **Edge Hostname:** \`${rec.suggestedEdgeHostname}\`\n`;
        responseText += `- **Secure:** ${rec.secure ? '✅ Yes' : '❌ No'}\n`;
        responseText += `- **Certificate:** ${rec.certificateType}\n`;
        responseText += `- **IP Version:** ${rec.ipVersion}\n`;
        responseText += `- **Rationale:** ${rec.rationale}\n\n`;
      });
    });

    // Bulk creation commands
    responseText += '## Bulk Creation Commands\n\n';

    // Group secure hostnames
    const secureHostnames = recommendations.filter((r) => r.secure);
    if (secureHostnames.length > 0) {
      responseText += `### Secure Edge Hostnames (${secureHostnames.length})\n`;
      responseText += '```\n';
      secureHostnames.forEach((rec) => {
        responseText += 'Create edge hostname:\n';
        responseText += `- Domain prefix: ${rec.hostname.split('.')[0]}\n`;
        responseText += `- Domain suffix: ${rec.domainSuffix}\n`;
        responseText += '- Secure: true\n';
        responseText += `- IP version: ${rec.ipVersion}\n\n`;
      });
      responseText += '```\n\n';
    }

    // Summary
    responseText += '## Summary\n';
    responseText += `- **Secure Hostnames:** ${secureHostnames.length}\n`;
    responseText += `- **Non-Secure Hostnames:** ${recommendations.length - secureHostnames.length}\n`;
    responseText += `- **DefaultDV Certificates:** ${recommendations.filter((r) => r.certificateType === 'DEFAULT_DV').length}\n\n`;

    responseText += '## Next Steps\n';
    responseText += '1. Review and adjust recommendations as needed\n';
    responseText += '2. Create edge hostnames using the bulk commands\n';
    responseText += '3. Update DNS CNAME records after creation\n';

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        }
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'generate edge hostname recommendations',
            parameters: args,
            timestamp: new Date(),
          }),
        }
      ],
    };
  }
}

/**
 * Validate hostnames in bulk
 */
export async function validateHostnamesBulk(
  client: AkamaiClient,
  args: {
    hostnames: string[];
    checkDNS?: boolean;
    checkCertificates?: boolean;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const validation: BulkHostnameValidation = {
      totalHostnames: args.hostnames.length,
      validHostnames: [],
      invalidHostnames: [],
      conflicts: [],
      recommendations: [],
    };

    // Get existing hostnames for conflict detection
    const allHostnamesResponse = await client._request({
      path: '/papi/v1/hostnames',
      method: 'GET',
    });
    const existingHostnames = allHostnamesResponse.hostnames?.items || [];

    // Validate each hostname
    for (const hostname of args.hostnames) {
      // Format validation
      if (!isValidHostname(hostname)) {
        validation.invalidHostnames.push({
          hostname,
          reason: 'Invalid hostname format',
        });
        continue;
      }

      // Length validation
      if (hostname.length > 253) {
        validation.invalidHostnames.push({
          hostname,
          reason: 'Hostname exceeds maximum length (253 characters)',
        });
        continue;
      }

      // Label validation
      const labels = hostname.split('.');
      const invalidLabel = labels.find(
        (label) =>
          label.length > 63 ||
          label.startsWith('-') ||
          label.endsWith('-') ||
          !/^[a-zA-Z0-9-]+$/.test(label),
      );

      if (invalidLabel) {
        validation.invalidHostnames.push({
          hostname,
          reason: `Invalid label: ${invalidLabel}`,
        });
        continue;
      }

      // TLD validation
      if (labels.length < 2) {
        validation.invalidHostnames.push({
          hostname,
          reason: 'Missing top-level domain',
        });
        continue;
      }

      // Check for conflicts
      const conflicts = detectHostnameConflicts(hostname, existingHostnames);
      if (conflicts.length > 0) {
        validation.conflicts.push({ hostname, conflicts });
      }

      // If all validations pass
      validation.validHostnames.push(hostname);

      // Generate recommendations
      const recommendations = generateValidationRecommendations(hostname, existingHostnames);
      if (recommendations.length > 0) {
        validation.recommendations.push({ hostname, recommendations });
      }
    }

    // DNS validation (if requested)
    if (args.checkDNS && validation.validHostnames.length > 0) {
      // Note: Actual DNS validation would require external DNS queries
      // This is a placeholder for the response format
    }

    // Format response
    let responseText = '# Bulk Hostname Validation Results\n\n';
    responseText += `**Total Hostnames:** ${validation.totalHostnames}\n`;
    responseText += `**Valid:** ${validation.validHostnames.length} ✅\n`;
    responseText += `**Invalid:** ${validation.invalidHostnames.length} ❌\n`;
    responseText += `**Conflicts:** ${validation.conflicts.length} ⚠️\n\n`;

    // Valid hostnames
    if (validation.validHostnames.length > 0) {
      responseText += `## ✅ Valid Hostnames (${validation.validHostnames.length})\n`;
      validation.validHostnames.forEach((hostname) => {
        responseText += `- ${hostname}\n`;
      });
      responseText += '\n';
    }

    // Invalid hostnames
    if (validation.invalidHostnames.length > 0) {
      responseText += `## ❌ Invalid Hostnames (${validation.invalidHostnames.length})\n`;
      validation.invalidHostnames.forEach(({ hostname, reason }) => {
        responseText += `- **${hostname}**: ${reason}\n`;
      });
      responseText += '\n';
    }

    // Conflicts
    if (validation.conflicts.length > 0) {
      responseText += `## ⚠️ Hostname Conflicts (${validation.conflicts.length})\n`;
      validation.conflicts.forEach(({ hostname, conflicts }) => {
        responseText += `- **${hostname}**\n`;
        conflicts.forEach((conflict) => {
          responseText += `  - ${conflict.severity}: ${conflict.description}\n`;
        });
      });
      responseText += '\n';
    }

    // Recommendations
    if (validation.recommendations.length > 0) {
      responseText += '## 💡 Recommendations\n';
      validation.recommendations.forEach(({ hostname, recommendations }) => {
        responseText += `- **${hostname}**\n`;
        recommendations.forEach((rec) => {
          responseText += `  - ${rec.recommendation}\n`;
        });
      });
      responseText += '\n';
    }

    // Summary statistics
    responseText += '## Validation Summary\n';
    const successRate = Math.round(
      (validation.validHostnames.length / validation.totalHostnames) * 100,
    );
    responseText += `- **Success Rate:** ${successRate}%\n`;

    if (validation.invalidHostnames.length > 0) {
      const reasons = validation.invalidHostnames.reduce(
        (acc, { reason }) => {
          acc[reason] = (acc[reason] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      responseText += '- **Failure Reasons:**\n';
      Object.entries(reasons).forEach(([reason, count]) => {
        responseText += `  - ${reason}: ${count}\n`;
      });
    }

    responseText += '\n## Next Steps\n';
    if (validation.validHostnames.length > 0) {
      responseText += `1. Proceed with provisioning ${validation.validHostnames.length} valid hostnames\n`;
      responseText += '2. Create edge hostnames and properties\n';
    }
    if (validation.invalidHostnames.length > 0) {
      responseText += `1. Fix ${validation.invalidHostnames.length} invalid hostnames\n`;
      responseText += '2. Re-validate after corrections\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        }
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'validate hostnames bulk',
            parameters: args,
            timestamp: new Date(),
          }),
        }
      ],
    };
  }
}

/**
 * Find optimal property assignment for hostnames
 */
export async function findOptimalPropertyAssignment(
  client: AkamaiClient,
  args: {
    hostnames: string[];
    groupingStrategy?: 'by-domain' | 'by-function' | 'by-environment' | 'auto';
    maxHostnamesPerProperty?: number;
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const strategy = args.groupingStrategy || 'auto';
    const maxPerProperty = args.maxHostnamesPerProperty || 100;

    // Get existing properties
    const propertiesResponse = await client._request({
      path: '/papi/v1/properties',
      method: 'GET',
    });
    const existingProperties = propertiesResponse.properties?.items || [];

    // Analyze hostnames for grouping
    const hostnameGroups = groupHostnamesByStrategy(args.hostnames, strategy);

    // Format response
    let responseText = '# Optimal Property Assignment Analysis\n\n';
    responseText += `**Total Hostnames:** ${args.hostnames.length}\n`;
    responseText += `**Grouping Strategy:** ${strategy}\n`;
    responseText += `**Max Hostnames per Property:** ${maxPerProperty}\n`;
    responseText += `**Suggested Property Groups:** ${Object.keys(hostnameGroups).length}\n\n`;

    // Display groupings
    let groupIndex = 1;
    Object.entries(hostnameGroups).forEach(([groupName, hostnames]) => {
      responseText += `## Property Group ${groupIndex}: ${groupName}\n`;
      responseText += `**Hostnames:** ${hostnames.length}\n\n`;

      // Check if group can use existing property
      const matchingProperty = findMatchingProperty(groupName, hostnames, existingProperties);

      if (matchingProperty) {
        responseText += '### ♻️ Reuse Existing Property\n';
        responseText += `- **Property:** ${matchingProperty.propertyName} (${matchingProperty.propertyId})\n`;
        responseText += `- **Current Hostnames:** ${matchingProperty.hostnameCount || 0}\n`;
        responseText += `- **Available Capacity:** ${maxPerProperty - (matchingProperty.hostnameCount || 0)}\n\n`;
      } else {
        responseText += '### 🆕 Create New Property\n';
        responseText += `- **Suggested Name:** ${generatePropertyName(groupName, hostnames)}\n`;
        responseText += '- **Product:** Ion (recommended for mixed content)\n';
        responseText += '- **Rule Template:** Auto-select based on content type\n\n';
      }

      responseText += '### Hostnames in this group:\n';
      hostnames.slice(0, 10).forEach((hostname) => {
        responseText += `- ${hostname}\n`;
      });
      if (hostnames.length > 10) {
        responseText += `- ... and ${hostnames.length - 10} more\n`;
      }
      responseText += '\n';

      groupIndex++;
    });

    // Optimization recommendations
    responseText += '## 📊 Optimization Analysis\n';

    // Certificate optimization
    const wildcardOpportunities = findWildcardOpportunities(args.hostnames);
    if (wildcardOpportunities.length > 0) {
      responseText += '### 🔐 Certificate Optimization\n';
      wildcardOpportunities.forEach((opp) => {
        responseText += `- Use wildcard certificate for \`*.${opp.domain}\` (covers ${opp.count} hostnames)\n`;
      });
      responseText += '\n';
    }

    // Performance recommendations
    responseText += '### ⚡ Performance Recommendations\n';
    responseText += '- Group API endpoints separately for optimized caching rules\n';
    responseText += '- Separate static assets into dedicated properties\n';
    responseText += '- Use shared CP codes for related hostnames\n\n';

    // Implementation plan
    responseText += '## 🚀 Implementation Plan\n';
    let step = 1;

    // Properties to create
    const newProperties = Object.entries(hostnameGroups).filter(
      ([_, hostnames]) => !findMatchingProperty('', hostnames, existingProperties),
    );

    if (newProperties.length > 0) {
      responseText += '### Phase 1: Property Creation\n';
      newProperties.forEach(([groupName, hostnames]) => {
        responseText += `${step}. Create property "${generatePropertyName(groupName, hostnames)}"\n`;
        step++;
      });
      responseText += '\n';
    }

    responseText += '### Phase 2: Edge Hostname Creation\n';
    responseText += `${step}. Create ${args.hostnames.length} edge hostnames with DefaultDV\n`;
    step++;
    responseText += `${step}. Wait for certificate validation\n`;
    step++;
    responseText += '\n';

    responseText += '### Phase 3: Hostname Assignment\n';
    responseText += `${step}. Add hostnames to properties according to groupings\n`;
    step++;
    responseText += `${step}. Configure property rules based on content type\n`;
    step++;
    responseText += '\n';

    responseText += '### Phase 4: Activation\n';
    responseText += `${step}. Activate all properties to staging\n`;
    step++;
    responseText += `${step}. Validate functionality\n`;
    step++;
    responseText += `${step}. Activate to production\n`;

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        }
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'find optimal property assignment',
            parameters: args,
            timestamp: new Date(),
          }),
        }
      ],
    };
  }
}

/**
 * Create hostname provisioning plan
 */
export async function createHostnameProvisioningPlan(
  client: AkamaiClient,
  args: {
    hostnames: string[];
    contractId: string;
    groupId: string;
    productId?: string;
    securityLevel?: 'standard' | 'enhanced' | 'advanced';
  }
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Validate all hostnames first
    const validationResult = await validateHostnamesBulk(client, {
      hostnames: args.hostnames,
    });

    // Extract valid hostnames from validation
    const validHostnames = extractValidHostnames(validationResult);

    if (validHostnames.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ No valid hostnames found. Please fix validation errors and try again.',
          }
        ],
      };
    }

    // Analyze ownership
    const ownershipResult = await analyzeHostnameOwnership(client, {
      hostnames: validHostnames,
      includeWildcardAnalysis: true,
      includeRecommendations: true,
    });

    // Generate edge hostname recommendations
    const edgeHostnameResult = await generateEdgeHostnameRecommendations(client, {
      hostnames: validHostnames,
      forceSecure: args.securityLevel !== 'standard',
    });

    // Find optimal property assignments
    const assignmentResult = await findOptimalPropertyAssignment(client, {
      hostnames: validHostnames,
      groupingStrategy: 'auto',
    });

    // Build comprehensive provisioning plan
    let responseText = '# Comprehensive Hostname Provisioning Plan\n\n';
    responseText += `**Contract:** ${args.contractId}\n`;
    responseText += `**Group:** ${args.groupId}\n`;
    responseText += `**Product:** ${args.productId || 'Ion (auto-selected)'}\n`;
    responseText += `**Security Level:** ${args.securityLevel || 'enhanced'}\n`;
    responseText += `**Valid Hostnames:** ${validHostnames.length}/${args.hostnames.length}\n\n`;

    // Validation summary
    responseText += '## 1️⃣ Validation Summary\n';
    responseText += extractSummaryFromResponse(validationResult);
    responseText += '\n';

    // Ownership analysis
    responseText += '## 2️⃣ Ownership Analysis\n';
    responseText += extractSummaryFromResponse(ownershipResult);
    responseText += '\n';

    // Edge hostname plan
    responseText += '## 3️⃣ Edge Hostname Configuration\n';
    responseText += extractSummaryFromResponse(edgeHostnameResult);
    responseText += '\n';

    // Property assignment
    responseText += '## 4️⃣ Property Assignment Strategy\n';
    responseText += extractSummaryFromResponse(assignmentResult);
    responseText += '\n';

    // Execution timeline
    responseText += '## 📅 Execution Timeline\n\n';
    responseText += '### Day 1: Preparation\n';
    responseText += '- Validate all prerequisites\n';
    responseText += '- Create required properties\n';
    responseText += '- Generate edge hostnames\n\n';

    responseText += '### Day 2-3: Certificate Provisioning\n';
    responseText += '- Create DefaultDV enrollments\n';
    responseText += '- Complete domain validation\n';
    responseText += '- Monitor certificate deployment\n\n';

    responseText += '### Day 4-5: Configuration\n';
    responseText += '- Add hostnames to properties\n';
    responseText += '- Configure property rules\n';
    responseText += '- Validate configurations\n\n';

    responseText += '### Day 6-7: Activation\n';
    responseText += '- Activate to staging\n';
    responseText += '- Perform testing\n';
    responseText += '- Activate to production\n\n';

    // Risk assessment
    responseText += '## ⚠️ Risk Assessment\n';
    responseText += '- **DNS Cutover Risk:** Low (using CNAME records)\n';
    responseText += '- **Certificate Risk:** Low (using DefaultDV)\n';
    responseText += '- **Downtime Risk:** None (gradual DNS transition)\n';
    responseText += '- **Rollback Strategy:** Keep original DNS records until verified\n\n';

    // Automation commands
    responseText += '## 🤖 Automation Commands\n';
    responseText += '```bash\n';
    responseText += '# Create properties\n';
    responseText += `akamai property create --name "property-name" --product ${args.productId || 'prd_Ion'} --contract ${args.contractId} --group ${args.groupId}\n\n`;
    responseText += '# Create edge hostnames\n';
    responseText += 'akamai edgehostname create --hostname "hostname" --secure true --cert DEFAULT\n\n';
    responseText += '# Add hostnames\n';
    responseText += 'akamai property hostname add --property "property-id" --hostname "hostname" --edgehostname "edge-hostname"\n';
    responseText += '```\n\n';

    responseText += '## ✅ Ready to Execute?\n';
    responseText += `This plan will provision ${validHostnames.length} hostnames across multiple properties with DefaultDV certificates.\n\n`;
    responseText += '**Next Step:** Execute the plan with:\n';
    responseText += `\`Execute hostname provisioning plan for ${validHostnames.length} hostnames\``;

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        }
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(_error, {
            operation: 'create hostname provisioning plan',
            parameters: args,
            timestamp: new Date(),
          }),
        }
      ],
    };
  }
}

// Helper functions

function isValidHostname(hostname: string): boolean {
  const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return hostnameRegex.test(hostname);
}

function getNetworkStatus(hostname: any): 'STAGING' | 'PRODUCTION' | 'BOTH' | 'NONE' {
  const staging = hostname.stagingStatus === 'ACTIVE';
  const production = hostname.productionStatus === 'ACTIVE';

  if (staging && production) {
return 'BOTH';
}
  if (staging) {
return 'STAGING';
}
  if (production) {
return 'PRODUCTION';
}
  return 'NONE';
}

function findWildcardCoverage(hostname: string, existingHostnames: any[]): WildcardCoverage[] {
  const coverage: WildcardCoverage[] = [];

  existingHostnames.forEach((existing) => {
    if (existing.cnameFrom.startsWith('*.')) {
      const wildcardDomain = existing.cnameFrom.substring(2);
      if (hostname.endsWith(wildcardDomain) && hostname !== wildcardDomain) {
        coverage.push({
          wildcardHostname: existing.cnameFrom,
          propertyId: existing.propertyId,
          propertyName: existing.propertyName,
          coverageType: 'full',
          certificateType: 'wildcard',
        });
      }
    }
  });

  return coverage;
}

function findSubdomainConflicts(hostname: string, existingHostnames: any[]): HostnameConflict[] {
  const conflicts: HostnameConflict[] = [];

  // Check if this hostname would conflict with existing subdomains
  existingHostnames.forEach((existing) => {
    // Check if one is a subdomain of the other
    if (hostname.endsWith(existing.cnameFrom) && hostname !== existing.cnameFrom) {
      conflicts.push({
        type: 'subdomain-hierarchy',
        severity: 'LOW',
        conflictingProperty: existing.propertyId,
        description: `${hostname} is a subdomain of existing ${existing.cnameFrom}`,
        resolution: 'Subdomains can coexist; ensure proper routing rules',
      });
    } else if (existing.cnameFrom.endsWith(hostname) && hostname !== existing.cnameFrom) {
      conflicts.push({
        type: 'subdomain-hierarchy',
        severity: 'MEDIUM',
        conflictingProperty: existing.propertyId,
        description: `${hostname} is a parent domain of existing ${existing.cnameFrom}`,
        resolution: 'Parent domain may affect subdomain routing; verify configuration',
      });
    }
  });

  return conflicts;
}

function generateHostnameRecommendations(
  analysis: HostnameAnalysis,
  existingHostnames: any[],
): HostnameRecommendation[] {
  const recommendations: HostnameRecommendation[] = [];

  if (analysis.status === 'available') {
    // Check if it fits with existing property patterns
    const domain = analysis.hostname.split('.').slice(-2).join('.');
    const relatedProperties = existingHostnames.filter((h) => h.cnameFrom.endsWith(domain));

    if (relatedProperties.length > 0) {
      recommendations.push({
        type: 'property-assignment',
        priority: 'HIGH',
        recommendation: `Consider adding to property ${relatedProperties[0].propertyName}`,
        rationale: 'Other hostnames from this domain are already in this property',
      });
    }

    // Edge hostname recommendations
    if (analysis.hostname.startsWith('api.') || analysis.hostname.includes('api-')) {
      recommendations.push({
        type: 'edge-hostname',
        priority: 'HIGH',
        recommendation: 'Use .edgekey.net with Enhanced TLS for API endpoints',
        rationale: 'API endpoints benefit from enhanced security and HTTP/2 support',
      });
    }
  }

  return recommendations;
}

function generateEdgeHostname(hostname: string, suffix: string): string {
  // Remove www. prefix if present
  const base = hostname.startsWith('www.') ? hostname.substring(4) : hostname;

  // For .edgekey.net, we can use the full hostname
  if (suffix === '.edgekey.net' || suffix === '.akamaized.net') {
    return hostname + suffix;
  }

  // For .edgesuite.net, traditional format
  return base + suffix;
}

function generateEdgeHostnameRationale(hostname: string, suffix: string, secure: boolean): string {
  const reasons: string[] = [];

  if (hostname.startsWith('api.') || hostname.includes('api-')) {
    reasons.push('API endpoint requires secure delivery');
  }

  if (suffix === '.edgekey.net') {
    reasons.push('Enhanced TLS network for optimal security');
    reasons.push('HTTP/2 and HTTP/3 support');
  } else if (suffix === '.edgesuite.net') {
    reasons.push('Standard delivery network');
    if (!secure) {
      reasons.push('Cost-optimized for non-secure content');
    }
  }

  return reasons.join('; ');
}

function detectHostnameConflicts(hostname: string, existingHostnames: any[]): HostnameConflict[] {
  const conflicts: HostnameConflict[] = [];

  // Check exact match
  const exactMatch = existingHostnames.find((h) => h.cnameFrom === hostname);
  if (exactMatch) {
    conflicts.push({
      type: 'exact-match',
      severity: 'HIGH',
      conflictingProperty: exactMatch.propertyId,
      description: 'Hostname already exists',
      resolution: 'Use existing property or choose different hostname',
    });
  }

  // Check wildcard conflicts
  const wildcardConflicts = findWildcardCoverage(hostname, existingHostnames);
  wildcardConflicts.forEach((wc) => {
    conflicts.push({
      type: 'wildcard-overlap',
      severity: 'MEDIUM',
      conflictingProperty: wc.propertyId,
      description: `Covered by wildcard ${wc.wildcardHostname}`,
      resolution: 'Can coexist; wildcard provides fallback',
    });
  });

  return conflicts;
}

function generateValidationRecommendations(
  hostname: string,
  existingHostnames: any[],
): HostnameRecommendation[] {
  const recommendations: HostnameRecommendation[] = [];

  // Check naming patterns
  if (
    !hostname.startsWith('www.') &&
    !hostname.startsWith('api.') &&
    !hostname.startsWith('cdn.')
  ) {
    const baseDomain = hostname.split('.').slice(1).join('.');
    if (!existingHostnames.some((h) => h.cnameFrom === `www.${baseDomain}`)) {
      recommendations.push({
        type: 'naming',
        priority: 'LOW',
        recommendation: `Consider also provisioning www.${baseDomain}`,
        rationale: 'Common practice to have both www and non-www versions',
      });
    }
  }

  return recommendations;
}

function groupHostnamesByStrategy(
  hostnames: string[],
  strategy: 'by-domain' | 'by-function' | 'by-environment' | 'auto',
): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  switch (strategy) {
    case 'by-domain':
      hostnames.forEach((hostname) => {
        const domain = hostname.split('.').slice(-2).join('.');
        if (!groups[domain]) {
groups[domain] = [];
}
        groups[domain].push(hostname);
      });
      break;

    case 'by-function':
      hostnames.forEach((hostname) => {
        let category = 'general';
        if (hostname.startsWith('api.') || hostname.includes('api-')) {
          category = 'api';
        } else if (
          hostname.startsWith('static.') ||
          hostname.startsWith('cdn.') ||
          hostname.startsWith('assets.')
        ) {
          category = 'static';
        } else if (hostname.startsWith('www.')) {
          category = 'www';
        }
        if (!groups[category]) {
groups[category] = [];
}
        groups[category].push(hostname);
      });
      break;

    case 'by-environment':
      hostnames.forEach((hostname) => {
        let env = 'production';
        if (hostname.includes('-dev') || hostname.includes('dev.')) {
          env = 'development';
        } else if (
          hostname.includes('-staging') ||
          hostname.includes('staging.') ||
          hostname.includes('-stg')
        ) {
          env = 'staging';
        }
        if (!groups[env]) {
groups[env] = [];
}
        groups[env].push(hostname);
      });
      break;

    case 'auto':
    default:
      // Intelligent grouping based on patterns
      hostnames.forEach((hostname) => {
        const parts = hostname.split('.');
        const domain = parts.slice(-2).join('.');
        const subdomain = parts[0];

        // Group by function if clear pattern
        if (subdomain && (subdomain === 'api' || subdomain.includes('api'))) {
          const key = `api-${domain}`;
          if (!groups[key]) {
groups[key] = [];
}
          groups[key].push(hostname);
        } else if (subdomain === 'static' || subdomain === 'cdn' || subdomain === 'assets') {
          const key = `static-${domain}`;
          if (!groups[key]) {
groups[key] = [];
}
          groups[key].push(hostname);
        } else {
          // Otherwise group by domain
          if (!groups[domain]) {
groups[domain] = [];
}
          groups[domain].push(hostname);
        }
      });
      break;
  }

  return groups;
}

function findMatchingProperty(
  _groupName: string,
  hostnames: string[],
  existingProperties: any[],
): any {
  // Look for properties that already have hostnames from the same domain
  const domain = hostnames[0]?.split('.').slice(-2).join('.');

  return existingProperties.find((property) => {
    // Check if property name matches pattern
    if (domain && property.propertyName.toLowerCase().includes(domain.split('.')[0])) {
      return true;
    }

    // Check if property already has related hostnames
    // This would require additional API call in real implementation
    return false;
  });
}

function generatePropertyName(groupName: string, hostnames: string[]): string {
  // Extract meaningful name from group
  if (groupName.includes('-')) {
    const parts = groupName.split('-');
    return `${parts[1]}-${parts[0]}`;
  }

  // Use first hostname as basis
  const firstHostname = hostnames[0];
  if (!firstHostname) {
return 'property';
}

  const parts = firstHostname.split('.');
  const domain = parts.slice(-2).join('.');
  const subdomain = parts[0];

  if (subdomain === 'www') {
    return domain.replace('.', '-');
  } else {
    return `${domain.replace('.', '-')}-${subdomain}`;
  }
}

function findWildcardOpportunities(hostnames: string[]): Array<{ domain: string; count: number }> {
  const domainCounts: Record<string, number> = {};

  hostnames.forEach((hostname) => {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const domain = parts.slice(-2).join('.');
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    }
  });

  // Return domains with 3+ subdomains as wildcard opportunities
  return Object.entries(domainCounts)
    .filter(([_, count]) => count >= 3)
    .map(([domain, count]) => ({ domain, count }));
}

function extractValidHostnames(validationResult: MCPToolResponse): string[] {
  const text = validationResult.content[0]?.text || '';
  const validSection = text.split('## ✅ Valid Hostnames')[1]?.split('##')[0] || '';

  return validSection
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.substring(2).trim())
    .filter((h) => h.length > 0);
}

function extractSummaryFromResponse(response: MCPToolResponse): string {
  const text = response.content[0]?.text || '';
  const lines = text.split('\n');

  // Extract first few summary lines
  const summaryLines: string[] = [];
  let foundSummary = false;

  for (const line of lines) {
    if (line.startsWith('**') && !foundSummary) {
      foundSummary = true;
    }
    if (foundSummary && line.trim() !== '') {
      summaryLines.push(line);
      if (summaryLines.length >= 3) {
break;
}
    }
  }

  return summaryLines.join('\n');
}
