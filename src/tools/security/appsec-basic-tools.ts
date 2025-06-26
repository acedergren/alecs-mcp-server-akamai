/**
 * Basic Akamai Application Security (APPSEC) MCP Tools
 *
 * Essential WAF policy management and security configuration tools.
 */

import { getCustomerConfig, hasCustomer } from '../../utils/customer-config';
import { formatJson, formatTable } from '../../utils/formatting';
import { ResilienceManager, OperationType } from '../../utils/resilience-manager';
import { z } from 'zod';

import { AkamaiClient } from '../../akamai-client';
import { type MCPToolResponse } from '../../types';

// Initialize resilience manager
const resilienceManager = ResilienceManager.getInstance();

// Helper functions
async function validateCustomerExists(customer: string): Promise<void> {
  if (!hasCustomer(customer)) {
    throw new Error(`Customer section '${customer}' not found in .edgerc file`);
  }
}

// Base schemas for validation
const ConfigIdSchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
});

const WAFPolicySchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
  policyName: z.string(),
  policyMode: z.enum(['ASE_AUTO', 'ASE_MANUAL', 'KRS']),
});

const SecurityEventsSchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
  from: z.string(),
  to: z.string(),
});

const ActivationSchema = z.object({
  customer: z.string().optional(),
  configId: z.number(),
  version: z.number(),
  network: z.enum(['STAGING', 'PRODUCTION']),
});

/**
 * List Application Security configurations
 */
export const listAppSecConfigurations = {
  name: 'list-appsec-configurations',
  description: 'List all Application Security configurations in your account',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Optional: Customer section name from .edgerc (default: "default")',
      },
    },
  },
  handler: async (args: any): Promise<MCPToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const response = await client.request({
        path: '/appsec/v1/configs',
        method: 'GET',
      });

      const configurations = response.configurations || [];

      return {
        content: [
          {
            type: 'text',
            text: `Found ${configurations.length} Application Security configurations:\n\n${formatTable(
              configurations.map((config: any) => ({
                'Config ID': config.id,
                Name: config.name,
                Description: config.description || 'N/A',
                'Latest Version': config.latestVersion,
                'Production Version': config.productionVersion || 'None',
                'Staging Version': config.stagingVersion || 'None',
              })),
            )}`,
          },
        ],
      };
    } catch (_error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list APPSEC configurations: ${_error instanceof Error ? _error.message : String(_error)}`,
          },
        ],
      };
    }
  },
};

/**
 * Get Application Security configuration details
 */
export const getAppSecConfiguration = {
  name: 'get-appsec-configuration',
  description: 'Get detailed information about a specific Application Security configuration',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Optional: Customer section name from .edgerc (default: "default")',
      },
      configId: {
        type: 'number',
        description: 'Application Security configuration ID',
      },
      version: {
        type: 'number',
        description: 'Optional: Specific version to retrieve (defaults to latest)',
      },
    },
    required: ['configId'],
  },
  handler: async (args: any): Promise<MCPToolResponse> => {
    const parsed = ConfigIdSchema.parse(args);
    const client = new AkamaiClient(parsed.customer || 'default');

    try {
      const versionParam = args.version ? `?version=${args.version}` : '';
      const response = await client.request({
        path: `/appsec/v1/configs/${args.configId}${versionParam}`,
        method: 'GET',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Application Security Configuration Details:\n\n${formatJson(response)}`,
          },
        ],
      };
    } catch (_error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get APPSEC configuration: ${_error instanceof Error ? _error.message : String(_error)}`,
          },
        ],
      };
    }
  },
};

/**
 * Create WAF security policy
 */
export const createWAFPolicy = {
  name: 'create-waf-policy',
  description: 'Create a new WAF security policy',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Optional: Customer section name from .edgerc (default: "default")',
      },
      configId: {
        type: 'number',
        description: 'Application Security configuration ID',
      },
      policyName: {
        type: 'string',
        description: 'Name for the WAF policy',
      },
      policyMode: {
        type: 'string',
        enum: ['ASE_AUTO', 'ASE_MANUAL', 'KRS'],
        description: 'WAF policy mode',
      },
      paranoidLevel: {
        type: 'number',
        minimum: 1,
        maximum: 4,
        description: 'Optional: Paranoid level (1-4) for ASE modes',
      },
    },
    required: ['configId', 'policyName', 'policyMode'],
  },
  handler: async (args: any) => {
    const parsed = WAFPolicySchema.parse(args);
    const customer = parsed.customer || 'default';

    return await resilienceManager.executeWithResilience(OperationType.PROPERTY_WRITE, async () => {
      await validateCustomerExists(customer);
      const config = getCustomerConfig(customer);
      const auth = new AkamaiClient(customer, config.account_switch_key);

      const policyData = {
        policyName: parsed.policyName,
        policyMode: parsed.policyMode,
        ...(args.paranoidLevel && { paranoidLevel: args.paranoidLevel }),
      };

      const data = await auth.request({
        path: `/appsec/v1/configs/${parsed.configId}/versions/1/security-policies`,
        method: 'POST',
        body: policyData,
      });

      return {
        content: [
          {
            type: 'text',
            text: `WAF policy '${parsed.policyName}' created successfully\n\nPolicy ID: ${data.policyId}\n\n${formatJson(data)}`,
          },
        ],
      };
    });
  },
};

/**
 * Get security events
 */
export const getSecurityEvents = {
  name: 'get-security-events',
  description: 'Retrieve security events and attack data for monitoring and analysis',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Optional: Customer section name from .edgerc (default: "default")',
      },
      configId: {
        type: 'number',
        description: 'Application Security configuration ID',
      },
      from: {
        type: 'string',
        description: 'Start time (ISO 8601 format)',
      },
      to: {
        type: 'string',
        description: 'End time (ISO 8601 format)',
      },
      limit: {
        type: 'number',
        maximum: 1000,
        description: 'Optional: Maximum number of events to return',
      },
    },
    required: ['configId', 'from', 'to'],
  },
  handler: async (args: any) => {
    const parsed = SecurityEventsSchema.parse(args);
    const customer = parsed.customer || 'default';

    return await resilienceManager.executeWithResilience(OperationType.PROPERTY_READ, async () => {
      await validateCustomerExists(customer);
      const config = getCustomerConfig(customer);
      const auth = new AkamaiClient(customer, config.account_switch_key);

      const queryParams = new URLSearchParams({
        from: parsed.from,
        to: parsed.to,
        ...(args.limit && { limit: args.limit.toString() }),
      });

      const response = await auth.request({
        path: `/appsec/v1/configs/${parsed.configId}/security-events?${queryParams.toString()}`,
        method: 'GET',
      });

      const data = response;

      return {
        content: [
          {
            type: 'text',
            text: `Security Events (${parsed.from} to ${parsed.to}):\nTotal Events: ${data.totalEvents || 0}\n\n${formatTable(
              data.securityEvents?.map((event: any) => ({
                'Event Time': new Date(
                  event.httpMessage?.start || event.timestamp,
                ).toLocaleString(),
                'Client IP': event.clientIP,
                'Rule ID': event.ruleId,
                'Attack Group': event.attackGroup,
                Action: event.action,
                Hostname: event.httpMessage?.host,
                URI: event.httpMessage?.requestUri,
              })) || [],
            )}`,
          },
        ],
      };
    });
  },
};

/**
 * Activate security configuration
 */
export const activateSecurityConfiguration = {
  name: 'activate-security-configuration',
  description: 'Activate an Application Security configuration to staging or production',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Optional: Customer section name from .edgerc (default: "default")',
      },
      configId: {
        type: 'number',
        description: 'Application Security configuration ID',
      },
      version: {
        type: 'number',
        description: 'Version to activate',
      },
      network: {
        type: 'string',
        enum: ['STAGING', 'PRODUCTION'],
        description: 'Target network',
      },
      note: {
        type: 'string',
        description: 'Optional: Activation notes',
      },
    },
    required: ['configId', 'version', 'network'],
  },
  handler: async (args: any) => {
    const parsed = ActivationSchema.parse(args);
    const customer = parsed.customer || 'default';

    return await resilienceManager.executeWithResilience(OperationType.PROPERTY_WRITE, async () => {
      await validateCustomerExists(customer);
      const config = getCustomerConfig(customer);
      const auth = new AkamaiClient(customer, config.account_switch_key);

      const activationData = {
        action: 'ACTIVATE',
        network: parsed.network,
        ...(args.note && { note: args.note }),
      };

      const data = await auth.request({
        path: `/appsec/v1/configs/${parsed.configId}/versions/${parsed.version}/activations`,
        method: 'POST',
        body: activationData,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Security configuration ${parsed.configId} v${parsed.version} activation initiated on ${parsed.network}\n\nActivation ID: ${data.activationId}\nStatus: ${data.status}\n\n${formatJson(data)}`,
          },
        ],
      };
    });
  },
};

