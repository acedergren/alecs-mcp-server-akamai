/**
 * Property Manager API Integration
 * Implements core CRUD operations for Akamai CDN properties
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
 * List all properties in the account
 * Displays comprehensive information about each property including versions and activation status
 */
export async function listProperties(
  client: AkamaiClient, 
  args: { contractId?: string; groupId?: string }
): Promise<MCPToolResponse> {
  try {
    // If no contract ID provided, get the first available contract
    let contractId = args.contractId;
    let groupId = args.groupId;
    
    if (!contractId) {
      // Get groups to find the first contract
      const groupsResponse = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      }) as GroupList;
      
      if (groupsResponse.groups?.items?.length > 0) {
        // Find first contract from any group
        for (const group of groupsResponse.groups.items) {
          if (group.contractIds?.length > 0) {
            contractId = group.contractIds[0];
            if (!groupId) {
              groupId = group.groupId;
            }
            break;
          }
        }
      }
      
      if (!contractId) {
        return {
          content: [{
            type: 'text',
            text: 'No contracts found in your account. Please check your API credentials and permissions.',
          }],
        };
      }
    }
    
    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (contractId) queryParams.contractId = contractId;
    if (groupId) queryParams.groupId = groupId;

    const response = await client.request({
      path: '/papi/v1/properties',
      method: 'GET',
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    }) as PropertyList;

    // Handle empty results
    if (!response.properties?.items || response.properties.items.length === 0) {
      let message = 'No properties found';
      if (args.contractId) message += ` for contract ${args.contractId}`;
      if (args.groupId) message += ` in group ${args.groupId}`;
      message += '.';
      
      if (!args.contractId && !args.groupId) {
        message += '\n\n💡 **Tip:** Use the list_groups tool to find available contracts and groups.';
      }
      
      return {
        content: [{
          type: 'text',
          text: message,
        }],
      };
    }

    // Format properties list with comprehensive details
    const properties = response.properties.items;
    let text = `# Akamai Properties (${properties.length} found)\n\n`;
    
    // Add filter information
    text += '**Filters Applied:**\n';
    if (contractId) text += `- Contract: ${contractId}${!args.contractId ? ' (auto-selected)' : ''}\n`;
    if (groupId) text += `- Group: ${groupId}${!args.groupId && !args.contractId ? ' (auto-selected)' : ''}\n`;
    text += '\n';

    // Group properties by contract for better organization
    const propertiesByContract = properties.reduce((acc, prop) => {
      const contract = prop.contractId;
      if (!acc[contract]) acc[contract] = [];
      acc[contract].push(prop);
      return acc;
    }, {} as Record<string, Property[]>);

    // Display properties organized by contract
    for (const [contractId, contractProps] of Object.entries(propertiesByContract)) {
      text += `## Contract: ${contractId}\n\n`;
      
      for (const prop of contractProps) {
        text += `### 📦 ${prop.propertyName}\n`;
        text += `- **Property ID:** ${prop.propertyId}\n`;
        text += `- **Current Version:** ${prop.latestVersion || 'N/A'}\n`;
        text += `- **Production:** ${formatStatus(prop.productionStatus)}\n`;
        text += `- **Staging:** ${formatStatus(prop.stagingStatus)}\n`;
        text += `- **Group:** ${prop.groupId}\n`;
        
        if (prop.note) {
          text += `- **Notes:** ${prop.note}\n`;
        }
        
        text += '\n';
      }
    }

    // Add helpful next steps
    text += '## Next Steps\n\n';
    text += '- To view detailed configuration: `"Show me details for property [propertyId]"`\n';
    text += '- To view property rules: `"Show me the rules for property [propertyId]"`\n';
    text += '- To activate a property: `"Activate property [propertyId] to staging"`\n';
    text += '- To create a new property: `"Create a new property called [name]"`\n';

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('list properties', error);
  }
}

/**
 * Get detailed information about a specific property
 * Includes version history, activation details, and associated hostnames
 */
