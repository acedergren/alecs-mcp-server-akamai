/**
 * Universal Akamai Search Tool - Enhanced with Caching
 * Uses Valkey/Redis for improved performance
 */

import { AkamaiCacheService } from '@services/cache-service';
import { handleApiError } from '@utils/error-handling';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

// Initialize cache service (singleton)
let cacheService: AkamaiCacheService | null = null;

function getCacheService(): AkamaiCacheService {
  if (!cacheService) {
    cacheService = new AkamaiCacheService();
  }
  return cacheService;
}

// Pattern matchers to identify query types
const patterns = {
  propertyId: /^prp_\d+$/i,
  contractId: /^ctr_[\w-]+$/i,
  groupId: /^grp_\d+$/i,
  cpCode: /^(cp_)?\d{4,7}$/i,
  edgeHostname: /\.(edgekey|edgesuite|akamaized|akamai)\.net$/i,
  hostname: /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
  activationId: /^atv_\d+$/i,
};

function detectQueryType(query: string): string[] {
  const types: string[] = [];
  const normalized = query.trim().toLowerCase();

  Object.entries(patterns).forEach(([type, pattern]) => {
    if (pattern.test(query)) {
      types.push(type);
    }
  });

  if (types.length === 0) {
    if (
      normalized.includes('.com') ||
      normalized.includes('.net') ||
      normalized.includes('.org') ||
      normalized.includes('.io')
    ) {
      types.push('hostname');
    }
    types.push('propertyName', 'general');
  }

  return types;
}

