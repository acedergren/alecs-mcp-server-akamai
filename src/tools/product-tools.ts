/**
 * Product Management Tools
 * Implements product discovery and use case operations for Akamai Property Manager
 */

import { formatContractDisplay, ensurePrefix } from '@utils/formatting';
import {
  getProductFriendlyName,
  formatProductDisplay,
  selectBestProduct,
} from '@utils/product-mapping';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

/**
 * List all products available under a contract
 */
export async function listProducts(
  client: AkamaiClient,
  args: {
    contractId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Ensure contract has prefix
    if (!args.contractId) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Contract ID is required.\n\n💡 **Tip:** Use `list_contracts` to find valid contract IDs.',
          },
        ],
      };
    }

    const contractId = ensurePrefix(args.contractId, 'ctr_');

    const response = await client.request({
      path: '/papi/v1/products',
      method: 'GET',
      queryParams: {
        contractId: contractId,
      },
    });

    if (!response.products?.items || response.products.items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No products found for contract ${formatContractDisplay(contractId)}.\n\n⚠️ This could mean:\n- The contract has no products assigned\n- Your API credentials lack access to this contract\n- The contract ID is invalid`,
          },
        ],
      };
    }

    let text = `# Products Available in ${formatContractDisplay(contractId)}\n\n`;
    text += `Found ${response.products.items.length} products:\n\n`;

    text += '| Product ID | Product Name | Category |\n';
    text += '|------------|--------------|----------|\n';

    // Sort products by name for easier reading
    const sortedProducts = response.products.items.sort((a: any, b: any) =>
      (a.productName || '').localeCompare(b.productName || ''),
    );

    for (const product of sortedProducts) {
      const productId = product.productId || 'Unknown';
      const productName = product.productName || 'Unnamed Product';
      const friendlyName = getProductFriendlyName(productId);
      const displayName =
        friendlyName !== productId ? `${productName} (${friendlyName})` : productName;
      const category = product.category || 'General';
      text += `| ${productId} | ${displayName} | ${category} |\n`;
    }

    text += '\n';
    // Add best product recommendation
    const bestProduct = selectBestProduct(response.products.items);
    if (bestProduct) {
      text += '## 🎯 Recommended Product\n\n';
      text += `**${formatProductDisplay(bestProduct.productId, bestProduct.productName)}**\n`;
      text +=
        'Ion products are preferred for most use cases due to their modern features and performance.\n\n';
    }

    text += '## Common Product Use Cases\n\n';
    text +=
      '- **prd_SPM (Ion Premier)**: Premium performance for dynamic web apps and APIs (BEST)\n';
    text +=
      '- **prd_FRESCA (Ion Standard)**: Modern web acceleration with advanced features (RECOMMENDED)\n';
    text += '- **prd_Alta (Alta)**: Alta acceleration platform\n';
    text +=
      '- **prd_SiteAccel/prd_Site_Accel (DSA)**: Dynamic Site Accelerator - Traditional web acceleration\n';
    text += '- **prd_Object_Delivery**: Object storage and delivery\n';
    text += '- **prd_Download_Delivery (DD)**: Large file downloads\n';
    text += '- **prd_Adaptive_Media_Delivery (AMD)**: Video and media streaming\n';
    text += '- **prd_Web_Application_Accelerator (WAA)**: Dynamic web content\n\n';

    text += '## Next Steps\n\n';
    text += '1. Use a product ID when creating properties:\n';
    text += `   \`"Create property with product ${bestProduct?.productId || 'prd_fresca'}"\`\n\n`;
    text += '2. View use cases for a specific product:\n';
    text += `   \`"List use cases for product ${bestProduct?.productId || 'prd_fresca'}"\`\n\n`;
    text += '3. Create CP codes with a product:\n';
    text += `   \`"Create CP code with product ${bestProduct?.productId || 'prd_fresca'}"\``;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list products', _error);
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
  },
): Promise<MCPToolResponse> {
  try {
    // Validate inputs
    if (!args.productId?.startsWith('prd_')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid product ID format. Product IDs should start with "prd_".\n\n💡 **Tip:** Use `list_products` to find valid product IDs.',
          },
        ],
      };
    }

    if (!args.contractId?.startsWith('ctr_')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid contract ID format. Contract IDs should start with "ctr_".\n\n💡 **Tip:** Use `list_contracts` to find valid contract IDs.',
          },
        ],
      };
    }

    // Get all products and find the specific one
    const response = await client.request({
      path: '/papi/v1/products',
      method: 'GET',
      queryParams: {
        contractId: args.contractId,
      },
    });

    const product = response.products?.items?.find((p: any) => p.productId === args.productId);

    if (!product) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Product ${args.productId} not found in contract ${args.contractId}.\n\n💡 **Tip:** Use \`list_products for contract ${args.contractId}\` to see available products.`,
          },
        ],
      };
    }

    const friendlyName = getProductFriendlyName(product.productId);
    let text = `# Product Details: ${formatProductDisplay(product.productId, product.productName)}\n\n`;

    text += '## Basic Information\n';
    text += `- **Product ID:** ${product.productId}\n`;
    text += `- **Product Name:** ${product.productName || 'Unknown'}\n`;
    text += `- **Friendly Name:** ${friendlyName}\n`;
    text += `- **Category:** ${product.category || 'General'}\n`;
    text += `- **Contract:** ${args.contractId}\n\n`;

    if (product.description) {
      text += `## Description\n${product.description}\n\n`;
    }

    text += '## Features\n';
    if (product.features && Array.isArray(product.features)) {
      for (const feature of product.features) {
        text += `- ${feature}\n`;
      }
    } else {
      text += 'Product features information not available.\n';
    }
    text += '\n';

    text += '## Usage\n';
    text += 'This product ID can be used for:\n';
    text += '- Creating new properties\n';
    text += '- Creating CP codes\n';
    text += '- Creating edge hostnames\n\n';

    text += '## Example Commands\n';
    text += '```\n';
    text += '# Create a property with this product\n';
    text += `"Create property my-site with product ${product.productId} in contract ${args.contractId}"\n\n`;
    text += '# Create a CP code with this product\n';
    text += `"Create CP code my-cpcode with product ${product.productId} in contract ${args.contractId}"\n\n`;
    text += '# View use cases for edge hostname creation\n';
    text += `"List use cases for product ${product.productId}"\n`;
    text += '```';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('get product', _error);
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
  },
): Promise<MCPToolResponse> {
  try {
    // Validate product ID
    if (!args.productId?.startsWith('prd_')) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Invalid product ID format. Product IDs should start with "prd_".\n\n💡 **Tip:** Use `list_products` to find valid product IDs.',
          },
        ],
      };
    }

    // For now, return predefined use cases as the API endpoint may vary
    // This can be updated when the exact API endpoint is confirmed
    const useCases = {
      prd_Site_Accel: [
        {
          useCase: 'Download_Mode',
          option: 'BACKGROUND',
          type: 'GLOBAL',
          description: 'Background downloads and software updates',
        },
        {
          useCase: 'Download_Mode',
          option: 'FOREGROUND',
          type: 'GLOBAL',
          description: 'User-initiated downloads',
        },
        {
          useCase: 'Web_Standard',
          option: 'STANDARD',
          type: 'GLOBAL',
          description: 'Standard web content delivery',
        },
      ],
      prd_Web_Accel: [
        {
          useCase: 'Web_Dynamic',
          option: 'DYNAMIC',
          type: 'GLOBAL',
          description: 'Dynamic web applications',
        },
        {
          useCase: 'Web_Standard',
          option: 'STANDARD',
          type: 'GLOBAL',
          description: 'Standard web content',
        },
      ],
      prd_Download_Delivery: [
        {
          useCase: 'Download_Mode',
          option: 'BACKGROUND',
          type: 'GLOBAL',
          description: 'Large file downloads',
        },
        {
          useCase: 'Download_Mode',
          option: 'FOREGROUND',
          type: 'GLOBAL',
          description: 'Direct user downloads',
        },
      ],
      prd_Adaptive_Media_Delivery: [
        {
          useCase: 'Live_Streaming',
          option: 'LIVE',
          type: 'GLOBAL',
          description: 'Live video streaming',
        },
        {
          useCase: 'On_Demand_Streaming',
          option: 'VOD',
          type: 'GLOBAL',
          description: 'Video on demand',
        },
      ],
    };

    const productUseCases = useCases[args.productId as keyof typeof useCases] || [
      {
        useCase: 'Download_Mode',
        option: 'BACKGROUND',
        type: 'GLOBAL',
        description: 'Default use case',
      },
    ];

    let text = `# Use Cases for Product ${args.productId}\n\n`;
    text += 'Use cases help optimize traffic routing across the Akamai edge network.\n\n';

    text += '## Available Use Cases\n\n';
    text += '| Use Case | Option | Type | Description |\n';
    text += '|----------|--------|------|-------------|\n';

    for (const uc of productUseCases) {
      text += `| ${uc.useCase} | ${uc.option} | ${uc.type} | ${uc.description} |\n`;
    }

    text += '\n## How to Use\n\n';
    text += 'When creating an edge hostname, include the use case configuration:\n\n';
    text += '```json\n';
    text += '{\n';
    text += `  "productId": "${args.productId}",\n`;
    text += '  "domainPrefix": "www.example.com",\n';
    text += '  "domainSuffix": "edgekey.net",\n';
    text += '  "useCases": [\n';
    text += '    {\n';
    text += `      "useCase": "${productUseCases[0]?.useCase}",\n`;
    text += `      "option": "${productUseCases[0]?.option}",\n`;
    text += `      "type": "${productUseCases[0]?.type}"\n`;
    text += '    }\n';
    text += '  ]\n';
    text += '}\n';
    text += '```\n\n';

    text += '## Edge Hostname Creation Example\n';
    text += `\`"Create edge hostname www.example.com.edgekey.net for property prp_12345 with product ${args.productId}"\`\n\n`;
    text +=
      '💡 **Note:** Use cases are automatically configured when creating edge hostnames through the standard MCP tools.';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list use cases', _error);
  }
}

