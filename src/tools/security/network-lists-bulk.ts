/**
 * Network Lists Bulk Operations
 * Handles large-scale operations, batch updates, and bulk element management
 */

import { AkamaiClient } from '../../akamai-client';
import { 
  MCPToolResponse, 
  NetworkList,
  NetworkListBulkUpdate,
  AkamaiError 
} from '../../types';

/**
 * Validate IP address or CIDR block
 */
function validateIPAddress(ip: string): boolean {
  const ipv4CidrRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
  const ipv6CidrRegex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(\/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8]))?$|^::1(\/128)?$|^::(\/0)?$/;
  return ipv4CidrRegex.test(ip) || ipv6CidrRegex.test(ip);
}

/**
 * Validate geographic location code
 */
function validateGeoCode(code: string): boolean {
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
 * Parse CSV content into array of elements
 */
function parseCSVContent(csvContent: string): string[] {
  return csvContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
    .map(line => line.split(',')[0]?.trim() || '') // Take first column, ignore descriptions
    .filter(element => element);
}

/**
 * Import elements from CSV content
 */
export async function importNetworkListFromCSV(
  uniqueId: string,
  csvContent: string,
  customer: string = 'default',
  options: {
    operation?: 'replace' | 'append' | 'remove';
    validateElements?: boolean;
    skipInvalid?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    // Parse CSV content
    const elements = parseCSVContent(csvContent);
    
    if (elements.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No valid elements found in CSV content.'
        }]
      };
    }

    // Get current list to determine type and validate
    const listResponse = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
      queryParams: { includeElements: 'true' }
    });

    const currentList: NetworkList = listResponse;

    // Validate elements if requested
    let validElements = elements;
    let invalidElements: string[] = [];

    if (options.validateElements !== false) {
      validElements = [];
      invalidElements = [];

      for (const element of elements) {
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
        
        if (isValid) {
          validElements.push(element);
        } else {
          invalidElements.push(element);
        }
      }

      if (invalidElements.length > 0 && !options.skipInvalid) {
        return {
          content: [{
            type: 'text',
            text: `❌ **Validation Failed**\n\nInvalid elements for ${currentList.type} list:\n${invalidElements.slice(0, 20).join('\n')}${invalidElements.length > 20 ? `\n... and ${invalidElements.length - 20} more` : ''}\n\nUse skipInvalid option to import only valid elements.`
          }]
        };
      }
    }

    if (validElements.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No valid elements to import after validation.'
        }]
      };
    }

    let output = `📊 **CSV Import Analysis**\n\n`;
    output += `**List:** ${currentList.name} (${currentList.uniqueId})\n`;
    output += `**Type:** ${currentList.type}\n`;
    output += `**CSV Elements:** ${elements.length}\n`;
    output += `**Valid Elements:** ${validElements.length}\n`;
    
    if (invalidElements.length > 0) {
      output += `**Invalid Elements:** ${invalidElements.length} (${options.skipInvalid ? 'skipped' : 'blocked'})\n`;
    }

    if (options.dryRun) {
      output += `\n**🔍 Dry Run Mode - No Changes Made**\n`;
      output += `**Operation:** ${options.operation || 'replace'}\n`;
      output += `**Current List Size:** ${currentList.elementCount}\n`;
      
      let newSize: number;
      switch (options.operation || 'replace') {
        case 'replace':
          newSize = validElements.length;
          break;
        case 'append':
          newSize = currentList.elementCount + validElements.filter(e => !currentList.list.includes(e)).length;
          break;
        case 'remove':
          newSize = currentList.elementCount - validElements.filter(e => currentList.list.includes(e)).length;
          break;
        default:
          newSize = currentList.elementCount;
      }
      
      output += `**Projected List Size:** ${newSize}\n`;
      output += `\n**Sample Elements:**\n`;
      validElements.slice(0, 10).forEach((element, i) => {
        output += `${i + 1}. ${element}\n`;
      });
      
      if (validElements.length > 10) {
        output += `... and ${validElements.length - 10} more\n`;
      }

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    }

    // Perform the actual update
    const requestBody: any = {};
    
    switch (options.operation || 'replace') {
      case 'replace':
        requestBody.list = validElements;
        break;
      case 'append':
        const uniqueNewElements = validElements.filter(e => !currentList.list.includes(e));
        requestBody.list = [...currentList.list, ...uniqueNewElements];
        break;
      case 'remove':
        requestBody.list = currentList.list.filter(e => !validElements.includes(e));
        break;
    }

    const response = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'PUT',
      body: requestBody
    });

    const updatedList: NetworkList = response;

    output += `\n✅ **Import Completed Successfully**\n`;
    output += `**Operation:** ${options.operation || 'replace'}\n`;
    output += `**Previous Size:** ${currentList.elementCount}\n`;
    output += `**New Size:** ${updatedList.elementCount}\n`;
    output += `**Updated:** ${new Date(updatedList.updateDate).toLocaleString()}\n`;

    if (invalidElements.length > 0 && options.skipInvalid) {
      output += `\n⚠️ **Skipped Invalid Elements:**\n`;
      invalidElements.slice(0, 10).forEach(element => {
        output += `- ${element}\n`;
      });
      if (invalidElements.length > 10) {
        output += `... and ${invalidElements.length - 10} more\n`;
      }
    }

    output += `\n**Note:** Changes are not yet active. Activate to staging/production to deploy.`;

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };

  } catch (error) {
    const akamaiError = error as AkamaiError;
    return {
      content: [{
        type: 'text',
        text: `Error importing CSV: ${akamaiError.title || akamaiError.detail || 'Unknown error'}`
      }]
    };
  }
}

