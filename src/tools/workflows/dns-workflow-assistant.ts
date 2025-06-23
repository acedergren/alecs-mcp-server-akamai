/**
 * DNS & Domain Management Domain Assistant
 * Maya Chen's UX Transformation: Making DNS operations feel simple and safe
 * 
 * "DNS scares users because it can break everything. This assistant provides confidence through 
 * intelligent guidance and safety mechanisms."
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { WorkflowOrchestrator } from '../consolidated/workflow-orchestrator';

/**
 * DNS Migration Context
 * Understands where users are coming from and their comfort level
 */
export interface DNSMigrationContext {
  current_provider: 'cloudflare' | 'route53' | 'godaddy' | 'namecheap' | 'custom';
  migration_reason: 'cost_savings' | 'better_security' | 'akamai_integration' | 'performance';
  risk_tolerance: 'zero_downtime' | 'brief_maintenance' | 'weekend_window';
  business_criticality: 'revenue_critical' | 'user_facing' | 'internal_tools';
  team_expertise: 'dns_experts' | 'basic_knowledge' | 'need_guidance';
}

/**
 * DNS & Domain Assistant
 * Consolidates DNS tools into confident, guided experiences
 */
export const dnsDomainAssistant: Tool = {
  name: 'dns',
  description: 'Maya\'s DNS assistant for ALECS - I make DNS changes safe and simple, with rollback plans for everything',
  inputSchema: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        description: 'What you need help with (e.g., "Migrate my domain from Cloudflare", "Add email records", "Fix DNS issues")',
      },
      domain: {
        type: 'string',
        description: 'The domain you\'re working with',
      },
      context: {
        type: 'object',
        description: 'Optional context about your DNS setup',
        properties: {
          current_provider: {
            type: 'string',
            enum: ['cloudflare', 'route53', 'godaddy', 'namecheap', 'custom'],
          },
          urgency: {
            type: 'string',
            enum: ['immediate', 'planned', 'testing'],
          },
          experience_level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'expert'],
          },
        },
      },
      safety_mode: {
        type: 'boolean',
        description: 'Enable extra safety checks and confirmations (default: true)',
        default: true,
      },
    },
    required: ['intent'],
  },
};

/**
 * Provider-specific migration templates
 */
const PROVIDER_MIGRATIONS = {
  cloudflare: {
    name: 'Cloudflare to ALECS Migration',
    specialConsiderations: [
      'Cloudflare proxy settings need special handling',
      'Page Rules must be converted to Edge behaviors',
      'Workers scripts need migration planning',
    ],
    exportMethod: 'Cloudflare API export with zone file backup',
    averageRecordCount: 25,
    commonRecordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA'],
    migrationSteps: [
      'Export zone file from Cloudflare',
      'Analyze Cloudflare-specific features',
      'Create ALECS zone with matching settings',
      'Import records with validation',
      'Set up equivalent Edge rules',
      'Test with preview nameservers',
      'Schedule nameserver cutover',
    ],
  },
  route53: {
    name: 'AWS Route53 to ALECS Migration',
    specialConsiderations: [
      'Route53 alias records need conversion',
      'Health checks require reconfiguration',
      'Weighted routing needs planning',
    ],
    exportMethod: 'AWS CLI export to zone file',
    averageRecordCount: 40,
    commonRecordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS'],
  },
  godaddy: {
    name: 'GoDaddy to ALECS Migration',
    specialConsiderations: [
      'GoDaddy parking records should be removed',
      'Email forwarding needs separate setup',
      'Domain privacy settings don\'t transfer',
    ],
    exportMethod: 'Manual export or API if available',
    averageRecordCount: 15,
    commonRecordTypes: ['A', 'CNAME', 'MX', 'TXT'],
  },
};

/**
 * Common DNS patterns and their purposes
 */
