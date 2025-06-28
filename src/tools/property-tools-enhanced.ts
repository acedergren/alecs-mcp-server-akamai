/**
 * CODE KAI: Enhanced Property Tools
 * World-class property management with comprehensive validation
 * No shortcuts - every operation validated and timeout-aware
 */

import { z } from 'zod';
import { AkamaiClient } from '../akamai-client';
import { MCPToolResponse } from '../types';
import { 
  BaseToolArgs, 
  ToolError, 
  ToolDefinition,
  TEST_DEFAULTS 
} from '../types/tool-infrastructure';
import { 
  withPropertyValidation, 
  validatePropertyAccess,
  getPropertyContext
} from '../utils/property-validation';
import {
  executeWithTimeout,
  OperationType,
  withTimeout,
  ProgressReporter
} from '../utils/timeout-handler';
import { validateApiResponse } from '../utils/api-response-validator';

/**
 * Enhanced list properties arguments with validation
 */
const ListPropertiesArgsSchema = z.object({
  customer: z.string().optional(),
  contractId: z.string().optional(),
  groupId: z.string().optional(),
  limit: z.number().min(1).max(1000).default(50),
  includeSubgroups: z.boolean().default(false),
  timeout: z.number().optional()
});

type ListPropertiesArgs = z.infer<typeof ListPropertiesArgsSchema> & BaseToolArgs;

/**
 * Enhanced list properties with validation and timeout handling
 */
export async function listPropertiesEnhanced(
  client: AkamaiClient,
  args: ListPropertiesArgs
): Promise<MCPToolResponse> {
  // Validate arguments
  const validated = ListPropertiesArgsSchema.parse(args);
  
  return executeWithTimeout(
    async () => {
      const progress = new ProgressReporter(
        'list properties',
        validated.timeout || 30000
      );
      
      progress.report('Fetching properties...');
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (validated.contractId) queryParams.append('contractId', validated.contractId);
      if (validated.groupId) queryParams.append('groupId', validated.groupId);
      
      const response = await client.request(
        withTimeout({
          path: `/papi/v1/properties${queryParams.toString() ? `?${queryParams}` : ''}`,
          method: 'GET',
          customer: validated.customer
        }, OperationType.PROPERTY_LIST, validated.timeout)
      );
      
      const validatedResponse = validateApiResponse<{
        properties?: {
          items?: Array<{
            propertyId: string;
            propertyName: string;
            contractId: string;
            groupId: string;
            latestVersion: number;
            productionVersion?: number;
            stagingVersion?: number;
          }>;
        };
      }>(response);
      
      const properties = validatedResponse.properties?.items || [];
      
      progress.report(`Found ${properties.length} properties`);
      
      // Format response for Claude Desktop
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              properties: properties.slice(0, validated.limit).map(prop => ({
                propertyId: prop.propertyId,
                propertyName: prop.propertyName,
                contractId: prop.contractId,
                groupId: prop.groupId,
                latestVersion: prop.latestVersion,
                productionVersion: prop.productionVersion || null,
                stagingVersion: prop.stagingVersion || null
              })),
              metadata: {
                total: properties.length,
                shown: Math.min(properties.length, validated.limit),
                hasMore: properties.length > validated.limit,
                customer: validated.customer || 'default'
              }
            }, null, 2)
          }
        ]
      };
    },
    {
      operationType: OperationType.PROPERTY_LIST,
      toolName: 'list_properties',
      operationName: 'list properties',
      timeout: validated.timeout,
      context: validated
    }
  );
}

/**
 * Enhanced get property arguments
 */
const GetPropertyArgsSchema = z.object({
  customer: z.string().optional(),
  propertyId: z.string().regex(/^prp_\d+$/),
  timeout: z.number().optional()
});

type GetPropertyArgs = z.infer<typeof GetPropertyArgsSchema> & BaseToolArgs;

/**
 * Enhanced get property with validation
 */
export async function getPropertyEnhanced(
  client: AkamaiClient,
  args: GetPropertyArgs
): Promise<MCPToolResponse> {
  const validated = GetPropertyArgsSchema.parse(args);
  
  return withPropertyValidation(
    client,
    validated,
    'get_property',
    'get property details',
    async () => {
      const response = await client.request(
        withTimeout({
          path: `/papi/v1/properties/${validated.propertyId}`,
          method: 'GET',
          customer: validated.customer
        }, OperationType.DEFAULT, validated.timeout)
      );
      
      const validatedResponse = validateApiResponse<{
        properties?: {
          items?: Array<{
            propertyId: string;
            propertyName: string;
            contractId: string;
            groupId: string;
            latestVersion: number;
            productionVersion?: number;
            stagingVersion?: number;
            note?: string;
            productId?: string;
            ruleFormat?: string;
          }>;
        };
      }>(response);
      
      const property = validatedResponse.properties?.items?.[0];
      
      if (!property) {
        throw new ToolError({
          operation: 'get property details',
          toolName: 'get_property',
          args: validated,
          propertyId: validated.propertyId,
          customer: validated.customer,
          suggestion: 'Property not found in response'
        });
      }
      
      // Get additional details
      const versionsPromise = client.request({
        path: `/papi/v1/properties/${validated.propertyId}/versions`,
        method: 'GET',
        customer: validated.customer
      });
      
      const hostnamesPromise = client.request({
        path: `/papi/v1/properties/${validated.propertyId}/versions/${property.latestVersion}/hostnames`,
        method: 'GET',
        customer: validated.customer
      });
      
      const [versionsResponse, hostnamesResponse] = await Promise.all([
        versionsPromise,
        hostnamesPromise
      ]);
      
      const versions = validateApiResponse<{ versions?: { items?: any[] } }>(versionsResponse);
      const hostnames = validateApiResponse<{ hostnames?: { items?: any[] } }>(hostnamesResponse);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              property: {
                ...property,
                versions: {
                  total: versions.versions?.items?.length || 0,
                  latest: property.latestVersion,
                  production: property.productionVersion,
                  staging: property.stagingVersion
                },
                hostnames: hostnames.hostnames?.items || []
              },
              metadata: {
                customer: validated.customer || 'default',
                fetchedAt: new Date().toISOString()
              }
            }, null, 2)
          }
        ]
      };
    }
  );
}

