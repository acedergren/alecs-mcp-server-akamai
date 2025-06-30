/**
 * Simple MCP E2E Test
 * Basic test to verify MCP server is working
 */

import { spawn, ChildProcess } from 'child_process';
import { createMCPClient } from './test-helpers';

describe('Simple MCP Test', () => {
  let serverProcess: ChildProcess;
  let client: any;
  
  beforeAll(async () => {
    console.log('Starting MCP server...');
    
    serverProcess = spawn('npm', ['run', 'dev:full'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { 
        ...process.env,
        NODE_ENV: 'test',
        AKAMAI_CLIENT_SECRET: process.env.AKAMAI_CLIENT_SECRET,
        AKAMAI_HOST: process.env.AKAMAI_HOST,
        AKAMAI_ACCESS_TOKEN: process.env.AKAMAI_ACCESS_TOKEN,
        AKAMAI_CLIENT_TOKEN: process.env.AKAMAI_CLIENT_TOKEN,
        AKAMAI_ACCOUNT_KEY: process.env.AKAMAI_ACCOUNT_KEY
      }
    });
    
    // Wait for server
    await new Promise<void>((resolve) => {
      const checkReady = (data: Buffer) => {
        const output = data.toString();
        console.log('[Server]', output);
        if (output.includes('Server started') || output.includes('initialized') || output.includes('MCP server running')) {
          serverProcess.stdout?.off('data', checkReady);
          resolve();
        }
      };
      serverProcess.stdout?.on('data', checkReady);
      serverProcess.stderr?.on('data', (data) => {
        console.error('[Server Error]', data.toString());
      });
      setTimeout(() => resolve(), 15000);
    });
    
    client = createMCPClient(serverProcess);
    
    console.log('Initializing MCP connection...');
    await client.initialize();
    console.log('MCP initialized successfully');
  }, 30000);
  
  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
  
  test('should list tools', async () => {
    const response = await client.listTools();
    
    expect(response).toBeDefined();
    expect(response.tools).toBeInstanceOf(Array);
    expect(response.tools.length).toBeGreaterThan(0);
    
    console.log(`Found ${response.tools.length} tools`);
    
    // Check for workflow assistants
    const workflowAssistants = response.tools.filter((tool: any) => 
      ['infrastructure', 'dns', 'security', 'performance'].includes(tool.name)
    );
    
    console.log('Workflow assistants:', workflowAssistants.map((t: any) => t.name));
    expect(workflowAssistants.length).toBe(4);
  });
  
  test('should call infrastructure assistant', async () => {
    const response = await client.callTool('infrastructure', {
      intent: 'Help me get started'
    });
    
    expect(response).toBeDefined();
    expect(response.content).toBeInstanceOf(Array);
    expect(response.content[0]).toHaveProperty('type', 'text');
    
    const text = response.content[0].text;
    console.log('Infrastructure assistant response:', text.substring(0, 200) + '...');
    
    // Simple checks without custom matchers
    expect(text.toLowerCase()).toContain('infrastructure');
  });
});