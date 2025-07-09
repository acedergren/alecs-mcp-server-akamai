/**
 * Tool Generator
 * 
 * Generates individual tools within existing domains
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../../utils/pino-logger';
import { validateToolName, toSnakeCase, toPascalCase } from '../utils/naming';
import { getToolTemplate } from '../templates/tool-template';

const logger = createLogger('tool-generator');

export interface ToolGeneratorOptions {
  description?: string;
  method?: string;
  endpoint?: string;
  dryRun?: boolean;
}

export async function generateTool(domain: string, name: string, options: ToolGeneratorOptions = {}): Promise<void> {
  // Validate inputs
  validateToolName(name);
  
  const domainPath = join(process.cwd(), 'src', 'tools', domain);
  const toolName = name.toLowerCase();
  const toolNameSnake = toSnakeCase(`${domain}_${toolName}`);
  
  logger.info({ domain, toolName, toolNameSnake }, 'Generating tool');
  
  // Check if domain exists
  try {
    await fs.access(domainPath);
  } catch (error) {
    throw new Error(`Domain '${domain}' does not exist. Create it first with: alecs generate domain ${domain}`);
  }
  
  // Prepare template variables
  const templateVars = {
    domain,
    domainPascal: toPascalCase(domain),
    toolName,
    toolNamePascal: toPascalCase(toolName),
    toolNameSnake,
    description: options.description || `${toPascalCase(toolName)} operation for ${domain}`,
    method: options.method || 'GET',
    endpoint: options.endpoint || `/${domain}/${toolName}`,
    timestamp: new Date().toISOString(),
  };
  
  // Generate tool code
  const toolCode = getToolTemplate(templateVars);
  
  if (options.dryRun) {
    logger.info('DRY RUN - Tool code that would be added:');
    console.log('\n📄 Tool Definition:');
    console.log('─'.repeat(50));
    console.log(toolCode);
    return;
  }
  
  // Read existing index.ts
  const indexPath = join(domainPath, 'index.ts');
  let indexContent = await fs.readFile(indexPath, 'utf8');
  
  // Check if tool already exists
  if (indexContent.includes(`'${toolNameSnake}':`)) {
    throw new Error(`Tool '${toolNameSnake}' already exists in domain '${domain}'`);
  }
  
  // Add tool to index.ts - find the closing brace and add before it
  const toolsObjectRegex = /export const \w+Tools = \{([\s\S]*?)(\n\s*\/\/ TODO: Add more tools here[\s\S]*?\n\s*}\;)/;
  const match = indexContent.match(toolsObjectRegex);
  
  if (!match) {
    throw new Error(`Could not find tools object in ${indexPath}`);
  }
  
  const toolsContent = match[1];
  const closingPart = match[2];
  if (!toolsContent) {
    throw new Error(`Could not extract tools content from ${indexPath}`);
  }
  const newToolsContent = toolsContent.trimEnd() + ',\n\n' + toolCode;
  
  indexContent = indexContent.replace(
    toolsObjectRegex,
    `export const ${domain}Tools = {${newToolsContent}${closingPart}`
  );
  
  // Write updated index.ts
  await fs.writeFile(indexPath, indexContent, 'utf8');
  logger.info({ path: indexPath }, 'Updated index.ts');
  
  // Update domain tools file
  await updateDomainTools(domain, toolName, templateVars);
  
  logger.info({ domain, toolName }, 'Tool generated successfully');
  
  // Show next steps
  console.log(`\n✅ Tool '${toolNameSnake}' generated successfully!`);
  console.log(`\n📂 Files updated:`);
  console.log(`   ${indexPath}`);
  console.log(`   ${join(domainPath, `${domain}-tools.ts`)}`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Implement the tool handler in ${domain}-tools.ts`);
  console.log(`   2. Add API endpoint implementation`);
  console.log(`   3. Test the tool: npm test`);
  console.log(`   4. Build server: npm run build`);
}

async function updateDomainTools(domain: string, toolName: string, templateVars: any): Promise<void> {
  const domainToolsPath = join(process.cwd(), 'src', 'tools', domain, `${domain}-tools.ts`);
  
  try {
    let domainToolsContent = await fs.readFile(domainToolsPath, 'utf8');
    
    // Add method signature to class
    const methodSignature = `
  /**
   * ${templateVars.description}
   */
  async ${toolName}(args: any): Promise<MCPToolResponse> {
    // TODO: Implement ${toolName} logic
    return {
      content: [
        {
          type: 'text',
          text: 'Tool ${toolName} not yet implemented'
        }
      ],
      isError: false
    };
  }`;
    
    // Find the class and add method before the closing brace
    const classRegex = /class \w+Tools[^{]*\{([\s\S]*)\n\s*\}(\s*export)/;
    const classMatch = domainToolsContent.match(classRegex);
    
    if (classMatch) {
      const classContent = classMatch[1];
      const newClassContent = classContent + methodSignature;
      
      domainToolsContent = domainToolsContent.replace(
        classRegex,
        `class ${toPascalCase(domain)}Tools {${newClassContent}\n}$2`
      );
      
      await fs.writeFile(domainToolsPath, domainToolsContent, 'utf8');
      logger.info({ path: domainToolsPath }, 'Updated domain tools file');
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to update domain tools file - you may need to update it manually');
  }
}