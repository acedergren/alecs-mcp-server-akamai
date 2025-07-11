#!/usr/bin/env node

/**
 * ALECS Code Generation CLI
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: CLI tool for rapid ALECSCore development
 * Approach: Template-based code generation with validation
 * Implementation: Type-safe, well-documented, production-ready
 * 
 * USAGE:
 * - Generate new domain: alecs generate domain <name>
 * - Generate new tool: alecs generate tool <domain> <name>
 * - List templates: alecs generate --list
 * - Help: alecs generate --help
 */

import { Command } from 'commander';
import { generateDomain } from './generators/domain-generator';
import { generateTool } from './generators/tool-generator';
import { TestGenerator, generateDomainTestSuite } from './generators/test-generator';
import { listTemplates } from './generators/template-manager';
import { createDownloadAPIsCommand } from './commands/download-apis';
import { createGenerateFromAPICommand } from './commands/generate-from-api';
import { createLogger } from '../utils/pino-logger';

const logger = createLogger('alecs-cli');
const program = new Command();

program
  .name('alecs')
  .description('ALECS Code Generation CLI')
  .version('1.0.0');

// Generate command
const generateCommand = program
  .command('generate')
  .alias('g')
  .description('Generate code from templates');

// Generate domain subcommand
generateCommand
  .command('domain <name>')
  .description('Generate a new domain with boilerplate code')
  .option('-d, --description <desc>', 'Domain description')
  .option('-a, --api <api>', 'API base name (e.g., "property" for PAPI)')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(async (name: string, options: { description?: string; api?: string; dryRun?: boolean }) => {
    try {
      logger.info({ name, options }, 'Generating domain');
      await generateDomain(name, options);
      logger.info('Domain generated successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to generate domain');
      process.exit(1);
    }
  });

// Generate tool subcommand
generateCommand
  .command('tool <domain> <name>')
  .description('Generate a new tool in existing domain')
  .option('-d, --description <desc>', 'Tool description')
  .option('-m, --method <method>', 'HTTP method (GET, POST, PUT, DELETE)')
  .option('-e, --endpoint <endpoint>', 'API endpoint path')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(async (domain: string, name: string, options: { description?: string; method?: string; endpoint?: string; dryRun?: boolean }) => {
    try {
      logger.info({ domain, name, options }, 'Generating tool');
      await generateTool(domain, name, options);
      logger.info('Tool generated successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to generate tool');
      process.exit(1);
    }
  });

// Generate tests subcommand
generateCommand
  .command('test <domain> [tool]')
  .description('Generate tests for domain or specific tool')
  .option('--dry-run', 'Show what would be generated without creating files')
  .action(async (domain: string, tool: string | undefined, options: { dryRun?: boolean }) => {
    try {
      if (tool) {
        logger.info({ domain, tool }, 'Generating tool test');
        const generator = new TestGenerator();
        await generator.generateToolTest({
          domainName: domain,
          toolName: tool,
          dryRun: options.dryRun
        });
      } else {
        logger.info({ domain }, 'Generating domain test suite');
        await generateDomainTestSuite(domain, options);
      }
      logger.info('Tests generated successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to generate tests');
      process.exit(1);
    }
  });

// List templates subcommand
generateCommand
  .command('list')
  .alias('ls')
  .description('List available templates')
  .action(async () => {
    try {
      await listTemplates();
    } catch (error) {
      logger.error({ error }, 'Failed to list templates');
      process.exit(1);
    }
  });

// Download APIs command
program.addCommand(createDownloadAPIsCommand());

// Generate from API command (OpenAPI-driven generation)
program.addCommand(createGenerateFromAPICommand());

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    program.help();
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}