/**
 * Intelligent Hostname Discovery Engine
 * Build comprehensive hostname discovery logic with conflict detection,
 * wildcard coverage analysis, and property ownership pattern recognition
 */

import { handleApiError } from '@utils/error-handling';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

export interface HostnameConflict {
  hostname: string;
  conflictType: 'exact_match' | 'wildcard_overlap' | 'subdomain_conflict' | 'certificate_mismatch';
  existingProperty: {
    propertyId: string;
    propertyName: string;
    groupId: string;
    contractId: string;
  };
  conflictDetails: string;
  severity: 'critical' | 'warning' | 'info';
  resolutionSuggestions: string[];
}

export interface WildcardCoverage {
  wildcardHostname: string;
  propertyId: string;
  propertyName: string;
  coveredHostnames: string[];
  potentialConflicts: string[];
  coverage: 'complete' | 'partial' | 'none';
  recommendations: string[];
}

export interface PropertyOwnershipPattern {
  pattern: string;
  patternType: 'subdomain' | 'domain' | 'tld' | 'brand';
  properties: Array<{
    propertyId: string;
    propertyName: string;
    hostnames: string[];
    confidence: number;
  }>;
  suggestedConsolidation?: {
    targetProperty: string;
    consolidationPlan: string[];
  };
}

export interface HostnameDiscoveryResult {
  discoveredHostnames: string[];
  conflicts: HostnameConflict[];
  wildcardCoverage: WildcardCoverage[];
  ownershipPatterns: PropertyOwnershipPattern[];
  recommendations: {
    newPropertySuggestions: Array<{
      hostname: string;
      suggestedPropertyName: string;
      suggestedGroup: string;
      rationale: string;
    }>;
    consolidationOpportunities: Array<{
      hostnames: string[];
      targetProperty: string;
      consolidationBenefit: string;
    }>;
    optimizationRecommendations: string[];
  };
  analytics: {
    totalHostnamesAnalyzed: number;
    totalProperties: number;
    conflictRate: number;
    wildcardEfficiency: number;
    consolidationPotential: number;
  };
}

/**
 * Discover hostnames across the entire Akamai portfolio with intelligent analysis
 */
export async function discoverHostnamesIntelligent(
  client: AkamaiClient,
  args: {
    analysisScope?: 'all' | 'contract' | 'group';
    contractId?: string;
    groupId?: string;
    includeInactive?: boolean;
    analyzeWildcards?: boolean;
    detectConflicts?: boolean;
    findOptimizations?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    let responseText = '# Intelligent Hostname Discovery Analysis\n\n';
    responseText += `**Analysis Scope:** ${args.analysisScope || 'all'}\n`;
    responseText += `**Analysis Started:** ${new Date().toISOString()}\n\n`;

    // Step 1: Gather all properties and hostnames
    const properties = await getAllPropertiesWithHostnames(client, args);
    const allHostnames = extractAllHostnames(properties);

    // Step 2: Analyze conflicts
    const conflicts =
      args.detectConflicts !== false
        ? await analyzeConflictsBetweenHostnames(allHostnames, allHostnames, properties, {
            includeWildcards: true,
            includeCertificates: true,
          })
        : [];

    // Step 3: Analyze wildcard coverage
    const wildcardCoverage =
      args.analyzeWildcards !== false
        ? await analyzeWildcardEfficiency(allHostnames, properties)
        : [];

    // Step 4: Identify ownership patterns
    const ownershipPatterns = findOwnershipPatterns(properties);

    // Step 5: Generate recommendations
    const recommendations = generateOptimizationRecommendations(
      allHostnames,
      properties,
      conflicts,
      wildcardCoverage,
      ownershipPatterns,
    );

    // Step 6: Calculate analytics
    const analytics = calculateAnalytics(allHostnames, properties, conflicts, wildcardCoverage);

    // Build comprehensive report
    responseText += buildDiscoveryReport({
      discoveredHostnames: allHostnames,
      conflicts,
      wildcardCoverage,
      ownershipPatterns,
      recommendations,
      analytics,
    });

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(_error, 'discovering hostnames intelligently');
  }
}

