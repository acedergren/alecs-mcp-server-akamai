/**
 * Critical Path Test: Can MCP Server Start?
 * The most basic requirement - server should initialize
 */

import { spawn } from 'child_process';
import * as path from 'path';

describe('Critical: MCP Server Startup', () => {
  it('should start without crashing', (done) => {
    const serverPath = path.join(__dirname, '../../src/index.ts');
    
    // Try to spawn the server
    const server = spawn('npx', ['tsx', serverPath], {
      env: { 
        ...process.env,
        MCP_TRANSPORT: 'stdio',
        NODE_ENV: 'test'
      },
      timeout: 5000
    });
    
    let hasError = false;
    
    server.on('error', (error) => {
      hasError = true;
      done(new Error(`Server failed to start: ${error.message}`));
    });
    
    // Give it a moment to crash if it's going to
    setTimeout(() => {
      if (!hasError) {
        server.kill();
        done();
      }
    }, 1000);
  });

  it('should have modular server factory', () => {
    // Just verify the module structure is correct
    const factory = require('../../src/utils/modular-server-factory');
    
    expect(factory).toBeDefined();
    expect(factory.createModularServer).toBeDefined();
    expect(typeof factory.createModularServer).toBe('function');
  });
});