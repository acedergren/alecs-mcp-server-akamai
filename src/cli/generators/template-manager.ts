/**
 * Template Manager
 * 
 * Manages and lists available templates
 */

import { createLogger } from '../../utils/pino-logger';

const logger = createLogger('template-manager');

export interface TemplateInfo {
  name: string;
  description: string;
  type: 'domain' | 'tool';
  files: string[];
}

const AVAILABLE_TEMPLATES: TemplateInfo[] = [
  {
    name: 'domain',
    description: 'Complete domain with consolidated tools pattern',
    type: 'domain',
    files: [
      'index.ts',
      'consolidated-{domain}-tools.ts',
      'README.md'
    ]
  },
  {
    name: 'tool',
    description: 'Individual tool within existing domain',
    type: 'tool',
    files: [
      'Updates index.ts',
      'Updates consolidated-{domain}-tools.ts'
    ]
  }
];

export async function listTemplates(): Promise<void> {
  console.log('\n🏗️  Available ALECSCore Templates\n');
  
  console.log('Domain Templates:');
  console.log('─'.repeat(50));
  
  const domainTemplates = AVAILABLE_TEMPLATES.filter(t => t.type === 'domain');
  domainTemplates.forEach(template => {
    console.log(`📁 ${template.name}`);
    console.log(`   Description: ${template.description}`);
    console.log(`   Usage: alecs generate ${template.name} <name>`);
    console.log(`   Files: ${template.files.join(', ')}`);
    console.log('');
  });
  
  console.log('Tool Templates:');
  console.log('─'.repeat(50));
  
  const toolTemplates = AVAILABLE_TEMPLATES.filter(t => t.type === 'tool');
  toolTemplates.forEach(template => {
    console.log(`🔧 ${template.name}`);
    console.log(`   Description: ${template.description}`);
    console.log(`   Usage: alecs generate ${template.name} <domain> <name>`);
    console.log(`   Files: ${template.files.join(', ')}`);
    console.log('');
  });
  
  console.log('Examples:');
  console.log('─'.repeat(50));
  console.log('• alecs generate domain billing');
  console.log('• alecs generate tool billing cost_analysis');
  console.log('• alecs generate domain gtm --description "Global Traffic Management"');
  console.log('• alecs generate tool property health_check --method GET');
  console.log('');
  
  console.log('Options:');
  console.log('─'.repeat(50));
  console.log('• --description <desc>   Custom description');
  console.log('• --api <name>          API base name');
  console.log('• --method <method>     HTTP method (GET, POST, PUT, DELETE)');
  console.log('• --endpoint <path>     API endpoint path');
  console.log('• --dry-run             Preview without creating files');
  console.log('');
  
  logger.info(`Listed ${AVAILABLE_TEMPLATES.length} available templates`);
}