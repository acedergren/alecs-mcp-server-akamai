
import { z } from 'zod';
import { AkamaiOperation, MCPToolResponse } from '../common';
import {
  isEdgeDNSRecordSetsResponse,
  EdgeDNSRecordSetsResponse,
} from '../../types/api-responses/edge-dns-zones';

const ListRecordsSchema = z.object({
  zone: z.string(),
  search: z.string().optional(),
  types: z.array(z.string()).optional(),
});

const UpsertRecordSchema = z.object({
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  ttl: z.number(),
  rdata: z.array(z.string()),
  comment: z.string().optional(),
  force: z.boolean().optional(),
  autoSubmit: z.boolean().optional(),
});

const DeleteRecordSchema = z.object({
  zone: z.string(),
  name: z.string(),
  type: z.string(),
  comment: z.string().optional(),
  force: z.boolean().optional(),
});

type ListRecordsArgs = z.infer<typeof ListRecordsSchema>;
type UpsertRecordArgs = z.infer<typeof UpsertRecordSchema>;
type DeleteRecordArgs = z.infer<typeof DeleteRecordSchema>;

async function listRecords(
  client: any,
  args: ListRecordsArgs
): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'list-records',
    args,
    async (client) => {
      const queryParams: Record<string, string> = {};
      if (args.search) {
        queryParams['search'] = args.search;
      }
      if (args.types?.length) {
        queryParams['types'] = args.types.join(',');
      }

      const rawResponse = await client.request({
        path: `/config-dns/v2/zones/${args.zone}/recordsets`,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        queryParams,
      });

      if (!isEdgeDNSRecordSetsResponse(rawResponse)) {
        throw new Error('Invalid Edge DNS record sets response structure');
      }

      return rawResponse as EdgeDNSRecordSetsResponse;
    },
    {
      formatter: (response) => {
        if (!response.recordsets || response.recordsets.length === 0) {
          return `No DNS records found for zone: ${args.zone}`;
        }

        const recordsList = response.recordsets
          .map((record) => {
            const rdataStr = record.rdata.join(', ');
            return `• ${record.name} ${record.ttl} ${record.type} ${rdataStr}`;
          })
          .join('\n');

        return `Found ${response.recordsets.length} DNS records in zone ${args.zone}:\n\n${recordsList}`;
      },
    }
  );
}

async function upsertRecord(
  client: any,
  args: UpsertRecordArgs
): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'upsert-record',
    args,
    async (client) => {
      let operation: 'ADD' | 'EDIT' = 'ADD';
      try {
        const existingRecords = await client.request({
          path: `/config-dns/v2/zones/${args.zone}/recordsets`,
          method: 'GET',
          headers: { Accept: 'application/json' },
          queryParams: {
            types: args.type,
            search: args.name,
          },
        });

        const records = (existingRecords as EdgeDNSRecordSetsResponse)
          .recordsets || [];
        const exactMatch = records.find(
          (r) => r.name === args.name && r.type === args.type
        );

        if (exactMatch) {
          operation = 'EDIT';
        }
      } catch (checkError) {
        // If we can't check, assume ADD
      }

      await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        queryParams: {
          zone: args.zone,
        },
      });

      const changeOperation = {
        name: args.name,
        type: args.type,
        op: operation,
        ttl: args.ttl,
        rdata: args.rdata,
      };

      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: changeOperation,
      });

      if (args.autoSubmit !== false) {
        await client.request({
          path: `/config-dns/v2/changelists/${args.zone}/submit`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: {
            comment: args.comment ||
              `${operation === 'ADD' ? 'Created' : 'Updated'} ${args.type} record for ${args.name}`,
          },
        });
      }

      return { operation };
    },
    {
      formatter: (data) => {
        return `Successfully ${data.operation === 'ADD' ? 'created' : 'updated'} DNS record: ${args.name} ${args.type}`;
      },
    }
  );
}

async function deleteRecord(
  client: any,
  args: DeleteRecordArgs
): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'delete-record',
    args,
    async (client) => {
      await client.request({
        path: '/config-dns/v2/changelists',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        queryParams: {
          zone: args.zone,
        },
      });

      const deleteOperation = {
        name: args.name,
        type: args.type,
        op: 'DELETE' as const,
      };

      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/recordsets/add-change`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: deleteOperation,
      });

      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: {
          comment: args.comment || `Deleted ${args.type} record for ${args.name}`,
        },
      });

      return {};
    },
    {
      formatter: () => {
        return `Successfully deleted DNS record: ${args.name} ${args.type}`;
      },
    }
  );
}

export const dnsRecordOperations = {
  'list-records': {
    handler: listRecords,
    schema: ListRecordsSchema,
    description: 'List all DNS records for a zone.',
  },
  'upsert-record': {
    handler: upsertRecord,
    schema: UpsertRecordSchema,
    description: 'Create or update a DNS record.',
  },
  'delete-record': {
    handler: deleteRecord,
    schema: DeleteRecordSchema,
    description: 'Delete a DNS record.',
  },
};
