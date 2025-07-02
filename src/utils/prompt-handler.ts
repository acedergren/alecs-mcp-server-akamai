/**
 * Prompt Handler for MCP Servers
 * Adds prompts/list and prompts/get support to eliminate "Method not found" errors
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListPromptsResultSchema,
  GetPromptResultSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from './pino-logger';
import { akamaiPrompts } from '../prompts/akamai-prompts';

const logger = createLogger('prompt-handler');

export interface PromptDefinition {
  title: string;
  description: string;
  argsSchema?: any;
  handler: (args: any) => {
    messages: Array<{
      role: 'user' | 'assistant';
      content: {
        type: 'text' | 'image';
        text?: string;
        data?: string;
        mimeType?: string;
      };
    }>;
  };
}

/**
 * Add prompt support to an MCP server
 */
export function addPromptSupport(server: Server, prompts: Record<string, PromptDefinition> = akamaiPrompts) {
  logger.info(`Adding prompt support with ${Object.keys(prompts).length} prompts`);

  // Handler for prompts/list
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Handling prompts/list request');
    
    const promptList = Object.entries(prompts).map(([name, definition]) => ({
      name,
      description: definition.description,
      arguments: definition.argsSchema ? [
        {
          name: 'arguments',
          description: 'Prompt arguments',
          required: true
        }
      ] : undefined
    }));

    logger.info(`Returning ${promptList.length} prompts`);
    return { prompts: promptList };
  });

  // Handler for prompts/get
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.debug(`Handling prompts/get for: ${name}`);

    const prompt = prompts[name];
    if (!prompt) {
      throw new Error(`Unknown prompt: ${name}`);
    }

    try {
      // Validate arguments if schema exists
      if (prompt.argsSchema && args) {
        prompt.argsSchema.parse(args);
      }

      // Execute the prompt handler
      const result = prompt.handler(args || {});
      
      logger.info(`Successfully generated prompt response for: ${name}`);
      return {
        description: prompt.description,
        messages: result.messages
      };
    } catch (error) {
      logger.error(`Error generating prompt ${name}:`, error);
      throw error;
    }
  });

  // Update server capabilities to advertise prompt support
  if (server.capabilities) {
    server.capabilities.prompts = {
      listChanged: false // We don't support dynamic prompt updates yet
    };
    logger.info('Updated server capabilities to advertise prompt support');
  }
}

/**
 * Create a simple prompt that returns a fixed message
 */
export function createSimplePrompt(
  title: string,
  description: string,
  messageText: string
): PromptDefinition {
  return {
    title,
    description,
    handler: () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: messageText
        }
      }]
    })
  };
}

/**
 * Create a no-op prompt handler that prevents "Method not found" errors
 * This is a minimal implementation for servers that don't need prompts
 */
export function addNoOpPromptSupport(server: Server) {
  logger.info('Adding no-op prompt support to prevent errors');

  // Return empty prompt list
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    logger.debug('Returning empty prompt list');
    return { prompts: [] };
  });

  // Return error for any prompt request
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    logger.warn(`Prompt requested but not implemented: ${name}`);
    throw new Error(`No prompts available. This server only provides tools.`);
  });

  // Update capabilities
  if (server.capabilities) {
    server.capabilities.prompts = {
      listChanged: false
    };
  }
}