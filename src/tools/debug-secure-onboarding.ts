/**
 * Debug version of Secure by Default Property Onboarding
 * This version provides detailed error information and step-by-step feedback
 */

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';
import { createProperty } from './property-tools';
import { selectBestProduct, formatProductDisplay } from '@utils/product-mapping';

/**
 * Debug version of secure property onboarding with detailed error reporting
 */
export async function debugSecurePropertyOnboarding(
  client: AkamaiClient,
  args: {
    propertyName: string;
    hostnames: string[];
    originHostname: string;
    contractId: string;
    groupId: string;
    productId?: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  let text = `# 🔍 Debug: Secure Property Onboarding\n\n`;
  text += `**Target:** ${args.propertyName}\n`;
  text += `**Hostnames:** ${args.hostnames.join(', ')}\n`;
  text += `**Origin:** ${args.originHostname}\n`;
  text += `**Contract:** ${args.contractId}\n`;
  text += `**Group:** ${args.groupId}\n\n`;

  try {
    // Step 1: Validate inputs
    text += `## Step 1: Input Validation\n`;
    const validationErrors: string[] = [];

    if (!args.propertyName || args.propertyName.trim().length === 0) {
      validationErrors.push('Property name is required');
    }
    if (!args.hostnames || args.hostnames.length === 0) {
      validationErrors.push('At least one hostname is required');
    }
    if (!args.originHostname || args.originHostname.trim().length === 0) {
      validationErrors.push('Origin hostname is required');
    }
    if (!args.contractId?.startsWith('ctr_')) {
      validationErrors.push('Valid contract ID is required (should start with ctr_)');
    }
    if (!args.groupId?.startsWith('grp_')) {
      validationErrors.push('Valid group ID is required (should start with grp_)');
    }

    if (validationErrors.length > 0) {
      text += `❌ **Validation Failed:**\n`;
      validationErrors.forEach((error) => {
        text += `- ${error}\n`;
      });
      text += `\n`;

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    text += `✅ **Input validation passed**\n\n`;

    // Step 2: Test API connectivity
    text += `## Step 2: API Connectivity Test\n`;
    try {
      const groupsResponse = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });

      if (groupsResponse.groups?.items) {
        text += `✅ **API connectivity working** (found ${groupsResponse.groups.items.length} groups)\n`;

        // Verify the specified group exists
        const targetGroup = groupsResponse.groups.items.find(
          (g: any) => g.groupId === args.groupId,
        );
        if (targetGroup) {
          text += `✅ **Target group found:** ${targetGroup.groupName}\n`;
        } else {
          text += `❌ **Target group ${args.groupId} not found**\n`;
          text += `Available groups:\n`;
          groupsResponse.groups.items.slice(0, 5).forEach((g: any) => {
            text += `- ${g.groupId}: ${g.groupName}\n`;
          });
          text += `\n`;
        }
      } else {
        text += `❌ **API connectivity issue** - unexpected response format\n`;
      }
    } catch (apiError: any) {
      text += `❌ **API connectivity failed:** ${apiError.message}\n`;
      text += `\n`;

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }
    text += `\n`;

    // Step 3: Product selection
    text += `## Step 3: Product Selection\n`;
    let productId = args.productId;

    if (!productId) {
      try {
        const productsResponse = await client.request({
          path: `/papi/v1/products`,
          method: 'GET',
          queryParams: {
            contractId: args.contractId,
          },
        });

        if (productsResponse.products?.items?.length > 0) {
          const bestProduct = selectBestProduct(productsResponse.products.items);
          if (bestProduct) {
            productId = bestProduct.productId;
            text += `✅ **Auto-selected product:** ${formatProductDisplay(bestProduct.productId, bestProduct.productName)}\n`;
          } else {
            productId = 'prd_fresca';
            text += `⚠️ **Using default product:** Ion (prd_fresca)\n`;
          }
        } else {
          productId = 'prd_fresca';
          text += `⚠️ **No products found, using default:** Ion (prd_fresca)\n`;
        }
      } catch (productError: any) {
        productId = 'prd_fresca';
        text += `⚠️ **Product lookup failed, using default:** Ion (prd_fresca)\n`;
        text += `Error: ${productError.message}\n`;
      }
    } else {
      text += `✅ **Using specified product:** ${formatProductDisplay(productId)}\n`;
    }
    text += `\n`;

    // Step 4: Create property
    text += `## Step 4: Property Creation\n`;
    let propertyId: string | null = null;

    try {
      const createPropResult = await createProperty(client, {
        propertyName: args.propertyName,
        productId: productId,
        contractId: args.contractId,
        groupId: args.groupId,
      });

      if (createPropResult.content[0]?.text.includes('✅')) {
        // Extract property ID from response
        const propMatch = createPropResult.content[0].text.match(/Property ID:\*\* (\w+)/);
        if (propMatch?.[1]) {
          propertyId = propMatch[1];
          text += `✅ **Property created successfully:** ${propertyId}\n`;
        } else {
          text += `⚠️ **Property created but ID extraction failed**\n`;
          text += `Response: ${createPropResult.content[0].text.substring(0, 200)}...\n`;
        }
      } else {
        text += `❌ **Property creation failed**\n`;
        text += `Response: ${createPropResult.content[0]?.text || 'No response'}\n`;

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      }
    } catch (propError: any) {
      text += `❌ **Property creation exception:** ${propError.message}\n`;

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }
    text += `\n`;

    // Step 5: Test edge hostname creation (simplified)
    text += `## Step 5: Edge Hostname Creation Test\n`;
    if (propertyId) {
      try {
        // First, get property details
        const propertyResponse = await client.request({
          path: `/papi/v1/properties/${propertyId}`,
          method: 'GET',
        });

        if (!propertyResponse.properties?.items?.[0]) {
          text += `❌ **Cannot retrieve property details for ${propertyId}**\n`;
        } else {
          const property = propertyResponse.properties.items[0];
          text += `✅ **Property details retrieved**\n`;
          text += `- Contract: ${property.contractId}\n`;
          text += `- Group: ${property.groupId}\n`;
          text += `- Product: ${formatProductDisplay(property.productId)}\n`;

          // Generate edge hostname prefix
          const edgeHostnamePrefix = args.propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
          text += `- Edge hostname prefix: ${edgeHostnamePrefix}\n`;

          // Test edge hostname creation with minimal parameters
          try {
            const edgeResponse = await client.request({
              path: `/papi/v1/edgehostnames?contractId=${property.contractId}&groupId=${property.groupId}`,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: {
                productId: property.productId,
                domainPrefix: edgeHostnamePrefix,
                domainSuffix: '.edgekey.net',
                secure: true,
                ipVersionBehavior: 'IPV4_IPV6',
              },
            });

            if (edgeResponse.edgeHostnameLink) {
              const edgeHostnameId = edgeResponse.edgeHostnameLink.split('/').pop();
              const edgeHostnameDomain = `${edgeHostnamePrefix}.edgekey.net`;
              text += `✅ **Edge hostname created:** ${edgeHostnameDomain}\n`;
              text += `- ID: ${edgeHostnameId}\n`;
            } else {
              text += `❌ **Edge hostname creation failed** - no link returned\n`;
              text += `Response: ${JSON.stringify(edgeResponse, null, 2)}\n`;
            }
          } catch (edgeError: any) {
            text += `❌ **Edge hostname creation exception:** ${edgeError.message}\n`;
            if (edgeError.response?.data) {
              text += `API Response: ${JSON.stringify(edgeError.response.data, null, 2)}\n`;
            }
          }
        }
      } catch (propDetailError: any) {
        text += `❌ **Property detail retrieval failed:** ${propDetailError.message}\n`;
      }
    } else {
      text += `⏭️ **Skipped - no property ID available**\n`;
    }
    text += `\n`;

    // Summary
    text += `## Summary\n`;
    if (propertyId) {
      text += `✅ **Property creation successful**\n`;
      text += `\n`;
      text += `**Next steps to complete manually:**\n`;
      text += `1. Create edge hostname: \`"Create edge hostname for property ${propertyId} with prefix ${args.propertyName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}"\`\n`;
      text += `2. Configure property rules\n`;
      text += `3. Add hostnames to property\n`;
      text += `4. Activate to staging\n`;
    } else {
      text += `❌ **Property creation failed** - cannot proceed with automation\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error: any) {
    text += `\n## ❌ Unexpected Error\n`;
    text += `**Message:** ${error.message}\n`;
    text += `**Stack:** ${error.stack}\n`;

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }
}

/**
 * Simple test for basic API connectivity and property creation
 */
export async function testBasicPropertyCreation(
  client: AkamaiClient,
  args: {
    propertyName: string;
    contractId: string;
    groupId: string;
    customer?: string;
  },
): Promise<MCPToolResponse> {
  try {
    let text = `# 🧪 Basic Property Creation Test\n\n`;

    // Test 1: API connectivity
    text += `## Test 1: API Connectivity\n`;
    try {
      const response = await client.request({
        path: '/papi/v1/groups',
        method: 'GET',
      });
      text += `✅ API accessible (found ${response.groups?.items?.length || 0} groups)\n\n`;
    } catch (apiError: any) {
      text += `❌ API not accessible: ${apiError.message}\n\n`;
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    }

    // Test 2: Product selection
    text += `## Test 2: Product Selection\n`;
    let productId = 'prd_fresca'; // Default to Ion
    try {
      const productsResponse = await client.request({
        path: `/papi/v1/products`,
        method: 'GET',
        queryParams: {
          contractId: args.contractId,
        },
      });

      if (productsResponse.products?.items?.length > 0) {
        const bestProduct = selectBestProduct(productsResponse.products.items);
        if (bestProduct) {
          productId = bestProduct.productId;
          text += `✅ Selected product: ${formatProductDisplay(bestProduct.productId, bestProduct.productName)}\n\n`;
        } else {
          text += `⚠️ Using default product: Ion (prd_fresca)\n\n`;
        }
      }
    } catch (productError: any) {
      text += `⚠️ Product lookup failed, using default: Ion (prd_fresca)\n\n`;
    }

    // Test 3: Property creation
    text += `## Test 3: Property Creation\n`;
    const result = await createProperty(client, {
      propertyName: args.propertyName,
      productId: productId,
      contractId: args.contractId,
      groupId: args.groupId,
    });

    text += `**Result:**\n`;
    text += result.content[0]?.text || 'No response';

    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Test failed: ${error.message}`,
        },
      ],
    };
  }
}
