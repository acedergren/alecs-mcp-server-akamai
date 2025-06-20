/**
 * Network Lists API Integration
 * Implements comprehensive network list management for IP, Geographic, and ASN controls
 * Supports whitelisting, blacklisting, geo-blocking, and security policy integration
 */

import { formatContractDisplay, formatGroupDisplay, ensurePrefix } from '@utils/formatting';

import { AkamaiClient } from '../../akamai-client';
import {
  type MCPToolResponse,
  type NetworkList,
  type NetworkListResponse,
  type AkamaiError,
} from '../../types';

/**
 * Validate IP address or CIDR block
 */
function validateIPAddress(ip: string): boolean {
  // IPv4 CIDR validation
  const ipv4CidrRegex =
    /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;

  // IPv6 CIDR validation (simplified)
  const ipv6CidrRegex =
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;

  return ipv4CidrRegex.test(ip) || ipv6CidrRegex.test(ip);
}

/**
 * Validate geographic location code
 */
function validateGeoCode(code: string): boolean {
  // Country codes (ISO 3166-1 alpha-2) or subdivision codes
  const geoCodeRegex = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
  return geoCodeRegex.test(code);
}

/**
 * Validate ASN (Autonomous System Number)
 */
function validateASN(asn: string): boolean {
  const asnRegex = /^AS?\d+$/i;
  return asnRegex.test(asn);
}

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
 * Format network list type with icon
 */
function formatListType(type: string): string {
  const typeMap: Record<string, string> = {
    IP: '🌐 IP Address List',
    GEO: '🗺️ Geographic List',
    ASN: '🏢 ASN List',
  };

  return typeMap[type] || type;
}

/**
 * List all network lists in the account
 */
