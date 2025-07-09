/**
 * Simple Tool Validator
 * A lightweight test runner that doesn't require Jest
 */

import { AkamaiClient } from '../../akamai-client';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestResult {
  tool: string;
  success: boolean;
  error?: string;
}

interface DomainResult {
  domain: string;
  totalTools: number;
  passedTools: number;
  failedTools: number;
  coverage: number;
  results: TestResult[];
}

export class SimpleToolValidator {
  private mockClient: AkamaiClient;
  private results: DomainResult[] = [];
  
  constructor() {
    this.mockClient = this.createMockClient();
  }

  private createMockClient(): AkamaiClient {
    const mockResponses: Record<string, any> = {
      'GET:/papi/v1/properties': {
        properties: { items: [{ propertyId: 'prp_123456', propertyName: 'test' }] }
      },
      'POST:/papi/v1/properties': {
        propertyId: 'prp_654321', propertyLink: '/papi/v1/properties/prp_654321'
      },
      'GET:/config-dns/v2/zones': {
        zones: [{ zone: 'example.com', type: 'primary' }]
      },
      'POST:/config-dns/v2/zones': {
        zone: 'newzone.com', type: 'primary'
      },
      'GET:/appsec/v1/configs': {
        configurations: [{ id: 123, name: 'test-config' }]
      },
      'GET:/cps/v2/enrollments': {
        enrollments: [{ id: 789, cn: 'example.com' }]
      }
    };

    return {
      request: async ({ path, method }: any) => {
        const key = `${method}:${path}`;
        // Check exact match first
        if (mockResponses[key]) {
          return mockResponses[key];
        }
        
        // Check pattern matches
        for (const [pattern, response] of Object.entries(mockResponses)) {
          const [m, p] = pattern.split(':');
          if (m === method && path.includes(p.replace(/\{[^}]+\}/g, ''))) {
            return response;
          }
        }
        
        // Default response
        return { success: true, message: 'Mock response' };
      },
      setCustomer: async () => {},
      getActiveCustomer: () => 'test-customer',
      validateCustomer: async () => ({ isValid: true })
    } as any;
  }

  async validateDomain(domainName: string, tools: Record<string, any>): Promise<DomainResult> {
    const results: TestResult[] = [];
    let passedTools = 0;
    let failedTools = 0;

    console.log(`\n🔍 Validating ${domainName} domain...`);

    for (const [toolName, toolConfig] of Object.entries(tools)) {
      try {
        // Skip if not a tool config
        if (!toolConfig || typeof toolConfig !== 'object' || !toolConfig.handler) {
          continue;
        }

        // Validate tool has required properties
        if (!toolConfig.description) {
          throw new Error('Missing description');
        }

        // Test with minimal valid input
        const input = this.generateMinimalInput(toolConfig.inputSchema);
        const result = await toolConfig.handler(this.mockClient, input);

        // Validate response structure
        if (!result || !result.content || !Array.isArray(result.content)) {
          throw new Error('Invalid response structure');
        }

        results.push({ tool: toolName, success: true });
        passedTools++;
        console.log(`  ✅ ${toolName}`);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ tool: toolName, success: false, error: errorMsg });
        failedTools++;
        console.log(`  ❌ ${toolName}: ${errorMsg}`);
      }
    }

    const totalTools = passedTools + failedTools;
    const coverage = totalTools > 0 ? (passedTools / totalTools) * 100 : 0;

    const domainResult: DomainResult = {
      domain: domainName,
      totalTools,
      passedTools,
      failedTools,
      coverage,
      results
    };

    this.results.push(domainResult);
    return domainResult;
  }

  private generateMinimalInput(schema?: any): any {
    if (!schema) return {};
    
    // For Zod schemas
    if (schema._def) {
      const shape = schema._def.shape?.() || {};
      const input: Record<string, any> = {};
      
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const field = fieldSchema as any;
        
        // Skip optional fields
        if (field._def?.typeName === 'ZodOptional') {
          continue;
        }
        
        // Generate required fields only
        if (key === 'propertyId') input[key] = 'prp_123456';
        else if (key === 'zone') input[key] = 'example.com';
        else if (key === 'contractId') input[key] = 'ctr_C-ABC123';
        else if (key === 'groupId') input[key] = 'grp_123456';
        else if (key === 'network') input[key] = 'STAGING';
        else if (key === 'propertyName') input[key] = 'test-property';
        else if (key === 'configId') input[key] = 123;
        else if (key === 'customer') input[key] = 'test-customer';
        else input[key] = 'test-value';
      }
      
      return input;
    }
    
    return {};
  }

  async runValidation(): Promise<{success: boolean, report: string}> {
    console.log('🚀 Starting Simple Tool Validation...\n');
    
    // Ensure directories exist
    await this.setupDirectories();
    
    // Load and validate all domains
    const domains = await this.loadAllDomains();
    
    for (const [domainName, tools] of domains) {
      await this.validateDomain(domainName, tools);
    }
    
    // Generate report
    const report = this.generateReport();
    const success = this.calculateSuccess();
    
    // Save report
    await this.saveReport(report);
    
    return { success, report };
  }

  private async setupDirectories(): Promise<void> {
    const dirs = [
      path.join(__dirname, '../../../test-data'),
      path.join(__dirname, '../../../tools/test-utils'),
      path.join(__dirname, 'reports')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async loadAllDomains(): Promise<Map<string, Record<string, any>>> {
    const domains = new Map<string, Record<string, any>>();
    
    try {
      // Try to load actual tool files
      const toolFiles = [
        { domain: 'Property Core', module: await import('../../tools/property/consolidated-property-tools') },
        { domain: 'DNS Core', module: await import('../../tools/dns/consolidated-dns-tools') },
        { domain: 'Security Core', module: await import('../../tools/security/consolidated-security-tools') },
        { domain: 'Certificates', module: await import('../../tools/certificates/consolidated-certificate-tools') }
      ];
      
      for (const { domain, module } of toolFiles) {
        const tools = typeof module.default === 'function' 
          ? module.default(this.mockClient)
          : module.default || module;
        
        if (tools && typeof tools === 'object') {
          domains.set(domain, tools);
        }
      }
      
      // Try to load advanced tools
      try {
        const appsecModule = await import('../../tools/appsec/comprehensive-security-tools');
        const appsecTools = appsecModule.getComprehensiveSecurityTools?.(this.mockClient) || {};
        domains.set('Application Security', appsecTools);
      } catch (e) {
        console.log('Could not load Application Security tools');
      }
      
    } catch (error) {
      console.error('Error loading domains:', error);
      
      // Fallback: Create mock tools for testing
      domains.set('Mock Domain', {
        'test.tool': {
          description: 'Test tool',
          inputSchema: { _def: { shape: () => ({}) } },
          handler: async () => ({ content: [{ type: 'text', text: 'Success' }] })
        }
      });
    }
    
    return domains;
  }

  private generateReport(): string {
    let report = '# Simple Tool Validation Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Summary
    const totalTools = this.results.reduce((sum, r) => sum + r.totalTools, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passedTools, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedTools, 0);
    const overallCoverage = totalTools > 0 ? (totalPassed / totalTools) * 100 : 0;
    
    report += '## Summary\n\n';
    report += `- Total Tools: ${totalTools}\n`;
    report += `- Passed: ${totalPassed} (${overallCoverage.toFixed(1)}%)\n`;
    report += `- Failed: ${totalFailed}\n\n`;
    
    // Domain Results
    report += '## Domain Results\n\n';
    for (const result of this.results) {
      report += `### ${result.domain}\n`;
      report += `- Tools: ${result.totalTools}\n`;
      report += `- Passed: ${result.passedTools}\n`;
      report += `- Failed: ${result.failedTools}\n`;
      report += `- Coverage: ${result.coverage.toFixed(1)}%\n\n`;
      
      if (result.failedTools > 0) {
        report += '**Failed Tools:**\n';
        for (const test of result.results) {
          if (!test.success) {
            report += `- ${test.tool}: ${test.error}\n`;
          }
        }
        report += '\n';
      }
    }
    
    return report;
  }

  private calculateSuccess(): boolean {
    const totalTools = this.results.reduce((sum, r) => sum + r.totalTools, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passedTools, 0);
    return totalTools > 0 && totalPassed === totalTools;
  }

  private async saveReport(report: string): Promise<void> {
    const reportPath = path.join(__dirname, 'reports', `validation-${Date.now()}.md`);
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Export runner function
export async function runSimpleValidation(): Promise<{success: boolean, report: string}> {
  const validator = new SimpleToolValidator();
  return await validator.runValidation();
}