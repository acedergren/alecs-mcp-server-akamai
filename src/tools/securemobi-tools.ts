import { z } from 'zod';
import { SecuremobiClient } from '../securemobi-client';
import { MCPToolResponse } from '../types/mcp-protocol';
import { AkamaiClient } from '../akamai-client';



export const ListSecureMobiTenantsSchema = z.object({
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const CreateSecureMobiTenantSchema = z.object({
  name: z.string().min(1).describe('Name of the tenant to create'),
  description: z.string().optional().describe('Optional description for the tenant'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const GetSecureMobiTenantSchema = z.object({
  tenantId: z.string().min(1).describe('ID of the tenant to retrieve'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const UpdateSecureMobiTenantSchema = z.object({
  tenantId: z.string().min(1).describe('ID of the tenant to update'),
  name: z.string().optional().describe('New name for the tenant'),
  description: z.string().optional().describe('New description for the tenant'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const DeleteSecureMobiTenantSchema = z.object({
  tenantId: z.string().min(1).describe('ID of the tenant to delete'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

type ListTenantsParams = z.infer<typeof ListSecureMobiTenantsSchema>;
type CreateTenantParams = z.infer<typeof CreateSecureMobiTenantSchema>;
type GetTenantParams = z.infer<typeof GetSecureMobiTenantSchema>;
type UpdateTenantParams = z.infer<typeof UpdateSecureMobiTenantSchema>;
type DeleteTenantParams = z.infer<typeof DeleteSecureMobiTenantSchema>;

// TENANT TOOLS

export async function listTenants(_akamaiClient: AkamaiClient, params: ListTenantsParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const tenants = await client.listTenants(params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            tenants: tenants,
            count: tenants.length,
            scopeTenantId: params.scopeTenantId || null
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to list SecureMobi tenants: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function createTenant(_akamaiClient: AkamaiClient, params: CreateTenantParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const tenant = await client.createTenant({ name: params.name, description: params.description }, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            tenant: tenant,
            message: `Tenant '${tenant.name}' created successfully` 
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to create SecureMobi tenant: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function getTenant(_akamaiClient: AkamaiClient, params: GetTenantParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const tenant = await client.getTenant(params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            tenant: tenant 
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get SecureMobi tenant: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function updateTenant(_akamaiClient: AkamaiClient, params: UpdateTenantParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const update: any = {};
    if (params.name !== undefined) update.name = params.name;
    if (params.description !== undefined) update.description = params.description;
    
    const tenant = await client.updateTenant(params.tenantId, update, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            tenant: tenant,
            message: `Tenant '${tenant.name}' updated successfully`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to update SecureMobi tenant: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function deleteTenant(_akamaiClient: AkamaiClient, params: DeleteTenantParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    await client.deleteTenant(params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true,
            message: `Tenant '${params.tenantId}' deleted successfully`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to delete SecureMobi tenant: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

// CONFIGURATION SCHEMAS

export const GetTenantConfigurationSchema = z.object({
  tenantId: z.string().optional().describe('Tenant ID (uses current tenant if not provided)'),
  configType: z.enum(['system', 'custom']).optional().describe('Configuration type to retrieve'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const CreateTenantConfigurationSchema = z.object({
  tenantId: z.string().optional().describe('Tenant ID (uses current tenant if not provided)'),
  configuration: z.record(z.any()).describe('Configuration object'),
  configType: z.enum(['system', 'custom']).optional().describe('Configuration type'),
  description: z.string().optional().describe('Configuration description'),
  inheritFromParent: z.boolean().optional().describe('Whether to inherit from parent tenant'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const UpdateTenantConfigurationSchema = z.object({
  tenantId: z.string().optional().describe('Tenant ID (uses current tenant if not provided)'),
  configuration: z.record(z.any()).optional().describe('Configuration object'),
  merge: z.boolean().optional().describe('Whether to merge with existing configuration'),
  description: z.string().optional().describe('Configuration description'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

export const DeleteTenantConfigurationSchema = z.object({
  tenantId: z.string().optional().describe('Tenant ID (uses current tenant if not provided)'),
  configType: z.enum(['system', 'custom']).optional().describe('Configuration type to delete'),
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
  scopeTenantId: z.string().optional().describe('Optional tenant ID to scope the request via X-Tenant-Id header'),
});

// CONFIGURATION TOOL TYPES

type GetTenantConfigurationParams = z.infer<typeof GetTenantConfigurationSchema>;
type CreateTenantConfigurationParams = z.infer<typeof CreateTenantConfigurationSchema>;
type UpdateTenantConfigurationParams = z.infer<typeof UpdateTenantConfigurationSchema>;
type DeleteTenantConfigurationParams = z.infer<typeof DeleteTenantConfigurationSchema>;

// TENANT CONFIGURATION TOOLS

export async function getTenantConfiguration(_akamaiClient: AkamaiClient, params: GetTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const configuration = await client.getTenantConfiguration(params.tenantId, params.configType, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            tenantId: params.tenantId || 'current',
            configType: params.configType || 'all'
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get SecureMobi tenant configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function createTenantConfiguration(_akamaiClient: AkamaiClient, params: CreateTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const configData = {
      configuration: params.configuration,
      configType: params.configType,
      description: params.description,
      inheritFromParent: params.inheritFromParent
    };
    
    const configuration = await client.createTenantConfiguration(configData, params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            message: `Tenant configuration created successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to create SecureMobi tenant configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function updateTenantConfiguration(_akamaiClient: AkamaiClient, params: UpdateTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const updateData = {
      configuration: params.configuration,
      merge: params.merge,
      description: params.description
    };
    
    const configuration = await client.updateTenantConfiguration(updateData, params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            message: `Tenant configuration updated successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to update SecureMobi tenant configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function deleteTenantConfiguration(_akamaiClient: AkamaiClient, params: DeleteTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    await client.deleteTenantConfiguration(params.tenantId, params.configType, params.scopeTenantId);
    
    const typeInfo = params.configType ? ` (${params.configType} type)` : '';
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true,
            message: `Tenant configuration deleted successfully for ${params.tenantId || 'current tenant'}${typeInfo}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to delete SecureMobi tenant configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

// SYSTEM CONFIGURATION TOOLS

export async function getTenantSystemConfiguration(_akamaiClient: AkamaiClient, params: GetTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const configuration = await client.getTenantSystemConfiguration(params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            tenantId: params.tenantId || 'current',
            configType: 'system'
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get SecureMobi tenant system configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function createTenantSystemConfiguration(_akamaiClient: AkamaiClient, params: CreateTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const configData = {
      configuration: params.configuration,
      description: params.description,
      inheritFromParent: params.inheritFromParent
    };
    
    const configuration = await client.createTenantSystemConfiguration(configData, params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            message: `Tenant system configuration created successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to create SecureMobi tenant system configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function deleteTenantSystemConfiguration(_akamaiClient: AkamaiClient, params: DeleteTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    await client.deleteTenantSystemConfiguration(params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true,
            message: `Tenant system configuration deleted successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to delete SecureMobi tenant system configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

// CUSTOM CONFIGURATION TOOLS

export async function getTenantCustomConfiguration(_akamaiClient: AkamaiClient, params: GetTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const configuration = await client.getTenantCustomConfiguration(params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            tenantId: params.tenantId || 'current',
            configType: 'custom'
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to get SecureMobi tenant custom configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function createTenantCustomConfiguration(_akamaiClient: AkamaiClient, params: CreateTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const configData = {
      configuration: params.configuration,
      description: params.description,
      inheritFromParent: params.inheritFromParent
    };
    
    const configuration = await client.createTenantCustomConfiguration(configData, params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            message: `Tenant custom configuration created successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to create SecureMobi tenant custom configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function updateTenantCustomConfiguration(_akamaiClient: AkamaiClient, params: UpdateTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    const updateData = {
      configuration: params.configuration,
      merge: params.merge,
      description: params.description
    };
    
    const configuration = await client.updateTenantCustomConfiguration(updateData, params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            configuration,
            message: `Tenant custom configuration updated successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to update SecureMobi tenant custom configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

export async function deleteTenantCustomConfiguration(_akamaiClient: AkamaiClient, params: DeleteTenantConfigurationParams): Promise<MCPToolResponse> {
  try {
    const clientId = process.env['SECUREMOBI_CLIENT_ID'];
    const clientSecret = process.env['SECUREMOBI_CLIENT_SECRET'];
    
    if (!clientId || !clientSecret) {
      return {
        content: [
          {
            type: 'text' as const,
            text: 'SecureMobi credentials not configured. Please set SECUREMOBI_CLIENT_ID and SECUREMOBI_CLIENT_SECRET environment variables.'
          }
        ],
        isError: true
      };
    }

    const client = new SecuremobiClient(clientId, clientSecret);
    await client.deleteTenantCustomConfiguration(params.tenantId, params.scopeTenantId);
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true,
            message: `Tenant custom configuration deleted successfully for ${params.tenantId || 'current tenant'}`
          }, null, 2)
        }
      ],
      isError: false
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Failed to delete SecureMobi tenant custom configuration: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
} 