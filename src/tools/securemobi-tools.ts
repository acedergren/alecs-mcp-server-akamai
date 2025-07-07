import { z } from 'zod';
import { SecuremobiClient } from '../securemobi-client';
import { MCPToolResponse } from '../types/mcp-protocol';
import { AkamaiClient } from '../akamai-client';

// Zod schemas for SecureMobi tool parameters
export const ListSecureMobiZonesSchema = z.object({
  customer: z.string().optional().describe('Customer context for multi-tenant support'),
});

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

// Type definitions derived from schemas
type ListZonesParams = z.infer<typeof ListSecureMobiZonesSchema>;
type ListTenantsParams = z.infer<typeof ListSecureMobiTenantsSchema>;
type CreateTenantParams = z.infer<typeof CreateSecureMobiTenantSchema>;
type GetTenantParams = z.infer<typeof GetSecureMobiTenantSchema>;
type UpdateTenantParams = z.infer<typeof UpdateSecureMobiTenantSchema>;
type DeleteTenantParams = z.infer<typeof DeleteSecureMobiTenantSchema>;

/**
 * Lists all DNS zones from Securemobi.
 * @param akamaiClient AkamaiClient instance (for customer context)
 * @param params Parameters for listing zones.
 */
export async function listZones(_akamaiClient: AkamaiClient, _params: ListZonesParams): Promise<MCPToolResponse> {
  try {
    // Get SecureMobi credentials from environment or customer config
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
    const zones = await client.listZones();
    
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ 
            success: true, 
            zones: zones,
            count: zones.length 
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
          text: `Failed to list SecureMobi zones: ${error instanceof Error ? error.message : 'An unknown error occurred'}`
        }
      ],
      isError: true
    };
  }
}

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

// Add other tool functions here, e.g., createZone, deleteZone... 