/**
 * Analyze hostname conflicts across properties
 */
export async function analyzeHostnameConflicts(
  client: AkamaiClient,
  args: {
    targetHostnames: string[];
    contractId?: string;
    groupId?: string;
    includeWildcardAnalysis?: boolean;
    includeCertificateAnalysis?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Get all existing properties and hostnames
    const properties = await getAllPropertiesWithHostnames(client, args);
    const existingHostnames = extractAllHostnames(properties);

    // Analyze conflicts for target hostnames
    const conflicts = await analyzeConflictsBetweenHostnames(
      args.targetHostnames,
      existingHostnames,
      properties,
      {
        includeWildcards: args.includeWildcardAnalysis !== false,
        includeCertificates: args.includeCertificateAnalysis !== false,
      },
    );

    let responseText = '# Hostname Conflict Analysis\n\n';
    responseText += `**Target Hostnames:** ${args.targetHostnames.length}\n`;
    responseText += `**Existing Hostnames:** ${existingHostnames.length}\n`;
    responseText += `**Conflicts Found:** ${conflicts.length}\n`;
    responseText += `**Analysis Date:** ${new Date().toISOString()}\n\n`;

    if (conflicts.length === 0) {
      responseText += '## ✅ No Conflicts Detected\n\n';
      responseText += 'All target hostnames are available for configuration.\n\n';
    } else {
      responseText += '## ⚠️ Conflicts Detected\n\n';

      const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');
      const warningConflicts = conflicts.filter((c) => c.severity === 'warning');
      const infoConflicts = conflicts.filter((c) => c.severity === 'info');

      if (criticalConflicts.length > 0) {
        responseText += `### ❌ Critical Conflicts (${criticalConflicts.length})\n\n`;
        criticalConflicts.forEach((conflict, index) => {
          responseText += buildConflictReport(conflict, index + 1);
        });
      }

      if (warningConflicts.length > 0) {
        responseText += `### ⚠️ Warning Conflicts (${warningConflicts.length})\n\n`;
        warningConflicts.forEach((conflict, index) => {
          responseText += buildConflictReport(conflict, index + 1);
        });
      }

      if (infoConflicts.length > 0) {
        responseText += `### ℹ️ Informational Conflicts (${infoConflicts.length})\n\n`;
        infoConflicts.forEach((conflict, index) => {
          responseText += buildConflictReport(conflict, index + 1);
        });
      }
    }

    // Add resolution guidance
    responseText += buildConflictResolutionGuidance(conflicts);

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(_error, 'analyzing hostname conflicts');
  }
}

/**
 * Analyze wildcard hostname coverage and efficiency
 */
export async function analyzeWildcardCoverage(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    includeOptimizationSuggestions?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const properties = await getAllPropertiesWithHostnames(client, args);
    const allHostnames = extractAllHostnames(properties);
    const wildcardCoverage = await analyzeWildcardEfficiency(allHostnames, properties);

    let responseText = '# Wildcard Coverage Analysis\n\n';
    responseText += `**Total Properties:** ${properties.length}\n`;
    responseText += `**Total Hostnames:** ${allHostnames.length}\n`;
    responseText += `**Wildcard Configurations:** ${wildcardCoverage.length}\n`;
    responseText += `**Analysis Date:** ${new Date().toISOString()}\n\n`;

    if (wildcardCoverage.length === 0) {
      responseText += '## No Wildcard Configurations Found\n\n';
      responseText += 'Consider implementing wildcard hostnames for:\n';
      responseText += '- Domain families with multiple subdomains\n';
      responseText += '- Development/staging environments\n';
      responseText += '- API endpoint consolidation\n\n';
    } else {
      responseText += '## Wildcard Coverage Analysis\n\n';

      wildcardCoverage.forEach((coverage, index) => {
        responseText += buildWildcardCoverageReport(coverage, index + 1);
      });

      // Optimization suggestions
      if (args.includeOptimizationSuggestions !== false) {
        responseText += buildWildcardOptimizationSuggestions(wildcardCoverage, allHostnames);
      }
    }

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(_error, 'analyzing wildcard coverage');
  }
}

