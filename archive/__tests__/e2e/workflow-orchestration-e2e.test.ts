/**
 * Workflow Orchestration End-to-End Tests
 * Testing complex multi-step workflows and tool chaining
 */

import { spawn, ChildProcess } from 'child_process';

describe('Workflow Orchestration E2E Tests', () => {
  let serverProcess: ChildProcess;
  
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
      
      setTimeout(() => {
        serverProcess.stdout?.off('data', handleData);
        serverProcess.stderr?.off('data', handleError);
        
        if (errorBuffer) {
          reject(new Error(`Server error: ${errorBuffer}`));
        } else {
          reject(new Error('Timeout waiting for MCP response'));
        }
      }, 20000); // Longer timeout for complex workflows
    });
  };
  
  beforeAll(async () => {
    console.log('🚀 Starting MCP server for workflow tests...');
    
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
    
    console.log('✅ MCP server ready for workflow tests');
  }, 30000);
  
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  describe('🏗️ Property Creation Workflow', () => {
    test('should orchestrate complete property creation flow', async () => {
      // Step 1: List available contracts
      const contractsResponse = await sendMCPRequest('tools/call', {
        name: 'list-contracts',
        arguments: {}
      });
      
      expect(contractsResponse).toBeDefined();
      expect(contractsResponse.content).toBeInstanceOf(Array);
      
      // Step 2: List groups
      const groupsResponse = await sendMCPRequest('tools/call', {
        name: 'list-groups',
        arguments: {}
      });
      
      expect(groupsResponse).toBeDefined();
      
      // Step 3: List products
      const productsResponse = await sendMCPRequest('tools/call', {
        name: 'list-products',
        arguments: {}
      });
      
      expect(productsResponse).toBeDefined();
      
      // Verify workflow can be executed
      const workflowResponse = await sendMCPRequest('tools/call', {
        name: 'property_workflow',
        arguments: {
          intent: 'create property with basic setup',
          context: {
            propertyName: 'test-workflow-property',
            contractIds: ['ctr_test',
            groupId: 'grp_test',
            productId: 'prd_test'
          },
          autoExecute: false // Don't actually execute
        }
      });
      
      expect(workflowResponse).toBeDefined();
      const textContent = workflowResponse.content[0]?.text || '';
      
      // Should show workflow plan
      expect(textContent.toLowerCase()).toMatch(/workflow|plan|steps/);
      expect(textContent).toContain('property');
    });
  });
  
  describe('🌐 DNS Migration Workflow', () => {
    test('should orchestrate DNS migration with safety checks', async () => {
      // Simulate DNS migration workflow
      const steps = [
        // Step 1: Analyze current DNS
        {
          tool: 'dns',
          args: {
            intent: 'Analyze current DNS setup for example.com',
            domain: 'example.com'
          }
        },
        // Step 2: Create migration plan
        {
          tool: 'dns',
          args: {
            intent: 'Create migration plan from Cloudflare',
            domain: 'example.com',
            context: {
              current_provider: 'cloudflare',
              risk_tolerance: 'zero_downtime'
            }
          }
        },
        // Step 3: Validate before migration
        {
          tool: 'dns',
          args: {
            intent: 'Validate DNS records before migration',
            domain: 'example.com',
            safety_mode: true
          }
        }
      ];
      
      const results = [];
      
      for (const step of steps) {
        const response = await sendMCPRequest('tools/call', {
          name: step.tool,
          arguments: step.args
        });
        
        expect(response).toBeDefined();
        results.push(response);
      }
      
      // All steps should complete
      expect(results).toHaveLength(3);
      
      // Should maintain context across steps
      const lastResponse = results[2].content[0]?.text || '';
      expect(lastResponse.toLowerCase()).toMatch(/validat|check|confirm/);
    });
  });
  
  describe('🛡️ Security Incident Response Workflow', () => {
    test('should orchestrate immediate threat response', async () => {
      // Step 1: Assess threat
      const assessResponse = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'Assess current bot attack severity',
          urgency: 'immediate_threat'
        }
      });
      
      expect(assessResponse).toBeDefined();
      const assessText = assessResponse.content[0]?.text || '';
      expect(assessText.toLowerCase()).toContain('immediate');
      
      // Step 2: Get mitigation plan
      const mitigateResponse = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'Apply bot attack mitigation',
          urgency: 'immediate_threat',
          auto_apply: false // Don't actually apply
        }
      });
      
      expect(mitigateResponse).toBeDefined();
      const mitigateText = mitigateResponse.content[0]?.text || '';
      expect(mitigateText.toLowerCase()).toMatch(/bot|protection|mitigation/);
      
      // Step 3: Set up monitoring
      const monitorResponse = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Monitor attack mitigation effectiveness',
          timeframe: 'real_time'
        }
      });
      
      expect(monitorResponse).toBeDefined();
      const monitorText = monitorResponse.content[0]?.text || '';
      expect(monitorText.toLowerCase()).toMatch(/monitor|status|real.?time/);
    });
  });
  
  describe('📊 Performance Optimization Workflow', () => {
    test('should orchestrate performance improvement workflow', async () => {
      // Step 1: Analyze current performance
      const analysisResponse = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Analyze current website performance',
          timeframe: 'last_week'
        }
      });
      
      expect(analysisResponse).toBeDefined();
      
      // Step 2: Get optimization recommendations
      const optimizeResponse = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Recommend performance optimizations',
          context: {
            business_goal: 'conversion_rate',
            current_pain_points: ['slow_pages']
          }
        }
      });
      
      expect(optimizeResponse).toBeDefined();
      const optimizeText = optimizeResponse.content[0]?.text || '';
      expect(optimizeText.toLowerCase()).toMatch(/optimization|improve|performance/);
      
      // Step 3: Calculate ROI
      const roiResponse = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Calculate ROI of recommended optimizations',
          context: {
            target_improvement: '50% faster'
          }
        }
      });
      
      expect(roiResponse).toBeDefined();
      const roiText = roiResponse.content[0]?.text || '';
      expect(roiText.toLowerCase()).toMatch(/roi|value|return/);
    });
  });
  
  describe('🔄 Cross-Domain Workflows', () => {
    test('should coordinate multiple assistants for complex request', async () => {
      // Complex request that needs multiple domains
      const scenario = 'Launch secure e-commerce site with optimal performance';
      
      // Step 1: Infrastructure setup
      const infraResponse = await sendMCPRequest('tools/call', {
        name: 'property',
        arguments: {
          intent: scenario,
          context: {
            business_type: 'ecommerce',
            compliance_needs: ['pci']
          }
        }
      });
      
      expect(infraResponse).toBeDefined();
      
      // Step 2: Security configuration
      const securityResponse = await sendMCPRequest('tools/call', {
        name: 'security',
        arguments: {
          intent: 'Configure security for e-commerce with PCI',
          context: {
            business_type: 'retail',
            compliance_requirements: ['pci']
          }
        }
      });
      
      expect(securityResponse).toBeDefined();
      
      // Step 3: Performance optimization
      const perfResponse = await sendMCPRequest('tools/call', {
        name: 'performance',
        arguments: {
          intent: 'Optimize e-commerce checkout performance',
          context: {
            business_goal: 'conversion_rate',
            critical_pages: ['/checkout', '/cart']
          }
        }
      });
      
      expect(perfResponse).toBeDefined();
      
      // All responses should be relevant to e-commerce
      const responses = [infraResponse, securityResponse, perfResponse];
      responses.forEach(response => {
        const text = response.content[0]?.text || '';
        expect(text.toLowerCase()).toMatch(/e.?commerce|retail|checkout|payment/);
      });
    });
  });
  
  describe('⚡ Workflow Performance', () => {
    test('should complete multi-step workflow within reasonable time', async () => {
      const start = Date.now();
      
      // Execute a 3-step workflow
      const steps = [
        sendMCPRequest('tools/call', {
          name: 'list-contracts',
          arguments: {}
        }),
        sendMCPRequest('tools/call', {
          name: 'list-groups',
          arguments: {}
        }),
        sendMCPRequest('tools/call', {
          name: 'list-products',
          arguments: {}
        })
      ];
      
      await Promise.all(steps);
      
      const duration = Date.now() - start;
      
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      console.log(`✅ 3-step workflow completed in ${duration}ms`);
    });
    
    test('should handle workflow errors gracefully', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property_workflow',
        arguments: {
          intent: 'invalid workflow request with missing data',
          context: {} // Missing required fields
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should provide helpful error message
      expect(textContent.toLowerCase()).toMatch(/error|invalid|missing|required/);
      
      // Should suggest correct usage
      expect(textContent.toLowerCase()).toMatch(/example|try|instead/);
    });
  });
  
  describe('🔐 Workflow Safety', () => {
    test('should prevent dangerous operations in workflows', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'dns',
        arguments: {
          intent: 'Delete all records and start fresh',
          domain: 'production-critical.com',
          safety_mode: true
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should warn about dangerous operation
      expect(textContent.toLowerCase()).toMatch(/warning|danger|risk|careful/);
      
      // Should require confirmation
      expect(textContent.toLowerCase()).toMatch(/confirm|sure|proceed/);
    });
    
    test('should validate workflow prerequisites', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'property_workflow',
        arguments: {
          intent: 'activate property to production',
          context: {
            propertyId: 'prp_nonexistent'
          }
        }
      });
      
      expect(response).toBeDefined();
      const textContent = response.content[0]?.text || '';
      
      // Should check prerequisites
      expect(textContent.toLowerCase()).toMatch(/check|validat|prerequisite|first/);
    });
  });
});

