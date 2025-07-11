/**
 * Tool Template
 * 
 * Generates domain tools using the standard BaseTool.execute pattern
 */

export interface ToolTemplateVars {
  domainName: string;
  domainNamePascal: string;
  domainNameSnake: string;
  description: string;
  apiName: string;
  timestamp: string;
}

export function getToolTemplate(vars: ToolTemplateVars): string {
  return `/**
 * ${vars.domainNamePascal} Domain Tools
 * 
 * ${vars.description}
 * Using the standard BaseTool pattern for:
 * - Dynamic customer support
 * - Built-in caching
 * - Automatic hint integration
 * - Progress tracking
 * - Enhanced error messages
 * 
 * Generated on ${vars.timestamp} using ALECSCore CLI
 */

import { type MCPToolResponse, BaseTool } from '../common';
import { 
  ${vars.domainNamePascal}Endpoints, 
  ${vars.domainNamePascal}ToolSchemas,
  format${vars.domainNamePascal}List,
  format${vars.domainNamePascal}Details
} from './${vars.domainName}-api-implementation';
import type { z } from 'zod';

/**
 * List all ${vars.domainName} resources
 */
async function list${vars.domainNamePascal}(args: z.infer<typeof ${vars.domainNamePascal}ToolSchemas.list>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${vars.domainName}',
    '${vars.domainNameSnake}_list',
    args,
    async (client) => {
      const queryParams: any = {};
      
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      
      return client.request({
        method: 'GET',
        path: ${vars.domainNamePascal}Endpoints.list${vars.domainNamePascal}(),
        queryParams
      });
    },
    {
      format: args.format || 'text',
      formatter: format${vars.domainNamePascal}List,
      cacheKey: (p) => \`${vars.domainName}:list:\${p.offset || 0}\`,
      cacheTtl: 300 // 5 minutes
    }
  );
}

/**
 * Get ${vars.domainName} details
 */
async function get${vars.domainNamePascal}(args: z.infer<typeof ${vars.domainNamePascal}ToolSchemas.get>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${vars.domainName}',
    '${vars.domainNameSnake}_get',
    args,
    async (client) => {
      return client.request({
        method: 'GET',
        path: ${vars.domainNamePascal}Endpoints.get${vars.domainNamePascal}(args.id)
      });
    },
    {
      format: 'text',
      formatter: format${vars.domainNamePascal}Details,
      cacheKey: (p) => \`${vars.domainName}:\${p.id}\`,
      cacheTtl: 300
    }
  );
}

/**
 * Create a new ${vars.domainName}
 */
async function create${vars.domainNamePascal}(args: z.infer<typeof ${vars.domainNamePascal}ToolSchemas.create>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${vars.domainName}',
    '${vars.domainNameSnake}_create',
    args,
    async (client) => {
      const body = {
        name: args.name,
        description: args.description
        // Add more fields as needed
      };
      
      const response = await client.request({
        method: 'POST',
        path: ${vars.domainNamePascal}Endpoints.create${vars.domainNamePascal}(),
        body
      });
      
      return response;
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = \`✅ **${vars.domainNamePascal} Created Successfully!**\\n\\n\`;
        text += \`**Name:** \${data.name}\\n\`;
        text += \`**ID:** \${data.id}\\n\`;
        text += \`\\n🎯 **Next Steps:**\\n\`;
        text += \`1. Configure ${vars.domainName} settings\\n\`;
        text += \`2. Test ${vars.domainName} functionality\\n\`;
        
        return text;
      }
    }
  );
}

/**
 * Update ${vars.domainName}
 */
async function update${vars.domainNamePascal}(args: z.infer<typeof ${vars.domainNamePascal}ToolSchemas.update>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${vars.domainName}',
    '${vars.domainNameSnake}_update',
    args,
    async (client) => {
      const body: any = {};
      
      if (args.name) body.name = args.name;
      if (args.description) body.description = args.description;
      
      await client.request({
        method: 'PUT',
        path: ${vars.domainNamePascal}Endpoints.update${vars.domainNamePascal}(args.id),
        body
      });
      
      return { id: args.id, ...body };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = \`📝 **${vars.domainNamePascal} Updated**\\n\\n\`;
        text += \`**ID:** \${data.id}\\n\`;
        if (data.name) text += \`**Name:** \${data.name}\\n\`;
        text += \`\\n✅ Update completed successfully!\`;
        
        return text;
      }
    }
  );
}

/**
 * Delete ${vars.domainName}
 */
async function delete${vars.domainNamePascal}(args: z.infer<typeof ${vars.domainNamePascal}ToolSchemas.delete>): Promise<MCPToolResponse> {
  return BaseTool.execute(
    '${vars.domainName}',
    '${vars.domainNameSnake}_delete',
    args,
    async (client) => {
      await client.request({
        method: 'DELETE',
        path: ${vars.domainNamePascal}Endpoints.delete${vars.domainNamePascal}(args.id)
      });
      
      return { id: args.id };
    },
    {
      format: 'text',
      formatter: (data) => {
        let text = \`🗑️ **${vars.domainNamePascal} Deleted**\\n\\n\`;
        text += \`**ID:** \${data.id}\\n\`;
        text += \`\\n✅ Deletion completed successfully!\`;
        
        return text;
      }
    }
  );
}

/**
 * ${vars.domainNamePascal} Tools Class - for backward compatibility
 */
export class ${vars.domainNamePascal}Tools {
  async list${vars.domainNamePascal}(args: any): Promise<MCPToolResponse> {
    return list${vars.domainNamePascal}(args);
  }
  
  async get${vars.domainNamePascal}(args: any): Promise<MCPToolResponse> {
    return get${vars.domainNamePascal}(args);
  }
  
  async create${vars.domainNamePascal}(args: any): Promise<MCPToolResponse> {
    return create${vars.domainNamePascal}(args);
  }
  
  async update${vars.domainNamePascal}(args: any): Promise<MCPToolResponse> {
    return update${vars.domainNamePascal}(args);
  }
  
  async delete${vars.domainNamePascal}(args: any): Promise<MCPToolResponse> {
    return delete${vars.domainNamePascal}(args);
  }
}

/**
 * Export instance for backward compatibility
 */
export const ${vars.domainName}Tools = new ${vars.domainNamePascal}Tools();

/**
 * Export individual functions for direct use
 */
export {
  list${vars.domainNamePascal},
  get${vars.domainNamePascal},
  create${vars.domainNamePascal},
  update${vars.domainNamePascal},
  delete${vars.domainNamePascal}
};`
}

