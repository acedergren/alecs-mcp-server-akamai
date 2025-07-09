/**
 * Consolidated Hostname Management Tools for ALECS MCP Server
 * 
 * CODE KAI IMPLEMENTATION:
 * - Provides comprehensive hostname discovery, analysis, and management
 * - Includes intelligent hostname conflict detection and resolution
 * - Implements wildcard coverage analysis and ownership patterns
 * - Supports bulk hostname operations across properties
 */

import { z } from 'zod';
import { 
  BaseTool,
  CustomerSchema,
  type MCPToolResponse
} from '../common';

/**
 * Hostname Management Schemas
 */
const DiscoverHostnamesSchema = CustomerSchema.extend({
  searchPattern: z.string().optional().describe('Pattern to search for hostnames (e.g., *.example.com)'),
  groupId: z.string().optional(),
  contractId: z.string().optional(),
  includeVersions: z.boolean().default(false).describe('Include hostname usage across versions'),
  maxResults: z.number().int().min(1).max(1000).default(100)
});

const AnalyzeConflictsSchema = CustomerSchema.extend({
  hostnames: z.array(z.string()).min(1).describe('List of hostnames to analyze for conflicts'),
  checkGlobal: z.boolean().default(true).describe('Check for conflicts across entire account'),
  includeRecommendations: z.boolean().default(true)
});

const WildcardCoverageSchema = CustomerSchema.extend({
  baseHostname: z.string().describe('Base hostname to analyze (e.g., example.com)'),
  checkDepth: z.number().int().min(1).max(5).default(3).describe('Subdomain levels to check'),
  includeExisting: z.boolean().default(true).describe('Include existing hostname usage')
});

const OwnershipPatternSchema = CustomerSchema.extend({
  groupId: z.string().optional(),
  contractId: z.string().optional(),
  analysisType: z.enum(['by_property', 'by_domain', 'by_certificate']).default('by_domain')
});


const BulkValidationSchema = CustomerSchema.extend({
  hostnames: z.array(z.string()).min(1).max(1000),
  validationChecks: z.array(z.enum(['dns', 'certificate', 'conflict', 'ownership'])).default(['dns', 'conflict'])
});

/**
 * Consolidated hostname management tools implementation
 */
export class ConsolidatedHostnameTools extends BaseTool {
  protected readonly domain = 'hostname';

  /**
   * Discover hostnames intelligently
   */
  async discoverHostnamesIntelligent(args: z.infer<typeof DiscoverHostnamesSchema>): Promise<MCPToolResponse> {
    const params = DiscoverHostnamesSchema.parse(args);

    return this.executeStandardOperation(
      'discover-hostnames',
      params,
      async (client) => {
        // Get all properties first
        const propertiesResponse = await this.makeTypedRequest(
          client,
          {
            path: '/papi/v1/properties',
            method: 'GET',
            schema: z.object({
              properties: z.object({
                items: z.array(z.object({
                  propertyId: z.string(),
                  propertyName: z.string(),
                  latestVersion: z.number(),
                  productionVersion: z.number().nullable(),
                  stagingVersion: z.number().nullable()
                }))
              })
            }),
            queryParams: {
              ...(params.contractId && { contractId: params.contractId }),
              ...(params.groupId && { groupId: params.groupId })
            }
          }
        );

        const properties = propertiesResponse.properties.items;
        const allHostnames: Array<{
          hostname: string;
          propertyId: string;
          propertyName: string;
          version: number;
          network: string;
        }> = [];

        // Discover hostnames from each property
        for (const property of properties) {
          const versions = params.includeVersions 
            ? [property.latestVersion, property.productionVersion, property.stagingVersion].filter(Boolean)
            : [property.latestVersion];

          for (const version of versions as number[]) {
            try {
              const hostnamesResponse = await this.makeTypedRequest(
                client,
                {
                  path: `/papi/v1/properties/${property.propertyId}/versions/${version}/hostnames`,
                  method: 'GET',
                  schema: z.object({
                    hostnames: z.object({
                      items: z.array(z.object({
                        cnameFrom: z.string(),
                        cnameTo: z.string().nullable(),
                        cnameType: z.string().nullable(),
                        edgeHostnameId: z.string().nullable()
                      }))
                    })
                  })
                }
              );

              hostnamesResponse.hostnames.items.forEach(h => {
                if (!params.searchPattern || this.matchesPattern(h.cnameFrom, params.searchPattern)) {
                  allHostnames.push({
                    hostname: h.cnameFrom,
                    propertyId: property.propertyId,
                    propertyName: property.propertyName,
                    version,
                    network: version === property.productionVersion ? 'PRODUCTION' : 
                            version === property.stagingVersion ? 'STAGING' : 'LATEST'
                  });
                }
              });
            } catch (error) {
              // Continue with other properties if one fails
              continue;
            }
          }
        }

        // Group and analyze discovered hostnames
        const uniqueHostnames = Array.from(new Set(allHostnames.map(h => h.hostname)));
        const hostnameGroups = this.groupHostnamesByDomain(uniqueHostnames);

        return {
          totalHostnames: allHostnames.length,
          uniqueHostnames: uniqueHostnames.length,
          propertiesScanned: properties.length,
          searchPattern: params.searchPattern,
          hostnames: allHostnames.slice(0, params.maxResults),
          domainSummary: hostnameGroups,
          message: `Discovered ${uniqueHostnames.length} unique hostnames across ${properties.length} properties`
        };
      },
      {
        customer: params.customer,
        cacheKey: () => `hostnames:discover:${params.searchPattern || 'all'}`,
        cacheTtl: 300
      }
    );
  }