export async function universalSearchCachedHandler(
  client: AkamaiClient,
  args: { query: string; customer?: string; detailed?: boolean; useCache?: boolean },
): Promise<MCPToolResponse> {
  try {
    const startTime = Date.now();
    const queryTypes = detectQueryType(args.query);
    const detailed = args.detailed !== false;
    const useCache = args.useCache !== false;
    const customer = args.customer || 'default';
    const cache = getCacheService();

    console.error(`🔍 Universal search for: "${args.query}"`);
    console.error(`Detected query types: ${queryTypes.join(', ')}`);
    console.error(`Cache enabled: ${useCache}`);

    let results: any;
    let cacheHit = false;

    // Try cache first if enabled
    if (useCache) {
      try {
        results = await cache.search(client, args.query, customer);
        if (results?.matches && results.matches.length > 0) {
          cacheHit = true;
          console.error(`⚡ Cache HIT - Found ${results.matches.length} cached results`);
        }
      } catch (_err) {
        console.error('Cache error:', _err);
      }
    }

    // If no cache hit, perform search
    if (!cacheHit) {
      results = {
        query: args.query,
        queryTypes: queryTypes,
        matches: [],
        summary: { totalMatches: 0, resourceTypes: [] },
      };

      // Property ID search
      if (queryTypes.includes('propertyId')) {
        try {
          const response = await client.request({
            path: `/papi/v1/properties/${args.query}`,
            method: 'GET',
          });

          if (response.properties?.items?.[0]) {
            const property = response.properties.items[0];

            if (detailed) {
              // Get hostnames
              try {
                const hostnamesResp = await client.request({
                  path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`,
                  method: 'GET',
                  queryParams: {
                    contractId: property.contractId,
                    groupId: property.groupId,
                  },
                });
                property.hostnames = hostnamesResp.hostnames?.items || [];
              } catch (_e) {
                console.error('Failed to get hostnames:', _e);
              }
            }

            results.matches.push({
              type: 'property',
              resource: property,
              matchReason: 'Exact property ID match',
            });
          }
        } catch (_err) {
          console.error('Property ID search failed:', _err);
        }
      }

      // Search using cache-optimized property list
      if (
        queryTypes.includes('hostname') ||
        queryTypes.includes('propertyName') ||
        queryTypes.includes('general')
      ) {
        try {
          // Get properties from cache or API
          const properties = await cache.getProperties(client, customer);

          for (const property of properties) {
            let isMatch = false;
            const matchReasons: string[] = [];

            // Check property name
            if (property.propertyName?.toLowerCase().includes(args.query.toLowerCase())) {
              isMatch = true;
              matchReasons.push('Property name match');
            }

            // Check hostnames if it looks like a domain
            if (queryTypes.includes('hostname') || args.query.includes('.')) {
              try {
                // Try to get from hostname cache first
                const _cacheKey = `akamai:${customer}:property:${property.propertyId}:hostnames`;

                const hostnamesResp = await client.request({
                  path: `/papi/v1/properties/${property.propertyId}/versions/${property.latestVersion}/hostnames`,
                  method: 'GET',
                  queryParams: {
                    contractId: property.contractId,
                    groupId: property.groupId,
                  },
                });

                const hostnames = hostnamesResp.hostnames?.items || [];
                const queryLower = args.query.toLowerCase();

                for (const hostname of hostnames) {
                  const cnameFrom = hostname.cnameFrom?.toLowerCase() || '';
                  const cnameTo = hostname.cnameTo?.toLowerCase() || '';

                  if (
                    cnameFrom === queryLower ||
                    cnameFrom === `www.${queryLower}` ||
                    queryLower === `www.${cnameFrom}` ||
                    cnameFrom.includes(queryLower) ||
                    cnameTo.includes(queryLower)
                  ) {
                    isMatch = true;
                    matchReasons.push(`Hostname match: ${hostname.cnameFrom}`);
                    break;
                  }
                }

                if (isMatch && detailed) {
                  property.hostnames = hostnames;
                }
              } catch (_err) {
                console.error(`Error checking hostnames for ${property.propertyId}:`, _err);
              }
            }

            if (isMatch) {
              results.matches.push({
                type: 'property',
                resource: property,
                matchReason: matchReasons.join(', '),
              });
            }
          }
        } catch (_err) {
          console.error('Property search failed:', _err);
        }
      }

      // Contract search
      if (queryTypes.includes('contractId')) {
        try {
          const contractsResp = await client.request({
            path: '/papi/v1/contracts',
            method: 'GET',
          });

          const contract = contractsResp.contracts?.items?.find(
            (c: any) => c.contractId === args.query,
          );

          if (contract) {
            results.matches.push({
              type: 'contract',
              resource: contract,
              matchReason: 'Exact contract ID match',
            });
          }
        } catch (_err) {
          console.error('Contract search failed:', _err);
        }
      }

      // Group search
      if (queryTypes.includes('groupId')) {
        try {
          const groupsResp = await client.request({
            path: '/papi/v1/groups',
            method: 'GET',
          });

          const group = groupsResp.groups?.items?.find((g: any) => g.groupId === args.query);

          if (group) {
            results.matches.push({
              type: 'group',
              resource: group,
              matchReason: 'Exact group ID match',
            });
          }
        } catch (_err) {
          console.error('Group search failed:', _err);
        }
      }
    }

    // Update summary
    results.summary.totalMatches = results.matches.length;
    results.summary.resourceTypes = [...new Set(results.matches.map((m: any) => m.type))];

    const searchTime = Date.now() - startTime;

    // Format response
    let responseText = `🔍 **Search Results for "${args.query}"**\n\n`;

    if (results.matches.length === 0) {
      responseText += '❌ No matches found.\n\n💡 Try searching for:\n';
      responseText += '• Full hostname (e.g., www.example.com)\n';
      responseText += '• Property name or ID (prp_12345)\n';
      responseText += '• Contract ID (ctr_X-XXXXX)\n';
      responseText += '• Group ID (grp_12345)\n';
    } else {
      responseText += `✅ Found ${results.summary.totalMatches} match${results.summary.totalMatches > 1 ? 'es' : ''}\n`;
      responseText += `⏱️ Search completed in ${searchTime}ms ${cacheHit ? '(from cache)' : '(from API)'}\n\n`;

      for (const match of results.matches) {
        const r = match.resource;

        if (match.type === 'property') {
          responseText += `📦 **${r.propertyName}** \`${r.propertyId}\`\n`;
          responseText += `• Contract: \`${r.contractId}\`\n`;
          responseText += `• Group: \`${r.groupId}\`\n`;
          responseText += `• Version: Latest v${r.latestVersion}, Production v${r.productionVersion || 'None'}, Staging v${r.stagingVersion || 'None'}\n`;
          responseText += `• Match: ${match.matchReason}\n`;

          if (r.hostnames) {
            responseText += '• **Hostnames:**\n';
            r.hostnames.slice(0, 5).forEach((h: any) => {
              responseText += `  - ${h.cnameFrom} → ${h.cnameTo}\n`;
            });
            if (r.hostnames.length > 5) {
              responseText += `  ... and ${r.hostnames.length - 5} more\n`;
            }
          }
          responseText += '\n';
        } else if (match.type === 'contract') {
          responseText += `📄 **Contract** \`${r.contractId}\`\n`;
          responseText += `• Type: ${r.contractTypeName || 'Standard'}\n\n`;
        } else if (match.type === 'group') {
          responseText += `🏢 **${r.groupName}** \`${r.groupId}\`\n\n`;
        }
      }
    }

    // Add cache statistics if available
    if (useCache) {
      try {
        const stats = await cache.getStats();
        if (stats.enabled) {
          responseText += '\n📊 **Cache Statistics:**\n';
          responseText += `• Cache: ${stats.connected ? 'Connected' : 'Disconnected'}\n`;
          responseText += `• Total Keys: ${stats.totalKeys || 0}\n`;
          responseText += `• Akamai Keys: ${stats.akamaiKeys || 0}\n`;
        }
      } catch (_err) {
        // Ignore stats errors
      }
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
    return handleApiError(_error, 'universal search');
  }
}