export async function listNetworkLists(
  customer = 'default',
  options: {
    type?: 'IP' | 'GEO' | 'ASN';
    search?: string;
    includeElements?: boolean;
    extended?: boolean;
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (options.type) {
      queryParams.listType = options.type;
    }
    if (options.search) {
      queryParams.search = options.search;
    }
    if (options.includeElements) {
      queryParams.includeElements = 'true';
    }
    if (options.extended) {
      queryParams.extended = 'true';
    }

    const response = await client.request({
      path: '/network-list/v2/network-lists',
      method: 'GET',
      queryParams,
    });

    const networkListsData: NetworkListResponse = response;
    const lists = networkListsData.networkLists || [];

    if (lists.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: options.type
              ? `No ${options.type} network lists found.`
              : 'No network lists found in this account.',
          },
        ],
      };
    }

    // Sort lists by creation date (newest first)
    lists.sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());

    let output = `Found ${lists.length} network list${lists.length !== 1 ? 's' : ''}:\n\n`;

    for (const list of lists) {
      output += `📋 **${list.name}** (${list.uniqueId})\n`;
      output += `   Type: ${formatListType(list.type)}\n`;
      output += `   Elements: ${list.elementCount}\n`;

      if (list.description) {
        output += `   Description: ${list.description}\n`;
      }

      output += `   Production: ${formatActivationStatus(list.productionStatus)}\n`;
      output += `   Staging: ${formatActivationStatus(list.stagingStatus)}\n`;
      output += `   Created: ${new Date(list.createDate).toLocaleDateString()}\n`;
      output += `   Shared: ${list.shared ? 'Yes' : 'No'}\n`;

      if (options.includeElements && list.list && list.list.length > 0) {
        output += '   Elements (first 10):\n';
        const elementsToShow = list.list.slice(0, 10);
        for (const element of elementsToShow) {
          output += `     - ${element}\n`;
        }
        if (list.list.length > 10) {
          output += `     ... and ${list.list.length - 10} more\n`;
        }
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
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error listing network lists: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Get detailed information about a specific network list
 */
export async function getNetworkList(
  uniqueId: string,
  customer = 'default',
  options: {
    includeElements?: boolean;
    extended?: boolean;
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    const queryParams: Record<string, string> = {};
    if (options.includeElements) {
      queryParams.includeElements = 'true';
    }
    if (options.extended) {
      queryParams.extended = 'true';
    }

    const response = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
      queryParams,
    });

    const list: NetworkList = response;

    let output = '📋 **Network List Details**\n\n';
    output += `**Name:** ${list.name}\n`;
    output += `**ID:** ${list.uniqueId}\n`;
    output += `**Type:** ${formatListType(list.type)}\n`;
    output += `**Element Count:** ${list.elementCount}\n`;

    if (list.description) {
      output += `**Description:** ${list.description}\n`;
    }

    output += `**Production Status:** ${formatActivationStatus(list.productionStatus)}\n`;
    output += `**Staging Status:** ${formatActivationStatus(list.stagingStatus)}\n`;
    output += `**Created:** ${new Date(list.createDate).toLocaleString()} by ${list.createdBy}\n`;
    output += `**Updated:** ${new Date(list.updateDate).toLocaleString()} by ${list.updatedBy}\n`;
    output += `**Shared:** ${list.shared ? 'Yes' : 'No'}\n`;

    if (list.contractId) {
      output += `**Contract:** ${formatContractDisplay(list.contractId)}\n`;
    }
    if (list.groupId) {
      output += `**Group:** ${formatGroupDisplay(list.groupId)}\n`;
    }
    if (list.syncPoint) {
      output += `**Sync Point:** ${list.syncPoint}\n`;
    }

    if (options.includeElements && list.list && list.list.length > 0) {
      output += `\n**Elements (${list.list.length}):**\n`;
      for (let i = 0; i < list.list.length; i++) {
        const element = list.list[i];
        output += `${i + 1}. ${element}\n`;

        // Limit output for very large lists
        if (i >= 99 && list.list.length > 100) {
          output += `... and ${list.list.length - 100} more elements\n`;
          break;
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Create a new network list
 */
export async function createNetworkList(
  name: string,
  type: 'IP' | 'GEO' | 'ASN',
  elements: string[],
  customer = 'default',
  options: {
    description?: string;
    contractId?: string;
    groupId?: string;
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // Validate elements based on type
    const invalidElements: string[] = [];
    for (const element of elements) {
      let isValid = false;

      switch (type) {
        case 'IP':
          isValid = validateIPAddress(element);
          break;
        case 'GEO':
          isValid = validateGeoCode(element);
          break;
        case 'ASN':
          isValid = validateASN(element);
          break;
      }

      if (!isValid) {
        invalidElements.push(element);
      }
    }

    if (invalidElements.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid elements for ${type} list:\n${invalidElements.join('\n')}\n\nPlease correct these before creating the list.`,
          },
        ],
      };
    }

    const requestBody: any = {
      name,
      type,
      list: elements,
    };

    if (options.description) {
      requestBody.description = options.description;
    }

    if (options.contractId) {
      requestBody.contractId = ensurePrefix(options.contractId, 'ctr_');
    }

    if (options.groupId) {
      requestBody.groupId = ensurePrefix(options.groupId, 'grp_');
    }

    const response = await client.request({
      path: '/network-list/v2/network-lists',
      method: 'POST',
      body: requestBody,
    });

    const newList: NetworkList = response;

    let output = '✅ **Network List Created Successfully**\n\n';
    output += `**Name:** ${newList.name}\n`;
    output += `**ID:** ${newList.uniqueId}\n`;
    output += `**Type:** ${formatListType(newList.type)}\n`;
    output += `**Element Count:** ${newList.elementCount}\n`;

    if (newList.description) {
      output += `**Description:** ${newList.description}\n`;
    }

    output += `**Created:** ${new Date(newList.createDate).toLocaleString()}\n`;
    output += `**Shared:** ${newList.shared ? 'Yes' : 'No'}\n`;

    output += '\n**Next Steps:**\n';
    output += '1. Review the list elements\n';
    output += '2. Activate to staging for testing\n';
    output += '3. Activate to production when ready\n';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error creating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Update network list elements
 */
export async function updateNetworkList(
  uniqueId: string,
  customer = 'default',
  options: {
    name?: string;
    description?: string;
    addElements?: string[];
    removeElements?: string[];
    replaceElements?: string[];
  } = {},
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // First get the current list to validate operations
    const currentResponse = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
      queryParams: { includeElements: 'true' },
    });

    const currentList: NetworkList = currentResponse;

    // Validate elements if provided
    if (options.addElements || options.replaceElements) {
      const elementsToValidate = [
        ...(options.addElements || []),
        ...(options.replaceElements || []),
      ];

      const invalidElements: string[] = [];
      for (const element of elementsToValidate) {
        let isValid = false;

        switch (currentList.type) {
          case 'IP':
            isValid = validateIPAddress(element);
            break;
          case 'GEO':
            isValid = validateGeoCode(element);
            break;
          case 'ASN':
            isValid = validateASN(element);
            break;
        }

        if (!isValid) {
          invalidElements.push(element);
        }
      }

      if (invalidElements.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: `Invalid elements for ${currentList.type} list:\n${invalidElements.join('\n')}\n\nPlease correct these before updating the list.`,
            },
          ],
        };
      }
    }

    const requestBody: any = {};

    // Update metadata
    if (options.name) {
      requestBody.name = options.name;
    }
    if (options.description !== undefined) {
      requestBody.description = options.description;
    }

    // Handle element operations
    if (options.replaceElements) {
      // Replace entire list
      requestBody.list = options.replaceElements;
    } else if (options.addElements || options.removeElements) {
      // Incremental updates
      let newList = [...currentList.list];

      if (options.removeElements) {
        newList = newList.filter((item) => !options.removeElements!.includes(item));
      }

      if (options.addElements) {
        const uniqueNewElements = options.addElements.filter((item) => !newList.includes(item));
        newList.push(...uniqueNewElements);
      }

      requestBody.list = newList;
    }

    const response = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'PUT',
      body: requestBody,
    });

    const updatedList: NetworkList = response;

    let output = '✅ **Network List Updated Successfully**\n\n';
    output += `**Name:** ${updatedList.name}\n`;
    output += `**ID:** ${updatedList.uniqueId}\n`;
    output += `**Type:** ${formatListType(updatedList.type)}\n`;
    output += `**Element Count:** ${updatedList.elementCount}\n`;
    output += `**Updated:** ${new Date(updatedList.updateDate).toLocaleString()}\n`;

    if (options.addElements && options.addElements.length > 0) {
      output += '\n**Added Elements:**\n';
      options.addElements.forEach((element) => {
        output += `+ ${element}\n`;
      });
    }

    if (options.removeElements && options.removeElements.length > 0) {
      output += '\n**Removed Elements:**\n';
      options.removeElements.forEach((element) => {
        output += `- ${element}\n`;
      });
    }

    output += '\n**Note:** Changes are not yet active. Activate to staging/production to deploy.';

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error updating network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}

/**
 * Delete a network list
 */
export async function deleteNetworkList(
  uniqueId: string,
  customer = 'default',
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // First check if the list exists and get its details
    const listResponse = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
    });

    const list: NetworkList = listResponse;

    // Check if list is active on any network
    if (list.productionStatus === 'ACTIVE' || list.stagingStatus === 'ACTIVE') {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Cannot delete network list "${list.name}" (${uniqueId})\n\nThe list is currently active on ${list.productionStatus === 'ACTIVE' ? 'production' : ''} ${list.stagingStatus === 'ACTIVE' ? 'staging' : ''} network(s).\n\nPlease deactivate the list first before deletion.`,
          },
        ],
      };
    }

    await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'DELETE',
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ **Network List Deleted Successfully**\n\nDeleted "${list.name}" (${uniqueId}) - ${formatListType(list.type)}`,
        },
      ],
    };
  } catch (_error) {
    const akamaiError = _error as AkamaiError;
    return {
      content: [
        {
          type: 'text',
          text: `Error deleting network list: ${akamaiError.title || akamaiError.detail || 'Unknown _error'}`,
        },
      ],
    };
  }
}