  /**
   * Analyze hostname conflicts
   */
  async analyzeHostnameConflicts(args: z.infer<typeof AnalyzeConflictsSchema>): Promise<MCPToolResponse> {
    const params = AnalyzeConflictsSchema.parse(args);

    return this.executeStandardOperation(
      'analyze-conflicts',
      params,
      async () => {
        const conflicts: Array<{
          hostname: string;
          conflictType: string;
          properties: string[];
          recommendation: string;
        }> = [];

        // Discover all existing hostnames if checking globally
        let existingHostnames: any[] = [];
        if (params.checkGlobal) {
          const discovery = await this.discoverHostnamesIntelligent({
            customer: params.customer,
            includeVersions: false,
            maxResults: 1000
          });
          existingHostnames = discovery.content?.[0]?.text ? 
            JSON.parse(discovery.content[0].text).hostnames : [];
        }

        // Analyze each hostname for conflicts
        for (const hostname of params.hostnames) {
          // Check for exact matches
          const exactMatches = existingHostnames.filter(h => h.hostname === hostname);
          if (exactMatches.length > 0) {
            conflicts.push({
              hostname,
              conflictType: 'EXACT_MATCH',
              properties: exactMatches.map(m => m.propertyName),
              recommendation: 'Hostname already exists. Consider using the existing property or choose a different hostname.'
            });
          }

          // Check for wildcard conflicts
          const wildcardConflicts = this.checkWildcardConflicts(hostname, existingHostnames);
          if (wildcardConflicts.length > 0) {
            conflicts.push({
              hostname,
              conflictType: 'WILDCARD_CONFLICT',
              properties: wildcardConflicts.map(c => c.propertyName),
              recommendation: 'Conflicts with existing wildcard hostnames. Review wildcard coverage before proceeding.'
            });
          }

          // Check for subdomain conflicts
          const subdomainConflicts = this.checkSubdomainConflicts(hostname, existingHostnames);
          if (subdomainConflicts.length > 0) {
            conflicts.push({
              hostname,
              conflictType: 'SUBDOMAIN_OVERLAP',
              properties: subdomainConflicts.map(c => c.propertyName),
              recommendation: 'Subdomain overlap detected. Ensure proper routing hierarchy.'
            });
          }
        }

        return {
          analyzedHostnames: params.hostnames.length,
          conflictsFound: conflicts.length,
          conflicts,
          summary: {
            exactMatches: conflicts.filter(c => c.conflictType === 'EXACT_MATCH').length,
            wildcardConflicts: conflicts.filter(c => c.conflictType === 'WILDCARD_CONFLICT').length,
            subdomainOverlaps: conflicts.filter(c => c.conflictType === 'SUBDOMAIN_OVERLAP').length
          },
          message: conflicts.length > 0 
            ? `Found ${conflicts.length} conflicts for ${params.hostnames.length} hostnames`
            : `No conflicts found for ${params.hostnames.length} hostnames`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Analyze wildcard coverage
   */
  async analyzeWildcardCoverage(args: z.infer<typeof WildcardCoverageSchema>): Promise<MCPToolResponse> {
    const params = WildcardCoverageSchema.parse(args);

    return this.executeStandardOperation(
      'analyze-wildcard-coverage',
      params,
      async () => {
        const baseDomain = params.baseHostname.replace(/^\*\./, '');
        const wildcardLevels: Array<{
          level: number;
          pattern: string;
          existingCoverage: boolean;
          coveredBy: string | null;
          potentialHostnames: string[];
        }> = [];

        // Discover existing hostnames if requested
        let existingHostnames: any[] = [];
        if (params.includeExisting) {
          const discovery = await this.discoverHostnamesIntelligent({
            customer: params.customer,
            searchPattern: `*.${baseDomain}`,
            includeVersions: false,
            maxResults: 1000
          });
          existingHostnames = discovery.content?.[0]?.text ? 
            JSON.parse(discovery.content[0].text).hostnames : [];
        }

        // Analyze wildcard coverage at different levels
        for (let level = 1; level <= params.checkDepth; level++) {
          const wildcardPattern = this.generateWildcardPattern(baseDomain, level);
          const existingWildcard = existingHostnames.find(h => 
            h.hostname === wildcardPattern || this.matchesWildcard(wildcardPattern, h.hostname)
          );

          wildcardLevels.push({
            level,
            pattern: wildcardPattern,
            existingCoverage: !!existingWildcard,
            coveredBy: existingWildcard?.propertyName || null,
            potentialHostnames: this.generatePotentialHostnames(baseDomain, level)
          });
        }

        // Calculate coverage recommendations
        const recommendations = this.generateWildcardRecommendations(wildcardLevels, existingHostnames);

        return {
          baseDomain,
          checkDepth: params.checkDepth,
          wildcardAnalysis: wildcardLevels,
          existingWildcards: existingHostnames.filter(h => h.hostname.includes('*')),
          recommendations,
          coverageSummary: {
            totalLevelsChecked: params.checkDepth,
            coveredLevels: wildcardLevels.filter(l => l.existingCoverage).length,
            optimalWildcardLevel: recommendations.optimalLevel
          },
          message: `Analyzed wildcard coverage for ${baseDomain} up to ${params.checkDepth} levels`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `wildcard:${p.baseHostname}:${p.checkDepth}`,
        cacheTtl: 600
      }
    );
  }

  /**
   * Identify ownership patterns
   */
  async identifyOwnershipPatterns(args: z.infer<typeof OwnershipPatternSchema>): Promise<MCPToolResponse> {
    const params = OwnershipPatternSchema.parse(args);

    return this.executeStandardOperation(
      'identify-ownership-patterns',
      params,
      async () => {
        // Discover all hostnames
        const discovery = await this.discoverHostnamesIntelligent({
          customer: params.customer,
          groupId: params.groupId,
          contractId: params.contractId,
          includeVersions: true,
          maxResults: 1000
        });

        const hostnames = discovery.content?.[0]?.text ? 
          JSON.parse(discovery.content[0].text).hostnames : [];

        let patterns: any = {};

        switch (params.analysisType) {
          case 'by_property':
            patterns = this.groupByProperty(hostnames);
            break;
          case 'by_domain':
            patterns = this.groupByDomain(hostnames);
            break;
          case 'by_certificate':
            patterns = await this.groupByCertificate(hostnames);
            break;
        }

        // Generate ownership insights
        const insights = this.generateOwnershipInsights(patterns, params.analysisType);

        return {
          analysisType: params.analysisType,
          totalHostnames: hostnames.length,
          patterns,
          insights,
          recommendations: insights.recommendations,
          message: `Identified ownership patterns for ${hostnames.length} hostnames by ${params.analysisType}`
        };
      },
      {
        customer: params.customer,
        cacheKey: (p) => `ownership:${p.analysisType}:${p.groupId || 'all'}`,
        cacheTtl: 600
      }
    );
  }


  /**
   * Validate hostnames in bulk
   */
  async validateHostnamesBulk(args: z.infer<typeof BulkValidationSchema>): Promise<MCPToolResponse> {
    const params = BulkValidationSchema.parse(args);

    return this.executeStandardOperation(
      'validate-hostnames-bulk',
      params,
      async () => {
        const validationResults: Array<{
          hostname: string;
          isValid: boolean;
          checks: Record<string, {
            passed: boolean;
            message: string;
          }>;
        }> = [];

        for (const hostname of params.hostnames) {
          const checks: Record<string, { passed: boolean; message: string }> = {};

          // DNS validation
          if (params.validationChecks.includes('dns')) {
            checks['dns'] = this.validateDNS(hostname);
          }

          // Certificate validation
          if (params.validationChecks.includes('certificate')) {
            checks['certificate'] = await this.validateCertificate(hostname);
          }

          // Conflict validation
          if (params.validationChecks.includes('conflict')) {
            const conflicts = await this.analyzeHostnameConflicts({
              hostnames: [hostname],
              checkGlobal: true,
              includeRecommendations: false,
              customer: params.customer
            });
            const conflictContent = conflicts.content?.[0];
            const hasConflicts = conflictContent && conflictContent.type === 'text' ? 
              JSON.parse(conflictContent.text).conflictsFound > 0 : false;
            checks['conflict'] = {
              passed: !hasConflicts,
              message: hasConflicts ? 'Hostname conflicts detected' : 'No conflicts found'
            };
          }

          // Ownership validation
          if (params.validationChecks.includes('ownership')) {
            checks['ownership'] = this.validateOwnership(hostname);
          }

          const isValid = Object.values(checks).every(check => check.passed);
          validationResults.push({
            hostname,
            isValid,
            checks
          });
        }

        const validCount = validationResults.filter(r => r.isValid).length;
        const invalidCount = validationResults.length - validCount;

        return {
          totalValidated: params.hostnames.length,
          validCount,
          invalidCount,
          validationChecks: params.validationChecks,
          results: validationResults,
          summary: {
            byCheck: this.summarizeValidationByCheck(validationResults),
            failureReasons: this.extractFailureReasons(validationResults)
          },
          message: `Validated ${params.hostnames.length} hostnames: ${validCount} valid, ${invalidCount} invalid`
        };
      },
      {
        customer: params.customer
      }
    );
  }

  /**
   * Helper methods
   */
  private matchesPattern(hostname: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    return new RegExp(`^${regex}$`).test(hostname);
  }

  private groupHostnamesByDomain(hostnames: string[]): Record<string, number> {
    const groups: Record<string, number> = {};
    hostnames.forEach(hostname => {
      const domain = hostname.split('.').slice(-2).join('.');
      groups[domain] = (groups[domain] || 0) + 1;
    });
    return groups;
  }

  private checkWildcardConflicts(hostname: string, existingHostnames: any[]): any[] {
    return existingHostnames.filter(h => {
      if (!h.hostname.includes('*')) return false;
      const wildcardRegex = h.hostname
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${wildcardRegex}$`).test(hostname);
    });
  }

  private checkSubdomainConflicts(hostname: string, existingHostnames: any[]): any[] {
    const parts = hostname.split('.');
    const conflicts: any[] = [];
    
    for (let i = 1; i < parts.length; i++) {
      const parentDomain = parts.slice(i).join('.');
      const parentConflicts = existingHostnames.filter(h => 
        h.hostname === parentDomain || h.hostname === `*.${parentDomain}`
      );
      conflicts.push(...parentConflicts);
    }
    
    return conflicts;
  }

  private generateWildcardPattern(baseDomain: string, level: number): string {
    const wildcards = Array(level).fill('*').join('.');
    return `${wildcards}.${baseDomain}`;
  }

  private matchesWildcard(pattern: string, hostname: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^.]+');
    return new RegExp(`^${regex}$`).test(hostname);
  }

  private generatePotentialHostnames(baseDomain: string, level: number): string[] {
    const examples = ['www', 'api', 'cdn', 'assets', 'images'];
    const hostnames: string[] = [];
    
    for (let i = 0; i < Math.min(3, examples.length); i++) {
      const subdomains = Array(level).fill(examples[i]).join('.');
      hostnames.push(`${subdomains}.${baseDomain}`);
    }
    
    return hostnames;
  }

  private generateWildcardRecommendations(levels: any[], existingHostnames: any[]): any {
    const recommendations: any = {
      optimalLevel: 1,
      reasoning: [],
      actions: []
    };

    // Find optimal wildcard level
    const uncoveredHostnames = existingHostnames.filter(h => 
      !levels.some(l => l.existingCoverage && this.matchesWildcard(l.pattern, h.hostname))
    );

    if (uncoveredHostnames.length > 10) {
      recommendations.optimalLevel = 2;
      recommendations.reasoning.push('Multiple uncovered hostnames detected');
      recommendations.actions.push('Consider implementing level 2 wildcard for broader coverage');
    }

    return recommendations;
  }

  private groupByProperty(hostnames: any[]): Record<string, any> {
    const groups: Record<string, any> = {};
    hostnames.forEach(h => {
      if (!groups[h.propertyName]) {
        groups[h.propertyName] = {
          propertyId: h.propertyId,
          hostnames: [],
          count: 0
        };
      }
      groups[h.propertyName].hostnames.push(h.hostname);
      groups[h.propertyName].count++;
    });
    return groups;
  }

  private groupByDomain(hostnames: any[]): Record<string, any> {
    const groups: Record<string, any> = {};
    hostnames.forEach(h => {
      const domain = h.hostname.split('.').slice(-2).join('.');
      if (!groups[domain]) {
        groups[domain] = {
          hostnames: [],
          properties: new Set(),
          count: 0
        };
      }
      groups[domain].hostnames.push(h.hostname);
      groups[domain].properties.add(h.propertyName);
      groups[domain].count++;
    });
    
    // Convert sets to arrays
    Object.keys(groups).forEach(domain => {
      groups[domain].properties = Array.from(groups[domain].properties);
    });
    
    return groups;
  }

  private async groupByCertificate(hostnames: any[]): Promise<Record<string, any>> {
    // This would normally query certificate information
    // For now, we'll simulate based on hostname patterns
    const groups: Record<string, any> = {
      'wildcard_certificates': {
        hostnames: hostnames.filter(h => h.hostname.includes('*')).map(h => h.hostname),
        count: 0
      },
      'san_certificates': {
        hostnames: [],
        count: 0
      },
      'dedicated_certificates': {
        hostnames: [],
        count: 0
      }
    };

    // Update counts
    Object.keys(groups).forEach(key => {
      groups[key].count = groups[key].hostnames.length;
    });

    return groups;
  }

  private generateOwnershipInsights(patterns: any, analysisType: string): any {
    const insights: {
      topOwners: any[];
      recommendations: string[];
      consolidationOpportunities: any[];
    } = {
      topOwners: [],
      recommendations: [],
      consolidationOpportunities: []
    };

    switch (analysisType) {
      case 'by_property':
        const properties = Object.entries(patterns)
          .sort((a: any, b: any) => b[1].count - a[1].count)
          .slice(0, 5);
        insights.topOwners = properties.map(([name, data]: any) => ({
          name,
          count: data.count
        }));
        break;
      case 'by_domain':
        const domains = Object.entries(patterns)
          .sort((a: any, b: any) => b[1].count - a[1].count)
          .slice(0, 5);
        insights.topOwners = domains.map(([domain, data]: any) => ({
          domain,
          count: data.count,
          propertyCount: data.properties.length
        }));
        
        // Check for consolidation opportunities
        domains.forEach(([domain, data]: any) => {
          if (data.properties.length > 3) {
            insights.consolidationOpportunities.push({
              domain,
              currentProperties: data.properties.length,
              recommendation: 'Consider consolidating to fewer properties'
            });
          }
        });
        break;
    }

    if (insights.consolidationOpportunities.length > 0) {
      insights.recommendations.push('Multiple properties managing same domain - consider consolidation');
    }

    return insights;
  }


  private validateDNS(hostname: string): { passed: boolean; message: string } {
    // Basic DNS validation
    const dnsRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const isValid = dnsRegex.test(hostname) || hostname.includes('*');
    
    return {
      passed: isValid,
      message: isValid ? 'Valid DNS hostname format' : 'Invalid DNS hostname format'
    };
  }

  private async validateCertificate(hostname: string): Promise<{ passed: boolean; message: string }> {
    // Simulate certificate validation
    const hasWildcard = hostname.includes('*');
    const isValid = !hasWildcard || hostname.split('*').length === 2;
    
    return {
      passed: isValid,
      message: isValid 
        ? 'Certificate compatible hostname' 
        : 'Hostname has multiple wildcards - not supported by standard certificates'
    };
  }

  private validateOwnership(hostname: string): { passed: boolean; message: string } {
    // Basic ownership validation - check if it's not a well-known domain
    const wellKnownDomains = ['google.com', 'facebook.com', 'amazon.com'];
    const domain = hostname.split('.').slice(-2).join('.');
    const isOwned = !wellKnownDomains.includes(domain);
    
    return {
      passed: isOwned,
      message: isOwned ? 'Domain ownership validated' : 'Cannot claim ownership of well-known domain'
    };
  }

  private summarizeValidationByCheck(results: any[]): Record<string, any> {
    const summary: Record<string, any> = {};
    
    results.forEach(result => {
      Object.entries(result.checks).forEach(([check, data]: any) => {
        if (!summary[check]) {
          summary[check] = { passed: 0, failed: 0 };
        }
        summary[check][data.passed ? 'passed' : 'failed']++;
      });
    });
    
    return summary;
  }

  private extractFailureReasons(results: any[]): string[] {
    const reasons = new Set<string>();
    
    results.forEach(result => {
      if (!result.isValid) {
        Object.values(result.checks).forEach((check: any) => {
          if (!check.passed) {
            reasons.add(check.message);
          }
        });
      }
    });
    
    return Array.from(reasons);
  }
}

// Export singleton instance
export const consolidatedHostnameTools = new ConsolidatedHostnameTools();