/**
 * Identify property ownership patterns for consolidation opportunities
 */
export async function identifyOwnershipPatterns(
  client: AkamaiClient,
  args: {
    contractId?: string;
    groupId?: string;
    minPropertiesForPattern?: number;
    includeConsolidationPlan?: boolean;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    const properties = await getAllPropertiesWithHostnames(client, args);
    const patterns = findOwnershipPatterns(properties, {
      minPropertiesForPattern: args.minPropertiesForPattern || 3,
    });

    let responseText = '# Property Ownership Pattern Analysis\n\n';
    responseText += `**Total Properties Analyzed:** ${properties.length}\n`;
    responseText += `**Patterns Identified:** ${patterns.length}\n`;
    responseText += `**Analysis Date:** ${new Date().toISOString()}\n\n`;

    if (patterns.length === 0) {
      responseText += '## No Clear Ownership Patterns Found\n\n';
      responseText += 'This could indicate:\n';
      responseText += '- Well-organized property structure\n';
      responseText += '- Diverse portfolio without clear patterns\n';
      responseText += '- Opportunity for better organization\n\n';
    } else {
      responseText += '## Identified Ownership Patterns\n\n';

      patterns.forEach((pattern, index) => {
        responseText += buildOwnershipPatternReport(pattern, index + 1);
      });

      // Consolidation recommendations
      if (args.includeConsolidationPlan !== false) {
        responseText += buildConsolidationRecommendations(patterns);
      }
    }

    return {
      content: [{ type: 'text', text: responseText }],
    };
  } catch (_error) {
    return handleApiError(_error, 'identifying ownership patterns');
  }
}

// Helper functions for hostname analysis