/**
 * Export network list elements to CSV format
 */
export async function exportNetworkListToCSV(
  uniqueId: string,
  customer: string = 'default',
  options: {
    includeHeaders?: boolean;
    includeMetadata?: boolean;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);

    const response = await client.request({
      path: `/network-list/v2/network-lists/${uniqueId}`,
      method: 'GET',
      queryParams: { includeElements: 'true' }
    });

    const list: NetworkList = response;

    let csvContent = '';

    // Add metadata as comments if requested
    if (options.includeMetadata) {
      csvContent += `# Network List Export\n`;
      csvContent += `# Name: ${list.name}\n`;
      csvContent += `# ID: ${list.uniqueId}\n`;
      csvContent += `# Type: ${list.type}\n`;
      csvContent += `# Element Count: ${list.elementCount}\n`;
      csvContent += `# Created: ${list.createDate}\n`;
      csvContent += `# Updated: ${list.updateDate}\n`;
      csvContent += `# Exported: ${new Date().toISOString()}\n`;
      csvContent += `#\n`;
    }

    // Add headers if requested
    if (options.includeHeaders) {
      switch (list.type) {
        case 'IP':
          csvContent += 'IP Address/CIDR,Description\n';
          break;
        case 'GEO':
          csvContent += 'Country/Region Code,Description\n';
          break;
        case 'ASN':
          csvContent += 'ASN,Description\n';
          break;
      }
    }

    // Add elements
    for (const element of list.list) {
      csvContent += `${element},\n`;
    }

    let output = `📄 **Network List CSV Export**\n\n`;
    output += `**List:** ${list.name} (${list.uniqueId})\n`;
    output += `**Type:** ${list.type}\n`;
    output += `**Elements:** ${list.elementCount}\n`;
    output += `**Export Date:** ${new Date().toLocaleString()}\n\n`;
    output += `**CSV Content:**\n`;
    output += `\`\`\`csv\n${csvContent}\`\`\`\n`;

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };

  } catch (error) {
    const akamaiError = error as AkamaiError;
    return {
      content: [{
        type: 'text',
        text: `Error exporting CSV: ${akamaiError.title || akamaiError.detail || 'Unknown error'}`
      }]
    };
  }
}

/**
 * Bulk update multiple network lists
 */
