/**
 * Network Lists Domain Tools
 * 
 * Part of the Security domain, these tools manage network lists for use in WAF policies.
 */

import { z } from 'zod';
import { AkamaiOperation, MCPToolResponse } from '../common';
import { AkamaiClient } from '../../akamai-client';

// --- Schemas ---

const ListNetworkListsSchema = z.object({
  customer: z.string().optional(),
  format: z.enum(['json', 'text']).optional(),
});

const GetNetworkListSchema = z.object({
  listId: z.string().describe("The unique ID of the network list."),
  customer: z.string().optional(),
  format: z.enum(['json', 'text']).optional(),
});

// --- Tool Handlers ---

async function listNetworkLists(client: AkamaiClient, args: z.infer<typeof ListNetworkListsSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'list-network-lists',
    args,
    async (client) => {
      return client.request({
        path: '/network-list/v2/network-lists',
        method: 'GET',
      });
    },
    {
      format: args.format,
      formatter: (data: any) => {
        if (args.format === 'json') {
          return JSON.stringify(data.networkLists, null, 2);
        }
        let text = '# Network Lists\n\n';
        if (!data.networkLists || data.networkLists.length === 0) {
          return 'No network lists found.';
        }
        text += '| Name | ID | Type | Items |\n';
        text += '|------|----|------|-------|\n';
        for (const list of data.networkLists) {
          text += `| ${list.name} | ${list.uniqueId} | ${list.type} | ${list.elementCount} |\n`;
        }
        return text;
      },
    }
  );
}

async function getNetworkList(client: AkamaiClient, args: z.infer<typeof GetNetworkListSchema>): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'security',
    'get-network-list',
    args,
    async (client) => {
      return client.request({
        path: `/network-list/v2/network-lists/${args.listId}`,
        method: 'GET',
      });
    },
    {
      format: args.format,
      formatter: (data: any) => {
        if (args.format === 'json') {
          return JSON.stringify(data, null, 2);
        }
        let text = `# Network List: ${data.name}\n\n`;
        text += `**ID:** ${data.uniqueId}\n`;
        text += `**Type:** ${data.type}\n`;
        text += `**Items:** ${data.elementCount}\n`;
        text += `**Sync Point:** ${data.syncPoint}\n\n`;
        if (data.list && data.list.length > 0) {
          text += '## Elements\n';
          text += '```\n';
          text += data.list.join('\n');
          text += '\n```';
        }
        return text;
      },
    }
  );
}

// --- Operations Object ---

export const networkListOperations = {
  'network-list-list': {
    description: 'Lists all available network lists.',
    schema: ListNetworkListsSchema,
    handler: listNetworkLists,
  },
  'network-list-get': {
    description: 'Retrieves the details and elements of a specific network list.',
    schema: GetNetworkListSchema,
    handler: getNetworkList,
  },
};