export async function getProperty(
  client: AkamaiClient,
  args: { propertyId: string }
): Promise<MCPToolResponse> {
  try {
    let propertyId = args.propertyId;
    
    // If not a property ID format, use the search API
    if (!propertyId.startsWith('prp_')) {
      try {
        // Use the find-by-value endpoint for efficient searching
        const searchResponse = await client.request({
          path: '/papi/v1/search/find-by-value',
          method: 'POST',
          body: {
            query: propertyId
          }
        });
        
        // Check if we found any properties
        if (!searchResponse.versions?.items || searchResponse.versions.items.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `❌ No property found matching "${propertyId}".\n\n💡 **Tips:**\n- Use the exact property name or hostname\n- Use list_properties to see all available properties\n- Property IDs start with 'prp_' (e.g., prp_12345)\n- For hostnames, use the full domain (e.g., www.example.com)`,
            }],
          };
        }
        
        // Get the first matching property (preferring active versions)
        const activeVersion = searchResponse.versions.items.find((v: any) => 
          v.productionStatus === 'ACTIVE' || v.stagingStatus === 'ACTIVE'
        );
        const matchedVersion = activeVersion || searchResponse.versions.items[0];
        
        propertyId = matchedVersion.propertyId;
        
        // Add note about the search
        let searchNote = `ℹ️ Found property "${matchedVersion.propertyName}" (${propertyId})\n`;
        if (matchedVersion.productionStatus === 'ACTIVE') {
          searchNote += `   Active in: PRODUCTION (v${matchedVersion.propertyVersion})\n`;
        }
        if (matchedVersion.stagingStatus === 'ACTIVE') {
          searchNote += `   Active in: STAGING (v${matchedVersion.propertyVersion})\n`;
        }
        searchNote += '\n';
        
        // Continue with the found property ID
        const result = await getPropertyById(client, propertyId);
        if (result.content[0] && 'text' in result.content[0]) {
          result.content[0].text = searchNote + result.content[0].text;
        }
        return result;
        
      } catch (searchError: any) {
        // If search fails, provide helpful error message
        if (searchError.message?.includes('404')) {
          return {
            content: [{
              type: 'text',
              text: `❌ No property found matching "${propertyId}".\n\n💡 **Tips:**\n- For property names: Use the exact name (case-insensitive)\n- For hostnames: Use the full domain (e.g., www.example.com)\n- For property IDs: Use the format prp_12345\n- Use list_properties to see all available properties`,
            }],
          };
        }
        // For other errors, fall through to general error handling
        throw searchError;
      }
    }

    // Get property by ID
    return await getPropertyById(client, propertyId);
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
  existingProperty?: Property
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
    let text = `# Property Details: ${prop.propertyName}\n\n`;
    
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
 * Create a new CDN property
 * Handles property creation with proper validation and helpful guidance
 */
