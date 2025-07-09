/**
 * Tool Template
 * 
 * Generates individual tool definitions
 */

export interface ToolTemplateVars {
  domain: string;
  domainPascal: string;
  toolName: string;
  toolNamePascal: string;
  toolNameSnake: string;
  description: string;
  method: string;
  endpoint: string;
  timestamp: string;
}

export function getToolTemplate(vars: ToolTemplateVars): string {
  const schemaFields = getSchemaFields(vars.method);
  const handlerMethod = getHandlerMethod(vars.toolName);
  
  return `  // ${vars.toolNamePascal} operation
  '${vars.toolNameSnake}': {
    description: '${vars.description}',
    inputSchema: z.object({${schemaFields}
      customer: z.string().optional()
    }),
    handler: async (_client: any, args: any): Promise<MCPToolResponse> => 
      consolidated${vars.domainPascal}Tools.${handlerMethod}(args)
  }`;
}

function getSchemaFields(method: string): string {
  switch (method.toLowerCase()) {
    case 'get':
      return `
      id: z.string(),`;
    case 'post':
      return `
      name: z.string(),
      description: z.string().optional(),`;
    case 'put':
      return `
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),`;
    case 'delete':
      return `
      id: z.string(),
      confirm: z.boolean().describe('Confirm deletion'),`;
    default:
      return `
      searchTerm: z.string().optional(),
      limit: z.number().optional(),`;
  }
}

function getHandlerMethod(toolName: string): string {
  // Map tool names to handler methods
  const methodMap: Record<string, string> = {
    'list': 'listResources',
    'get': 'getResource',
    'create': 'createResource',
    'update': 'updateResource',
    'delete': 'deleteResource',
    'search': 'searchResources'
  };
  
  return methodMap[toolName] || `${toolName}Operation`;
}