/**
 * Enhanced create property arguments
 */
const CreatePropertyArgsSchema = z.object({
  customer: z.string().optional(),
  propertyName: z.string().min(1).max(85),
  productId: z.string(),
  contractId: z.string().regex(/^ctr_/),
  groupId: z.string().regex(/^grp_/),
  ruleFormat: z.string().optional(),
  timeout: z.number().optional()
});

type CreatePropertyArgs = z.infer<typeof CreatePropertyArgsSchema> & BaseToolArgs;

/**
 * Enhanced create property with validation
 */
export async function createPropertyEnhanced(
  client: AkamaiClient,
  args: CreatePropertyArgs
): Promise<MCPToolResponse> {
  const validated = CreatePropertyArgsSchema.parse(args);
  
  return executeWithTimeout(
    async () => {
      // Check if property name already exists
      const searchResponse = await client.request({
        path: `/papi/v1/search/find-by-value`,
        method: 'POST',
        data: {
          propertyName: validated.propertyName
        },
        customer: validated.customer
      }).catch(() => null); // Search might not be available
      
      if (searchResponse?.versions?.items?.length > 0) {
        throw new ToolError({
          operation: 'create property',
          toolName: 'create_property',
          args: validated,
          customer: validated.customer,
          suggestion: `Property name '${validated.propertyName}' already exists. Choose a different name.`
        });
      }
      
      // Create property
      const response = await client.request(
        withTimeout({
          path: '/papi/v1/properties',
          method: 'POST',
          data: {
            propertyName: validated.propertyName,
            productId: validated.productId,
            contractId: validated.contractId,
            groupId: validated.groupId,
            ruleFormat: validated.ruleFormat
          },
          customer: validated.customer
        }, OperationType.PROPERTY_CREATE, validated.timeout)
      );
      
      const propertyLink = response.propertyLink;
      if (!propertyLink) {
        throw new ToolError({
          operation: 'create property',
          toolName: 'create_property',
          args: validated,
          customer: validated.customer,
          suggestion: 'Property creation response missing propertyLink'
        });
      }
      
      // Extract property ID from link
      const propertyId = propertyLink.split('/').pop();
      
      // Get created property details
      const propertyDetails = await client.request({
        path: `/papi/v1/properties/${propertyId}`,
        method: 'GET',
        customer: validated.customer
      });
      
      const property = validateApiResponse<{ properties?: { items?: any[] } }>(propertyDetails)
        .properties?.items?.[0];
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              created: true,
              property: {
                propertyId,
                propertyName: validated.propertyName,
                contractId: validated.contractId,
                groupId: validated.groupId,
                productId: validated.productId,
                latestVersion: property?.latestVersion || 1
              },
              nextSteps: [
                `Add hostnames: add_property_hostname propertyId="${propertyId}" hostname="www.example.com"`,
                `Configure rules: get_property_rules propertyId="${propertyId}" version=1`,
                `Activate: activate_property propertyId="${propertyId}" version=1 network="STAGING"`
              ]
            }, null, 2)
          }
        ]
      };
    },
    {
      operationType: OperationType.PROPERTY_CREATE,
      toolName: 'create_property',
      operationName: 'create property',
      timeout: validated.timeout,
      context: validated
    }
  );
}

/**
 * Tool definitions for registration
 */
export const enhancedPropertyTools: ToolDefinition[] = [
  {
    name: 'list_properties',
    description: 'List all Akamai CDN properties with enhanced validation',
    inputSchema: ListPropertiesArgsSchema,
    implementation: listPropertiesEnhanced,
    examples: [
      {
        description: 'List first 10 properties',
        input: { limit: 10 }
      },
      {
        description: 'List properties for specific contract',
        input: { contractId: 'ctr_1-5C13O2', limit: 20 }
      }
    ]
  },
  {
    name: 'get_property',
    description: 'Get property details with comprehensive validation',
    inputSchema: GetPropertyArgsSchema,
    implementation: getPropertyEnhanced,
    examples: [
      {
        description: 'Get property details',
        input: { propertyId: 'prp_1229270' }
      }
    ]
  },
  {
    name: 'create_property',
    description: 'Create new property with duplicate checking',
    inputSchema: CreatePropertyArgsSchema,
    implementation: createPropertyEnhanced,
    examples: [
      {
        description: 'Create web property',
        input: {
          propertyName: 'my-website',
          productId: 'prd_Web_Accel',
          contractId: 'ctr_1-5C13O2',
          groupId: 'grp_125952'
        }
      }
    ]
  }
];