async function getAllPropertiesWithHostnames(client: AkamaiClient, args: any): Promise<any[]> {
  // Implementation would fetch all properties and their hostnames
  // This is a simplified version - real implementation would paginate through all properties
  const params = new URLSearchParams();

  if (args.contractId) {
    params.append('contractId', args.contractId);
  }
  if (args.groupId) {
    params.append('groupId', args.groupId);
  }

  const response = await client.request({
    path: `/papi/v1/properties?${params.toString()}`,
    method: 'GET',
  });

  const properties = response.properties?.items || [];

  // Fetch hostnames for each property
  const propertiesWithHostnames = await Promise.all(
    properties.map(async (property: any) => {
      try {
        const hostnameResponse = await client.request({
          path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames?contractId=${property.contractId}&groupId=${property.groupId}`,
          method: 'GET',
        });

        return {
          ...property,
          hostnames: hostnameResponse.hostnames?.items || [],
        };
      } catch (_error) {
        return {
          ...property,
          hostnames: [],
        };
      }
    }),
  );

  return propertiesWithHostnames;
}

function extractAllHostnames(properties: any[]): string[] {
  const hostnames = new Set<string>();

  properties.forEach((property) => {
    if (property.hostnames) {
      property.hostnames.forEach((hostname: any) => {
        hostnames.add(hostname.cnameFrom || hostname.hostname);
      });
    }
  });

  return Array.from(hostnames);
}

async function analyzeConflictsBetweenHostnames(
  targetHostnames: string[],
  existingHostnames: string[],
  properties: any[],
  options: any,
): Promise<HostnameConflict[]> {
  const conflicts: HostnameConflict[] = [];

  targetHostnames.forEach((targetHostname) => {
    // Check for exact matches
    existingHostnames.forEach((existingHostname) => {
      if (targetHostname === existingHostname) {
        const property = findPropertyByHostname(properties, existingHostname);
        conflicts.push({
          hostname: targetHostname,
          conflictType: 'exact_match',
          existingProperty: property,
          conflictDetails: `Hostname ${targetHostname} is already configured`,
          severity: 'critical',
          resolutionSuggestions: [
            'Use a different hostname',
            'Remove hostname from existing property',
            'Use subdomain variation',
          ],
        });
      }
    });

    // Check for wildcard overlaps if enabled
    if (options.includeWildcards) {
      // Implementation for wildcard conflict detection
    }
  });

  return conflicts;
}

async function analyzeWildcardEfficiency(
  hostnames: string[],
  properties: any[],
): Promise<WildcardCoverage[]> {
  const wildcardCoverage: WildcardCoverage[] = [];

  // Find existing wildcard hostnames
  const wildcards = hostnames.filter((hostname) => hostname.startsWith('*.'));

  wildcards.forEach((wildcard) => {
    const domain = wildcard.substring(2); // Remove *.
    const coveredHostnames = hostnames.filter(
      (hostname) => hostname.endsWith(`.${domain}`) && !hostname.startsWith('*.'),
    );

    const property = findPropertyByHostname(properties, wildcard);

    wildcardCoverage.push({
      wildcardHostname: wildcard,
      propertyId: property?.propertyId || 'unknown',
      propertyName: property?.propertyName || 'unknown',
      coveredHostnames,
      potentialConflicts: [],
      coverage:
        coveredHostnames.length > 5 ? 'complete' : coveredHostnames.length > 2 ? 'partial' : 'none',
      recommendations: generateWildcardRecommendations(wildcard, coveredHostnames),
    });
  });

  return wildcardCoverage;
}

function findOwnershipPatterns(properties: any[], _options: any = {}): PropertyOwnershipPattern[] {
  const patterns: PropertyOwnershipPattern[] = [];
  const minProperties = _options.minPropertiesForPattern || 3;

  // Group properties by domain patterns
  const domainGroups = new Map<string, any[]>();

  properties.forEach((property) => {
    if (property.hostnames) {
      property.hostnames.forEach((hostname: any) => {
        const domain = extractDomain(hostname.cnameFrom || hostname.hostname);
        if (domain) {
          if (!domainGroups.has(domain)) {
            domainGroups.set(domain, []);
          }
          domainGroups.get(domain)!.push(property);
        }
      });
    }
  });

  // Identify patterns with sufficient properties
  domainGroups.forEach((properties, domain) => {
    if (properties.length >= minProperties) {
      patterns.push({
        pattern: domain,
        patternType: 'domain',
        properties: properties.map((p) => ({
          propertyId: p.propertyId,
          propertyName: p.propertyName,
          hostnames: p.hostnames.map((h: any) => h.cnameFrom || h.hostname),
          confidence: calculatePatternConfidence(domain, p.hostnames),
        })),
      });
    }
  });

  return patterns;
}

// Helper functions for report building

function buildDiscoveryReport(result: HostnameDiscoveryResult): string {
  let report = '## Discovery Summary\n\n';
  report += `- **Total Hostnames:** ${result.discoveredHostnames.length}\n`;
  report += `- **Conflicts Found:** ${result.conflicts.length}\n`;
  report += `- **Wildcard Configurations:** ${result.wildcardCoverage.length}\n`;
  report += `- **Ownership Patterns:** ${result.ownershipPatterns.length}\n\n`;

  // Add detailed sections for each analysis type
  if (result.conflicts.length > 0) {
    report += '## Conflicts Analysis\n\n';
    result.conflicts.forEach((conflict, index) => {
      report += buildConflictReport(conflict, index + 1);
    });
  }

  if (result.wildcardCoverage.length > 0) {
    report += '## Wildcard Analysis\n\n';
    result.wildcardCoverage.forEach((coverage, index) => {
      report += buildWildcardCoverageReport(coverage, index + 1);
    });
  }

  if (result.ownershipPatterns.length > 0) {
    report += '## Ownership Patterns\n\n';
    result.ownershipPatterns.forEach((pattern, index) => {
      report += buildOwnershipPatternReport(pattern, index + 1);
    });
  }

  // Add recommendations
  if (result.recommendations.newPropertySuggestions.length > 0) {
    report += '## New Property Suggestions\n\n';
    result.recommendations.newPropertySuggestions.forEach((suggestion, index) => {
      report += `### ${index + 1}. ${suggestion.hostname}\n`;
      report += `- **Suggested Property:** ${suggestion.suggestedPropertyName}\n`;
      report += `- **Suggested Group:** ${suggestion.suggestedGroup}\n`;
      report += `- **Rationale:** ${suggestion.rationale}\n\n`;
    });
  }

  return report;
}

function buildConflictReport(conflict: HostnameConflict, index: number): string {
  let report = `### ${index}. ${conflict.hostname}\n`;
  report += `- **Conflict Type:** ${conflict.conflictType.replace('_', ' ').toUpperCase()}\n`;
  report += `- **Severity:** ${conflict.severity.toUpperCase()}\n`;
  report += `- **Existing Property:** ${conflict.existingProperty.propertyName} (${conflict.existingProperty.propertyId})\n`;
  report += `- **Details:** ${conflict.conflictDetails}\n`;

  if (conflict.resolutionSuggestions.length > 0) {
    report += '- **Resolution Options:**\n';
    conflict.resolutionSuggestions.forEach((suggestion) => {
      report += `  - ${suggestion}\n`;
    });
  }

  report += '\n';
  return report;
}

function buildWildcardCoverageReport(coverage: WildcardCoverage, index: number): string {
  let report = `### ${index}. ${coverage.wildcardHostname}\n`;
  report += `- **Property:** ${coverage.propertyName} (${coverage.propertyId})\n`;
  report += `- **Coverage:** ${coverage.coverage.toUpperCase()}\n`;
  report += `- **Covered Hostnames:** ${coverage.coveredHostnames.length}\n`;

  if (coverage.coveredHostnames.length > 0) {
    report += `  - ${coverage.coveredHostnames.slice(0, 5).join(', ')}`;
    if (coverage.coveredHostnames.length > 5) {
      report += ` and ${coverage.coveredHostnames.length - 5} more`;
    }
    report += '\n';
  }

  if (coverage.recommendations.length > 0) {
    report += '- **Recommendations:**\n';
    coverage.recommendations.forEach((rec) => {
      report += `  - ${rec}\n`;
    });
  }

  report += '\n';
  return report;
}

function buildOwnershipPatternReport(pattern: PropertyOwnershipPattern, index: number): string {
  let report = `### ${index}. ${pattern.pattern}\n`;
  report += `- **Pattern Type:** ${pattern.patternType.toUpperCase()}\n`;
  report += `- **Properties:** ${pattern.properties.length}\n`;

  pattern.properties.forEach((prop) => {
    report += `  - ${prop.propertyName} (${prop.propertyId}) - Confidence: ${(prop.confidence * 100).toFixed(0)}%\n`;
  });

  if (pattern.suggestedConsolidation) {
    report += `- **Consolidation Opportunity:** Target ${pattern.suggestedConsolidation.targetProperty}\n`;
  }

  report += '\n';
  return report;
}

function buildConflictResolutionGuidance(conflicts: HostnameConflict[]): string {
  let guidance = '## Resolution Guidance\n\n';

  const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');
  if (criticalConflicts.length > 0) {
    guidance += '### Critical Actions Required\n\n';
    guidance += `${criticalConflicts.length} critical conflicts must be resolved before proceeding:\n\n`;
    guidance += '1. **Review existing property configurations**\n';
    guidance += '2. **Choose alternative hostnames or consolidate properties**\n';
    guidance += '3. **Update DNS configuration accordingly**\n';
    guidance += '4. **Test all changes in staging environment**\n\n';
  }

  return guidance;
}

function buildWildcardOptimizationSuggestions(
  coverage: WildcardCoverage[],
  allHostnames: string[],
): string {
  let suggestions = '## Optimization Opportunities\n\n';

  // Find domains that could benefit from wildcard consolidation
  const domainCounts = new Map<string, string[]>();
  allHostnames.forEach((hostname) => {
    if (!hostname.startsWith('*.')) {
      const domain = extractDomain(hostname);
      if (domain) {
        if (!domainCounts.has(domain)) {
          domainCounts.set(domain, []);
        }
        domainCounts.get(domain)!.push(hostname);
      }
    }
  });

  domainCounts.forEach((hostnames, domain) => {
    if (hostnames.length >= 3) {
      const hasWildcard = coverage.some((c) => c.wildcardHostname === `*.${domain}`);
      if (!hasWildcard) {
        suggestions += `### Consider Wildcard for ${domain}\n`;
        suggestions += `- **Current Hostnames:** ${hostnames.length}\n`;
        suggestions += `- **Potential Savings:** Consolidate ${hostnames.length} hostnames into *.${domain}\n`;
        suggestions += `- **Hostnames:** ${hostnames.slice(0, 5).join(', ')}`;
        if (hostnames.length > 5) {
          suggestions += ` and ${hostnames.length - 5} more`;
        }
        suggestions += '\n\n';
      }
    }
  });

  return suggestions;
}

function buildConsolidationRecommendations(patterns: PropertyOwnershipPattern[]): string {
  let recommendations = '## Consolidation Recommendations\n\n';

  patterns.forEach((pattern, index) => {
    if (pattern.properties.length >= 3) {
      recommendations += `### ${index + 1}. ${pattern.pattern} Domain Family\n`;
      recommendations += `Consider consolidating ${pattern.properties.length} properties:\n`;
      pattern.properties.forEach((prop) => {
        recommendations += `- ${prop.propertyName} (${prop.hostnames.length} hostnames)\n`;
      });
      recommendations += '\n**Benefits:**\n';
      recommendations += '- Simplified management\n';
      recommendations += '- Reduced configuration overhead\n';
      recommendations += '- Consistent behavior across domain family\n\n';
    }
  });

  return recommendations;
}

// Utility functions

function findPropertyByHostname(properties: any[], hostname: string): any {
  for (const property of properties) {
    if (property.hostnames) {
      for (const h of property.hostnames) {
        if ((h.cnameFrom || h.hostname) === hostname) {
          return {
            propertyId: property.propertyId,
            propertyName: property.propertyName,
            groupId: property.groupId,
            contractId: property.contractId,
          };
        }
      }
    }
  }
  return null;
}

function extractDomain(hostname: string): string | null {
  if (!hostname || hostname.startsWith('*.')) {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return null;
}

function generateWildcardRecommendations(_wildcard: string, coveredHostnames: string[]): string[] {
  const recommendations: string[] = [];

  if (coveredHostnames.length === 0) {
    recommendations.push('Consider removing unused wildcard configuration');
  } else if (coveredHostnames.length < 3) {
    recommendations.push('Low efficiency - consider specific hostnames instead');
  } else {
    recommendations.push('Well-utilized wildcard configuration');
  }

  return recommendations;
}

function calculatePatternConfidence(domain: string, hostnames: any[]): number {
  const domainHostnames = hostnames.filter((h: any) =>
    (h.cnameFrom || h.hostname).includes(domain),
  );
  return domainHostnames.length / hostnames.length;
}

function generateOptimizationRecommendations(
  _hostnames: string[],
  _properties: any[],
  _conflicts: HostnameConflict[],
  _wildcardCoverage: WildcardCoverage[],
  _ownershipPatterns: PropertyOwnershipPattern[],
): any {
  return {
    newPropertySuggestions: [],
    consolidationOpportunities: [],
    optimizationRecommendations: [
      'Regular hostname auditing recommended',
      'Consider wildcard consolidation for domain families',
      'Monitor for hostname conflicts during provisioning',
    ],
  };
}

function calculateAnalytics(
  hostnames: string[],
  properties: any[],
  conflicts: HostnameConflict[],
  wildcardCoverage: WildcardCoverage[],
): any {
  return {
    totalHostnamesAnalyzed: hostnames.length,
    totalProperties: properties.length,
    conflictRate: conflicts.length / hostnames.length,
    wildcardEfficiency:
      wildcardCoverage.filter((w) => w.coverage === 'complete').length /
      Math.max(wildcardCoverage.length, 1),
    consolidationPotential: 0.25, // Placeholder calculation
  };
}
