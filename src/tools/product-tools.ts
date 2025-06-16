/**
 * Product Management Tools
 * Implements product discovery and use case operations for Akamai Property Manager
 */

import { AkamaiClient } from '../akamai-client.js';
import { MCPToolResponse } from '../types.js';
import { getProductFriendlyName, formatProductDisplay, selectBestProduct } from '../utils/product-mapping.js';
import { formatContractDisplay, ensurePrefix } from '../utils/formatting.js';

/**
 * List all products available under a contract
 */
export async function listProducts(
  client: AkamaiClient,
  args: {
    contractId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Ensure contract has prefix
    if (!args.contractId) {
      return {
        content: [{
          type: 'text',
          text: `❌ Contract ID is required.\n\n💡 **Tip:** Use \`list_contracts\` to find valid contract IDs.`,
        }],
      };
    }
    
    const contractId = ensurePrefix(args.contractId, 'ctr_');

    const response = await client.request({
      path: `/papi/v1/products`,
      method: 'GET',
      queryParams: {
        contractId: contractId,
      },
    });

    if (!response.products?.items || response.products.items.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No products found for contract ${formatContractDisplay(contractId)}.\n\n⚠️ This could mean:\n- The contract has no products assigned\n- Your API credentials lack access to this contract\n- The contract ID is invalid`,
        }],
      };
    }

    let text = `# Products Available in ${formatContractDisplay(contractId)}\n\n`;
    text += `Found ${response.products.items.length} products:\n\n`;

    text += `| Product ID | Product Name | Category |\n`;
    text += `|------------|--------------|----------|\n`;
    
    // Sort products by name for easier reading
    const sortedProducts = response.products.items.sort((a: any, b: any) => 
      (a.productName || '').localeCompare(b.productName || '')
    );

    for (const product of sortedProducts) {
      const productId = product.productId || 'Unknown';
      const productName = product.productName || 'Unnamed Product';
      const friendlyName = getProductFriendlyName(productId);
      const displayName = friendlyName !== productId ? `${productName} (${friendlyName})` : productName;
      const category = product.category || 'General';
      text += `| ${productId} | ${displayName} | ${category} |\n`;
    }
    
    text += '\n';
    // Add best product recommendation
    const bestProduct = selectBestProduct(response.products.items);
    if (bestProduct) {
      text += `## 🎯 Recommended Product\n\n`;
      text += `**${formatProductDisplay(bestProduct.productId, bestProduct.productName)}**\n`;
      text += `Ion products are preferred for most use cases due to their modern features and performance.\n\n`;
    }
    
    text += `## Common Product Use Cases\n\n`;
    text += `- **prd_fresca (Ion)**: Modern web acceleration with advanced features (RECOMMENDED)\n`;
    text += `- **prd_Site_Accel (DSA)**: Dynamic Site Accelerator - Traditional web acceleration\n`;
    text += `- **prd_Web_Accel (WAA)**: Web Application Accelerator - Dynamic content\n`;
    text += `- **prd_Download_Delivery (DD)**: Large file downloads\n`;
    text += `- **prd_Adaptive_Media_Delivery (AMD)**: Video and media streaming\n\n`;
    
    text += `## Next Steps\n\n`;
    text += `1. Use a product ID when creating properties:\n`;
    text += `   \`"Create property with product ${bestProduct?.productId || 'prd_fresca'}"\`\n\n`;
    text += `2. View use cases for a specific product:\n`;
    text += `   \`"List use cases for product ${bestProduct?.productId || 'prd_fresca'}"\`\n\n`;
    text += `3. Create CP codes with a product:\n`;
    text += `   \`"Create CP code with product ${bestProduct?.productId || 'prd_fresca'}"\``;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('list products', error);
  }
}

/**
 * Get details about a specific product
 */
export async function getProduct(
  client: AkamaiClient,
  args: {
    productId: string;
    contractId: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Validate inputs
    if (!args.productId || !args.productId.startsWith('prd_')) {
      return {
        content: [{
          type: 'text',
          text: `❌ Invalid product ID format. Product IDs should start with "prd_".\n\n💡 **Tip:** Use \`list_products\` to find valid product IDs.`,
        }],
      };
    }

    if (!args.contractId || !args.contractId.startsWith('ctr_')) {
      return {
        content: [{
          type: 'text',
          text: `❌ Invalid contract ID format. Contract IDs should start with "ctr_".\n\n💡 **Tip:** Use \`list_contracts\` to find valid contract IDs.`,
        }],
      };
    }

    // Get all products and find the specific one
    const response = await client.request({
      path: `/papi/v1/products`,
      method: 'GET',
      queryParams: {
        contractId: args.contractId,
      },
    });

    const product = response.products?.items?.find((p: any) => p.productId === args.productId);

    if (!product) {
      return {
        content: [{
          type: 'text',
          text: `❌ Product ${args.productId} not found in contract ${args.contractId}.\n\n💡 **Tip:** Use \`list_products for contract ${args.contractId}\` to see available products.`,
        }],
      };
    }

    const friendlyName = getProductFriendlyName(product.productId);
    let text = `# Product Details: ${formatProductDisplay(product.productId, product.productName)}\n\n`;
    
    text += `## Basic Information\n`;
    text += `- **Product ID:** ${product.productId}\n`;
    text += `- **Product Name:** ${product.productName || 'Unknown'}\n`;
    text += `- **Friendly Name:** ${friendlyName}\n`;
    text += `- **Category:** ${product.category || 'General'}\n`;
    text += `- **Contract:** ${args.contractId}\n\n`;

    if (product.description) {
      text += `## Description\n${product.description}\n\n`;
    }

    text += `## Features\n`;
    if (product.features && Array.isArray(product.features)) {
      for (const feature of product.features) {
        text += `- ${feature}\n`;
      }
    } else {
      text += `Product features information not available.\n`;
    }
    text += '\n';

    text += `## Usage\n`;
    text += `This product ID can be used for:\n`;
    text += `- Creating new properties\n`;
    text += `- Creating CP codes\n`;
    text += `- Creating edge hostnames\n\n`;

    text += `## Example Commands\n`;
    text += `\`\`\`\n`;
    text += `# Create a property with this product\n`;
    text += `"Create property my-site with product ${product.productId} in contract ${args.contractId}"\n\n`;
    text += `# Create a CP code with this product\n`;
    text += `"Create CP code my-cpcode with product ${product.productId} in contract ${args.contractId}"\n\n`;
    text += `# View use cases for edge hostname creation\n`;
    text += `"List use cases for product ${product.productId}"\n`;
    text += `\`\`\``;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('get product', error);
  }
}

/**
 * List use cases for a product (for edge hostname creation)
 */
export async function listUseCases(
  _client: AkamaiClient,
  args: {
    productId: string;
    contractId?: string;
    customer?: string;
  }
): Promise<MCPToolResponse> {
  try {
    // Validate product ID
    if (!args.productId || !args.productId.startsWith('prd_')) {
      return {
        content: [{
          type: 'text',
          text: `❌ Invalid product ID format. Product IDs should start with "prd_".\n\n💡 **Tip:** Use \`list_products\` to find valid product IDs.`,
        }],
      };
    }

    // For now, return predefined use cases as the API endpoint may vary
    // This can be updated when the exact API endpoint is confirmed
    const useCases = {
      'prd_Site_Accel': [
        { useCase: 'Download_Mode', option: 'BACKGROUND', type: 'GLOBAL', description: 'Background downloads and software updates' },
        { useCase: 'Download_Mode', option: 'FOREGROUND', type: 'GLOBAL', description: 'User-initiated downloads' },
        { useCase: 'Web_Standard', option: 'STANDARD', type: 'GLOBAL', description: 'Standard web content delivery' }
      ],
      'prd_Web_Accel': [
        { useCase: 'Web_Dynamic', option: 'DYNAMIC', type: 'GLOBAL', description: 'Dynamic web applications' },
        { useCase: 'Web_Standard', option: 'STANDARD', type: 'GLOBAL', description: 'Standard web content' }
      ],
      'prd_Download_Delivery': [
        { useCase: 'Download_Mode', option: 'BACKGROUND', type: 'GLOBAL', description: 'Large file downloads' },
        { useCase: 'Download_Mode', option: 'FOREGROUND', type: 'GLOBAL', description: 'Direct user downloads' }
      ],
      'prd_Adaptive_Media_Delivery': [
        { useCase: 'Live_Streaming', option: 'LIVE', type: 'GLOBAL', description: 'Live video streaming' },
        { useCase: 'On_Demand_Streaming', option: 'VOD', type: 'GLOBAL', description: 'Video on demand' }
      ]
    };

    const productUseCases = useCases[args.productId as keyof typeof useCases] || [
      { useCase: 'Download_Mode', option: 'BACKGROUND', type: 'GLOBAL', description: 'Default use case' }
    ];

    let text = `# Use Cases for Product ${args.productId}\n\n`;
    text += `Use cases help optimize traffic routing across the Akamai edge network.\n\n`;

    text += `## Available Use Cases\n\n`;
    text += `| Use Case | Option | Type | Description |\n`;
    text += `|----------|--------|------|-------------|\n`;

    for (const uc of productUseCases) {
      text += `| ${uc.useCase} | ${uc.option} | ${uc.type} | ${uc.description} |\n`;
    }

    text += `\n## How to Use\n\n`;
    text += `When creating an edge hostname, include the use case configuration:\n\n`;
    text += `\`\`\`json\n`;
    text += `{\n`;
    text += `  "productId": "${args.productId}",\n`;
    text += `  "domainPrefix": "www.example.com",\n`;
    text += `  "domainSuffix": "edgekey.net",\n`;
    text += `  "useCases": [\n`;
    text += `    {\n`;
    text += `      "useCase": "${productUseCases[0]?.useCase}",\n`;
    text += `      "option": "${productUseCases[0]?.option}",\n`;
    text += `      "type": "${productUseCases[0]?.type}"\n`;
    text += `    }\n`;
    text += `  ]\n`;
    text += `}\n`;
    text += `\`\`\`\n\n`;

    text += `## Edge Hostname Creation Example\n`;
    text += `\`"Create edge hostname www.example.com.edgekey.net for property prp_12345 with product ${args.productId}"\`\n\n`;
    text += `💡 **Note:** Use cases are automatically configured when creating edge hostnames through the standard MCP tools.`;

    return {
      content: [{
        type: 'text',
        text,
      }],
    };
  } catch (error) {
    return formatError('list use cases', error);
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
      solution = '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      solution = '**Solution:** Your API credentials may lack the necessary permissions for product operations.';
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      solution = '**Solution:** The requested resource was not found. Verify the contract ID is correct.';
    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
      solution = '**Solution:** Invalid request parameters. Check the product and contract IDs.';
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
  text += '- List available contracts: `"List contracts"`\n';
  text += '- List products: `"List products for contract ctr_XXX"`\n';
  text += '- Product documentation: https://techdocs.akamai.com/property-mgr/reference/products';

  return {
    content: [{
      type: 'text',
      text,
    }],
  };
}