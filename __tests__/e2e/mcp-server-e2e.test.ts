/**
 * 🚀 END-TO-END MCP SERVER TEST
 * Alex Rodriguez: "Testing the ENTIRE MCP experience from start to finish!"
 */

import { spawn, ChildProcess } from 'child_process';
import { AkamaiClient } from '../../src/akamai-client';

describe('🌟 MCP Server End-to-End Tests', () => {
  let serverProcess: ChildProcess;
  let client: AkamaiClient;
  
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
      
      // Timeout after 5 seconds
      setTimeout(() => {
        serverProcess.stdout?.off('data', handleData);
        serverProcess.stderr?.off('data', handleError);
        
        if (errorBuffer) {
          reject(new Error(`Server error: ${errorBuffer}`));
        } else {
          reject(new Error('Timeout waiting for MCP response'));
        }
      }, 5000);
    });
  };
  
  beforeAll(async () => {
    console.log('🚀 Starting MCP server for e2e tests...');
    
    // Start the FULL MCP server (all tools)
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
      
      // Timeout after 10 seconds
      setTimeout(() => {
        serverProcess.stdout?.off('data', checkReady);
        resolve(); // Continue anyway
      }, 10000);
    });
    
    console.log('✅ MCP server started');
    
    // Initialize Akamai client
    client = new AkamaiClient();
  }, 30000);
  
  afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  describe('🔌 Server Initialization', () => {
    test('should respond to initialization request', async () => {
      const response = await sendMCPRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {}
      });
      
      expect(response).toBeDefined();
      expect(response.protocolVersion).toBe('2024-11-05');
      expect(response.capabilities).toBeDefined();
    });
  });
  
  describe('🛠️ Tool Discovery', () => {
    test('should list all available tools', async () => {
      const response = await sendMCPRequest('tools/list');
      
      expect(response).toBeDefined();
      expect(response.tools).toBeInstanceOf(Array);
      expect(response.tools.length).toBeGreaterThan(0);
      
      // Check for essential tools
      const toolNames = response.tools.map((t: any) => t.name);
      expect(toolNames).toContain('list-properties');
      expect(toolNames).toContain('list-contracts');
      
      console.log(`✅ Found ${response.tools.length} tools`);
      
      // Verify tool structure
      for (const tool of response.tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      }
    });
    
    test('should have correct schema for each tool', async () => {
      const response = await sendMCPRequest('tools/list');
      
      for (const tool of response.tools) {
        expect(tool.inputSchema).toHaveProperty('type');
        
        if (tool.inputSchema.type === 'object') {
          expect(tool.inputSchema).toHaveProperty('properties');
        }
      }
    });
  });
  
  describe('🎯 Core Tool Execution', () => {
    test('should execute list_contracts tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'list-contracts',
        arguments: {}
      });
      
      expect(response).toBeDefined();
      expect(response.content).toBeInstanceOf(Array);
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content[0]).toHaveProperty('type', 'text');
    });
    
    test('should handle tool with required parameters', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {
          customer: 'default'
        }
      });
      
      expect(response).toBeDefined();
      expect(response.content).toBeInstanceOf(Array);
    });
    
    test('should provide helpful error for missing parameters', async () => {
      await expect(
        sendMCPRequest('tools/call', {
          name: 'get-property',
          arguments: {} // Missing required propertyId
        })
      ).rejects.toThrow();
    });
  });
  
  describe('🎨 UX Validation - Alex\'s Specialty!', () => {
    test('should handle natural language-style requests gracefully', async () => {
      // Even though MCP expects structured input, error messages should be helpful
      const response = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {
          customer: 'solutionsedge' // Natural customer name
        }
      });
      
      expect(response).toBeDefined();
      expect(response.content).toBeInstanceOf(Array);
    });
    
    test('should maintain context across multiple tool calls', async () => {
      // First call - list properties
      const listResponse = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {}
      });
      
      expect(listResponse).toBeDefined();
      
      // Second call - should work with same context
      const contractsResponse = await sendMCPRequest('tools/call', {
        name: 'list-contracts',
        arguments: {}
      });
      
      expect(contractsResponse).toBeDefined();
    });
    
    test('should provide clear guidance in responses', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {}
      });
      
      expect(response).toBeDefined();
      expect(response.content).toBeInstanceOf(Array);
      
      // Check if response includes helpful next steps
      const textContent = response.content.find((c: any) => c.type === 'text')?.text || '';
      
      // Should include guidance or next steps
      const hasGuidance = textContent.includes('Next') || 
                         textContent.includes('Tip') || 
                         textContent.includes('Note') ||
                         textContent.includes('To ');
                         
      expect(hasGuidance).toBe(true);
    });
  });
  
  describe('🔄 Workflow Integration', () => {
    test('should support property management workflow', async () => {
      // Step 1: List properties
      const listResponse = await sendMCPRequest('tools/call', {
        name: 'list-properties',
        arguments: {}
      });
      
      expect(listResponse).toBeDefined();
      expect(listResponse.content).toBeInstanceOf(Array);
      
      // Step 2: Get property details (if properties exist)
      const textContent = listResponse.content[0]?.text || '';
      const propertyIdMatch = textContent.match(/prp_\d+/);
      
      if (propertyIdMatch) {
        const propertyId = propertyIdMatch[0];
        const detailsResponse = await sendMCPRequest('tools/call', {
          name: 'get-property',
          arguments: { propertyId }
        });
        
        expect(detailsResponse).toBeDefined();
        expect(detailsResponse.content).toBeInstanceOf(Array);
      }
    });
  });
  
  describe('🛡️ Error Handling and Resilience', () => {
    test('should handle invalid tool names gracefully', async () => {
      await expect(
        sendMCPRequest('tools/call', {
          name: 'non_existent_tool',
          arguments: {}
        })
      ).rejects.toThrow();
    });
    
    test('should validate input parameters', async () => {
      await expect(
        sendMCPRequest('tools/call', {
          name: 'list-properties',
          arguments: {
            limit: 'not-a-number' // Invalid type
          }
        })
      ).rejects.toThrow();
    });
  });
  
  describe('📊 Performance and Scalability', () => {
    test('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      // Send 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(
          sendMCPRequest('tools/call', {
            name: 'list-contracts',
            arguments: {}
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeInstanceOf(Array);
      });
    });
    
    test('should respond within reasonable time', async () => {
      const start = Date.now();
      
      await sendMCPRequest('tools/call', {
        name: 'list-contracts',
        arguments: {}
      });
      
      const duration = Date.now() - start;
      
      // Should respond within 2 seconds for good UX
      expect(duration).toBeLessThan(2000);
      console.log(`✅ Response time: ${duration}ms`);
    });
  });
});

// Alex's sign-off
console.log(`
═══════════════════════════════════════════════════════════════════
  🎯 E2E Test Suite by Alex Rodriguez
  📧 alex.rodriguez@solutionsedge.io
  🌟 "Testing the ENTIRE journey, not just the destination!"
═══════════════════════════════════════════════════════════════════
`);