/**
 * Format error responses with helpful guidance
 */
function formatError(operation: string, _error: any): MCPToolResponse {
  let errorMessage = `❌ Failed to ${operation}`;
  let solution = '';

  if (_error instanceof Error) {
    errorMessage += `: ${_error.message}`;

    // Provide specific solutions based on error type
    if (_error.message.includes('401') || _error.message.includes('credentials')) {
      solution =
        '**Solution:** Check your ~/.edgerc file has valid credentials for the customer section.';
    } else if (_error.message.includes('403') || _error.message.includes('Forbidden')) {
      solution =
        '**Solution:** Your API credentials may lack the necessary permissions for product operations.';
    } else if (_error.message.includes('404') || _error.message.includes('not found')) {
      solution =
        '**Solution:** The requested resource was not found. Verify the contract ID is correct.';
    } else if (_error.message.includes('400') || _error.message.includes('Bad Request')) {
      solution = '**Solution:** Invalid request parameters. Check the product and contract IDs.';
    }
  } else {
    errorMessage += `: ${String(_error)}`;
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
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * List billing products for a contract to discover additional product mappings
 * Uses the Billing API to get product names and IDs
 */
export async function listBillingProducts(
  client: AkamaiClient,
  args: {
    contractId: string;
    year?: number;
    month?: number;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    // Ensure contract has prefix
    const contractId = ensurePrefix(args.contractId, 'ctr_');

    // Default to current month if not specified
    const now = new Date();
    const year = args.year || now.getFullYear();
    const month = args.month || now.getMonth() + 1; // JavaScript months are 0-based

    // Format date parameters for API
    const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0); // Last day of month
    const toDate = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const response = await client.request({
      path: `/billing/v1/contracts/${contractId}/products`,
      method: 'GET',
      queryParams: {
        fromDate: fromDate,
        toDate: toDate,
      },
    });

    if (!response.billingProducts || response.billingProducts.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No billing products found for contract ${formatContractDisplay(contractId)} in ${year}-${month}.\n\n⚠️ This could mean:\n- No usage in the specified period\n- The contract has no active products\n- Your API credentials lack billing access`,
          },
        ],
      };
    }

    let text = `# Billing Products for ${formatContractDisplay(contractId)}\n`;
    text += `**Period:** ${year}-${month}\n\n`;
    text += `Found ${response.billingProducts.length} billing products:\n\n`;

    // Categorize products
    const productMappings: Map<string, { id: string; name: string; category: string }> = new Map();

    text += '| Product ID | Billing Name | Current Mapping | Category |\n';
    text += '|------------|--------------|-----------------|----------|\n';

    for (const product of response.billingProducts) {
      const productId = product.productId || 'Unknown';
      const billingName = product.productName || 'Unnamed';
      const currentMapping = getProductFriendlyName(productId);
      const isNewMapping = currentMapping === productId;

      // Try to categorize based on name or ID
      let category = 'Other';
      if (
        productId.includes('Ion') ||
        productId.includes('SPM') ||
        productId.includes('FRESCA') ||
        billingName.toLowerCase().includes('ion')
      ) {
        category = 'Web Acceleration';
      } else if (
        productId.includes('Download') ||
        productId.includes('Object') ||
        billingName.toLowerCase().includes('download') ||
        billingName.toLowerCase().includes('object')
      ) {
        category = 'Downloads/Storage';
      } else if (
        productId.includes('Media') ||
        productId.includes('Streaming') ||
        billingName.toLowerCase().includes('media') ||
        billingName.toLowerCase().includes('stream')
      ) {
        category = 'Media/Streaming';
      } else if (
        productId.includes('Security') ||
        productId.includes('WAF') ||
        productId.includes('Bot') ||
        billingName.toLowerCase().includes('security') ||
        billingName.toLowerCase().includes('waf')
      ) {
        category = 'Security';
      } else if (productId.includes('DNS') || billingName.toLowerCase().includes('dns')) {
        category = 'DNS';
      }

      const mappingDisplay = isNewMapping ? '❌ No mapping' : `✅ ${currentMapping}`;
      text += `| \`${productId}\` | ${billingName} | ${mappingDisplay} | ${category} |\n`;

      if (isNewMapping) {
        productMappings.set(productId, { id: productId, name: billingName, category });
      }
    }

    // Show geographic breakdown if available
    if (response.billingProducts.some((p: any) => p.regions && p.regions.length > 0)) {
      text += '\n## Geographic Usage\n\n';

      for (const product of response.billingProducts) {
        if (product.regions && product.regions.length > 0) {
          const productName = getProductFriendlyName(product.productId) || product.productName;
          text += `### ${productName} (${product.productId})\n\n`;
          text += '| Region | Usage | Unit |\n';
          text += '|--------|-------|------|\n';

          for (const region of product.regions) {
            text += `| ${region.regionName || region.regionId} | ${region.usage || 0} | ${region.unit || 'N/A'} |\n`;
          }
          text += '\n';
        }
      }
    }

    // Suggest new mappings
    if (productMappings.size > 0) {
      text += '\n## 📝 Suggested New Product Mappings\n\n';
      text += "The following products from billing don't have friendly name mappings:\n\n";
      text += '```typescript\n';
      text += '// Add to PRODUCT_NAME_MAP in product-mapping.ts:\n';

      const mappingEntries: string[] = [];
      productMappings.forEach((value) => {
        // Clean up billing name for use as friendly name
        let friendlyName = value.name;

        // Remove common suffixes/prefixes
        friendlyName = friendlyName.replace(/\s*-\s*.*$/, ''); // Remove everything after dash
        friendlyName = friendlyName.replace(/^Akamai\s+/i, ''); // Remove "Akamai" prefix

        mappingEntries.push(`  '${value.id}': '${friendlyName}',`);
      });

      text += mappingEntries.join('\n');
      text += '\n```\n\n';

      text += '**Categories found:**\n';
      const categories = new Set(Array.from(productMappings.values()).map((p) => p.category));
      categories.forEach((cat) => {
        const products = Array.from(productMappings.values()).filter((p) => p.category === cat);
        text += `- ${cat}: ${products.length} products\n`;
      });
    }

    text += '\n## Cross-Reference with Property Manager\n\n';
    text += 'To see which of these products can be used for property creation:\n';
    text += `\`"List products for contract ${contractId}"\`\n\n`;

    text += '## Note\n';
    text +=
      'Billing product names may differ from Property Manager product names. The billing API shows:\n';
    text += '- Historical usage data\n';
    text += '- Geographic breakdown\n';
    text += '- Products that may not be available for new properties';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (_error) {
    return formatError('list billing products', _error);
  }
}
