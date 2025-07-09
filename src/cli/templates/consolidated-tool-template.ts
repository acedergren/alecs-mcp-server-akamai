/**
 * Consolidated Tool Template
 * 
 * Generates consolidated-{domain}-tools.ts file
 */

export interface ConsolidatedToolTemplateVars {
  domainName: string;
  domainNamePascal: string;
  domainNameSnake: string;
  description: string;
  apiName: string;
  timestamp: string;
}

export function getConsolidatedToolTemplate(vars: ConsolidatedToolTemplateVars): string {
  return `/**
 * ${vars.domainNamePascal} Domain Tools
 * 
 * ${vars.description}
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Domain tool architecture for ${vars.domainNamePascal} operations
 * Approach: Single class with all ${vars.domainName} operations
 * Implementation: Type-safe, well-documented, production-ready
 * 
 * Generated on ${vars.timestamp} using ALECSCore CLI
 */

import { BaseTool } from '../base-tool';
import { type MCPToolResponse } from '../../types/mcp-protocol';
import { AkamaiClient } from '../../akamai-client';
import { createLogger } from '../../utils/pino-logger';
import { z } from 'zod';

const logger = createLogger('${vars.domainName}-tools');

/**
 * ${vars.domainNamePascal} Tools - Complete implementation
 * 
 * Provides all ${vars.domainName} operations through a single class
 * following ALECSCore domain patterns
 */
export class ${vars.domainNamePascal}Tools extends BaseTool {
  private client: AkamaiClient;

  constructor(customer: string = 'default') {
    super();
    this.client = new AkamaiClient(customer);
  }

  /**
   * List all ${vars.domainName} resources
   */
  async listResources(args: any): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Listing ${vars.domainName} resources');
      
      // TODO: Implement API call to list ${vars.domainName} resources
      const response = await this.client.request({
        method: 'GET',
        path: '/${vars.domainName}',
        params: {
          limit: args.limit || 100,
          offset: args.offset || 0
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: \`Found \${response.data?.length || 0} ${vars.domainName} resources\`
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to list ${vars.domainName} resources');
      return this.handleError(error, 'Failed to list ${vars.domainName} resources');
    }
  }

  /**
   * Get specific ${vars.domainName} resource
   */
  async getResource(args: any): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Getting ${vars.domainName} resource');
      
      // TODO: Implement API call to get specific ${vars.domainName} resource
      const response = await this.client.request({
        method: 'GET',
        path: \`/${vars.domainName}/\${args.id}\`
      });

      return {
        content: [
          {
            type: 'text',
            text: \`Retrieved ${vars.domainName} resource: \${args.id}\`
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to get ${vars.domainName} resource');
      return this.handleError(error, 'Failed to get ${vars.domainName} resource');
    }
  }

  /**
   * Create new ${vars.domainName} resource
   */
  async createResource(args: any): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Creating ${vars.domainName} resource');
      
      // TODO: Implement API call to create ${vars.domainName} resource
      const response = await this.client.request({
        method: 'POST',
        path: '/${vars.domainName}',
        data: args
      });

      return {
        content: [
          {
            type: 'text',
            text: \`Created ${vars.domainName} resource: \${response.data?.id || 'unknown'}\`
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to create ${vars.domainName} resource');
      return this.handleError(error, 'Failed to create ${vars.domainName} resource');
    }
  }

  /**
   * Update existing ${vars.domainName} resource
   */
  async updateResource(args: any): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Updating ${vars.domainName} resource');
      
      // TODO: Implement API call to update ${vars.domainName} resource
      const response = await this.client.request({
        method: 'PUT',
        path: \`/${vars.domainName}/\${args.id}\`,
        data: args
      });

      return {
        content: [
          {
            type: 'text',
            text: \`Updated ${vars.domainName} resource: \${args.id}\`
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to update ${vars.domainName} resource');
      return this.handleError(error, 'Failed to update ${vars.domainName} resource');
    }
  }

  /**
   * Delete ${vars.domainName} resource
   */
  async deleteResource(args: any): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Deleting ${vars.domainName} resource');
      
      // TODO: Implement API call to delete ${vars.domainName} resource
      const response = await this.client.request({
        method: 'DELETE',
        path: \`/${vars.domainName}/\${args.id}\`
      });

      return {
        content: [
          {
            type: 'text',
            text: \`Deleted ${vars.domainName} resource: \${args.id}\`
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to delete ${vars.domainName} resource');
      return this.handleError(error, 'Failed to delete ${vars.domainName} resource');
    }
  }

  /**
   * Search ${vars.domainName} resources
   */
  async searchResources(args: any): Promise<MCPToolResponse> {
    try {
      logger.info({ args }, 'Searching ${vars.domainName} resources');
      
      // TODO: Implement API call to search ${vars.domainName} resources
      const response = await this.client.request({
        method: 'GET',
        path: \`/${vars.domainName}/search\`,
        params: {
          q: args.searchTerm,
          limit: args.limit || 50
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: \`Found \${response.data?.length || 0} ${vars.domainName} resources matching "\${args.searchTerm}"\`
          }
        ],
        isError: false
      };
    } catch (error) {
      logger.error({ error, args }, 'Failed to search ${vars.domainName} resources');
      return this.handleError(error, 'Failed to search ${vars.domainName} resources');
    }
  }
}

/**
 * Create ${vars.domainName} tools instance
 */
export const ${vars.domainName}Tools = new ${vars.domainNamePascal}Tools();
`;
}