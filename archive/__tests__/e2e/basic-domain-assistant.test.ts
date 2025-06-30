/**
 * Basic Domain Assistant Test
 * Quick verification that domain assistants are working
 */

import { spawn, ChildProcess } from 'child_process';
import { createMCPClient } from './test-helpers';

describe('Basic Domain Assistant Test', () => {
  let serverProcess: ChildProcess;
  let client: any;
  
  beforeAll(async () => {
    console.log('🚀 Starting MCP server for basic test...');
    
    serverProcess = spawn('npm', ['run', 'dev:full'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Wait for server
    await new Promise<void>((resolve) => {
      const checkReady = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Server started') || output.includes('initialized')) {
          serverProcess.stdout?.off('data', checkReady);
          resolve();
        }
      };
      serverProcess.stdout?.on('data', checkReady);
      setTimeout(() => resolve(), 10000);
    });
    
    client = createMCPClient(serverProcess);
    await client.initialize();
    
    console.log('✅ Server ready');
  }, 30000);
  
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  test('should list domain assistant tools', async () => {
    const response = await client.listTools();
    
    expect(response).toBeDefined();
    expect(response.tools).toBeInstanceOf(Array);
    
    // Find domain assistants
    const domainAssistants = response.tools.filter((tool: any) => 
      ['property', 'dns', 'security', 'performance'].includes(tool.name)
    );
    
    expect(domainAssistants).toHaveLength(4);
    
    // Verify each has proper description
    domainAssistants.forEach((tool: any) => {
      expect(tool.description).toContain('Maya');
      expect(tool.description).toContain('assistant');
    });
  });
  
  test('should respond to property assistant', async () => {
    const response = await client.callTool('property', {
      intent: 'Help me launch a website'
    });
    
    expect(response).toBeValidMCPResponse();
    
    const text = response.content[0].text;
    expect(text).toContainBusinessTerms([
      'infrastructure',
      'launch',
      'website',
      'cdn',
      'deploy'
    ]);
  });
  
  test('should respond to dns assistant', async () => {
    const response = await client.callTool('dns', {
      intent: 'Help me set up DNS'
    });
    
    expect(response).toBeValidMCPResponse();
    
    const text = response.content[0].text;
    expect(text).toContainBusinessTerms([
      'dns',
      'domain',
      'records',
      'nameserver'
    ]);
  });
  
  test('should respond to security assistant', async () => {
    const response = await client.callTool('security', {
      intent: 'Help me secure my site'
    });
    
    expect(response).toBeValidMCPResponse();
    
    const text = response.content[0].text;
    expect(text).toContainBusinessTerms([
      'security',
      'protect',
      'compliance',
      'threat'
    ]);
  });
  
  test('should respond to performance assistant', async () => {
    const response = await client.callTool('performance', {
      intent: 'Make my site faster'
    });
    
    expect(response).toBeValidMCPResponse();
    
    const text = response.content[0].text;
    expect(text).toContainBusinessTerms([
      'performance',
      'speed',
      'optimize',
      'fast'
    ]);
  });
  
  test('assistants should provide actionable guidance', async () => {
    const response = await client.callTool('property', {
      intent: 'Launch e-commerce site',
      context: {
        business_type: 'ecommerce'
      }
    });
    
    expect(response).toBeValidMCPResponse();
    
    const text = response.content[0].text;
    
    // Should include specific recommendations
    expect(text.toLowerCase()).toMatch(/recommend|suggest|should|step/);
    
    // Should mention e-commerce specifics
    expect(text.toLowerCase()).toContain('e-commerce');
    
    // Should include next steps
    expect(text.toLowerCase()).toMatch(/next step|implementation|deploy/);
  });
});