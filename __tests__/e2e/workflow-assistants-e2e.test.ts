/**
 * Workflow Assistants End-to-End Tests
 * Testing Maya Chen's UX transformation with real MCP workflows
 */

import { spawn, ChildProcess } from 'child_process';

describe('Workflow Assistants E2E Tests', () => {
  let serverProcess: ChildProcess;
  
  // Helper to send JSON-RPC request to MCP server
  const sendMCPRequest = (method: string, params: any = {}): Promise<any> => {
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
        
        // Try to parse complete JSON responses
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
      
      // Timeout after 10 seconds for complex workflows
      setTimeout(() => {
        serverProcess.stdout?.off('data', handleData);
        serverProcess.stderr?.off('data', handleError);
        
        if (errorBuffer) {
          reject(new Error(`Server error: ${errorBuffer}`));
        } else {
          reject(new Error('Timeout waiting for MCP response'));
        }
      }, 10000);
    });
  };
  
  beforeAll(async () => {
    console.log('🚀 Starting MCP server for workflow assistant tests...');
    
    // Start the FULL MCP server with all tools including workflow assistants
    serverProcess = spawn('npm', ['run', 'dev:full'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Wait for server to be ready
    await new Promise<void>((resolve) => {
      const checkReady = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Server started') || output.includes('initialized')) {
          serverProcess.stdout?.off('data', checkReady);
          resolve();
        }
      };
      serverProcess.stdout?.on('data', checkReady);
      
      setTimeout(() => {
        serverProcess.stdout?.off('data', checkReady);
        resolve(); // Continue anyway
      }, 15000);
    });
    
    // Initialize MCP connection
    await sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {}
    });
    
    console.log('✅ MCP server started and initialized');
  }, 30000);
  
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  describe('🏗️ Property & Infrastructure Assistant', () => {
    test('should handle e-commerce site launch request', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property',
        arguments: {
          intent: 'Launch my e-commerce site globally',
          context: {
            business_type: 'ecommerce',
            performance_priority: 'speed_first',
            scaling_expectation: 'growth',
            compliance_needs: ['pci'],
          }
        }
      });
      
      expect(response).toBeDefined();
      expect(response.content).toBeInstanceOf(Array);
      
      const textContent = response.content[0]?.text || '';
      
      // Should include business-focused recommendations
      expect(textContent).toContain('e-commerce');
      expect(textContent).toContain('PCI');
      expect(textContent).toContain('performance');
      
      // Should provide clear next steps
      expect(textContent.toLowerCase()).toMatch(/next steps|implementation|deploy/);
    });
    
    test('should adapt recommendations based on business type', async () => {
      const businessTypes = ['saas', 'api', 'media', 'marketing'];
      
      for (const businessType of businessTypes) {
        const response = await sendMCPRequest('tools/call', {
          name: 'property',
          arguments: {
            intent: `Set up infrastructure for my ${businessType} platform`,
            context: {
              business_type: businessType as any,
            }
          }
        });
        
        expect(response).toBeDefined();
        const textContent = response.content[0]?.text || '';
        
        // Should include business-specific recommendations
        expect(textContent.toLowerCase()).toContain(businessType);
      }
    });
    
    test('should handle technical details request', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property',
        arguments: {
          intent: 'Show me advanced CDN configuration options',
          advanced_mode: true
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include technical details when requested
      expect(textContent).toMatch(/cache|TTL|origin|edge/i);
    });
  });
  
  describe('🌐 DNS & Domain Assistant', () => {
    test('should provide safe migration plan from Cloudflare', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'dns',
        arguments: {
          intent: 'Migrate my domain from Cloudflare to Akamai',
          domain: 'example.com',
          context: {
            current_provider: 'cloudflare',
            urgency: 'planned',
            experience_level: 'beginner'
          },
          safety_mode: true
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include migration-specific guidance
      expect(textContent).toContain('Cloudflare');
      expect(textContent).toContain('migration');
      expect(textContent.toLowerCase()).toContain('safety');
      
      // Should include rollback plan
      expect(textContent.toLowerCase()).toMatch(/rollback|revert|undo/);
      
      // Should provide step-by-step instructions
      expect(textContent).toMatch(/step|1\.|2\./i);
    });
    
    test('should handle email setup request', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'dns',
        arguments: {
          intent: 'Set up email for my domain with Google Workspace',
          domain: 'example.com'
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include email-specific records
      expect(textContent).toContain('MX');
      expect(textContent).toContain('SPF');
      expect(textContent.toLowerCase()).toContain('email');
    });
    
    test('should provide troubleshooting guidance', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'dns',
        arguments: {
          intent: 'My website is not loading after DNS changes',
          domain: 'example.com'
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include diagnostic steps
      expect(textContent.toLowerCase()).toMatch(/troubleshoot|diagnos|check/);
      expect(textContent).toMatch(/dig|nslookup|DNS/);
    });
  });
  
  describe('🛡️ Security & Compliance Assistant', () => {
    test('should handle PCI compliance request', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'I need to meet PCI compliance for payment processing',
          context: {
            business_type: 'retail',
            data_sensitivity: 'restricted',
            compliance_requirements: ['pci'],
            threat_model: 'elevated'
          }
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include PCI-specific recommendations
      expect(textContent).toContain('PCI');
      expect(textContent.toLowerCase()).toContain('payment');
      expect(textContent).toMatch(/WAF|firewall/i);
      
      // Should include compliance checklist
      expect(textContent.toLowerCase()).toMatch(/checklist|requirement|control/);
    });
    
    test('should handle active threat response', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'We are under bot attack right now!',
          urgency: 'immediate_threat',
          auto_apply: false // Don't actually apply in test
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should treat as critical
      expect(textContent).toMatch(/immediate|urgent|critical/i);
      expect(textContent.toLowerCase()).toContain('bot');
      
      // Should provide immediate actions
      expect(textContent).toMatch(/immediate action|right now|immediately/i);
    });
    
    test('should provide security ROI analysis', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'What security improvements should we invest in?',
          context: {
            business_type: 'financial',
            security_maturity: 'basic_protection'
          }
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include investment guidance
      expect(textContent.toLowerCase()).toMatch(/investment|cost|roi|value/);
      expect(textContent.toLowerCase()).toMatch(/recommend|priority|phase/);
    });
  });
  
  describe('📊 Performance & Analytics Assistant', () => {
    test('should analyze checkout performance', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Speed up our checkout process',
          context: {
            business_goal: 'conversion_rate',
            current_pain_points: ['slow_pages', 'cart_abandonment'],
            critical_pages: ['/checkout', '/cart', '/payment']
          },
          timeframe: 'last_week'
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should focus on checkout optimization
      expect(textContent.toLowerCase()).toContain('checkout');
      expect(textContent.toLowerCase()).toMatch(/conversion|abandon/);
      
      // Should provide business impact
      expect(textContent).toMatch(/impact|improvement|gain/i);
      
      // Should include specific optimizations
      expect(textContent.toLowerCase()).toMatch(/cache|api|prefetch|optimize/);
    });
    
    test('should provide real-time performance status', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Show current performance status',
          timeframe: 'real_time'
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include real-time metrics
      expect(textContent.toLowerCase()).toMatch(/current|real.?time|status/);
      expect(textContent).toMatch(/response time|availability|cache/i);
      
      // Should include health indicator
      expect(textContent).toMatch(/health|status|🟢|🟡|🟠|🔴/);
    });
    
    test('should calculate ROI for improvements', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'What is the ROI of improving our page speed?',
          context: {
            business_goal: 'conversion_rate',
            target_improvement: '50% faster load times'
          }
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should include ROI calculations
      expect(textContent.toLowerCase()).toMatch(/roi|return|value|revenue/);
      expect(textContent).toMatch(/\d+%|\$\d+/); // Percentages or dollar amounts
    });
  });
  
  describe('🔄 Cross-Workflow Integration', () => {
    test('should handle multi-workflow request intelligently', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property',
        arguments: {
          intent: 'Launch a secure e-commerce site with great performance and PCI compliance'
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should recognize this touches multiple workflows
      expect(textContent.toLowerCase()).toMatch(/security|performance|infrastructure/);
      
      // Property assistant should handle it but mention other aspects
      expect(textContent).toContain('PCI');
      expect(textContent.toLowerCase()).toContain('performance');
    });
  });
  
  describe('🎯 Intent Recognition', () => {
    test('should handle various ways of expressing the same intent', async () => {
      const intents = [
        'Make my website faster',
        'Improve site performance',
        'Speed up page loading',
        'Reduce load times'
      ];
      
      for (const intent of intents) {
        const response = await sendMCPRequest('tools/call', {
          name: 'performance',
          arguments: { intent }
        });
        
        expect(response).toBeDefined();
        const textContent = response.content[0]?.text || '';
        
        // All should be recognized as performance optimization
        expect(textContent.toLowerCase()).toMatch(/performance|speed|fast|optimize/);
      }
    });
  });
  
  describe('🛡️ Safety and Validation', () => {
    test('DNS assistant should validate risky operations', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'dns',
        arguments: {
          intent: 'Delete all DNS records', // Risky operation
          domain: 'production.com',
          safety_mode: true
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should warn about risks
      expect(textContent.toLowerCase()).toMatch(/risk|warning|careful|safety/);
    });
    
    test('Security assistant should not auto-apply in test mode', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'Block all traffic from China',
          urgency: 'immediate_threat',
          auto_apply: false
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should prepare but not execute
      expect(textContent.toLowerCase()).toMatch(/ready|confirm|review/);
      expect(textContent).not.toMatch(/applied|completed|done/i);
    });
  });
});

