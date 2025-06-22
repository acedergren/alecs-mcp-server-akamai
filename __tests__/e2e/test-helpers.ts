/**
 * E2E Test Helpers and Mock Data
 * Shared utilities for MCP workflow testing
 */

import { ChildProcess } from 'child_process';

/**
 * Helper to send JSON-RPC requests to MCP server
 */
export function createMCPClient(serverProcess: ChildProcess) {
  return {
    async sendRequest(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve, reject) => {
        const request = {
          jsonrpc: '2.0',
          method,
          params,
          id: Date.now()
        };
        
        let response = '';
        let errorBuffer = '';
        
        const handleData = (data: Buffer) => {
          response += data.toString();
          
          const lines = response.split('\n');
          for (const line of lines) {
            if (line.trim() && line.includes('"jsonrpc"')) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.id === request.id) {
                  serverProcess.stdout?.off('data', handleData);
                  serverProcess.stderr?.off('data', handleError);
                  
                  if (parsed.error) {
                    reject(new Error(parsed.error.message || 'MCP Error'));
                  } else {
                    resolve(parsed.result);
                  }
                }
              } catch (e) {
                // Not complete JSON yet
              }
            }
          }
        };
        
        const handleError = (data: Buffer) => {
          errorBuffer += data.toString();
        };
        
        serverProcess.stdout?.on('data', handleData);
        serverProcess.stderr?.on('data', handleError);
        serverProcess.stdin?.write(JSON.stringify(request) + '\n');
        
        // Configurable timeout
        const timeout = params._timeout || 10000;
        setTimeout(() => {
          serverProcess.stdout?.off('data', handleData);
          serverProcess.stderr?.off('data', handleError);
          
          if (errorBuffer) {
            reject(new Error(`Server error: ${errorBuffer}`));
          } else {
            reject(new Error('Timeout waiting for MCP response'));
          }
        }, timeout);
      });
    },
    
    async callTool(name: string, args: any = {}): Promise<any> {
      return this.sendRequest('tools/call', {
        name,
        arguments: args
      });
    },
    
    async listTools(): Promise<any> {
      return this.sendRequest('tools/list');
    },
    
    async initialize(): Promise<any> {
      return this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'e2e-test-client',
          version: '1.0.0'
        }
      });
    }
  };
}

/**
 * Mock data for testing
 */
export const mockData = {
  properties: {
    valid: {
      propertyId: 'prp_123456',
      propertyName: 'test-property',
      contractId: 'ctr_C-1234567',
      groupId: 'grp_12345',
      productId: 'prd_Site_Accel',
      latestVersion: 1,
      productionVersion: 1,
      stagingVersion: 1
    },
    invalid: {
      propertyId: 'prp_invalid',
      propertyName: '',
      contractId: 'invalid',
      groupId: 'invalid'
    }
  },
  
  dns: {
    domains: {
      valid: 'example.com',
      migration: 'migrate-me.com',
      production: 'production.com'
    },
    providers: ['cloudflare', 'route53', 'godaddy', 'namecheap'],
    recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'CAA']
  },
  
  security: {
    threats: {
      botAttack: {
        type: 'bot_attack',
        severity: 'high',
        source: 'automated'
      },
      ddos: {
        type: 'ddos_attack',
        severity: 'critical',
        source: 'distributed'
      }
    },
    compliance: ['pci', 'gdpr', 'hipaa', 'sox']
  },
  
  performance: {
    metrics: {
      good: {
        responseTime: 150,
        availability: 99.99,
        errorRate: 0.01,
        cacheHitRate: 95
      },
      poor: {
        responseTime: 3500,
        availability: 98.5,
        errorRate: 2.5,
        cacheHitRate: 60
      }
    },
    pages: {
      critical: ['/checkout', '/cart', '/payment'],
      standard: ['/', '/products', '/about']
    }
  },
  
  workflows: {
    propertyCreation: {
      steps: [
        'validate_inputs',
        'check_prerequisites',
        'create_property',
        'configure_settings',
        'create_version',
        'add_hostnames',
        'activate_staging'
      ],
      requiredParams: ['propertyName', 'contractId', 'groupId', 'productId']
    },
    dnsMigration: {
      steps: [
        'analyze_current_dns',
        'export_records',
        'validate_records',
        'create_zone',
        'import_records',
        'test_resolution',
        'update_nameservers'
      ],
      safetyChecks: [
        'backup_current_config',
        'validate_all_records',
        'test_with_preview',
        'prepare_rollback'
      ]
    }
  }
};

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Extract property ID from response text
   */
  extractPropertyId(text: string): string | null {
    const match = text.match(/prp_\d+/);
    return match ? match[0] : null;
  },
  
  /**
   * Extract domain from response text
   */
  extractDomain(text: string): string | null {
    const match = text.match(/([a-z0-9-]+\.)+[a-z]{2,}/i);
    return match ? match[0] : null;
  },
  
  /**
   * Check if response indicates success
   */
  isSuccessResponse(response: any): boolean {
    if (!response || !response.content || !Array.isArray(response.content)) {
      return false;
    }
    
    const text = response.content[0]?.text || '';
    const successIndicators = [
      'success',
      'completed',
      'created',
      'updated',
      'configured',
      '✅',
      '🎉'
    ];
    
    return successIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  },
  
  /**
   * Check if response contains error
   */
  hasError(response: any): boolean {
    if (!response || !response.content) {
      return true;
    }
    
    const text = response.content[0]?.text || '';
    const errorIndicators = [
      'error',
      'failed',
      'invalid',
      'missing',
      'required',
      '❌',
      '⚠️'
    ];
    
    return errorIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
  },
  
  /**
   * Wait for condition with timeout
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Timeout waiting for condition');
  },
  
  /**
   * Measure execution time
   */
  async measureTime<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await operation();
    const duration = Date.now() - start;
    
    return { result, duration };
  },
  
  /**
   * Retry operation with exponential backoff
   */
  async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Retry failed');
  }
};