/**
 * Get activation status
 */
export const getSecurityActivationStatus = {
  name: 'get-security-activation-status',
  description: 'Get the status of a security configuration activation',
  inputSchema: {
    type: 'object',
    properties: {
      customer: {
        type: 'string',
        description: 'Optional: Customer section name from .edgerc (default: "default")',
      },
      configId: {
        type: 'number',
        description: 'Application Security configuration ID',
      },
      activationId: {
        type: 'number',
        description: 'Activation ID to check status for',
      },
    },
    required: ['configId', 'activationId'],
  },
  handler: async (args: any) => {
    const customer = args.customer || 'default';

    return await resilienceManager.executeWithResilience(OperationType.PROPERTY_READ, async () => {
      await validateCustomerExists(customer);
      const config = getCustomerConfig(customer);
      const auth = new AkamaiClient(customer, config.account_switch_key);

      const data = await auth.request({
        path: `/appsec/v1/configs/${args.configId}/activations/${args.activationId}`,
        method: 'GET',
      });

      return {
        content: [
          {
            type: 'text',
            text: `Activation ${args.activationId} status: ${data.status}\nNetwork: ${data.network}\nProgress: ${data.progress || 0}%\n\n${formatJson(data)}`,
          },
        ],
      };
    });
  },
};

// Export all basic security tools
export const basicAppSecTools = [
  listAppSecConfigurations,
  getAppSecConfiguration,
  createWAFPolicy,
  getSecurityEvents,
  activateSecurityConfiguration,
  getSecurityActivationStatus,
];

export default basicAppSecTools;