describe('Workflow Orchestration E2E Tests', () => {
  let serverProcess: ChildProcess;
  
  // Reuse helper function
  const sendMCPRequest = (method: string, params: any = {}): Promise<any> => {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      };
      
      let response = '';
      
      const handleData = (data: Buffer) => {
        response += data.toString();
        
        const lines = response.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('"jsonrpc"')) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.id === request.id) {
                serverProcess.stdout?.off('data', handleData);
                
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
      
      serverProcess.stdout?.on('data', handleData);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');
      
      setTimeout(() => {
        serverProcess.stdout?.off('data', handleData);
        reject(new Error('Timeout waiting for MCP response'));
      }, 15000); // Longer timeout for workflows
    });
  };
  
  beforeAll(async () => {
    serverProcess = spawn('npm', ['run', 'dev:full'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    await new Promise<void>((resolve) => {
      const checkReady = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Server started') || output.includes('initialized')) {
          serverProcess.stdout?.off('data', checkReady);
          resolve();
        }
      };
      serverProcess.stdout?.on('data', checkReady);
      setTimeout(() => resolve(), 15000);
    });
    
    await sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {}
    });
  }, 30000);
  
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  describe('🔄 Property Workflow Integration', () => {
    test('should execute property creation workflow', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property_workflow',
        arguments: {
          intent: 'create new property for customer acme-corp',
          context: {
            customer: 'acme-corp',
            contractId: 'ctr_test123',
            groupId: 'grp_test456'
          },
          autoExecute: false // Don't actually create in test
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should identify workflow steps
      expect(textContent.toLowerCase()).toMatch(/workflow|steps|plan/);
      expect(textContent).toContain('property');
      
      // Should include validation
      expect(textContent.toLowerCase()).toMatch(/validat|check|confirm/);
    });
    
    test('should handle hostname management workflow', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property_workflow',
        arguments: {
          intent: 'add www.example.com to property prp_12345',
          context: {
            propertyId: 'prp_12345',
            hostname: 'www.example.com'
          },
          autoExecute: false
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should recognize hostname operation
      expect(textContent.toLowerCase()).toContain('hostname');
      expect(textContent).toContain('www.example.com');
    });
  });
  
  describe('🚀 Performance Optimization', () => {
    test('workflow assistants should respond quickly', async () => {
      const assistants = ['property', 'dns', 'security', 'performance'];
      
      for (const assistant of assistants) {
        const start = Date.now();
        
        await sendMCPRequest('tools/call', {
          name: assistant,
          arguments: {
            intent: 'Help me with a simple task'
          }
        });
        
        const duration = Date.now() - start;
        
        // Should respond within 3 seconds
        expect(duration).toBeLessThan(3000);
        console.log(`✅ ${assistant} assistant response time: ${duration}ms`);
      }
    });
    
    test('should handle concurrent workflow assistant requests', async () => {
      const promises = [
        sendMCPRequest('tools/call', {
          name: 'property',
          arguments: { intent: 'List my properties' }
        }),
        sendMCPRequest('tools/call', {
          name: 'dns',
          arguments: { intent: 'Check DNS status' }
        }),
        sendMCPRequest('tools/call', {
          name: 'security',
          arguments: { intent: 'Security overview' }
        }),
        sendMCPRequest('tools/call', {
          name: 'performance',
          arguments: { intent: 'Performance summary' }
        })
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeInstanceOf(Array);
      });
    });
  });
});

console.log(`
═══════════════════════════════════════════════════════════════════
  🌟 Workflow Assistants E2E Test Suite
  👩‍💼 Testing Maya Chen's UX Transformation
  🎯 "From 180 tools to 4 intelligent assistants!"
═══════════════════════════════════════════════════════════════════
`);