export async function bulkUpdateNetworkLists(
  updates: NetworkListBulkUpdate[],
  customer: string = 'default',
  options: {
    validateElements?: boolean;
    skipInvalid?: boolean;
    continueOnError?: boolean;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);
    const results: Array<{
      uniqueId: string;
      success: boolean;
      error?: string;
      elementsAdded?: number;
      elementsRemoved?: number;
    }> = [];

    let output = `🔄 **Bulk Network List Update**\n\n`;
    output += `Processing ${updates.length} network lists...\n\n`;

    for (const update of updates) {
      try {
        // Get current list
        const listResponse = await client.request({
          path: `/network-list/v2/network-lists/${update.uniqueId}`,
          method: 'GET',
          queryParams: { includeElements: 'true' }
        });

        const currentList: NetworkList = listResponse;

        // Validate elements if requested
        let validAdd = update.add || [];
        let validRemove = update.remove || [];
        let invalidElements: string[] = [];

        if (options.validateElements) {
          validAdd = [];
          validRemove = [];
          
          for (const element of update.add || []) {
            let isValid = false;
            switch (currentList.type) {
              case 'IP': isValid = validateIPAddress(element); break;
              case 'GEO': isValid = validateGeoCode(element); break;
              case 'ASN': isValid = validateASN(element); break;
            }
            
            if (isValid) {
              validAdd.push(element);
            } else {
              invalidElements.push(element);
            }
          }

          for (const element of update.remove || []) {
            let isValid = false;
            switch (currentList.type) {
              case 'IP': isValid = validateIPAddress(element); break;
              case 'GEO': isValid = validateGeoCode(element); break;
              case 'ASN': isValid = validateASN(element); break;
            }
            
            if (isValid) {
              validRemove.push(element);
            } else {
              invalidElements.push(element);
            }
          }

          if (invalidElements.length > 0 && !options.skipInvalid) {
            results.push({
              uniqueId: update.uniqueId,
              success: false,
              error: `Invalid elements: ${invalidElements.slice(0, 5).join(', ')}${invalidElements.length > 5 ? '...' : ''}`
            });
            
            output += `❌ ${update.uniqueId}: Invalid elements\n`;
            
            if (!options.continueOnError) {
              break;
            }
            continue;
          }
        }

        // Calculate new list
        let newList = [...currentList.list];
        
        // Remove elements
        if (validRemove.length > 0) {
          newList = newList.filter(item => !validRemove.includes(item));
        }
        
        // Add elements
        if (validAdd.length > 0) {
          const uniqueNewElements = validAdd.filter(item => !newList.includes(item));
          newList.push(...uniqueNewElements);
        }

        // Update the list
        const requestBody = {
          list: newList,
          syncPoint: update.syncPoint
        };

        await client.request({
          path: `/network-list/v2/network-lists/${update.uniqueId}`,
          method: 'PUT',
          body: requestBody
        });

        results.push({
          uniqueId: update.uniqueId,
          success: true,
          elementsAdded: validAdd.length,
          elementsRemoved: validRemove.length
        });

        output += `✅ ${update.uniqueId}: +${validAdd.length} -${validRemove.length}\n`;

      } catch (error) {
        const akamaiError = error as AkamaiError;
        results.push({
          uniqueId: update.uniqueId,
          success: false,
          error: akamaiError.title || akamaiError.detail || 'Unknown error'
        });

        output += `❌ ${update.uniqueId}: ${akamaiError.title}\n`;

        if (!options.continueOnError) {
          break;
        }
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalAdded = results.reduce((sum, r) => sum + (r.elementsAdded || 0), 0);
    const totalRemoved = results.reduce((sum, r) => sum + (r.elementsRemoved || 0), 0);

    output += `\n**Summary:**\n`;
    output += `✅ Successful: ${successful}\n`;
    output += `❌ Failed: ${failed}\n`;
    output += `➕ Total Elements Added: ${totalAdded}\n`;
    output += `➖ Total Elements Removed: ${totalRemoved}\n`;

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };

  } catch (error) {
    const akamaiError = error as AkamaiError;
    return {
      content: [{
        type: 'text',
        text: `Error in bulk update: ${akamaiError.title || akamaiError.detail || 'Unknown error'}`
      }]
    };
  }
}

/**
 * Merge multiple network lists into a single list
 */
