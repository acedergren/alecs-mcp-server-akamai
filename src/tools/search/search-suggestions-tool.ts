/**
 * SEARCH SUGGESTIONS TOOL
 * 
 * CODE KAI ARCHITECTURE:
 * Intelligent search suggestions based on:
 * - Search history
 * - Popular searches
 * - Type-ahead completions
 * - Spell corrections
 * 
 * USER EXPERIENCE:
 * - Smart query suggestions
 * - Learn from search patterns
 * - Help users find what they need faster
 */

import { z } from 'zod';
import { BaseTool } from '../common/base-tool';
import { MCPToolResponse } from '../../types';
import { AkamaiClient } from '../../akamai-client';
import { unifiedSearch } from '../../services/unified-search-service';
import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('search-suggestions-tool');

/**
 * Input schema for search suggestions tool
 */
export const SearchSuggestionsInputSchema = z.object({
  query: z.string().min(1).describe('Partial search query to get suggestions for'),
  customer: z.string().optional().describe('Customer account context for suggestions'),
  maxSuggestions: z.number().optional().default(10).describe('Maximum number of suggestions'),
});

/**
 * Search Suggestions Tool - Get intelligent search suggestions
 */
// Handler function for tools registry
export async function searchSuggestionsHandler(_client: AkamaiClient, args: unknown): Promise<MCPToolResponse> {
  const tool = new SearchSuggestionsTool();
  return tool.execute(args);
}

export class SearchSuggestionsTool extends BaseTool {
  protected readonly domain = 'search';
  name = 'search_suggestions';
  description = `Get intelligent search suggestions based on partial queries.

Suggestion types:
- History: Previous searches starting with the query
- Popular: Frequently searched terms
- Corrections: Spell-check suggestions for typos
- Completions: Auto-complete based on existing resources

Examples:
- "prop" → ["property-prod", "property-staging", "property list"]
- "certifcate" → ["certificate" (correction)]
- "example" → ["example.com", "example-staging.com"]`;

  inputSchema = SearchSuggestionsInputSchema;

  async execute(args: unknown): Promise<MCPToolResponse> {
    const input = SearchSuggestionsInputSchema.parse(args);
    logger.info({ input }, 'Getting search suggestions');

    try {
      // Get client for the specified customer
      const client = await this.getClient(input.customer);

      // Get suggestions
      const suggestions = await unifiedSearch.getSuggestions(
        input.query,
        client,
        input.customer
      );

      // Format suggestions for display
      let text = `# Search Suggestions for "${input.query}"\n\n`;

      if (suggestions.length === 0) {
        text += 'No suggestions available. Try typing more characters.\n';
      } else {
        // Group suggestions by type
        const byType = suggestions.reduce((acc, suggestion) => {
          if (!acc[suggestion.type]) {
            acc[suggestion.type] = [];
          }
          acc[suggestion.type]!.push(suggestion);
          return acc;
        }, {} as Record<string, typeof suggestions>);

        // Display by type
        const typeLabels: Record<string, string> = {
          history: '## Recent Searches',
          popular: '## Popular Searches',
          correction: '## Did You Mean?',
          completion: '## Suggestions',
        };

        for (const [type, typeSuggestions] of Object.entries(byType)) {
          if (typeSuggestions.length > 0) {
            const label = typeLabels[type] || `## ${type}`;
            text += `${label}\n\n`;
            
            for (const suggestion of typeSuggestions) {
              text += `- **${suggestion.text}**`;
              
              // Add metadata if available
              if (suggestion.metadata) {
                if (suggestion.metadata.searchCount) {
                  text += ` (searched ${suggestion.metadata.searchCount} times)`;
                }
                if (suggestion.metadata.resultCount !== undefined) {
                  text += ` (${suggestion.metadata.resultCount} results)`;
                }
                if (suggestion.metadata.originalQuery) {
                  text += ` (correction for "${suggestion.metadata.originalQuery}")`;
                }
              }
              
              text += '\n';
            }
            text += '\n';
          }
        }

        // Add search analytics summary
        const analytics = unifiedSearch.getSearchAnalytics();
        if (analytics.totalSearches > 0) {
          text += '## Search Analytics\n\n';
          text += `- Total searches tracked: ${analytics.totalSearches}\n`;
          text += `- Average search time: ${analytics.averageSearchTime.toFixed(0)}ms\n`;
          text += '\n';
        }
      }

      logger.info({ 
        query: input.query,
        suggestionCount: suggestions.length,
      }, 'Search suggestions retrieved successfully');

      return {
        content: [{
          type: 'text',
          text,
        }],
      };
    } catch (error) {
      logger.error({ error, input }, 'Failed to get search suggestions');
      throw error;
    }
  }
}