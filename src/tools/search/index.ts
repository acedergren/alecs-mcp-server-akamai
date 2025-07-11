/**
 * SEARCH TOOLS INDEX
 * 
 * CODE KAI ARCHITECTURE:
 * Exports all search-related tools for the Universal Search Engine.
 * These tools provide various search capabilities across Akamai resources.
 */

export { SearchAllTool } from './search-all-tool';
export { SearchPropertiesTool } from './search-properties-tool';
export { SearchDnsZonesTool } from './search-dns-zones-tool';
export { SearchCertificatesTool } from './search-certificates-tool';
export { SearchSuggestionsTool } from './search-suggestions-tool';

// Import handler functions and schemas
import { searchAllHandler, SearchAllInputSchema } from './search-all-tool';
import { searchPropertiesHandler, SearchPropertiesInputSchema } from './search-properties-tool';
import { searchDnsZonesHandler, SearchDnsZonesInputSchema } from './search-dns-zones-tool';
import { searchCertificatesHandler, SearchCertificatesInputSchema } from './search-certificates-tool';
import { searchSuggestionsHandler, SearchSuggestionsInputSchema } from './search-suggestions-tool';

// Export tools object for registry
export const searchTools = {
  search_all: {
    description: 'Search across all Akamai resources with fuzzy matching and advanced filtering',
    inputSchema: SearchAllInputSchema,
    handler: searchAllHandler,
  },
  search_properties: {
    description: 'Search for Akamai properties by name, ID, hostname, or CP code',
    inputSchema: SearchPropertiesInputSchema,
    handler: searchPropertiesHandler,
  },
  search_dns_zones: {
    description: 'Search for Akamai Edge DNS zones by domain name or zone comment',
    inputSchema: SearchDnsZonesInputSchema,
    handler: searchDnsZonesHandler,
  },
  search_certificates: {
    description: 'Search for Akamai CPS certificates by common name, domain, or enrollment ID',
    inputSchema: SearchCertificatesInputSchema,
    handler: searchCertificatesHandler,
  },
  search_suggestions: {
    description: 'Get intelligent search suggestions based on partial queries',
    inputSchema: SearchSuggestionsInputSchema,
    handler: searchSuggestionsHandler,
  },
};