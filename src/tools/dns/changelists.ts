
import { z } from 'zod';
import { AkamaiOperation, MCPToolResponse } from '../common';
import {
  isEdgeDNSZoneSubmitResponse,
  EdgeDNSZoneSubmitResponse,
  EdgeDNSChangeListMetadataSchema,
} from '../../types/api-responses/edge-dns-zones';

const GetChangeListMetadataSchema = z.object({
  zone: z.string(),
});

const SubmitChangeListSchema = z.object({
  zone: z.string(),
  comment: z.string().optional(),
  validateOnly: z.boolean().optional(),
});

const DiscardChangeListSchema = z.object({
  zone: z.string(),
});

type GetChangeListMetadataArgs = z.infer<typeof GetChangeListMetadataSchema>;
type SubmitChangeListArgs = z.infer<typeof SubmitChangeListSchema>;
type DiscardChangeListArgs = z.infer<typeof DiscardChangeListSchema>;

async function getChangeListMetadata(
  client: any,
  args: GetChangeListMetadataArgs
): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'get-changelist-metadata',
    args,
    async (client) => {
      const rawResponse = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const parsed = EdgeDNSChangeListMetadataSchema.safeParse(rawResponse);
      if (!parsed.success) {
        throw new Error(
          'Invalid Edge DNS change list metadata response structure'
        );
      }
      return parsed.data;
    },
    {
      formatter: (data) => {
        return JSON.stringify(data, null, 2);
      },
    }
  );
}

async function submitChangeList(
  client: any,
  args: SubmitChangeListArgs
): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'submit-changelist',
    args,
    async (client) => {
      const rawResponse = await client.request({
        path: `/config-dns/v2/changelists/${args.zone}/submit`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: {
          comment: args.comment || `Submitting pending changes for ${args.zone}`,
          validateOnly: args.validateOnly,
        },
      });

      if (!isEdgeDNSZoneSubmitResponse(rawResponse)) {
        throw new Error('Invalid Edge DNS zone submit response structure');
      }

      return rawResponse as EdgeDNSZoneSubmitResponse;
    },
    {
      formatter: (data) => {
        return `Successfully submitted changelist for zone ${args.zone}. Request ID: ${data.requestId}`;
      },
    }
  );
}

async function discardChangeList(
  client: any,
  args: DiscardChangeListArgs
): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    'dns',
    'discard-changelist',
    args,
    async (client) => {
      await client.request({
        path: `/config-dns/v2/changelists/${args.zone}`,
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });
      return {};
    },
    {
      formatter: () => {
        return `Successfully discarded changelist for zone ${args.zone}`;
      },
    }
  );
}

export const dnsChangelistOperations = {
  'get-changelist-metadata': {
    handler: getChangeListMetadata,
    schema: GetChangeListMetadataSchema,
    description: 'Get metadata for a zones changelist.',
  },
  'submit-changelist': {
    handler: submitChangeList,
    schema: SubmitChangeListSchema,
    description: 'Submit a zones changelist.',
  },
  'discard-changelist': {
    handler: discardChangeList,
    schema: DiscardChangeListSchema,
    description: 'Discard a zones changelist.',
  },
};
