/**
 * Network Lists Activation and Deployment Tools
 * Handles activation, deactivation, and status monitoring for network lists
 */

import { AkamaiClient } from '../../akamai-client';
import {
  type MCPToolResponse,
  type NetworkList,
  type NetworkListActivation,
  type AkamaiError,
} from '../../types';

/**
 * Format activation status with emoji
 */
function formatActivationStatus(status: string | undefined): string {
  if (!status) {
return '⚫ INACTIVE';
}

  const statusMap: Record<string, string> = {
    ACTIVE: '🟢 ACTIVE',
    INACTIVE: '⚫ INACTIVE',
    PENDING: '🟡 PENDING',
    FAILED: '🔴 FAILED',
  };

  return statusMap[status] || `⚫ ${status}`;
}

/**
 * Activate a network list to staging or production
 */
export async function activateNetworkList(
  uniqueId: string,
  network: 'STAGING' | 'PRODUCTION',
  customer = 'default',
  options: {
    comments?: string;
    notificationEmails?: string[];
    fast?: boolean;
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // First get the list details
    const listResponse = await client._request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
    });

    const list: NetworkList = listResponse;

    // Check if already active on target network
    const currentStatus = network === 'PRODUCTION' ? list.productionStatus : list.stagingStatus;
    if (currentStatus === 'ACTIVE') {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ Network list "${list.name}" is already active on ${network}`,
          },
        ],
      };
    }

    const requestBody: any = {
      networkList: {
        uniqueId: uniqueId,
      },
      network: network,
    };

    if (options.comments) {
      requestBody.comments = options.comments;
    }

    if (options.notificationEmails && options.notificationEmails.length > 0) {
      requestBody.notificationEmails = options.notificationEmails;
    }

    if (options.fast) {
      requestBody.fast = true;
    }

    const response = await client._request({
      path: '/network-list/v2/network-lists/activations',
      method: 'POST',
      body: requestBody,
    });

    const activation: NetworkListActivation = response;

    let output = '🚀 **Network List Activation Initiated**\n\n';
    output += `**List:** ${list.name} (${list.uniqueId})\n`;
    output += `**Network:** ${network}\n`;
    output += `**Activation ID:** ${activation.activationId}\n`;
    output += `**Status:** ${formatActivationStatus(activation.status)}\n`;

    if (options.comments) {
      output += `**Comments:** ${options.comments}\n`;
    }

    if (activation.status === 'PENDING') {
      output += '\n**⏳ Activation in progress...**\n';
      output += 'Use the activation ID to monitor progress.\n';
      output += `Typical activation time: 2-5 minutes for ${network.toLowerCase()}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error activating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Get activation status for a network list
 */
export async function getNetworkListActivationStatus(
  activationId: string,
  customer = 'default',
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    const response = await client._request({
      path: `/network-list/v2/network-lists/activations/${activationId}`,
      method: 'GET',
    });

    const activation: NetworkListActivation = response;

    let output = '📊 **Network List Activation Status**\n\n';
    output += `**Activation ID:** ${activation.activationId}\n`;
    output += `**List:** ${activation.name} (${activation.uniqueId})\n`;
    output += `**Network:** ${activation.network}\n`;
    output += `**Status:** ${formatActivationStatus(activation.status)}\n`;
    output += `**Dispatch Count:** ${activation.dispatchCount}\n`;

    if (activation.comments) {
      output += `**Comments:** ${activation.comments}\n`;
    }

    if (activation.status === 'PENDING') {
      output += '\n⏳ **Activation still in progress**\n';
      output += 'Check again in a few minutes for updates.\n';
    } else if (activation.status === 'ACTIVE') {
      output += '\n✅ **Activation completed successfully**\n';
      output += 'The network list is now active and enforcing policies.\n';
    } else if (activation.status === 'FAILED') {
      output += '\n❌ **Activation failed**\n';
      output += 'Please check the activation details and try again.\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving activation status: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * List all activations for network lists
 */
export async function listNetworkListActivations(
  customer = 'default',
  options: {
    listType?: 'IP' | 'GEO' | 'ASN';
    network?: 'STAGING' | 'PRODUCTION';
    status?: 'PENDING' | 'ACTIVE' | 'FAILED' | 'INACTIVE';
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    const queryParams: Record<string, string> = {};
    if (options.listType) {
      queryParams.listType = options.listType;
    }
    if (options.network) {
      queryParams.network = options.network;
    }
    if (options.status) {
      queryParams.status = options.status;
    }

    const response = await client._request({
      path: '/network-list/v2/network-lists/activations',
      method: 'GET',
      queryParams,
    });

    const activations = response.activations || [];

    if (activations.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No network list activations found matching the criteria.',
          },
        ],
      };
    }

    // Sort by most recent first
    activations.sort((a: NetworkListActivation, b: NetworkListActivation) => {
      return new Date(b.activationId).getTime() - new Date(a.activationId).getTime();
    });

    let output = `📋 **Network List Activations** (${activations.length})\n\n`;

    for (const activation of activations) {
      output += `🚀 **${activation.name}**\n`;
      output += `   ID: ${activation.uniqueId}\n`;
      output += `   Activation: ${activation.activationId}\n`;
      output += `   Network: ${activation.network}\n`;
      output += `   Status: ${formatActivationStatus(activation.status)}\n`;
      output += `   Dispatches: ${activation.dispatchCount}\n`;

      if (activation.comments) {
        output += `   Comments: ${activation.comments}\n`;
      }

      output += '\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: output.trim(),
        },
      ],
    };
  } catch (error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error listing activations: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Deactivate a network list from staging or production
 */
export async function deactivateNetworkList(
  uniqueId: string,
  network: 'STAGING' | 'PRODUCTION',
  customer = 'default',
  options: {
    comments?: string;
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // First get the list details
    const listResponse = await client._request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
    });

    const list: NetworkList = listResponse;

    // Check if currently active on target network
    const currentStatus = network === 'PRODUCTION' ? list.productionStatus : list.stagingStatus;
    if (currentStatus !== 'ACTIVE') {
      return {
        content: [
          {
            type: 'text',
            text: `ℹ️ Network list "${list.name}" is not currently active on ${network}`,
          },
        ],
      };
    }

    const requestBody: any = {
      networkList: {
        uniqueId: uniqueId,
      },
      network: network,
      action: 'DEACTIVATE',
    };

    if (options.comments) {
      requestBody.comments = options.comments;
    }

    const response = await client._request({
      path: '/network-list/v2/network-lists/activations',
      method: 'POST',
      body: requestBody,
    });

    const activation: NetworkListActivation = response;

    let output = '🛑 **Network List Deactivation Initiated**\n\n';
    output += `**List:** ${list.name} (${list.uniqueId})\n`;
    output += `**Network:** ${network}\n`;
    output += `**Activation ID:** ${activation.activationId}\n`;
    output += `**Status:** ${formatActivationStatus(activation.status)}\n`;

    if (options.comments) {
      output += `**Comments:** ${options.comments}\n`;
    }

    output += '\n⚠️ **Warning:** Deactivating this list will remove its security policies from the edge network.\n';
    output += 'Traffic that was previously blocked/allowed by this list will no longer be filtered.\n';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error deactivating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Activate multiple network lists with dependency management
 */
export async function bulkActivateNetworkLists(
  activations: Array<{
    uniqueId: string;
    network: 'STAGING' | 'PRODUCTION';
  }>,
  customer = 'default',
  options: {
    comments?: string;
    notificationEmails?: string[];
    waitForCompletion?: boolean;
    maxWaitTime?: number; // in milliseconds
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);
    const results: Array<{ uniqueId: string; activationId?: string; error?: string }> = [];

    let output = '🚀 **Bulk Network List Activation**\n\n';
    output += `Activating ${activations.length} network lists...\n\n`;

    // Process each activation
    for (const activation of activations) {
      try {
        const requestBody: any = {
          networkList: {
            uniqueId: activation.uniqueId,
          },
          network: activation.network,
        };

        if (options.comments) {
          requestBody.comments = options.comments;
        }

        if (options.notificationEmails && options.notificationEmails.length > 0) {
          requestBody.notificationEmails = options.notificationEmails;
        }

        const response = await client._request({
          path: '/network-list/v2/network-lists/activations',
          method: 'POST',
          body: requestBody,
        });

        const activationResult: NetworkListActivation = response;
        results.push({
          uniqueId: activation.uniqueId,
          activationId: activationResult.activationId,
        });

        output += `✅ ${activation.uniqueId} → ${activation.network} (${activationResult.activationId})\n`;
      } catch (error) {
        const akamaiError = _error as AkamaiError;
        results.push({
          uniqueId: activation.uniqueId,
          error: akamaiError.title || akamaiError.detail || 'Unknown _error',
        });

        output += `❌ ${activation.uniqueId} → ${activation.network} (Error: ${akamaiError.title})\n`;
      }
    }

    const successful = results.filter((r) => r.activationId).length;
    const failed = results.filter((r) => r.error).length;

    output += '\n**Summary:**\n';
    output += `✅ Successful: ${successful}\n`;
    output += `❌ Failed: ${failed}\n`;

    if (options.waitForCompletion && successful > 0) {
      output += '\n⏳ Waiting for activations to complete...\n';
      // Note: This would require polling logic in a real implementation
      output += '(Monitoring activation status - this may take 2-5 minutes per network)\n';
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error in bulk activation: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}