describe('Tool Chaining Integration Tests', () => {
  let serverProcess: ChildProcess;
  
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
        reject(new Error('Timeout'));
      }, 10000);
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
  
  describe('🔗 Sequential Tool Chaining', () => {
    test('should pass context between chained tools', async () => {
      // Chain: List properties -> Get property details -> Get property rules
      
      // Step 1: List properties
      const listResponse = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {}
      });
      
      expect(listResponse).toBeDefined();
      const listText = listResponse.content[0]?.text || '';
      
      // Extract property ID if available
      const propertyMatch = listText.match(/prp_\d+/);
      
      if (propertyMatch) {
        const propertyId = propertyMatch[0];
        
        // Step 2: Get property details
        const detailsResponse = await sendMCPRequest('tools/call', {
          name: 'get-property',
          arguments: { propertyId }
        });
        
        expect(detailsResponse).toBeDefined();
        
        // Step 3: Get property rules
        const rulesResponse = await sendMCPRequest('tools/call', {
          name: 'get-property-rules',
          arguments: { 
            propertyId,
            version: 'latest'
          }
        });
        
        expect(rulesResponse).toBeDefined();
        
        // Verify chain completed successfully
        expect(rulesResponse.content).toBeInstanceOf(Array);
      }
    });
  });
  
  describe('🔀 Parallel Tool Execution', () => {
    test('should execute independent tools in parallel', async () => {
      const start = Date.now();
      
      // Execute multiple independent tools in parallel
      const parallelCalls = [
        sendMCPRequest('tools/call', {
          name: 'list-contracts',
          arguments: {}
        }),
        sendMCPRequest('tools/call', {
          name: 'list-zones',
          arguments: {}
        }),
        sendMCPRequest('tools/call', {
          name: 'list-network-lists',
          arguments: {}
        }),
        sendMCPRequest('tools/call', {
          name: 'list-certificate-enrollments',
          arguments: {}
        })
      ];
      
      const results = await Promise.all(parallelCalls);
      
      const duration = Date.now() - start;
      
      // All should succeed
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeInstanceOf(Array);
      });
      
      // Should be faster than sequential execution
      console.log(`✅ Parallel execution of 4 tools completed in ${duration}ms`);
      expect(duration).toBeLessThan(4000); // Should be much faster than 4 sequential calls
    });
  });
  
  describe('🎭 Conditional Tool Chaining', () => {
    test('should branch based on tool results', async () => {
      // Check if property exists, then either get details or suggest creation
      
      const listResponse = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {}
      });
      
      expect(listResponse).toBeDefined();
      const listText = listResponse.content[0]?.text || '';
      
      if (listText.includes('prp_')) {
        // Property exists - get details
        const propertyMatch = listText.match(/prp_\d+/);
        const propertyId = propertyMatch![0];
        
        const detailsResponse = await sendMCPRequest('tools/call', {
          name: 'get-property',
          arguments: { propertyId }
        });
        
        expect(detailsResponse).toBeDefined();
        expect(detailsResponse.content[0]?.text).toContain(propertyId);
      } else {
        // No properties - suggest creation workflow
        const workflowResponse = await sendMCPRequest('tools/call', {
          name: 'property_workflow',
          arguments: {
            intent: 'help me create my first property',
            autoExecute: false
          }
        });
        
        expect(workflowResponse).toBeDefined();
        expect(workflowResponse.content[0]?.text).toMatch(/create|new|property/i);
      }
    });
  });
  
  describe('🔁 Retry and Error Recovery', () => {
    test('should handle transient errors in tool chains', async () => {
      // Test error recovery by calling a tool that might fail
      let attempts = 0;
      let lastError: Error | null = null;
      
      while (attempts < 3) {
        try {
          const response = await sendMCPRequest('tools/call', {
            name: 'get-property',
            arguments: {
              propertyId: 'prp_might_not_exist'
            }
          });
          
          // If successful, verify response
          expect(response).toBeDefined();
          break;
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          if (attempts < 3) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Should either succeed or fail with meaningful error
      if (lastError) {
        expect(lastError.message).toBeTruthy();
        expect(attempts).toBe(3); // Tried all attempts
      }
    });
  });
});

console.log(`
═══════════════════════════════════════════════════════════════════
  🔄 Workflow Orchestration E2E Test Suite
  🎯 Testing complex multi-step workflows
  🔗 Tool chaining and orchestration validation
  ✨ "Making complex simple through intelligent workflows!"
═══════════════════════════════════════════════════════════════════
`);