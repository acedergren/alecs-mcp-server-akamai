/**
 * Domain Generator
 * 
 * Generates complete domain boilerplate following ALECSCore patterns
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../../utils/pino-logger';
import { validateDomainName, toPascalCase, toSnakeCase } from '../utils/naming';
import { getDomainTemplate } from '../templates/domain-template';
import { getConsolidatedToolTemplate } from '../templates/consolidated-tool-template';
import { getIndexTemplate } from '../templates/index-template';

const logger = createLogger('domain-generator');

export interface DomainGeneratorOptions {
  description?: string;
  api?: string;
  dryRun?: boolean;
}

export async function generateDomain(name: string, options: DomainGeneratorOptions = {}): Promise<void> {
  // Validate domain name
  validateDomainName(name);
  
  const domainName = name.toLowerCase();
  const domainPath = join(process.cwd(), 'src', 'tools', domainName);
  
  logger.info({ domainName, domainPath }, 'Generating domain');
  
  // Check if domain already exists
  try {
    await fs.access(domainPath);
    throw new Error(`Domain '${domainName}' already exists at ${domainPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
  
  // Prepare template variables
  const templateVars = {
    domainName,
    domainNamePascal: toPascalCase(domainName),
    domainNameSnake: toSnakeCase(domainName),
    description: options.description || `${toPascalCase(domainName)} domain tools`,
    apiName: options.api || domainName.toUpperCase(),
    timestamp: new Date().toISOString(),
  };
  
  // Generate file contents
  const files = [
    {
      path: join(domainPath, 'index.ts'),
      content: getIndexTemplate(templateVars),
    },
    {
      path: join(domainPath, `${domainName}-tools.ts`),
      content: getConsolidatedToolTemplate(templateVars),
    },
    {
      path: join(domainPath, 'README.md'),
      content: getDomainTemplate(templateVars),
    },
  ];
  
  if (options.dryRun) {
    logger.info('DRY RUN - Files that would be created:');
    files.forEach(file => {
      console.log(`\n📄 ${file.path}`);
      console.log('─'.repeat(50));
      console.log(file.content.substring(0, 200) + '...');
    });
    return;
  }
  
  // Create domain directory
  await fs.mkdir(domainPath, { recursive: true });
  
  // Write files
  for (const file of files) {
    await fs.writeFile(file.path, file.content, 'utf8');
    logger.info({ path: file.path }, 'Created file');
  }
  
  // Update all-tools-registry.ts
  await updateToolsRegistry(domainName);
  
  logger.info({ domainName }, 'Domain generated successfully');
  
  // Show next steps
  console.log(`\n✅ Domain '${domainName}' generated successfully!`);
  console.log(`\n📂 Files created:`);
  files.forEach(file => console.log(`   ${file.path}`));
  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Review generated files in src/tools/${domainName}/`);
  console.log(`   2. Implement your first tool using: alecs generate tool ${domainName} <tool-name>`);
  console.log(`   3. Add API client implementation in ${domainName}-tools.ts`);
  console.log(`   4. Run tests: npm test`);
  console.log(`   5. Build server: npm run build`);
}

async function updateToolsRegistry(domainName: string): Promise<void> {
  const registryPath = join(process.cwd(), 'src', 'tools', 'all-tools-registry.ts');
  
  try {
    const registryContent = await fs.readFile(registryPath, 'utf8');
    
    // Add import statement
    const importStatement = `import { ${domainName}Tools } from './${domainName}';`;
    const importRegex = /^(import.*from.*';)$/gm;
    const imports = registryContent.match(importRegex) || [];
    
    if (!registryContent.includes(importStatement)) {
      const lastImport = imports[imports.length - 1];
      if (!lastImport) {
        logger.warn('No imports found in registry file');
        return;
      }
      const updatedContent = registryContent.replace(
        lastImport,
        `${lastImport}\n${importStatement}`
      );
      
      // Add to tool loading section
      const toolLoadingRegex = /(\s+\/\/ TODO: Add new domains here)/;
      const toolLoadingReplacement = `  // ${toPascalCase(domainName)} Tools\n  allTools.push(...convertToolsToDefinitions(${domainName}Tools));\n\n$1`;
      
      const finalContent = updatedContent.replace(toolLoadingRegex, toolLoadingReplacement);
      
      await fs.writeFile(registryPath, finalContent, 'utf8');
      logger.info('Updated all-tools-registry.ts');
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to update tools registry - you may need to update it manually');
  }
}