export async function createProperty(
  client: AkamaiClient,
  args: {
    propertyName: string;
    productId: string;
    contractId: string;
    groupId: string;
    ruleFormat?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Validate required parameters
    const validationErrors: string[] = [];
    
    if (!args.propertyName || args.propertyName.trim().length === 0) {
      validationErrors.push('Property name is required');
    } else if (!/^[a-zA-Z0-9-._]+$/.test(args.propertyName)) {
      validationErrors.push('Property name can only contain letters, numbers, hyphens, dots, and underscores');
    }
    
    if (!args.contractId || !args.contractId.startsWith('ctr_')) {
      validationErrors.push('Valid contract ID is required (should start with ctr_)');
    }
    
    if (!args.groupId || !args.groupId.startsWith('grp_')) {
      validationErrors.push('Valid group ID is required (should start with grp_)');
    }
    
    if (!args.productId) {
      validationErrors.push('Product ID is required (e.g., prd_Web_Accel, prd_Download_Delivery)');
    }
    
    if (validationErrors.length > 0) {
      return {
        content: [{
          type: 'text',
          text: `❌ Cannot create property - validation errors:\n\n${validationErrors.map(e => `- ${e}`).join('\n')}\n\n💡 **Tip:** Use the list_groups tool to find valid contract and group IDs.`,
        }],
      };
    }

    // Get the latest rule format if not specified
    let ruleFormat = args.ruleFormat;
    if (!ruleFormat) {
      try {
        const formatsResponse = await client.request({
          path: '/papi/v1/rule-formats',
          method: 'GET',
        });
        
        if (formatsResponse.ruleFormats?.items?.[0]) {
          ruleFormat = formatsResponse.ruleFormats.items[0];
        } else {
          ruleFormat = 'latest'; // Fallback
        }
      } catch {
        ruleFormat = 'latest'; // Fallback if we can't get formats
      }
    }

    // Create the property
    const response = await client.request({
      path: `/papi/v1/properties?contractId=${args.contractId}&groupId=${args.groupId}`,
      method: 'POST',
      body: {
        propertyName: args.propertyName,
        productId: args.productId,
        ruleFormat: ruleFormat,
      },
    });

    if (!response.propertyLink) {
      throw new Error('Property creation failed - no property link returned');
    }

    // Extract property ID from the link
    const propertyId = response.propertyLink.split('/').pop();
    
    // Format success response with comprehensive next steps
    let text = `✅ **Property Created Successfully!**\n\n`;
    
    text += `## Property Details\n`;
    text += `- **Name:** ${args.propertyName}\n`;
    text += `- **Property ID:** ${propertyId}\n`;
    text += `- **Product:** ${args.productId}\n`;
    text += `- **Contract:** ${args.contractId}\n`;
    text += `- **Group:** ${args.groupId}\n`;
    text += `- **Rule Format:** ${ruleFormat}\n`;
    text += `- **Status:** 🔵 NEW (Not yet activated)\n\n`;
    
    text += `## Required Next Steps\n\n`;
    text += `### 1. Create Edge Hostname\n`;
    text += `You need an edge hostname for content delivery:\n`;
    text += `\`"Create edge hostname for property ${propertyId}"\`\n\n`;
    
    text += `### 2. Configure Property Rules\n`;
    text += `Set up origin server and caching behavior:\n`;
    text += `\`"Update property ${propertyId} to use origin server [your-origin.com]"\`\n\n`;
    
    text += `### 3. Add Hostnames\n`;
    text += `Associate your domains with the property:\n`;
    text += `\`"Add hostname www.example.com to property ${propertyId}"\`\n\n`;
    
    text += `### 4. Activate to Staging\n`;
    text += `Test your configuration in staging first:\n`;
    text += `\`"Activate property ${propertyId} to staging"\`\n\n`;
    
    text += `### 5. SSL Certificate\n`;
    text += `If using HTTPS, enroll a certificate:\n`;
    text += `\`"Enroll DV certificate for www.example.com"\`\n\n`;
    
    text += `## Common Product IDs Reference\n`;
    text += `- **prd_Web_Accel** - Web Application Accelerator\n`;
    text += `- **prd_Download_Delivery** - Download Delivery\n`;
    text += `- **prd_Dynamic_Site_Accel** - Dynamic Site Accelerator\n`;
    text += `- **prd_Site_Accel** - Ion Standard\n`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return {
          content: [{
            type: 'text',
            text: `❌ A property with name '${args.propertyName}' already exists in this contract/group.\n\n**Solutions:**\n- Choose a different property name\n- Use list_properties to see existing properties\n- Check if the property exists in a different group`,
          }],
        };
      }
      
      if (error.message.includes('Invalid product')) {
        return {
          content: [{
            type: 'text',
            text: `❌ Invalid product ID: ${args.productId}\n\n**Common Product IDs:**\n- prd_Web_Accel\n- prd_Download_Delivery\n- prd_Dynamic_Site_Accel\n- prd_Site_Accel\n\nCheck your contract to see which products are available.`,
          }],
        };
      }
    }
    
    return formatError('create property', error);
  }
}

/**
 * List all available groups and contracts
 * Essential for property creation as it provides the required IDs
 */
