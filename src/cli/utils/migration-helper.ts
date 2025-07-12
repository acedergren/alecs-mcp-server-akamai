/**
 * Migration Helper for Converting Legacy Tool Patterns
 * 
 * Automates migration from class-based and function-based tools
 * to CLI-compatible tool object pattern
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger';

export interface MigrationConfig {
  domainPath: string;
  domainName: string;
  dryRun?: boolean;
  backupOriginal?: boolean;
}

/**
 * Migrate class-based tools to CLI pattern
 */
export async function migrateClassBasedTools(config: MigrationConfig): Promise<void> {
  const { domainPath, domainName, dryRun = false, backupOriginal = true } = config;
  
  logger.info(`Migrating class-based tools for domain: ${domainName}`);
  
  // Find consolidated tools file
  const consolidatedFile = join(domainPath, `consolidated-${domainName}-tools.ts`);
  
  try {
    const content = await fs.readFile(consolidatedFile, 'utf8');
    
    // Extract class methods and convert to tool objects
    const toolDefinitions = extractClassMethods(content, domainName);
    
    // Generate new index.ts content
    const newIndexContent = generateIndexFromToolDefinitions(toolDefinitions, domainName);
    
    if (dryRun) {
      console.log('\n📄 Generated index.ts content:');
      console.log('─'.repeat(50));
      console.log(newIndexContent);
      return;
    }
    
    // Backup original if requested
    if (backupOriginal) {
      const backupPath = `${consolidatedFile}.backup-${Date.now()}`;
      await fs.copyFile(consolidatedFile, backupPath);
      logger.info(`Backed up original to: ${backupPath}`);
    }
    
    // Write new index.ts
    const indexPath = join(domainPath, 'index.ts');
    await fs.writeFile(indexPath, newIndexContent, 'utf8');
    
    logger.info(`Migration completed for ${domainName}`);
    
  } catch (error) {
    logger.error(`Migration failed for ${domainName}:`, error instanceof Error ? { message: error.message, stack: error.stack } : { error: String(error) });
    throw error;
  }
}

/**
 * Extract class methods and convert to tool definitions
 */
function extractClassMethods(content: string, domainName: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  
  // Regex to find async methods in class
  const methodRegex = /async\s+(\w+)\s*\([^)]*\):\s*Promise<MCPToolResponse>\s*\{([\s\S]*?)(?=\n\s*(?:async\s+\w+|}\s*$))/g;
  
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const [, methodName, methodBody] = match;
    
    // Skip constructor and private methods
    if (!methodName || methodName === 'constructor' || methodName.startsWith('_')) {
      continue;
    }
    
    // Convert camelCase to snake_case for tool name
    const toolName = `${domainName}_${camelToSnake(methodName)}`;
    
    // Extract description from JSDoc if available
    const description = extractMethodDescription(content, methodName) || 
                       `${methodName} operation for ${domainName}`;
    
    tools.push({
      name: toolName,
      description,
      methodName: methodName || '',
      body: methodBody?.trim() || ''
    });
  }
  
  return tools;
}

/**
 * Generate new index.ts content from tool definitions
 */
function generateIndexFromToolDefinitions(tools: ToolDefinition[], domainName: string): string {
  const pascalDomain = toPascalCase(domainName);
  
  return `/**
 * ${pascalDomain} Domain Tools Export
 * 
 * Migrated from class-based tools to CLI-compatible pattern
 * Generated on ${new Date().toISOString()}
 */

import { z } from 'zod';
import { type MCPToolResponse, AkamaiOperation } from '../common';
import { 
  ${pascalDomain}Endpoints, 
  ${pascalDomain}ToolSchemas 
} from './${domainName}-api-implementation';

/**
 * ${pascalDomain} tool definitions for ALECSCore registration
 */
export const ${domainName}Tools = {
${tools.map(tool => generateToolDefinition(tool, domainName)).join(',\n\n')}
};

/**
 * Export individual tool functions for direct use
 */
${tools.map(tool => generateToolFunction(tool, domainName)).join('\n\n')}

/**
 * ${pascalDomain} domain metadata
 */
export const ${domainName}DomainMetadata = {
  name: '${domainName}',
  description: '${pascalDomain} domain tools',
  toolCount: ${tools.length},
  features: [
    'Dynamic customer support',
    'Built-in caching',
    'Enhanced error handling',
    'Progress tracking'
  ]
};
`;
}

/**
 * Generate tool definition object
 */
function generateToolDefinition(tool: ToolDefinition, domainName: string): string {
  return `  // ${tool.description}
  '${tool.name}': {
    description: '${tool.description}',
    inputSchema: ${toPascalCase(domainName)}ToolSchemas.${camelToSnake(tool.methodName)},
    handler: async (client: AkamaiClient, args: any): Promise<MCPToolResponse> => 
      ${camelToSnake(tool.methodName)}(args)
  }`;
}

/**
 * Generate standalone tool function
 */
function generateToolFunction(tool: ToolDefinition, domainName: string): string {
  const functionName = camelToSnake(tool.methodName);
  
  return `/**
 * ${tool.description}
 */
async function ${functionName}(args: any): Promise<MCPToolResponse> {
  return AkamaiOperation.execute(
    '${domainName}',
    '${tool.name}',
    args,
    async (client) => {
      ${tool.body.replace(/this\./g, '')} // Remove 'this.' references
    },
    {
      format: args.format || 'text',
      cacheKey: (p) => \`${domainName}:${functionName}:\${JSON.stringify(p)}\`,
      cacheTtl: 300
    }
  );
}`;
}

/**
 * Extract method description from JSDoc comment
 */
function extractMethodDescription(content: string, methodName: string): string | null {
  const jsdocRegex = new RegExp(`/\\*\\*([\\s\\S]*?)\\*/\\s*async\\s+${methodName}`, 'g');
  const match = jsdocRegex.exec(content);
  
  if (!match) return null;
  
  const jsdocContent = match[1];
  const descriptionMatch = jsdocContent?.match(/\*\s*(.+?)(?:\n|\*\/)/);
  
  return descriptionMatch?.[1]?.trim() || null;
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

interface ToolDefinition {
  name: string;
  description: string;
  methodName: string;
  body: string;
}

/**
 * CLI command to run migration
 */
export async function runMigrationCommand(domainName: string, options: { dryRun?: boolean } = {}): Promise<void> {
  const domainPath = join(process.cwd(), 'src', 'tools', domainName);
  
  // Check if domain exists
  try {
    await fs.access(domainPath);
  } catch (error) {
    throw new Error(`Domain '${domainName}' not found at ${domainPath}`);
  }
  
  // Check if consolidated file exists
  const consolidatedFile = join(domainPath, `consolidated-${domainName}-tools.ts`);
  try {
    await fs.access(consolidatedFile);
  } catch (error) {
    throw new Error(`No consolidated tools file found for domain '${domainName}'`);
  }
  
  await migrateClassBasedTools({
    domainPath,
    domainName,
    dryRun: options.dryRun,
    backupOriginal: true
  });
  
  console.log(`\n✅ Migration completed for domain '${domainName}'`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Review generated index.ts file`);
  console.log(`   2. Update API schemas in ${domainName}-api-implementation.ts`);
  console.log(`   3. Test tools: npm test`);
  console.log(`   4. Remove consolidated file if satisfied with migration`);
}