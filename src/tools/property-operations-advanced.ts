/**
 * Advanced Property Operations and Search Tools
 * Comprehensive property management including search, comparison, health checks, and bulk updates
 */

import { ErrorTranslator } from '@utils/errors';
import { formatPropertyDisplay } from '@utils/formatting';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Property search types
export interface PropertySearchCriteria {
  name?: string;
  hostname?: string;
  edgeHostname?: string;
  contractId?: string;
  groupId?: string;
  productId?: string;
  activationStatus?: 'production' | 'staging' | 'both' | 'none';
  lastModifiedAfter?: Date;
  lastModifiedBefore?: Date;
  hasWarnings?: boolean;
  hasErrors?: boolean;
  certificateStatus?: 'valid' | 'expiring' | 'expired';
  ruleFormat?: string;
}

export interface PropertySearchResult {
  propertyId: string;
  propertyName: string;
  contractId: string;
  groupId: string;
  productId: string;
  latestVersion: number;
  productionVersion?: number;
  stagingVersion?: number;
  lastModified: Date;
  hostnames: string[];
  edgeHostnames: string[];
  score: number; // Relevance score
  matchReasons: string[];
}

// Property comparison types
export interface PropertyComparisonResult {
  propertyA: PropertyInfo;
  propertyB: PropertyInfo;
  differences: {
    metadata: MetadataDifference[];
    hostnames: HostnameDifference[];
    rules: RuleDifference[];
    behaviors: BehaviorDifference[];
    activations: ActivationDifference[];
  };
  similarity: {
    overall: number;
    rules: number;
    behaviors: number;
    hostnames: number;
  };
}

export interface PropertyInfo {
  propertyId: string;
  propertyName: string;
  version: number;
  productId: string;
  ruleFormat: string;
}

export interface MetadataDifference {
  field: string;
  valueA: any;
  valueB: any;
}

export interface HostnameDifference {
  type: 'added' | 'removed' | 'modified';
  hostname: string;
  details?: string;
}

export interface RuleDifference {
  path: string;
  type: 'added' | 'removed' | 'modified';
  ruleA?: any;
  ruleB?: any;
}

export interface BehaviorDifference {
  behavior: string;
  path: string;
  type: 'added' | 'removed' | 'modified';
  optionsA?: any;
  optionsB?: any;
}

export interface ActivationDifference {
  network: 'STAGING' | 'PRODUCTION';
  versionA?: number;
  versionB?: number;
  statusA?: string;
  statusB?: string;
}

// Property health check types
export interface PropertyHealthCheck {
  propertyId: string;
  propertyName: string;
  version: number;
  overallHealth: 'healthy' | 'warning' | 'critical';
  checks: {
    configuration: HealthCheckResult;
    certificates: HealthCheckResult;
    hostnames: HealthCheckResult;
    rules: HealthCheckResult;
    performance: HealthCheckResult;
    security: HealthCheckResult;
  };
  recommendations: string[];
  issues: HealthIssue[];
}

export interface HealthCheckResult {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: string[];
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  issue: string;
  recommendation: string;
  impact?: string;
}

// Configuration drift types
export interface ConfigurationDrift {
  propertyId: string;
  propertyName: string;
  driftDetected: boolean;
  driftScore: number; // 0-100, higher means more drift
  drifts: DriftItem[];
  recommendations: string[];
}

export interface DriftItem {
  type: 'rule' | 'behavior' | 'hostname' | 'setting';
  description: string;
  expectedValue: any;
  actualValue: any;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

/**
 * Advanced property search with multiple criteria
 */
export async function searchPropertiesAdvanced(
  client: AkamaiClient,
  args: {
    criteria: PropertySearchCriteria;
    limit?: number;
    sortBy?: 'relevance' | 'name' | 'lastModified' | 'size';
    includeDetails?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const limit = args.limit || 50;

    // Get all properties
    const propertiesResponse = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
    });

    const properties = propertiesResponse.properties?.items || [];
    const searchResults: PropertySearchResult[] = [];

