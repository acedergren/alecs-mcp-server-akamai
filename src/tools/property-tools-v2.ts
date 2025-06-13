/**
 * Property Manager API Integration - Optimized Version
 * Uses efficient search methods to avoid timeouts
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse, PropertyList, Property, GroupList } from '../types.js';

/**
 * Format a date string to a more readable format
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format activation status with appropriate emoji
 */
function formatStatus(status: string | undefined): string {
  if (!status) return '⚫ INACTIVE';
  
  const statusMap: Record<string, string> = {
    'ACTIVE': '🟢 ACTIVE',
    'INACTIVE': '⚫ INACTIVE', 
    'PENDING': '🟡 PENDING',
    'FAILED': '🔴 FAILED',
    'DEACTIVATED': '⚪ DEACTIVATED',
    'NEW': '🔵 NEW'
  };
  
  return statusMap[status] || `⚫ ${status}`;
}

/**
 * Get detailed information about a specific property - OPTIMIZED VERSION
 * This version avoids the timeout issue by using proper search methods
 */
export async function getPropertyOptimized(
  client: AkamaiClient,
  args: { propertyId: string }
): Promise<MCPToolResponse> {
  try {
    let propertyId = args.propertyId;
    let searchNote = '';
    
    // If it's already a property ID, get it directly
    if (propertyId.startsWith('prp_')) {
      return await getPropertyById(client, propertyId);
    }
    
    // For non-property IDs, we need to search
    // First, try a quick search by getting a single contract's properties
    console.error(`[getPropertyOptimized] Searching for: ${propertyId}`);
    
    // Get the first available contract/group
    const groupsResponse = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    }) as GroupList;
    
    if (!groupsResponse.groups?.items?.length) {
      return {
        content: [{
          type: 'text',
          text: 'No groups found. Please check your API credentials.',
        }],
      };
    }
    
    // Strategy: Instead of searching all properties, ask user to be more specific
    // or provide a list of properties to choose from
    const searchTerm = propertyId.toLowerCase();
    let matchingProperties: Array<{property: Property, group: any}> = [];
    
    // Search only in the first few groups to avoid timeout
    const maxGroupsToSearch = 3;
    let groupsSearched = 0;
    
    for (const group of groupsResponse.groups.items) {
      if (groupsSearched >= maxGroupsToSearch) break;
      if (!group.contractIds?.length) continue;
      
      groupsSearched++;
      const contractId = group.contractIds[0];
      
      try {
        const propertiesResponse = await client.request({
          path: '/papi/v1/properties',
          method: 'GET',
          queryParams: {
            contractId: contractId,
            groupId: group.groupId
          }
        }) as PropertyList;
        
        // Find properties that match the search term
        const matches = propertiesResponse.properties?.items?.filter(prop => 
          prop.propertyName.toLowerCase().includes(searchTerm) ||
          prop.propertyId.includes(searchTerm)
        ) || [];
        
        matches.forEach(prop => {
          matchingProperties.push({ property: prop, group });
        });
      } catch (err) {
        console.error(`Failed to search in group ${group.groupId}:`, err);
      }
    }
    
    // Handle search results
    if (matchingProperties.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ No properties found matching "${propertyId}" in the first ${groupsSearched} groups.\n\n` +
                `**Suggestions:**\n` +
                `1. Use the exact property ID (e.g., prp_12345)\n` +
                `2. Use "list properties" to see all available properties\n` +
                `3. Be more specific with the property name\n\n` +
                `**Note:** To avoid timeouts, the search was limited to ${groupsSearched} groups. ` +
                `If your property is in a different group, please use the exact property ID.`,
        }],
      };
    }
    
    if (matchingProperties.length === 1) {
      // Found exactly one match
      const match = matchingProperties[0];
      searchNote = `ℹ️ Found property "${match.property.propertyName}" (${match.property.propertyId}) in group ${match.group.groupName}\n\n`;
      return await getPropertyById(client, match.property.propertyId, match.property, searchNote);
    }
    
    // Multiple matches found
    let text = `🔍 Found ${matchingProperties.length} properties matching "${propertyId}":\n\n`;
    
    matchingProperties.forEach((match, index) => {
      text += `${index + 1}. **${match.property.propertyName}**\n`;
      text += `   - Property ID: ${match.property.propertyId}\n`;
      text += `   - Group: ${match.group.groupName}\n`;
      text += `   - Production: ${formatStatus(match.property.productionStatus)}\n`;
      text += `   - Staging: ${formatStatus(match.property.stagingStatus)}\n\n`;
    });
    
    text += `**To get details for a specific property, use its ID:**\n`;
    text += `Example: "get property ${matchingProperties[0].property.propertyId}"\n\n`;
    text += `💡 **Tip:** Using the exact property ID (prp_XXXXX) is always faster and more reliable.`;
    
    return {
      content: [{
        type: 'text',
        text,
      }],
    };
    
  } catch (error) {
    return formatError('get property', error);
  }
}

/**
 * Internal function to get property details by ID
 */
async function getPropertyById(
  client: AkamaiClient,
  propertyId: string,
  existingProperty?: Property,
  searchNote: string = ''
): Promise<MCPToolResponse> {
  try {
    let prop = existingProperty;
    
    if (!prop) {
      // Get basic property details
      const response = await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'GET',
      });

      if (!response.properties?.items?.[0]) {
        return {
          content: [{
            type: 'text',
            text: `Property ${propertyId} not found.\n\n💡 **Tip:** Use the list_properties tool to see available properties.`,
        }],
      };
      }

      prop = response.properties.items[0];
    }
    
    // Ensure prop is defined at this point
    if (!prop) {
      throw new Error('Unable to retrieve property details');
    }
    
    // Get latest version details
    let versionDetails = null;
    try {
      if (prop.latestVersion) {
        versionDetails = await client.request({
          path: `/papi/v1/properties/${propertyId}/versions/${prop.latestVersion}`,
          method: 'GET',
        });
      }
    } catch (versionError) {
      // Continue without version details
      console.error('Failed to get version details:', versionError);
    }

    // Get hostnames associated with the property
    let hostnames = null;
    try {
      hostnames = await client.request({
        path: `/papi/v1/properties/${propertyId}/hostnames`,
        method: 'GET',
      });
    } catch (hostnameError) {
      // Continue without hostname details
      console.error('Failed to get hostnames:', hostnameError);
    }

    // Format comprehensive property details
    let text = searchNote;
    text += `# Property Details: ${prop.propertyName}\n\n`;
    
    // Basic Information
    text += `## Basic Information\n`;
    text += `- **Property ID:** ${prop.propertyId}\n`;
    text += `- **Asset ID:** ${prop.assetId || 'N/A'}\n`;
    text += `- **Contract ID:** ${prop.contractId}\n`;
    text += `- **Group ID:** ${prop.groupId}\n`;
    text += `- **Product ID:** ${prop.productId || 'N/A'}\n\n`;
    
    // Version Information
    text += `## Version Information\n`;
    text += `- **Latest Version:** ${prop.latestVersion || 'N/A'}\n`;
    text += `- **Production Version:** ${prop.productionVersion || 'None'}\n`;
    text += `- **Staging Version:** ${prop.stagingVersion || 'None'}\n\n`;
    
    // Activation Status
    text += `## Activation Status\n`;
    text += `- **Production:** ${formatStatus(prop.productionStatus)}\n`;
    text += `- **Staging:** ${formatStatus(prop.stagingStatus)}\n\n`;
    
    // Version Details if available
    if (versionDetails?.versions?.items?.[0]) {
      const version = versionDetails.versions.items[0];
      text += `## Latest Version Details (v${version.propertyVersion})\n`;
      text += `- **Updated By:** ${version.updatedByUser || 'Unknown'}\n`;
      text += `- **Updated Date:** ${formatDate(version.updatedDate)}\n`;
      if (version.note) {
        text += `- **Version Notes:** ${version.note}\n`;
      }
      text += '\n';
    }
    
    // Hostnames if available
    if (hostnames?.hostnames?.items && (hostnames.hostnames.items as any[]).length > 0) {
      text += `## Associated Hostnames\n`;
      for (const hostname of hostnames.hostnames.items) {
        text += `- **${hostname.cnameFrom}** → ${hostname.cnameTo}`;
        if (hostname.certStatus) {
          text += ` (Cert: ${hostname.certStatus.status || 'Unknown'})`;
        }
        text += '\n';
      }
      text += '\n';
    }
    
    // Notes
    if (prop.note) {
      text += `## Property Notes\n${prop.note}\n\n`;
    }

    // Next Steps
    text += `## Available Actions\n`;
    text += `- View rules: \`"Show me the rules for property ${propertyId}"\`\n`;
    text += `- Update rules: \`"Update property ${propertyId} to use origin server example.com"\`\n`;
    text += `- Activate: \`"Activate property ${propertyId} to staging"\`\n`;
    text += `- View activations: \`"Show activation history for property ${propertyId}"\`\n`;
    
    if (!prop.productionVersion) {
      text += `\n⚠️ **Note:** This property has never been activated to production.`;
    }

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('get property details', error);
  }
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  let solution = '';
  
  if (error instanceof Error) {
    errorMessage += `: ${error.message}`;
    
    // Provide specific solutions based on error type
    if (error.message.includes('401') || error.message.includes('credentials')) {
      solution = '**Solution:** Check your ~/.edgerc file has valid credentials. You may need to generate new API credentials in Akamai Control Center.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions. Ensure your API client has read/write access to Property Manager.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the ID is correct using the list tools.';
    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
      solution = '**Solution:** Rate limit exceeded. Please wait 60 seconds before retrying.';
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      solution = '**Solution:** Network connectivity issue. Check your internet connection and verify the API host in ~/.edgerc is correct.';
    } else if (error.message.includes('timeout')) {
      solution = '**Solution:** Request timed out. The search was too broad. Try using a property ID (prp_XXXXX) instead of searching by name.';
    }
  } else {
    errorMessage += `: ${String(error)}`;
  }
  
  let text = errorMessage;
  if (solution) {
    text += `\n\n${solution}`;
  }
  
  // Add general help
  text += '\n\n**Need Help?**\n';
  text += '- Verify your credentials: `cat ~/.edgerc`\n';
  text += '- List available resources: `"List all my properties"`\n';
  text += '- Check API docs: https://techdocs.akamai.com/property-mgr/reference/api';

  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}