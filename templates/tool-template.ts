/**
 * ${DOMAIN} Domain Tools Template
 * 
 * This template demonstrates how to create tools with ID translation support
 * Replace ${DOMAIN} with your domain name (e.g., 'property', 'certificate', etc.)
 */

import { type MCPToolResponse, BaseTool } from '../common';
import { z } from 'zod';

// Define your tool schemas
const ${DOMAIN}ToolSchemas = {
  list: z.object({
    customer: z.string().optional().describe('Customer account to use (from .edgerc)'),
    // Add your parameters here
  }),
  
  get: z.object({
    customer: z.string().optional().describe('Customer account to use (from .edgerc)'),
    id: z.string().describe('${DOMAIN} ID'),
    // Add your parameters here
  }),
};

/**
 * List ${DOMAIN} resources
 * 
 * This example shows how to enable ID translation for list operations
 */
export async function list${DOMAIN}s(args: z.infer<typeof ${DOMAIN}ToolSchemas.list>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${DOMAIN}',
    '${DOMAIN}_list',
    args,
    async (client) => {
      const queryParams: Record<string, string> = {};
      
      // Build your query parameters here
      
      return client.request({
        method: 'GET',
        path: `/api/v1/${DOMAIN}s`, // Update with actual endpoint
        queryParams
      });
    },
    {
      format: 'json', // or 'text' with a custom formatter
      cacheKey: (p) => `${DOMAIN}:list:\${p.customer || 'default'}`,
      cacheTtl: 300, // 5 minutes
      
      // Enable ID translation with appropriate mappings
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.${DOMAIN} || [
          // Define custom mappings if not in COMMON_TRANSLATIONS
          { path: '${DOMAIN}Id', type: '${DOMAIN}' as any },
          { path: '*.${DOMAIN}Id', type: '${DOMAIN}' as any },
          { path: '${DOMAIN}s.*.${DOMAIN}Id', type: '${DOMAIN}' as any },
          // Include related IDs that might appear
          { path: '*.contractId', type: 'contract' },
          { path: '*.groupId', type: 'group' },
        ]
      }
    }
  );
}

/**
 * Get ${DOMAIN} details
 * 
 * This example shows how to enable ID translation for single resource operations
 */
export async function get${DOMAIN}(args: z.infer<typeof ${DOMAIN}ToolSchemas.get>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${DOMAIN}',
    '${DOMAIN}_get',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: `/api/v1/${DOMAIN}s/\${args.id}`, // Update with actual endpoint
      });
    },
    {
      format: 'json',
      cacheKey: (p) => `${DOMAIN}:\${p.id}`,
      cacheTtl: 300,
      
      // Enable ID translation
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.${DOMAIN} || [
          { path: '${DOMAIN}Id', type: '${DOMAIN}' as any },
          { path: 'contractId', type: 'contract' },
          { path: 'groupId', type: 'group' },
        ],
        
        // Optional: Configure translation behavior
        options: {
          includeMetadata: true, // Include additional metadata in translations
          ttl: 3600000, // Custom cache TTL for translations (1 hour)
        }
      }
    }
  );
}

/**
 * Example: Operation without translation
 * 
 * Some operations might not need ID translation
 */
export async function create${DOMAIN}(args: any): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${DOMAIN}',
    '${DOMAIN}_create',
    args,
    async (client) => {
      return client.request({
        method: 'POST',
        path: `/api/v1/${DOMAIN}s`,
        body: args.data
      });
    },
    {
      format: 'json',
      // No translation needed for create operations
      translation: {
        enabled: false
      }
    }
  );
}

/**
 * Example: Custom formatter with translation
 * 
 * Shows how translation works with custom formatters
 */
export async function list${DOMAIN}sFormatted(args: any): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${DOMAIN}',
    '${DOMAIN}_list_formatted',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: `/api/v1/${DOMAIN}s`,
      });
    },
    {
      format: 'text',
      
      // Custom formatter receives the translated response
      formatter: (result: any) => {
        const items = result.${DOMAIN}s?.items || [];
        if (items.length === 0) {
          return 'No ${DOMAIN}s found';
        }
        
        let output = `Found \${items.length} ${DOMAIN}(s):\n\n`;
        
        items.forEach((item: any, index: number) => {
          output += `\${index + 1}. \${item.name || item.${DOMAIN}Id}\n`;
          
          // Thanks to translation, we can show human-readable names
          if (item.contractName) {
            output += `   Contract: \${item.contractName} (\${item.contractId})\n`;
          }
          if (item.groupName) {
            output += `   Group: \${item.groupName} (\${item.groupId})\n`;
          }
          output += '\n';
        });
        
        return output;
      },
      
      // Translation happens before formatting
      translation: {
        enabled: true,
        mappings: BaseTool.COMMON_TRANSLATIONS.all // Use all common mappings
      }
    }
  );
}

/**
 * Export all tools for registration
 */
export const ${DOMAIN}Tools = {
  list${DOMAIN}s,
  get${DOMAIN},
  create${DOMAIN},
  list${DOMAIN}sFormatted,
};