export function getApiImplementationTemplate(vars: ToolTemplateVars): string {
  return `/**
 * ${vars.domainNamePascal} API Implementation Details
 * 
 * Contains endpoints, schemas, and formatters for ${vars.domainName} tools
 */

import { z } from 'zod';

/**
 * ${vars.domainNamePascal} API Endpoints
 */
export const ${vars.domainNamePascal}Endpoints = {
  list${vars.domainNamePascal}: () => '/${vars.apiName}/${vars.domainName}',
  get${vars.domainNamePascal}: (id: string) => \`/${vars.apiName}/${vars.domainName}/\${id}\`,
  create${vars.domainNamePascal}: () => '/${vars.apiName}/${vars.domainName}',
  update${vars.domainNamePascal}: (id: string) => \`/${vars.apiName}/${vars.domainName}/\${id}\`,
  delete${vars.domainNamePascal}: (id: string) => \`/${vars.apiName}/${vars.domainName}/\${id}\`
};

/**
 * ${vars.domainNamePascal} Tool Schemas
 */
export const ${vars.domainNamePascal}ToolSchemas = {
  list: z.object({
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional(),
    customer: z.string().optional(),
    format: z.enum(['json', 'text']).optional()
  }),
  
  get: z.object({
    id: z.string(),
    customer: z.string().optional()
  }),
  
  create: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    customer: z.string().optional()
  }),
  
  update: z.object({
    id: z.string(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    customer: z.string().optional()
  }),
  
  delete: z.object({
    id: z.string(),
    confirm: z.boolean().describe('Confirm deletion'),
    customer: z.string().optional()
  })
};

/**
 * Format ${vars.domainName} list response
 */
export function format${vars.domainNamePascal}List(response: any): string {
  const items = response.items || [];
  
  let text = \`📋 **${vars.domainNamePascal} List**\\n\\n\`;
  
  if (items.length === 0) {
    text += '⚠️ No ${vars.domainName} resources found.\\n';
    return text;
  }
  
  text += \`Found **\${items.length}** ${vars.domainName} resources:\\n\\n\`;
  
  items.slice(0, 20).forEach((item: any, index: number) => {
    text += \`\${index + 1}. **\${item.name}**\\n\`;
    text += \`   • ID: \${item.id}\\n\`;
    if (item.description) {
      text += \`   • Description: \${item.description}\\n\`;
    }
    text += \`\\n\`;
  });
  
  if (items.length > 20) {
    text += \`_... and \${items.length - 20} more ${vars.domainName} resources_\\n\`;
  }
  
  return text;
}

/**
 * Format ${vars.domainName} details response
 */
export function format${vars.domainNamePascal}Details(response: any): string {
  const item = response;
  
  let text = \`📄 **${vars.domainNamePascal} Details**\\n\\n\`;
  text += \`**Name:** \${item.name}\\n\`;
  text += \`**ID:** \${item.id}\\n\`;
  
  if (item.description) {
    text += \`**Description:** \${item.description}\\n\`;
  }
  
  if (item.createdAt) {
    text += \`**Created:** \${new Date(item.createdAt).toLocaleDateString()}\\n\`;
  }
  
  if (item.updatedAt) {
    text += \`**Updated:** \${new Date(item.updatedAt).toLocaleDateString()}\\n\`;
  }
  
  return text;
}`
}