export async function listGroups(
  client: AkamaiClient,
  args: { searchTerm?: string }
): Promise<MCPToolResponse> {
  try {
    const response = await client.request({
      path: '/papi/v1/groups',
      method: 'GET',
    }) as GroupList;

    if (!response.groups?.items || response.groups.items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No groups found in your account.\n\n⚠️ This might indicate a permissions issue with your API credentials.',
        }],
      };
    }

    // Organize groups hierarchically
    let groups = response.groups.items;
    
    // Filter groups by search term if provided
    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      groups = groups.filter(g => 
        g.groupName.toLowerCase().includes(searchLower) ||
        g.groupId.toLowerCase().includes(searchLower)
      );
      
      if (groups.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No groups found matching "${args.searchTerm}".\n\n💡 **Tip:** Try a partial name or group ID.`,
          }],
        };
      }
    }
    
    const topLevelGroups = groups.filter(g => !g.parentGroupId);
    const groupsByParent = groups.reduce((acc, group) => {
      if (group.parentGroupId) {
        if (!acc[group.parentGroupId]) acc[group.parentGroupId] = [];
        acc[group.parentGroupId]!.push(group);
      }
      return acc;
    }, {} as Record<string, typeof groups>);

    let text = `# Akamai Groups & Contracts ${args.searchTerm ? `(${groups.length} groups matching "${args.searchTerm}")` : `(${groups.length} groups found)`}\n\n`;
    
    // Function to recursively display groups
    function displayGroup(group: typeof groups[0], indent: string = ''): string {
      let output = `${indent}📁 **${group.groupName}**\n`;
      output += `${indent}   Group ID: ${group.groupId}\n`;
      
      if (group.contractIds && group.contractIds.length > 0) {
        output += `${indent}   Contracts: ${group.contractIds.join(', ')}\n`;
      } else {
        output += `${indent}   Contracts: None\n`;
      }
      
      // Display child groups
      const children = groupsByParent[group.groupId] || [];
      if (children.length > 0) {
        output += `${indent}   Child Groups:\n`;
        for (const child of children) {
          output += displayGroup(child, indent + '      ');
        }
      }
      
      output += '\n';
      return output;
    }

    // Display top-level groups and their hierarchies
    text += `## Group Hierarchy\n\n`;
    for (const group of topLevelGroups) {
      text += displayGroup(group);
    }

    // List all contracts for easy reference
    const allContracts = new Set<string>();
    groups.forEach(g => {
      if (g.contractIds) {
        g.contractIds.forEach(c => allContracts.add(c));
      }
    });

    if (allContracts.size > 0) {
      text += `## All Available Contracts\n\n`;
      Array.from(allContracts).sort().forEach(contract => {
        text += `- ${contract}\n`;
      });
      text += '\n';
    }

    // Add group name to ID lookup table
    text += `## Group Name to ID Lookup\n\n`;
    text += `| Group Name | Group ID | Contracts |\n`;
    text += `|------------|----------|----------|\n`;
    
    // Sort groups by name for easy lookup
    const sortedGroups = [...groups].sort((a, b) => 
      a.groupName.toLowerCase().localeCompare(b.groupName.toLowerCase())
    );
    
    for (const group of sortedGroups) {
      const contracts = group.contractIds?.join(', ') || 'None';
      text += `| ${group.groupName} | ${group.groupId} | ${contracts} |\n`;
    }
    text += '\n';
    
    // Add usage instructions
    text += `## How to Use This Information\n\n`;
    text += `When creating a new property, you'll need:\n`;
    text += `1. **Group ID** (grp_XXXXX) - Choose based on your organization structure\n`;
    text += `2. **Contract ID** (ctr_X-XXXXX) - Choose based on your billing arrangement\n\n`;
    text += `Example:\n`;
    text += `\`"Create a new property called my-site in group grp_12345 with contract ctr_C-1234567"\`\n\n`;
    text += `💡 **Tip:** Properties inherit permissions from their group, so choose the appropriate group for access control.`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('list groups', error);
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
      solution = '**Solution:** Request timed out. The Akamai API might be slow. Try again in a moment.';
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