export async function mergeNetworkLists(
  sourceListIds: string[],
  targetListId: string,
  customer: string = 'default',
  options: {
    operation?: 'union' | 'intersection' | 'difference';
    removeDuplicates?: boolean;
    deleteSourceLists?: boolean;
  } = {}
): Promise<MCPToolResponse> {
  try {
    const client = new AkamaiClient(customer);
    
    // Get all source lists
    const sourceLists: NetworkList[] = [];
    for (const listId of sourceListIds) {
      const response = await client.request({
        path: `/network-list/v2/network-lists/${listId}`,
        method: 'GET',
        queryParams: { includeElements: 'true' }
      });
      sourceLists.push(response);
    }

    // Get target list
    const targetResponse = await client.request({
      path: `/network-list/v2/network-lists/${targetListId}`,
      method: 'GET',
      queryParams: { includeElements: 'true' }
    });
    const targetList: NetworkList = targetResponse;

    // Verify all lists are the same type
    const listTypes = [targetList.type, ...sourceLists.map(l => l.type)];
    if (new Set(listTypes).size > 1) {
      return {
        content: [{
          type: 'text',
          text: `❌ Cannot merge lists of different types: ${[...new Set(listTypes)].join(', ')}`
        }]
      };
    }

    // Perform merge operation
    let mergedElements: string[] = [...targetList.list];
    
    switch (options.operation || 'union') {
      case 'union':
        for (const sourceList of sourceLists) {
          for (const element of sourceList.list) {
            if (!mergedElements.includes(element)) {
              mergedElements.push(element);
            }
          }
        }
        break;
        
      case 'intersection':
        // Start with target list, keep only elements that exist in ALL source lists
        mergedElements = targetList.list.filter(element => 
          sourceLists.every(sourceList => sourceList.list.includes(element))
        );
        break;
        
      case 'difference':
        // Remove elements that exist in any source list
        const elementsToRemove = new Set();
        sourceLists.forEach(sourceList => {
          sourceList.list.forEach(element => elementsToRemove.add(element));
        });
        mergedElements = targetList.list.filter(element => !elementsToRemove.has(element));
        break;
    }

    if (options.removeDuplicates) {
      mergedElements = [...new Set(mergedElements)];
    }

    // Update target list
    const updateResponse = await client.request({
      path: `/network-list/v2/network-lists/${targetListId}`,
      method: 'PUT',
      body: { list: mergedElements }
    });

    const updatedList: NetworkList = updateResponse;

    let output = `🔄 **Network List Merge Completed**\n\n`;
    output += `**Operation:** ${options.operation || 'union'}\n`;
    output += `**Target List:** ${targetList.name} (${targetListId})\n`;
    output += `**Source Lists:** ${sourceLists.length}\n`;
    
    sourceLists.forEach(list => {
      output += `  - ${list.name} (${list.uniqueId}) - ${list.elementCount} elements\n`;
    });
    
    output += `\n**Results:**\n`;
    output += `**Previous Size:** ${targetList.elementCount}\n`;
    output += `**New Size:** ${updatedList.elementCount}\n`;
    output += `**Net Change:** ${updatedList.elementCount - targetList.elementCount > 0 ? '+' : ''}${updatedList.elementCount - targetList.elementCount}\n`;

    // Delete source lists if requested
    if (options.deleteSourceLists) {
      output += `\n**Deleting Source Lists:**\n`;
      
      for (const sourceList of sourceLists) {
        try {
          await client.request({
            path: `/network-list/v2/network-lists/${sourceList.uniqueId}`,
            method: 'DELETE'
          });
          output += `✅ Deleted ${sourceList.name}\n`;
        } catch (error) {
          const akamaiError = error as AkamaiError;
          output += `❌ Failed to delete ${sourceList.name}: ${akamaiError.title}\n`;
        }
      }
    }

    return {
      content: [{
        type: 'text',
        text: output
      }]
    };

  } catch (error) {
    const akamaiError = error as AkamaiError;
    return {
      content: [{
        type: 'text',
        text: `Error merging network lists: ${akamaiError.title || akamaiError.detail || 'Unknown error'}`
      }]
    };
  }
}