/**
 * Performance benchmarks
 */
export const performanceBenchmarks = {
  tools: {
    simple: 500,      // Simple tool should respond within 500ms
    complex: 2000,    // Complex tool within 2s
    workflow: 5000    // Workflow within 5s
  },
  
  assistants: {
    response: 1000,   // Assistant should respond within 1s
    analysis: 3000    // Complex analysis within 3s
  },
  
  concurrent: {
    tools: 10,        // Should handle 10 concurrent tool calls
    requests: 50      // Should handle 50 concurrent requests
  }
};

/**
 * Validation helpers
 */
export const validators = {
  /**
   * Validate property ID format
   */
  isValidPropertyId(id: string): boolean {
    return /^prp_\d+$/.test(id);
  },
  
  /**
   * Validate contract ID format
   */
  isValidContractId(id: string): boolean {
    return /^ctr_[A-Z0-9-]+$/i.test(id);
  },
  
  /**
   * Validate domain format
   */
  isValidDomain(domain: string): boolean {
    return /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(domain);
  },
  
  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
};

/**
 * Test scenarios
 */
export const testScenarios = {
  happyPath: {
    ecommerceLaunch: {
      description: 'Launch new e-commerce site with full setup',
      steps: [
        { tool: 'property', intent: 'Launch e-commerce site' },
        { tool: 'dns', intent: 'Set up domain' },
        { tool: 'security', intent: 'Configure PCI compliance' },
        { tool: 'performance', intent: 'Optimize for conversions' }
      ]
    },
    
    dnsMigration: {
      description: 'Safe DNS migration from another provider',
      steps: [
        { tool: 'dns', intent: 'Analyze current DNS' },
        { tool: 'dns', intent: 'Create migration plan' },
        { tool: 'dns', intent: 'Execute migration safely' },
        { tool: 'dns', intent: 'Verify migration success' }
      ]
    }
  },
  
  errorCases: {
    missingParams: {
      description: 'Handle missing required parameters',
      tool: 'get-property',
      args: {} // Missing propertyId
    },
    
    invalidData: {
      description: 'Handle invalid data gracefully',
      tool: 'create-property',
      args: {
        propertyName: '',
        contractId: 'invalid'
      }
    }
  },
  
  edgeCases: {
    longPropertyName: {
      description: 'Handle very long property names',
      tool: 'create-property',
      args: {
        propertyName: 'a'.repeat(300)
      }
    },
    
    specialCharacters: {
      description: 'Handle special characters in inputs',
      tool: 'dns',
      args: {
        intent: 'Set up domain for café-münchen.de'
      }
    }
  }
};