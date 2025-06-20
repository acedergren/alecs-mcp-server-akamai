/**
 * Basic Akamai Application Security (APPSEC) MCP Tools
 *
 * Essential WAF policy management and security configuration tools.
 */

import { AkamaiClient } from '../../akamai-client';

// Tool response interface
interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Simple formatting functions
function formatJson(obj: any): string {
  return JSON.stringify(obj, null, 2);
}

function formatTable(data: any[]): string {
  if (!data || data.length === 0) {
return 'No data available';
}

  const keys = Object.keys(data[0]);
  let result = keys.join('\t') + '\n';
  result += keys.map(() => '---').join('\t') + '\n';

  data.forEach((row) => {
    result += keys.map((key) => row[key] || 'N/A').join('\t') + '\n';
  });

  return result;
}

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
  handler: async (args: any): Promise<ToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const response = await client._request({
        path: '/appsec/v1/configs',
        method: 'GET',
      });

      const configurations = response.configurations || [];

      return {
        success: true,
        data: {
          configurations,
          count: configurations.length,
          formatted: formatTable(
            configurations.map((config: any) => ({
              'Config ID': config.id,
              Name: config.name,
              Description: config.description || 'N/A',
              'Latest Version': config.latestVersion,
              'Production Version': config.productionVersion || 'None',
              'Staging Version': config.stagingVersion || 'None',
            })),
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list APPSEC configurations: ${error instanceof Error ? error.message : String(error)}`,
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
  handler: async (args: any): Promise<ToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const versionParam = args.version ? `?version=${args.version}` : '';
      const response = await client._request({
        path: `/appsec/v1/configs/${args.configId}${versionParam}`,
        method: 'GET',
      });

      return {
        success: true,
        data: {
          configuration: response,
          formatted: formatJson(response),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get APPSEC configuration: ${error instanceof Error ? error.message : String(error)}`,
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
  handler: async (args: any): Promise<ToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const policyData = {
        policyName: args.policyName,
        policyMode: args.policyMode,
        ...(args.paranoidLevel && { paranoidLevel: args.paranoidLevel }),
      };

      const response = await client._request({
        path: `/appsec/v1/configs/${args.configId}/versions/1/security-policies`,
        method: 'POST',
        body: policyData,
      });

      return {
        success: true,
        data: {
          policy: response,
          policyId: response.policyId,
          message: `WAF policy '${args.policyName}' created successfully`,
          formatted: formatJson(response),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create WAF policy: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
  handler: async (args: any): Promise<ToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const queryParams: Record<string, string> = {
        from: args.from,
        to: args.to,
      };

      if (args.limit) {
        queryParams.limit = args.limit.toString();
      }

      const response = await client._request({
        path: `/appsec/v1/configs/${args.configId}/security-events`,
        method: 'GET',
        queryParams,
      });

      const events = response.securityEvents || [];

      return {
        success: true,
        data: {
          events,
          totalEvents: response.totalEvents || 0,
          query: {
            from: args.from,
            to: args.to,
            configId: args.configId,
          },
          formatted: formatTable(
            events.map((event: any) => ({
              'Event Time': new Date(event.httpMessage?.start || event.timestamp).toLocaleString(),
              'Client IP': event.clientIP,
              'Rule ID': event.ruleId,
              'Attack Group': event.attackGroup,
              Action: event.action,
              Hostname: event.httpMessage?.host,
              URI: event.httpMessage?.requestUri,
            })),
          ),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get security events: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
  handler: async (args: any): Promise<ToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const activationData = {
        action: 'ACTIVATE',
        network: args.network,
        ...(args.note && { note: args.note }),
      };

      const response = await client._request({
        path: `/appsec/v1/configs/${args.configId}/versions/${args.version}/activations`,
        method: 'POST',
        body: activationData,
      });

      return {
        success: true,
        data: {
          activation: response,
          activationId: response.activationId,
          status: response.status,
          network: args.network,
          message: `Security configuration ${args.configId} v${args.version} activation initiated on ${args.network}`,
          formatted: formatJson(response),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to activate security configuration: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
  handler: async (args: any): Promise<ToolResponse> => {
    const client = new AkamaiClient(args.customer || 'default');

    try {
      const response = await client._request({
        path: `/appsec/v1/configs/${args.configId}/activations/${args.activationId}`,
        method: 'GET',
      });

      return {
        success: true,
        data: {
          activation: response,
          status: response.status,
          network: response.network,
          progress: response.progress || 0,
          message: `Activation ${args.activationId} status: ${response.status}`,
          formatted: formatJson(response),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get activation status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
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