    // Search and score each property
    for (const property of properties) {
      let score = 0;
      const matchReasons: string[] = [];

      // Name matching
      if (args.criteria.name) {
        const nameScore = calculateStringMatch(property.propertyName, args.criteria.name);
        if (nameScore > 0) {
          score += nameScore * 10;
          matchReasons.push(
            `Name matches "${args.criteria.name}" (${Math.round(nameScore * 100)}%)`,
          );
        }
      }

      // Contract/Group/Product filtering
      if (args.criteria.contractId && property.contractId !== args.criteria.contractId) {
continue;
}
      if (args.criteria.groupId && property.groupId !== args.criteria.groupId) {
continue;
}
      if (args.criteria.productId && property.productId !== args.criteria.productId) {
continue;
}

      // Activation status filtering
      if (args.criteria.activationStatus) {
        const hasProduction = property.productionVersion > 0;
        const hasStaging = property.stagingVersion > 0;

        switch (args.criteria.activationStatus) {
          case 'production':
            if (!hasProduction) {
continue;
}
            matchReasons.push('Active in production');
            break;
          case 'staging':
            if (!hasStaging) {
continue;
}
            matchReasons.push('Active in staging');
            break;
          case 'both':
            if (!hasProduction || !hasStaging) {
continue;
}
            matchReasons.push('Active in both networks');
            break;
          case 'none':
            if (hasProduction || hasStaging) {
continue;
}
            matchReasons.push('Not activated');
            break;
        }
      }

      // Get additional details if needed
      let hostnames: string[] = [];
      let edgeHostnames: string[] = [];

      if (args.includeDetails || args.criteria.hostname || args.criteria.edgeHostname) {
        try {
          const hostnamesResponse = await client.request({
            path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`,
            method: 'GET',
          });

          const hostnameItems = hostnamesResponse.hostnames?.items || [];
          hostnames = hostnameItems.map((h: any) => String(h.cnameFrom));
          edgeHostnames = [
            ...new Set(hostnameItems.map((h: any) => String(h.cnameTo)).filter((h: string) => h)),
          ] as string[];

          // Hostname matching
          if (args.criteria.hostname) {
            const hostnameMatches = hostnames.filter((h) =>
              h.toLowerCase().includes(args.criteria.hostname!.toLowerCase()),
            );
            if (hostnameMatches.length > 0) {
              score += 15;
              matchReasons.push(`Hostname matches: ${hostnameMatches.join(', ')}`);
            } else {
              continue;
            }
          }

          // Edge hostname matching
          if (args.criteria.edgeHostname) {
            const edgeMatches = edgeHostnames.filter((h) =>
              h.toLowerCase().includes(args.criteria.edgeHostname!.toLowerCase()),
            );
            if (edgeMatches.length > 0) {
              score += 10;
              matchReasons.push(`Edge hostname matches: ${edgeMatches.join(', ')}`);
            } else {
              continue;
            }
          }
        } catch (_error) {
          // Continue without hostname data
        }
      }

      // Last modified filtering
      const lastModified = new Date(property.lastModified || property.updateDate);
      if (args.criteria.lastModifiedAfter && lastModified < args.criteria.lastModifiedAfter) {
continue;
}
      if (args.criteria.lastModifiedBefore && lastModified > args.criteria.lastModifiedBefore) {
continue;
}

      // Add to results if matches criteria
      if (score > 0 || matchReasons.length > 0 || !hasAnyCriteria(args.criteria)) {
        searchResults.push({
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          contractId: property.contractId,
          groupId: property.groupId,
          productId: property.productId,
          latestVersion: property.latestVersion,
          productionVersion: property.productionVersion,
          stagingVersion: property.stagingVersion,
          lastModified,
          hostnames,
          edgeHostnames,
          score,
          matchReasons,
        });
      }
    }

    // Sort results
    switch (args.sortBy) {
      case 'name':
        searchResults.sort((a, b) => a.propertyName.localeCompare(b.propertyName));
        break;
      case 'lastModified':
        searchResults.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        break;
      case 'relevance':
      default:
        searchResults.sort((a, b) => b.score - a.score);
    }

    // Apply limit
    const limitedResults = searchResults.slice(0, limit);

    // Format response
    let responseText = '# Advanced Property Search Results\n\n';
    responseText += `**Total Matches:** ${searchResults.length}`;
    if (searchResults.length > limit) {
      responseText += ` (showing top ${limit})`;
    }
    responseText += '\n\n';

    // Search criteria summary
    responseText += '## Search Criteria\n';
    if (args.criteria.name) {
responseText += `- **Name contains:** ${args.criteria.name}\n`;
}
    if (args.criteria.hostname) {
responseText += `- **Hostname contains:** ${args.criteria.hostname}\n`;
}
    if (args.criteria.edgeHostname) {
responseText += `- **Edge hostname contains:** ${args.criteria.edgeHostname}\n`;
}
    if (args.criteria.contractId) {
responseText += `- **Contract:** ${args.criteria.contractId}\n`;
}
    if (args.criteria.groupId) {
responseText += `- **Group:** ${args.criteria.groupId}\n`;
}
    if (args.criteria.productId) {
responseText += `- **Product:** ${args.criteria.productId}\n`;
}
    if (args.criteria.activationStatus) {
responseText += `- **Activation status:** ${args.criteria.activationStatus}\n`;
}
    responseText += '\n';

    // Results
    if (limitedResults.length === 0) {
      responseText += '❌ No properties found matching the search criteria.\n';
    } else {
      limitedResults.forEach((result, index) => {
        responseText += `## ${index + 1}. ${result.propertyName}\n`;
        responseText += `**Property ID:** ${result.propertyId}\n`;
        responseText += `**Score:** ${result.score}\n`;

        if (result.matchReasons.length > 0) {
          responseText += '**Match Reasons:**\n';
          result.matchReasons.forEach((reason) => {
            responseText += `- ${reason}\n`;
          });
        }

        responseText += `**Contract:** ${result.contractId} | **Group:** ${result.groupId}\n`;
        responseText += `**Product:** ${formatPropertyDisplay(result.productId)}\n`;
        responseText += `**Latest Version:** ${result.latestVersion}`;

        if (result.productionVersion) {
          responseText += ` | **Production:** v${result.productionVersion}`;
        }
        if (result.stagingVersion) {
          responseText += ` | **Staging:** v${result.stagingVersion}`;
        }
        responseText += '\n';

        responseText += `**Last Modified:** ${result.lastModified.toISOString()}\n`;

        if (args.includeDetails && result.hostnames.length > 0) {
          responseText += `**Hostnames:** ${result.hostnames.slice(0, 3).join(', ')}`;
          if (result.hostnames.length > 3) {
            responseText += ` ... +${result.hostnames.length - 3} more`;
          }
          responseText += '\n';
        }

        responseText += '\n';
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'search properties advanced',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Compare two properties in detail
 */
export async function compareProperties(
  client: AkamaiClient,
  args: {
    propertyIdA: string;
    propertyIdB: string;
    versionA?: number;
    versionB?: number;
    compareRules?: boolean;
    compareHostnames?: boolean;
    compareBehaviors?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Get property details
    const [propAResponse, propBResponse] = await Promise.all([
      client.request({
        path: `/papi/v1/properties/${args.propertyIdA}`,
        method: 'GET',
      }),
      client.request({
        path: `/papi/v1/properties/${args.propertyIdB}`,
        method: 'GET',
      }),
    ]);

    const propA = propAResponse.properties?.items?.[0];
    const propB = propBResponse.properties?.items?.[0];

    if (!propA || !propB) {
      throw new Error('One or both properties not found');
    }

    const versionA = args.versionA || propA.latestVersion;
    const versionB = args.versionB || propB.latestVersion;

    const comparison: PropertyComparisonResult = {
      propertyA: {
        propertyId: propA.propertyId,
        propertyName: propA.propertyName,
        version: versionA,
        productId: propA.productId,
        ruleFormat: propA.ruleFormat,
      },
      propertyB: {
        propertyId: propB.propertyId,
        propertyName: propB.propertyName,
        version: versionB,
        productId: propB.productId,
        ruleFormat: propB.ruleFormat,
      },
      differences: {
        metadata: [],
        hostnames: [],
        rules: [],
        behaviors: [],
        activations: [],
      },
      similarity: {
        overall: 0,
        rules: 0,
        behaviors: 0,
        hostnames: 0,
      },
    };

    // Compare metadata
    if (propA.productId !== propB.productId) {
      comparison.differences.metadata.push({
        field: 'productId',
        valueA: propA.productId,
        valueB: propB.productId,
      });
    }

    if (propA.ruleFormat !== propB.ruleFormat) {
      comparison.differences.metadata.push({
        field: 'ruleFormat',
        valueA: propA.ruleFormat,
        valueB: propB.ruleFormat,
      });
    }

    // Compare hostnames
    if (args.compareHostnames !== false) {
      const [hostnamesA, hostnamesB] = await Promise.all([
        client.request({
          path: `/papi/v1/properties/${args.propertyIdA}/versions/${versionA}/hostnames`,
          method: 'GET',
        }),
        client.request({
          path: `/papi/v1/properties/${args.propertyIdB}/versions/${versionB}/hostnames`,
          method: 'GET',
        }),
      ]);

      const hostSetA = new Set(hostnamesA.hostnames?.items?.map((h: any) => h.cnameFrom) || []);
      const hostSetB = new Set(hostnamesB.hostnames?.items?.map((h: any) => h.cnameFrom) || []);

      // Find differences
      hostSetA.forEach((hostname: unknown) => {
        if (!hostSetB.has(hostname)) {
          comparison.differences.hostnames.push({
            type: 'removed',
            hostname: String(hostname),
            details: `Present in ${propA.propertyName} but not in ${propB.propertyName}`,
          });
        }
      });

      hostSetB.forEach((hostname: unknown) => {
        if (!hostSetA.has(hostname)) {
          comparison.differences.hostnames.push({
            type: 'added',
            hostname: String(hostname),
            details: `Present in ${propB.propertyName} but not in ${propA.propertyName}`,
          });
        }
      });

      // Calculate hostname similarity
      const commonHostnames = [...hostSetA].filter((h) => hostSetB.has(h)).length;
      const totalHostnames = new Set([...hostSetA, ...hostSetB]).size;
      comparison.similarity.hostnames =
        totalHostnames > 0 ? (commonHostnames / totalHostnames) * 100 : 100;
    }

    // Compare rules
    if (args.compareRules !== false) {
      const [rulesA, rulesB] = await Promise.all([
        client.request({
          path: `/papi/v1/properties/${args.propertyIdA}/versions/${versionA}/rules`,
          method: 'GET',
          headers: {
            Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
          },
        }),
        client.request({
          path: `/papi/v1/properties/${args.propertyIdB}/versions/${versionB}/rules`,
          method: 'GET',
          headers: {
            Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
          },
        }),
      ]);

      // Compare rule structures
      const ruleDiffs = compareRuleStructures(rulesA.rules, rulesB.rules);
      comparison.differences.rules = ruleDiffs;

      // Compare behaviors
      if (args.compareBehaviors !== false) {
        const behaviorDiffs = compareBehaviors(rulesA.rules, rulesB.rules);
        comparison.differences.behaviors = behaviorDiffs;

        // Calculate behavior similarity
        const allBehaviors = new Set([
          ...extractAllBehaviors(rulesA.rules),
          ...extractAllBehaviors(rulesB.rules),
        ]);
        const commonBehaviors = [...extractAllBehaviors(rulesA.rules)].filter((b) =>
          extractAllBehaviors(rulesB.rules).has(b),
        ).length;
        comparison.similarity.behaviors =
          allBehaviors.size > 0 ? (commonBehaviors / allBehaviors.size) * 100 : 100;
      }

      // Calculate rule similarity (simplified)
      comparison.similarity.rules = 100 - ruleDiffs.length * 5; // Each diff reduces similarity by 5%
      comparison.similarity.rules = Math.max(0, comparison.similarity.rules);
    }

    // Compare activations
    comparison.differences.activations.push({
      network: 'PRODUCTION',
      versionA: propA.productionVersion,
      versionB: propB.productionVersion,
      statusA: propA.productionVersion ? 'ACTIVE' : 'INACTIVE',
      statusB: propB.productionVersion ? 'ACTIVE' : 'INACTIVE',
    });

    comparison.differences.activations.push({
      network: 'STAGING',
      versionA: propA.stagingVersion,
      versionB: propB.stagingVersion,
      statusA: propA.stagingVersion ? 'ACTIVE' : 'INACTIVE',
      statusB: propB.stagingVersion ? 'ACTIVE' : 'INACTIVE',
    });

    // Calculate overall similarity
    comparison.similarity.overall =
      comparison.similarity.hostnames * 0.3 +
      comparison.similarity.rules * 0.4 +
      comparison.similarity.behaviors * 0.3;

    // Format response
    let responseText = '# Property Comparison Report\n\n';
    responseText += '## Properties Being Compared\n\n';
    responseText += `### Property A: ${comparison.propertyA.propertyName}\n`;
    responseText += `- **ID:** ${comparison.propertyA.propertyId}\n`;
    responseText += `- **Version:** ${comparison.propertyA.version}\n`;
    responseText += `- **Product:** ${formatPropertyDisplay(comparison.propertyA.productId)}\n`;
    responseText += `- **Rule Format:** ${comparison.propertyA.ruleFormat}\n\n`;

    responseText += `### Property B: ${comparison.propertyB.propertyName}\n`;
    responseText += `- **ID:** ${comparison.propertyB.propertyId}\n`;
    responseText += `- **Version:** ${comparison.propertyB.version}\n`;
    responseText += `- **Product:** ${formatPropertyDisplay(comparison.propertyB.productId)}\n`;
    responseText += `- **Rule Format:** ${comparison.propertyB.ruleFormat}\n\n`;

    responseText += '## Similarity Scores\n';
    responseText += `- **Overall Similarity:** ${Math.round(comparison.similarity.overall)}%\n`;
    responseText += `- **Hostname Similarity:** ${Math.round(comparison.similarity.hostnames)}%\n`;
    responseText += `- **Rule Similarity:** ${Math.round(comparison.similarity.rules)}%\n`;
    responseText += `- **Behavior Similarity:** ${Math.round(comparison.similarity.behaviors)}%\n\n`;

    // Metadata differences
    if (comparison.differences.metadata.length > 0) {
      responseText += '## Metadata Differences\n';
      comparison.differences.metadata.forEach((diff) => {
        responseText += `- **${diff.field}:** ${diff.valueA} → ${diff.valueB}\n`;
      });
      responseText += '\n';
    }

    // Hostname differences
    if (comparison.differences.hostnames.length > 0) {
      responseText += `## Hostname Differences (${comparison.differences.hostnames.length})\n`;
      const added = comparison.differences.hostnames.filter((h) => h.type === 'added');
      const removed = comparison.differences.hostnames.filter((h) => h.type === 'removed');

      if (added.length > 0) {
        responseText += '### Added in Property B:\n';
        added.forEach((h) => (responseText += `- ${h.hostname}\n`));
      }

      if (removed.length > 0) {
        responseText += '### Removed from Property B:\n';
        removed.forEach((h) => (responseText += `- ${h.hostname}\n`));
      }
      responseText += '\n';
    }

    // Rule differences
    if (comparison.differences.rules.length > 0) {
      responseText += `## Rule Differences (${comparison.differences.rules.length})\n`;
      comparison.differences.rules.slice(0, 10).forEach((diff) => {
        responseText += `- **${diff.type}** at ${diff.path}\n`;
      });
      if (comparison.differences.rules.length > 10) {
        responseText += `- ... and ${comparison.differences.rules.length - 10} more differences\n`;
      }
      responseText += '\n';
    }

    // Behavior differences
    if (comparison.differences.behaviors.length > 0) {
      responseText += `## Behavior Differences (${comparison.differences.behaviors.length})\n`;
      comparison.differences.behaviors.slice(0, 10).forEach((diff) => {
        responseText += `- **${diff.behavior}** (${diff.type}) at ${diff.path}\n`;
      });
      if (comparison.differences.behaviors.length > 10) {
        responseText += `- ... and ${comparison.differences.behaviors.length - 10} more differences\n`;
      }
      responseText += '\n';
    }

    // Activation differences
    responseText += '## Activation Status\n';
    comparison.differences.activations.forEach((diff) => {
      responseText += `- **${diff.network}:** `;
      if (diff.versionA === diff.versionB) {
        responseText += `Both at v${diff.versionA || 'none'}\n`;
      } else {
        responseText += `v${diff.versionA || 'none'} → v${diff.versionB || 'none'}\n`;
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'compare properties',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Perform health check on property
 */
export async function checkPropertyHealth(
  client: AkamaiClient,
  args: {
    propertyId: string;
    version?: number;
    includePerformance?: boolean;
    includeSecurity?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }

    const version = args.version || property.latestVersion;

    const healthCheck: PropertyHealthCheck = {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      version,
      overallHealth: 'healthy',
      checks: {
        configuration: { status: 'pass', message: 'Configuration is valid' },
        certificates: { status: 'pass', message: 'Certificates are valid' },
        hostnames: { status: 'pass', message: 'Hostnames are properly configured' },
        rules: { status: 'pass', message: 'Rules are valid' },
        performance: { status: 'pass', message: 'Performance optimizations in place' },
        security: { status: 'pass', message: 'Security best practices followed' },
      },
      recommendations: [],
      issues: [],
    };

    // Get rule tree for analysis
    const rulesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/rules`,
      method: 'GET',
      headers: {
        Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
      },
    });

    const rules = rulesResponse.rules;

    // Configuration checks
    if (!property.productionVersion && !property.stagingVersion) {
      healthCheck.checks.configuration.status = 'warning';
      healthCheck.checks.configuration.message = 'Property not activated to any network';
      healthCheck.issues.push({
        severity: 'medium',
        category: 'configuration',
        issue: 'Property is not activated',
        recommendation: 'Activate property to staging for testing',
        impact: 'Property is not serving traffic',
      });
    }

    // Get hostnames for certificate checks
    const hostnamesResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}/versions/${version}/hostnames`,
      method: 'GET',
    });

    const hostnames = hostnamesResponse.hostnames?.items || [];

    // Certificate checks
    let hasInvalidCerts = false;
    hostnames.forEach((hostname: any) => {
      if (hostname.certStatus?.production?.[0]?.status === 'NEEDS_ACTIVATION') {
        hasInvalidCerts = true;
        healthCheck.issues.push({
          severity: 'high',
          category: 'certificates',
          issue: `Certificate not activated for ${hostname.cnameFrom}`,
          recommendation: 'Activate certificate for production use',
          impact: 'HTTPS traffic will fail',
        });
      }
    });

    if (hasInvalidCerts) {
      healthCheck.checks.certificates.status = 'fail';
      healthCheck.checks.certificates.message = 'One or more certificates need activation';
    }

    // Hostname checks
    const edgeHostnames = new Set(hostnames.map((h: any) => h.cnameTo));
    if (edgeHostnames.size > 5) {
      healthCheck.checks.hostnames.status = 'warning';
      healthCheck.checks.hostnames.message = 'Multiple edge hostnames detected';
      healthCheck.recommendations.push(
        'Consider consolidating edge hostnames for easier management',
      );
    }

    // Rule tree analysis
    const ruleAnalysis = analyzeRuleTree(rules);

    if (ruleAnalysis.warnings.length > 0) {
      healthCheck.checks.rules.status = 'warning';
      healthCheck.checks.rules.message = `${ruleAnalysis.warnings.length} rule warnings found`;
      healthCheck.checks.rules.details = ruleAnalysis.warnings;
    }

    // Performance checks
    if (args.includePerformance) {
      const perfAnalysis = analyzePerformance(rules);

      if (!perfAnalysis.hasHttp2) {
        healthCheck.checks.performance.status = 'warning';
        healthCheck.checks.performance.message = 'HTTP/2 not enabled';
        healthCheck.recommendations.push('Enable HTTP/2 for better performance');
      }

      if (!perfAnalysis.hasCaching) {
        healthCheck.checks.performance.status = 'warning';
        healthCheck.checks.performance.message = 'Caching not properly configured';
        healthCheck.issues.push({
          severity: 'medium',
          category: 'performance',
          issue: 'No caching rules found',
          recommendation: 'Add caching behaviors for static content',
          impact: 'Higher origin load and slower performance',
        });
      }
    }

    // Security checks
    if (args.includeSecurity) {
      const securityAnalysis = analyzeSecurity(rules);

      if (!securityAnalysis.hasHttpsRedirect) {
        healthCheck.checks.security.status = 'warning';
        healthCheck.checks.security.message = 'HTTPS redirect not configured';
        healthCheck.issues.push({
          severity: 'high',
          category: 'security',
          issue: 'No HTTP to HTTPS redirect',
          recommendation: 'Add redirect behavior to force HTTPS',
          impact: 'Users may access site over insecure HTTP',
        });
      }

      if (!securityAnalysis.hasSecurityHeaders) {
        healthCheck.recommendations.push(
          'Consider adding security headers (HSTS, X-Frame-Options, etc.)',
        );
      }
    }

    // Determine overall health
    const statuses = Object.values(healthCheck.checks).map((c) => c.status);
    if (statuses.includes('fail')) {
      healthCheck.overallHealth = 'critical';
    } else if (statuses.includes('warning')) {
      healthCheck.overallHealth = 'warning';
    }

    // Format response
    let responseText = '# Property Health Check Report\n\n';
    responseText += `**Property:** ${healthCheck.propertyName} (${healthCheck.propertyId})\n`;
    responseText += `**Version:** ${healthCheck.version}\n`;
    responseText += `**Overall Health:** ${getHealthEmoji(healthCheck.overallHealth)} ${healthCheck.overallHealth.toUpperCase()}\n\n`;

    responseText += '## Health Check Results\n\n';
    Object.entries(healthCheck.checks).forEach(([category, result]) => {
      responseText += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
      responseText += `${getHealthEmoji(result.status)} **Status:** ${result.status.toUpperCase()}\n`;
      responseText += `**Message:** ${result.message}\n`;
      if (result.details && result.details.length > 0) {
        responseText += '**Details:**\n';
        result.details.forEach((detail) => {
          responseText += `- ${detail}\n`;
        });
      }
      responseText += '\n';
    });

    // Issues
    if (healthCheck.issues.length > 0) {
      responseText += `## Issues Found (${healthCheck.issues.length})\n\n`;

      const criticalIssues = healthCheck.issues.filter((i) => i.severity === 'critical');
      const highIssues = healthCheck.issues.filter((i) => i.severity === 'high');
      const mediumIssues = healthCheck.issues.filter((i) => i.severity === 'medium');
      const lowIssues = healthCheck.issues.filter((i) => i.severity === 'low');

      if (criticalIssues.length > 0) {
        responseText += '### 🔴 Critical Issues\n';
        criticalIssues.forEach((issue) => {
          responseText += formatIssue(issue);
        });
      }

      if (highIssues.length > 0) {
        responseText += '### 🟠 High Priority Issues\n';
        highIssues.forEach((issue) => {
          responseText += formatIssue(issue);
        });
      }

      if (mediumIssues.length > 0) {
        responseText += '### 🟡 Medium Priority Issues\n';
        mediumIssues.forEach((issue) => {
          responseText += formatIssue(issue);
        });
      }

      if (lowIssues.length > 0) {
        responseText += '### 🟢 Low Priority Issues\n';
        lowIssues.forEach((issue) => {
          responseText += formatIssue(issue);
        });
      }
    }

    // Recommendations
    if (healthCheck.recommendations.length > 0) {
      responseText += '## 💡 Recommendations\n\n';
      healthCheck.recommendations.forEach((rec) => {
        responseText += `- ${rec}\n`;
      });
    }

    // Next steps
    responseText += '\n## Next Steps\n';
    if (healthCheck.overallHealth === 'critical') {
      responseText += '1. Address critical issues immediately\n';
      responseText += '2. Review and fix certificate problems\n';
      responseText += '3. Re-run health check after fixes\n';
    } else if (healthCheck.overallHealth === 'warning') {
      responseText += '1. Review and address warnings\n';
      responseText += '2. Implement recommended optimizations\n';
      responseText += '3. Consider security enhancements\n';
    } else {
      responseText += '1. Property is healthy!\n';
      responseText += '2. Consider implementing recommendations for optimization\n';
      responseText += '3. Schedule regular health checks\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'check property health',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Detect configuration drift
 */
export async function detectConfigurationDrift(
  client: AkamaiClient,
  args: {
    propertyId: string;
    baselineVersion: number;
    compareVersion?: number;
    checkBehaviors?: boolean;
    checkHostnames?: boolean;
    checkSettings?: boolean;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    // Get property details
    const propertyResponse = await client.request({
      path: `/papi/v1/properties/${args.propertyId}`,
      method: 'GET',
    });

    const property = propertyResponse.properties?.items?.[0];
    if (!property) {
      throw new Error('Property not found');
    }

    const compareVersion = args.compareVersion || property.latestVersion;

    const drift: ConfigurationDrift = {
      propertyId: property.propertyId,
      propertyName: property.propertyName,
      driftDetected: false,
      driftScore: 0,
      drifts: [],
      recommendations: [],
    };

    // Get rules for both versions
    const [baselineRules, compareRules] = await Promise.all([
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${args.baselineVersion}/rules`,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
        },
      }),
      client.request({
        path: `/papi/v1/properties/${args.propertyId}/versions/${compareVersion}/rules`,
        method: 'GET',
        headers: {
          Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
        },
      }),
    ]);

    // Check behaviors
    if (args.checkBehaviors !== false) {
      const behaviorDrifts = detectBehaviorDrifts(baselineRules.rules, compareRules.rules);
      drift.drifts.push(...behaviorDrifts);
    }

    // Check hostnames
    if (args.checkHostnames !== false) {
      const [baselineHostnames, compareHostnames] = await Promise.all([
        client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${args.baselineVersion}/hostnames`,
          method: 'GET',
        }),
        client.request({
          path: `/papi/v1/properties/${args.propertyId}/versions/${compareVersion}/hostnames`,
          method: 'GET',
        }),
      ]);

      const hostnameDrifts = detectHostnameDrifts(
        baselineHostnames.hostnames?.items || [],
        compareHostnames.hostnames?.items || [],
      );
      drift.drifts.push(...hostnameDrifts);
    }

    // Calculate drift score
    drift.driftScore = calculateDriftScore(drift.drifts);
    drift.driftDetected = drift.driftScore > 0;

    // Generate recommendations
    if (drift.driftScore > 50) {
      drift.recommendations.push('Significant drift detected - review all changes carefully');
      drift.recommendations.push('Consider creating a new baseline after review');
    } else if (drift.driftScore > 20) {
      drift.recommendations.push('Moderate drift detected - verify changes are intentional');
    }

    if (drift.drifts.some((d) => d.type === 'behavior' && d.impact === 'high')) {
      drift.recommendations.push(
        'High-impact behavior changes detected - test thoroughly before activation',
      );
    }

    // Format response
    let responseText = '# Configuration Drift Analysis\n\n';
    responseText += `**Property:** ${drift.propertyName} (${drift.propertyId})\n`;
    responseText += `**Baseline Version:** ${args.baselineVersion}\n`;
    responseText += `**Compare Version:** ${compareVersion}\n`;
    responseText += `**Drift Score:** ${drift.driftScore}/100\n`;
    responseText += `**Drift Status:** ${drift.driftDetected ? '⚠️ DRIFT DETECTED' : '✅ NO DRIFT'}\n\n`;

    if (drift.drifts.length > 0) {
      responseText += `## Drift Details (${drift.drifts.length} items)\n\n`;

      // Group by impact
      const highImpact = drift.drifts.filter((d) => d.impact === 'high');
      const mediumImpact = drift.drifts.filter((d) => d.impact === 'medium');
      const lowImpact = drift.drifts.filter((d) => d.impact === 'low');

      if (highImpact.length > 0) {
        responseText += '### 🔴 High Impact Changes\n';
        highImpact.forEach((drift) => {
          responseText += formatDrift(drift);
        });
      }

      if (mediumImpact.length > 0) {
        responseText += '### 🟡 Medium Impact Changes\n';
        mediumImpact.forEach((drift) => {
          responseText += formatDrift(drift);
        });
      }

      if (lowImpact.length > 0) {
        responseText += '### 🟢 Low Impact Changes\n';
        lowImpact.forEach((drift) => {
          responseText += formatDrift(drift);
        });
      }
    } else {
      responseText += '## No Configuration Drift Detected\n\n';
      responseText += `The configuration in version ${compareVersion} matches the baseline version ${args.baselineVersion}.\n`;
    }

    // Recommendations
    if (drift.recommendations.length > 0) {
      responseText += '\n## Recommendations\n\n';
      drift.recommendations.forEach((rec) => {
        responseText += `- ${rec}\n`;
      });
    }

    // Next steps
    responseText += '\n## Next Steps\n';
    if (drift.driftDetected) {
      responseText += '1. Review each drift item to verify it\'s intentional\n';
      responseText += '2. Test changes in staging environment\n';
      responseText += '3. Document significant changes\n';
      responseText += '4. Consider updating baseline after verification\n';
    } else {
      responseText += '1. No action required - configuration is stable\n';
      responseText += '2. Continue monitoring for future changes\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'detect configuration drift',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

/**
 * Update multiple properties with common changes
 */
export async function bulkUpdateProperties(
  client: AkamaiClient,
  args: {
    propertyIds: string[];
    updates: {
      addBehavior?: {
        name: string;
        options?: any;
        criteria?: any[];
      };
      updateBehavior?: {
        name: string;
        options?: any;
      };
      addHostname?: {
        hostname: string;
        edgeHostname: string;
      };
      removeHostname?: string;
    };
    createNewVersion?: boolean;
    note?: string;
  },
): Promise<MCPToolResponse> {
  const errorTranslator = new ErrorTranslator();

  try {
    const results: Array<{
      propertyId: string;
      propertyName: string;
      success: boolean;
      message: string;
      newVersion?: number;
    }> = [];

    // Process each property
    for (const propertyId of args.propertyIds) {
      try {
        // Get property details
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
        });

        const property = propertyResponse.properties?.items?.[0];
        if (!property) {
          results.push({
            propertyId,
            propertyName: 'Unknown',
            success: false,
            message: 'Property not found',
          });
          continue;
        }

        let version = property.latestVersion;

        // Create new version if requested
        if (args.createNewVersion) {
          const versionResponse = await client.request({
            path: `/papi/v1/properties/${propertyId}/versions`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            queryParams: {
              contractId: property.contractId,
              groupId: property.groupId,
            },
            body: {
              createFromVersion: version,
              createFromVersionEtag: property.etag,
            },
          });

          version = parseInt(versionResponse.versionLink.split('/').pop());
        }

        // Apply updates
        let updateApplied = false;

        // Update rules if behavior changes requested
        if (args.updates.addBehavior || args.updates.updateBehavior) {
          const rulesResponse = await client.request({
            path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
            method: 'GET',
            headers: {
              Accept: 'application/vnd.akamai.papirules.v2024-02-12+json',
            },
          });

          const rules = rulesResponse.rules;

          // Add behavior
          if (args.updates.addBehavior) {
            if (!rules.behaviors) {
rules.behaviors = [];
}
            rules.behaviors.push({
              name: args.updates.addBehavior.name,
              options: args.updates.addBehavior.options,
            });
            updateApplied = true;
          }

          // Update behavior
          if (args.updates.updateBehavior) {
            const behaviorIndex = rules.behaviors?.findIndex(
              (b: any) => b.name === args.updates.updateBehavior!.name,
            );
            if (behaviorIndex !== undefined && behaviorIndex >= 0) {
              rules.behaviors[behaviorIndex].options = {
                ...rules.behaviors[behaviorIndex].options,
                ...args.updates.updateBehavior.options,
              };
              updateApplied = true;
            }
          }

          // Save updated rules
          if (updateApplied) {
            await client.request({
              path: `/papi/v1/properties/${propertyId}/versions/${version}/rules`,
              method: 'PUT',
              headers: {
                'Content-Type': 'application/vnd.akamai.papirules.v2024-02-12+json',
              },
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId,
                validateRules: 'true',
              },
              body: {
                rules: rules,
              },
            });
          }
        }

        // Update hostnames
        if (args.updates.addHostname || args.updates.removeHostname) {
          // Add hostname
          if (args.updates.addHostname) {
            await client.request({
              path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`,
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              queryParams: {
                contractId: property.contractId,
                groupId: property.groupId,
              },
              body: [
                {
                  op: 'add',
                  path: '/hostnames/-',
                  value: {
                    cnameType: 'EDGE_HOSTNAME',
                    cnameFrom: args.updates.addHostname.hostname,
                    cnameTo: args.updates.addHostname.edgeHostname,
                  },
                },
              ],
            });
            updateApplied = true;
          }

          // Remove hostname
          if (args.updates.removeHostname) {
            const hostnamesResponse = await client.request({
              path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`,
              method: 'GET',
            });

            const hostnameIndex = hostnamesResponse.hostnames?.items?.findIndex(
              (h: any) => h.cnameFrom === args.updates.removeHostname,
            );

            if (hostnameIndex !== undefined && hostnameIndex >= 0) {
              await client.request({
                path: `/papi/v1/properties/${propertyId}/versions/${version}/hostnames`,
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                queryParams: {
                  contractId: property.contractId,
                  groupId: property.groupId,
                },
                body: [
                  {
                    op: 'remove',
                    path: `/hostnames/${hostnameIndex}`,
                  },
                ],
              });
              updateApplied = true;
            }
          }
        }

        results.push({
          propertyId,
          propertyName: property.propertyName,
          success: true,
          message: updateApplied ? 'Updates applied successfully' : 'No updates applied',
          newVersion: args.createNewVersion ? version : undefined,
        });
      } catch (_error) {
        results.push({
          propertyId,
          propertyName: 'Unknown',
          success: false,
          message: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }

    // Format response
    let responseText = '# Bulk Property Update Results\n\n';
    responseText += `**Total Properties:** ${args.propertyIds.length}\n`;
    responseText += `**Successful:** ${results.filter((r) => r.success).length}\n`;
    responseText += `**Failed:** ${results.filter((r) => !r.success).length}\n\n`;

    // Update summary
    responseText += '## Updates Applied\n';
    if (args.updates.addBehavior) {
      responseText += `- **Add Behavior:** ${args.updates.addBehavior.name}\n`;
    }
    if (args.updates.updateBehavior) {
      responseText += `- **Update Behavior:** ${args.updates.updateBehavior.name}\n`;
    }
    if (args.updates.addHostname) {
      responseText += `- **Add Hostname:** ${args.updates.addHostname.hostname}\n`;
    }
    if (args.updates.removeHostname) {
      responseText += `- **Remove Hostname:** ${args.updates.removeHostname}\n`;
    }
    responseText += '\n';

    // Results by property
    responseText += '## Results by Property\n\n';

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (successful.length > 0) {
      responseText += `### ✅ Successful Updates (${successful.length})\n`;
      successful.forEach((result) => {
        responseText += `- **${result.propertyName}** (${result.propertyId})`;
        if (result.newVersion) {
          responseText += ` - New version: ${result.newVersion}`;
        }
        responseText += `\n  ${result.message}\n`;
      });
      responseText += '\n';
    }

    if (failed.length > 0) {
      responseText += `### ❌ Failed Updates (${failed.length})\n`;
      failed.forEach((result) => {
        responseText += `- **${result.propertyName}** (${result.propertyId})\n`;
        responseText += `  Error: ${result.message}\n`;
      });
      responseText += '\n';
    }

    // Next steps
    responseText += '## Next Steps\n';
    if (successful.length > 0) {
      responseText += '1. Review the changes in each property\n';
      responseText += '2. Test in staging environment\n';
      responseText += '3. Activate properties when ready\n';
    }
    if (failed.length > 0) {
      responseText += '1. Review failed properties individually\n';
      responseText += '2. Fix any permission or validation issues\n';
      responseText += '3. Retry updates for failed properties\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (_error) {
    return {
      content: [
        {
          type: 'text',
          text: errorTranslator.formatConversationalError(error, {
            operation: 'bulk update properties',
            parameters: args,
            timestamp: new Date(),
          }),
        },
      ],
    };
  }
}

// Helper functions

function calculateStringMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) {
return 1;
}
  if (s1.includes(s2) || s2.includes(s1)) {
return 0.8;
}

  // Simple similarity score
  const maxLen = Math.max(s1.length, s2.length);
  let matches = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) {
matches++;
}
  }
  return matches / maxLen;
}

function hasAnyCriteria(criteria: PropertySearchCriteria): boolean {
  return !!(
    criteria.name ||
    criteria.hostname ||
    criteria.edgeHostname ||
    criteria.contractId ||
    criteria.groupId ||
    criteria.productId ||
    criteria.activationStatus ||
    criteria.lastModifiedAfter ||
    criteria.lastModifiedBefore
  );
}

function compareRuleStructures(rulesA: any, rulesB: any): RuleDifference[] {
  const differences: RuleDifference[] = [];

  // Compare children recursively
  const compareChildren = (childrenA: any[], childrenB: any[], path: string) => {
    const namesA = childrenA.map((c) => c.name);
    const namesB = childrenB.map((c) => c.name);

    // Find added rules
    namesB.forEach((name, index) => {
      if (!namesA.includes(name)) {
        differences.push({
          path: `${path}/children/${name}`,
          type: 'added',
          ruleB: childrenB[index],
        });
      }
    });

    // Find removed rules
    namesA.forEach((name, index) => {
      if (!namesB.includes(name)) {
        differences.push({
          path: `${path}/children/${name}`,
          type: 'removed',
          ruleA: childrenA[index],
        });
      }
    });

    // Compare common rules
    namesA.forEach((name, indexA) => {
      const indexB = namesB.indexOf(name);
      if (indexB >= 0) {
        const childA = childrenA[indexA];
        const childB = childrenB[indexB];

        // Recursively compare children
        if (childA.children && childB.children) {
          compareChildren(childA.children, childB.children, `${path}/children/${name}`);
        }
      }
    });
  };

  if (rulesA.children && rulesB.children) {
    compareChildren(rulesA.children, rulesB.children, 'rules');
  }

  return differences;
}

function compareBehaviors(rulesA: any, rulesB: any): BehaviorDifference[] {
  const differences: BehaviorDifference[] = [];

  const extractBehaviors = (rule: any, path: string, behaviors: Map<string, any>) => {
    if (rule.behaviors) {
      rule.behaviors.forEach((behavior: any) => {
        behaviors.set(`${path}:${behavior.name}`, {
          behavior: behavior.name,
          path,
          options: behavior.options,
        });
      });
    }

    if (rule.children) {
      rule.children.forEach((child: any) => {
        extractBehaviors(child, `${path}/children/${child.name}`, behaviors);
      });
    }
  };

  const behaviorsA = new Map();
  const behaviorsB = new Map();

  extractBehaviors(rulesA, 'rules', behaviorsA);
  extractBehaviors(rulesB, 'rules', behaviorsB);

  // Find differences
  behaviorsA.forEach((behaviorA, key) => {
    if (!behaviorsB.has(key)) {
      differences.push({
        ...behaviorA,
        type: 'removed',
        optionsA: behaviorA.options,
      });
    } else {
      const behaviorB = behaviorsB.get(key);
      // Compare options (simplified)
      if (JSON.stringify(behaviorA.options) !== JSON.stringify(behaviorB.options)) {
        differences.push({
          ...behaviorA,
          type: 'modified',
          optionsA: behaviorA.options,
          optionsB: behaviorB.options,
        });
      }
    }
  });

  behaviorsB.forEach((behaviorB, key) => {
    if (!behaviorsA.has(key)) {
      differences.push({
        ...behaviorB,
        type: 'added',
        optionsB: behaviorB.options,
      });
    }
  });

  return differences;
}

function extractAllBehaviors(rules: any): Set<string> {
  const behaviors = new Set<string>();

  const extract = (rule: any) => {
    if (rule.behaviors) {
      rule.behaviors.forEach((b: any) => behaviors.add(b.name));
    }
    if (rule.children) {
      rule.children.forEach((child: any) => extract(child));
    }
  };

  extract(rules);
  return behaviors;
}

function analyzeRuleTree(rules: any): { warnings: string[] } {
  const warnings: string[] = [];

  // Check for empty rules
  if (!rules.behaviors || rules.behaviors.length === 0) {
    warnings.push('No behaviors defined in default rule');
  }

  // Check for missing origin
  const hasOrigin = rules.behaviors?.some((b: any) => b.name === 'origin');
  if (!hasOrigin) {
    warnings.push('No origin behavior found');
  }

  // Check for duplicate behaviors
  const behaviorCounts = new Map<string, number>();
  rules.behaviors?.forEach((b: any) => {
    const count = behaviorCounts.get(b.name) || 0;
    behaviorCounts.set(b.name, count + 1);
  });

  behaviorCounts.forEach((count, name) => {
    if (count > 1) {
      warnings.push(`Duplicate behavior found: ${name}`);
    }
  });

  return { warnings };
}

function analyzePerformance(rules: any): { hasHttp2: boolean; hasCaching: boolean } {
  let hasHttp2 = false;
  let hasCaching = false;

  const analyze = (rule: any) => {
    if (rule.behaviors) {
      rule.behaviors.forEach((b: any) => {
        if (b.name === 'http2' && b.options?.enabled) {
          hasHttp2 = true;
        }
        if (b.name === 'caching' && b.options?.behavior !== 'NO_STORE') {
          hasCaching = true;
        }
      });
    }
    if (rule.children) {
      rule.children.forEach((child: any) => analyze(child));
    }
  };

  analyze(rules);
  return { hasHttp2, hasCaching };
}

function analyzeSecurity(rules: any): { hasHttpsRedirect: boolean; hasSecurityHeaders: boolean } {
  let hasHttpsRedirect = false;
  let hasSecurityHeaders = false;

  const analyze = (rule: any) => {
    if (rule.behaviors) {
      rule.behaviors.forEach((b: any) => {
        if (b.name === 'redirectPlus' && b.options?.destination?.includes('https://')) {
          hasHttpsRedirect = true;
        }
        if (
          b.name === 'modifyOutgoingResponseHeader' &&
          (b.options?.standardAddHeaderName === 'STRICT_TRANSPORT_SECURITY' ||
            b.options?.standardAddHeaderName === 'X_FRAME_OPTIONS')
        ) {
          hasSecurityHeaders = true;
        }
      });
    }
    if (rule.children) {
      rule.children.forEach((child: any) => analyze(child));
    }
  };

  analyze(rules);
  return { hasHttpsRedirect, hasSecurityHeaders };
}

function getHealthEmoji(status: string): string {
  switch (status) {
    case 'healthy':
    case 'pass':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'critical':
    case 'fail':
      return '❌';
    default:
      return '❓';
  }
}

function formatIssue(issue: HealthIssue): string {
  let text = `- **${issue.issue}**\n`;
  text += `  - Category: ${issue.category}\n`;
  text += `  - Recommendation: ${issue.recommendation}\n`;
  if (issue.impact) {
    text += `  - Impact: ${issue.impact}\n`;
  }
  text += '\n';
  return text;
}

function detectBehaviorDrifts(baselineRules: any, compareRules: any): DriftItem[] {
  const drifts: DriftItem[] = [];

  const behaviorDiffs = compareBehaviors(baselineRules, compareRules);

  behaviorDiffs.forEach((diff) => {
    let impact: 'low' | 'medium' | 'high' = 'low';

    // Determine impact based on behavior type
    const criticalBehaviors = ['origin', 'caching', 'cpCode', 'allowTransferEncoding'];
    const importantBehaviors = ['http2', 'sureRoute', 'tieredDistribution'];

    if (criticalBehaviors.includes(diff.behavior)) {
      impact = 'high';
    } else if (importantBehaviors.includes(diff.behavior)) {
      impact = 'medium';
    }

    drifts.push({
      type: 'behavior',
      description: `Behavior '${diff.behavior}' ${diff.type} at ${diff.path}`,
      expectedValue: diff.optionsA || 'Not present',
      actualValue: diff.optionsB || 'Not present',
      impact,
      recommendation:
        impact === 'high'
          ? 'Review this critical change carefully'
          : 'Verify this change is intentional',
    });
  });

  return drifts;
}

function detectHostnameDrifts(baselineHostnames: any[], compareHostnames: any[]): DriftItem[] {
  const drifts: DriftItem[] = [];

  const baselineSet = new Set(baselineHostnames.map((h) => h.cnameFrom));
  const compareSet = new Set(compareHostnames.map((h) => h.cnameFrom));

  // Added hostnames
  compareSet.forEach((hostname) => {
    if (!baselineSet.has(hostname)) {
      drifts.push({
        type: 'hostname',
        description: `Hostname '${hostname}' added`,
        expectedValue: 'Not present',
        actualValue: hostname,
        impact: 'medium',
        recommendation: 'Ensure DNS is properly configured for new hostname',
      });
    }
  });

  // Removed hostnames
  baselineSet.forEach((hostname) => {
    if (!compareSet.has(hostname)) {
      drifts.push({
        type: 'hostname',
        description: `Hostname '${hostname}' removed`,
        expectedValue: hostname,
        actualValue: 'Not present',
        impact: 'high',
        recommendation: 'Verify hostname removal is intentional - may impact live traffic',
      });
    }
  });

  return drifts;
}

function calculateDriftScore(drifts: DriftItem[]): number {
  let score = 0;

  drifts.forEach((drift) => {
    switch (drift.impact) {
      case 'high':
        score += 10;
        break;
      case 'medium':
        score += 5;
        break;
      case 'low':
        score += 2;
        break;
    }
  });

  return Math.min(100, score);
}

function formatDrift(drift: DriftItem): string {
  let text = `- **${drift.description}**\n`;
  text += `  - Type: ${drift.type}\n`;
  text += `  - Expected: ${JSON.stringify(drift.expectedValue)}\n`;
  text += `  - Actual: ${JSON.stringify(drift.actualValue)}\n`;
  text += `  - Recommendation: ${drift.recommendation}\n\n`;
  return text;
}