const DNS_PATTERNS = {
  email: {
    gmail: [
      { type: 'MX', priority: 1, value: 'aspmx.l.google.com' },
      { type: 'MX', priority: 5, value: 'alt1.aspmx.l.google.com' },
      { type: 'MX', priority: 5, value: 'alt2.aspmx.l.google.com' },
      { type: 'MX', priority: 10, value: 'alt3.aspmx.l.google.com' },
      { type: 'MX', priority: 10, value: 'alt4.aspmx.l.google.com' },
      { type: 'TXT', value: 'v=spf1 include:_spf.google.com ~all' },
    ],
    office365: [
      { type: 'MX', priority: 0, value: '{domain}.mail.protection.outlook.com' },
      { type: 'TXT', value: 'v=spf1 include:spf.protection.outlook.com -all' },
    ],
  },
  verification: {
    google: { type: 'TXT', pattern: 'google-site-verification=' },
    microsoft: { type: 'TXT', pattern: 'MS=' },
    facebook: { type: 'TXT', pattern: 'facebook-domain-verification=' },
  },
  security: {
    dmarc: { type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=quarantine; rua=mailto:' },
    dkim: { type: 'TXT', name: '*._domainkey', pattern: 'v=DKIM1;' },
    caa: { type: 'CAA', value: '0 issue "letsencrypt.org"' },
  },
};

/**
 * DNS Analyzer
 * Understands DNS intent and provides safety analysis
 */
class DNSAnalyzer {
  /**
   * Analyze DNS intent and identify operation type
   */
  analyzeIntent(intent: string, domain?: string): {
    operation: string;
    riskLevel: 'low' | 'medium' | 'high';
    recordTypes: string[];
    requiresDowntime: boolean;
    estimatedTime: string;
  } {
    const lowerIntent = intent.toLowerCase();
    
    let operation = 'unknown';
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let recordTypes: string[] = [];
    let requiresDowntime = false;
    
    // Detect operation type
    if (lowerIntent.includes('migrate') || lowerIntent.includes('move') || lowerIntent.includes('transfer')) {
      operation = 'migration';
      riskLevel = 'high';
      requiresDowntime = false; // With proper planning
      recordTypes = ['ALL'];
    } else if (lowerIntent.includes('email') || lowerIntent.includes('mx') || lowerIntent.includes('mail')) {
      operation = 'email_setup';
      riskLevel = 'medium';
      recordTypes = ['MX', 'TXT', 'DMARC', 'DKIM'];
    } else if (lowerIntent.includes('add') || lowerIntent.includes('create')) {
      operation = 'add_records';
      riskLevel = 'low';
      
      // Detect specific record types
      if (lowerIntent.includes('subdomain')) {recordTypes.push('A', 'CNAME');}
      if (lowerIntent.includes('www')) {recordTypes.push('CNAME');}
      if (lowerIntent.includes('api')) {recordTypes.push('A', 'AAAA');}
    } else if (lowerIntent.includes('fix') || lowerIntent.includes('troubleshoot') || lowerIntent.includes('issue')) {
      operation = 'troubleshoot';
      riskLevel = 'medium';
      recordTypes = ['DIAGNOSTIC'];
    } else if (lowerIntent.includes('ssl') || lowerIntent.includes('https') || lowerIntent.includes('certificate')) {
      operation = 'ssl_setup';
      riskLevel = 'low';
      recordTypes = ['CAA', 'TXT'];
    }
    
    // Estimate time based on operation
    const estimatedTime = this.estimateTime(operation, riskLevel);
    
    return {
      operation,
      riskLevel,
      recordTypes,
      requiresDowntime,
      estimatedTime,
    };
  }
  
  /**
   * Analyze migration safety and provide recommendations
   */
  analyzeMigrationSafety(
    domain: string,
    fromProvider: string,
    context: Partial<DNSMigrationContext>
  ): {
    safetyScore: number;
    risks: string[];
    mitigations: string[];
    rollbackPlan: string[];
  } {
    const risks: string[] = [];
    const mitigations: string[] = [];
    const rollbackPlan: string[] = [];
    
    // Analyze business criticality
    if (context.business_criticality === 'revenue_critical') {
      risks.push('Revenue-critical domain requires zero downtime');
      mitigations.push('Use preview nameservers for testing');
      mitigations.push('Schedule migration during low-traffic period');
      mitigations.push('Have support team on standby');
    }
    
    // Provider-specific risks
    if (fromProvider === 'cloudflare') {
      risks.push('Cloudflare proxy features will need reconfiguration');
      mitigations.push('Document all proxy settings before migration');
      mitigations.push('Prepare equivalent Akamai Edge rules');
    }
    
    // Build rollback plan
    rollbackPlan.push('Keep original DNS provider active for 48 hours');
    rollbackPlan.push('Document original nameserver settings');
    rollbackPlan.push('Test rollback procedure before migration');
    rollbackPlan.push('Have provider support contacts ready');
    
    // Calculate safety score (0-100)
    let safetyScore = 100;
    if (context.business_criticality === 'revenue_critical') {safetyScore -= 20;}
    if (context.team_expertise === 'need_guidance') {safetyScore -= 15;}
    if (context.risk_tolerance === 'zero_downtime') {safetyScore -= 10;}
    
    return {
      safetyScore,
      risks,
      mitigations,
      rollbackPlan,
    };
  }
  
  /**
   * Generate DNS validation tests
   */
  generateValidationTests(domain: string, recordTypes: string[]): {
    preTests: string[];
    postTests: string[];
    verificationCommands: string[];
  } {
    const preTests: string[] = [];
    const postTests: string[] = [];
    const verificationCommands: string[] = [];
    
    // Pre-migration tests
    preTests.push(`Current DNS resolution for ${domain}`);
    preTests.push('Current nameserver configuration');
    preTests.push('TTL values for critical records');
    preTests.push('Email delivery test (if MX records exist)');
    
    // Post-migration tests
    postTests.push('Verify all records match original configuration');
    postTests.push('Test DNS resolution from multiple locations');
    postTests.push('Verify SSL certificate validation');
    postTests.push('Test email delivery (if applicable)');
    
    // Verification commands
    verificationCommands.push(`dig ${domain} +short`);
    verificationCommands.push(`dig ${domain} NS +short`);
    if (recordTypes.includes('MX')) {
      verificationCommands.push(`dig ${domain} MX +short`);
    }
    verificationCommands.push(`nslookup ${domain} 8.8.8.8`);
    
    return {
      preTests,
      postTests,
      verificationCommands,
    };
  }
  
  private estimateTime(operation: string, riskLevel: string): string {
    const times: Record<string, string> = {
      'migration:high': '2-4 hours with testing',
      'migration:medium': '1-2 hours',
      'migration:low': '30-60 minutes',
      'email_setup:medium': '30 minutes',
      'add_records:low': '5-10 minutes',
      'troubleshoot:medium': '15-30 minutes',
      'ssl_setup:low': '10 minutes',
    };
    
    return times[`${operation}:${riskLevel}`] || '30 minutes';
  }
}

/**
 * DNS Safety Validator
 * Provides extra safety checks for critical operations
 */
class DNSSafetyValidator {
  /**
   * Validate DNS changes before applying
   */
  async validateChanges(
    domain: string,
    proposedChanges: any[],
    safetyMode: boolean
  ): Promise<{
    valid: boolean;
    warnings: string[];
    blockers: string[];
  }> {
    const warnings: string[] = [];
    const blockers: string[] = [];
    
    // Check for common mistakes
    proposedChanges.forEach(change => {
      // Check for apex CNAME (not allowed)
      if (change.type === 'CNAME' && change.name === '@') {
        blockers.push('Cannot create CNAME record at domain apex');
      }
      
      // Check for conflicting records
      if (change.type === 'CNAME' && change.conflict) {
        blockers.push(`CNAME record conflicts with existing ${change.conflict} record`);
      }
      
      // Warn about short TTLs
      if (change.ttl && change.ttl < 300) {
        warnings.push(`Very short TTL (${change.ttl}s) may impact caching performance`);
      }
      
      // Warn about missing SPF for MX
      if (change.type === 'MX' && !proposedChanges.find(c => c.type === 'TXT' && c.value?.includes('v=spf1'))) {
        warnings.push('Adding MX records without SPF may cause email delivery issues');
      }
    });
    
    return {
      valid: blockers.length === 0,
      warnings,
      blockers,
    };
  }
  
  /**
   * Generate safety checklist for operation
   */
  generateSafetyChecklist(operation: string, riskLevel: string): string[] {
    const checklist: string[] = [];
    
    if (riskLevel === 'high') {
      checklist.push('✓ Current DNS configuration backed up');
      checklist.push('✓ Rollback plan documented and tested');
      checklist.push('✓ Stakeholders notified of maintenance');
      checklist.push('✓ Support contacts available');
    }
    
    if (operation === 'migration') {
      checklist.push('✓ TTLs lowered 24 hours before migration');
      checklist.push('✓ All records inventoried and documented');
      checklist.push('✓ Preview testing completed');
      checklist.push('✓ Monitoring alerts configured');
    }
    
    if (operation === 'email_setup') {
      checklist.push('✓ Email service provider settings confirmed');
      checklist.push('✓ SPF, DKIM, DMARC records prepared');
      checklist.push('✓ Test email account ready');
      checklist.push('✓ Email routing tested');
    }
    
    return checklist;
  }
}

/**
 * Main handler for DNS & Domain Assistant
 */
export async function handleDNSDomainAssistant(args: any) {
  const analyzer = new DNSAnalyzer();
  const validator = new DNSSafetyValidator();
  
  try {
    // Analyze intent
    const analysis = analyzer.analyzeIntent(args.intent, args.domain);
    
    // Build response with safety-first approach
    let response = `# DNS Assistant Response\n\n`;
    response += `I'll help you **${args.intent}**${args.domain ? ` for ${args.domain}` : ''}.\n\n`;
    
    // Safety indicator
    const safetyEmoji = analysis.riskLevel === 'low' ? '🟢' : analysis.riskLevel === 'medium' ? '🟡' : '🔴';
    response += `**Safety Level:** ${safetyEmoji} ${analysis.riskLevel.toUpperCase()} RISK\n`;
    response += `**Estimated Time:** ${analysis.estimatedTime}\n`;
    response += `**Downtime Required:** ${analysis.requiresDowntime ? 'Yes' : 'No'}\n\n`;
    
    // Operation-specific guidance
    if (analysis.operation === 'migration') {
      response += await generateMigrationGuidance(args, analyzer, validator);
    } else if (analysis.operation === 'email_setup') {
      response += await generateEmailSetupGuidance(args, analyzer);
    } else if (analysis.operation === 'troubleshoot') {
      response += await generateTroubleshootingGuidance(args, analyzer);
    } else {
      response += await generateGeneralDNSGuidance(args, analysis);
    }
    
    // Safety checklist
    if (args.safety_mode !== false) {
      const checklist = validator.generateSafetyChecklist(analysis.operation, analysis.riskLevel);
      if (checklist.length > 0) {
        response += `\n## Safety Checklist\n\n`;
        response += `Before proceeding, please confirm:\n\n`;
        checklist.forEach(item => {
          response += `${item}\n`;
        });
      }
    }
    
    // Next steps
    response += `\n## Next Steps\n\n`;
    
    if (!args.domain) {
      response += `1. **Which domain are you working with?**\n`;
      response += `   Please provide the domain name so I can give you specific guidance.\n\n`;
    }
    
    if (analysis.operation === 'migration' && !args.context?.current_provider) {
      response += `2. **Where is your domain currently hosted?**\n`;
      response += `   - Cloudflare\n`;
      response += `   - AWS Route53\n`;
      response += `   - GoDaddy\n`;
      response += `   - Namecheap\n`;
      response += `   - Other provider\n\n`;
    }
    
    response += `3. **When do you need this completed?**\n`;
    response += `   - Immediately\n`;
    response += `   - Within a few days\n`;
    response += `   - Just planning ahead\n\n`;
    
    response += `Once I have these details, I'll create a safe, step-by-step plan for you!\n`;
    
    return {
      content: [{
        type: 'text',
        text: response,
      }],
    };
    
  } catch (error) {
    logger.error('DNS Assistant Error:', error);
    
    return {
      content: [{
        type: 'text',
        text: `I want to help you with your DNS needs, but I need a bit more information.\n\n` +
              `Could you tell me:\n` +
              `1. What specific DNS task you need help with?\n` +
              `2. Which domain you're working on?\n` +
              `3. Whether this is urgent or you're just planning?\n\n` +
              `DNS changes can be critical, so I want to make sure I give you the safest, most accurate guidance!`,
      }],
    };
  }
}

/**
 * Generate migration-specific guidance
 */
async function generateMigrationGuidance(
  args: any,
  analyzer: DNSAnalyzer,
  validator: DNSSafetyValidator
): Promise<string> {
  let response = `## DNS Migration Plan\n\n`;
  
  if (args.context?.current_provider && PROVIDER_MIGRATIONS[args.context.current_provider as keyof typeof PROVIDER_MIGRATIONS]) {
    const migration = PROVIDER_MIGRATIONS[args.context.current_provider as keyof typeof PROVIDER_MIGRATIONS];
    
    response += `### ${migration.name}\n\n`;
    response += `I'll help you migrate from ${args.context.current_provider} to ALECS safely.\n\n`;
    
    response += `**Special Considerations:**\n`;
    migration.specialConsiderations.forEach((consideration: string) => {
      response += `- ⚠️ ${consideration}\n`;
    });
    
    if ('migrationSteps' in migration && migration.migrationSteps) {
      response += `\n**Migration Steps:**\n`;
      migration.migrationSteps.forEach((step: string, index: number) => {
        response += `${index + 1}. ${step}\n`;
      });
    }
    
    // Safety analysis
    if (args.domain) {
      const safety = analyzer.analyzeMigrationSafety(
        args.domain,
        args.context.current_provider,
        args.context
      );
      
      response += `\n### Safety Analysis\n\n`;
      response += `**Safety Score:** ${safety.safetyScore}/100\n\n`;
      
      if (safety.risks.length > 0) {
        response += `**Identified Risks:**\n`;
        safety.risks.forEach(risk => {
          response += `- ⚠️ ${risk}\n`;
        });
        
        response += `\n**Mitigations:**\n`;
        safety.mitigations.forEach(mitigation => {
          response += `- ✅ ${mitigation}\n`;
        });
      }
      
      response += `\n**Rollback Plan:**\n`;
      safety.rollbackPlan.forEach((step, index) => {
        response += `${index + 1}. ${step}\n`;
      });
    }
  } else {
    response += `I'll create a safe migration plan once you tell me where your domain is currently hosted.\n`;
    response += `\nMigration typically involves:\n`;
    response += `1. Backing up current DNS configuration\n`;
    response += `2. Creating the domain in ALECS\n`;
    response += `3. Importing all DNS records\n`;
    response += `4. Testing with preview nameservers\n`;
    response += `5. Updating nameservers at your registrar\n`;
    response += `6. Monitoring the transition\n`;
  }
  
  return response;
}

/**
 * Generate email setup guidance
 */
async function generateEmailSetupGuidance(
  args: any,
  analyzer: DNSAnalyzer
): Promise<string> {
  let response = `## Email Configuration Setup\n\n`;
  
  response += `I'll help you set up email records for ${args.domain || 'your domain'}.\n\n`;
  
  response += `### Common Email Providers\n\n`;
  response += `Which email service are you using?\n\n`;
  
  response += `**1. Google Workspace (Gmail)**\n`;
  response += `   - Professional email with @yourdomain.com\n`;
  response += `   - Includes calendar, drive, and collaboration tools\n\n`;
  
  response += `**2. Microsoft 365**\n`;
  response += `   - Outlook email with @yourdomain.com\n`;
  response += `   - Includes Office apps and OneDrive\n\n`;
  
  response += `**3. Other Provider**\n`;
  response += `   - Tell me which service and I'll help with the setup\n\n`;
  
  response += `### What I'll Configure\n\n`;
  response += `- **MX Records**: Direct email to your provider\n`;
  response += `- **SPF Record**: Authorize servers to send email\n`;
  response += `- **DKIM Records**: Sign emails for authenticity\n`;
  response += `- **DMARC Policy**: Protect against email spoofing\n\n`;
  
  response += `### Email Security Best Practices\n\n`;
  response += `I'll also set up:\n`;
  response += `- Anti-spoofing protection\n`;
  response += `- Spam prevention measures\n`;
  response += `- Email authentication standards\n`;
  
  return response;
}

/**
 * Generate troubleshooting guidance
 */
async function generateTroubleshootingGuidance(
  args: any,
  analyzer: DNSAnalyzer
): Promise<string> {
  let response = `## DNS Troubleshooting\n\n`;
  
  response += `I'll help you diagnose and fix DNS issues.\n\n`;
  
  response += `### Quick Diagnostics\n\n`;
  response += `Let me check the most common issues:\n\n`;
  
  response += `1. **DNS Propagation**: Changes can take up to 48 hours\n`;
  response += `2. **Record Conflicts**: CNAME records can't coexist with others\n`;
  response += `3. **TTL Issues**: High TTLs delay updates\n`;
  response += `4. **Nameserver Mismatch**: Ensure correct nameservers at registrar\n\n`;
  
  if (args.domain) {
    const tests = analyzer.generateValidationTests(args.domain, ['A', 'NS', 'MX']);
    
    response += `### Diagnostic Commands\n\n`;
    response += `Run these commands to help diagnose:\n\n`;
    response += '```bash\n';
    tests.verificationCommands.forEach(cmd => {
      response += `${cmd}\n`;
    });
    response += '```\n\n';
  }
  
  response += `### Tell Me More\n\n`;
  response += `To help you better, please describe:\n`;
  response += `- What specific issue are you experiencing?\n`;
  response += `- When did it start?\n`;
  response += `- What changes were made recently?\n`;
  
  return response;
}

/**
 * Generate general DNS guidance
 */
async function generateGeneralDNSGuidance(
  args: any,
  analysis: any
): Promise<string> {
  let response = `## DNS Configuration\n\n`;
  
  response += `I'll help you with your DNS configuration.\n\n`;
  
  if (analysis.recordTypes.length > 0) {
    response += `### Record Types Needed\n\n`;
    analysis.recordTypes.forEach((type: string) => {
      response += `- **${type} Records**: ${getRecordTypeDescription(type)}\n`;
    });
    response += '\n';
  }
  
  response += `### Best Practices\n\n`;
  response += `- Always test changes in a staging environment first\n`;
  response += `- Keep TTLs low (300-600s) when making changes\n`;
  response += `- Document all changes for future reference\n`;
  response += `- Set up monitoring for critical records\n`;
  
  return response;
}

/**
 * Get user-friendly record type descriptions
 */
function getRecordTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'A': 'Points domain to IPv4 address',
    'AAAA': 'Points domain to IPv6 address',
    'CNAME': 'Alias to another domain name',
    'MX': 'Directs email to mail servers',
    'TXT': 'Text data for verification and policies',
    'NS': 'Delegates to nameservers',
    'CAA': 'Controls which CAs can issue certificates',
    'SRV': 'Specifies servers for services',
  };
  
  return descriptions[type] || 'DNS record';
}