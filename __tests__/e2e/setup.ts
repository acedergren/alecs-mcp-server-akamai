/**
 * E2E Test Setup
 * Global setup for all E2E tests
 */

import { spawn, ChildProcess } from 'child_process';

// Extend Jest matchers
expect.extend({
  toContainBusinessTerms(received: string, terms: string[]) {
    const text = received.toLowerCase();
    const found = terms.filter(term => text.includes(term.toLowerCase()));
    
    const pass = found.length > 0;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected text not to contain business terms ${found.join(', ')}`
          : `Expected text to contain at least one of: ${terms.join(', ')}`
    };
  },
  
  toBeValidMCPResponse(received: any) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      Array.isArray(received.content) &&
      received.content.length > 0 &&
      received.content[0].type === 'text';
    
    return {
      pass: isValid,
      message: () =>
        isValid
          ? 'Expected not to be a valid MCP response'
          : 'Expected to be a valid MCP response with content array and text type'
    };
  }
});

// Global test configuration
global.testConfig = {
  mcp: {
    startupTimeout: 20000,
    requestTimeout: 10000,
    shutdownTimeout: 5000
  },
  
  retries: {
    max: 3,
    delay: 1000
  },
  
  logging: {
    verbose: process.env.VERBOSE_TESTS === 'true',
    captureServerLogs: process.env.CAPTURE_LOGS === 'true'
  }
};

// Test lifecycle hooks
beforeAll(() => {
  console.log(`
═══════════════════════════════════════════════════════════════════
  🧪 E2E Test Suite Starting
  🌟 Testing MCP Workflows & Domain Assistants
  📅 ${new Date().toISOString()}
═══════════════════════════════════════════════════════════════════
  `);
});

afterAll(() => {
  console.log(`
═══════════════════════════════════════════════════════════════════
  ✅ E2E Test Suite Complete
  📊 Results will be available in test-results/e2e/
═══════════════════════════════════════════════════════════════════
  `);
});

// Helper to ensure clean server shutdown
export async function cleanupServer(serverProcess: ChildProcess): Promise<void> {
  if (!serverProcess || serverProcess.killed) {
    return;
  }
  
  return new Promise((resolve) => {
    serverProcess.on('exit', () => {
      resolve();
    });
    
    // Try graceful shutdown first
    serverProcess.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill('SIGKILL');
      }
      resolve();
    }, global.testConfig.mcp.shutdownTimeout);
  });
}

// Helper to wait for server ready
export async function waitForServerReady(
  serverProcess: ChildProcess
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server startup timeout'));
    }, global.testConfig.mcp.startupTimeout);
    
    const checkReady = (data: Buffer) => {
      const output = data.toString();
      
      if (global.testConfig.logging.verbose) {
        console.log('[Server]', output);
      }
      
      if (
        output.includes('Server started') ||
        output.includes('initialized') ||
        output.includes('MCP server running')
      ) {
        clearTimeout(timeout);
        serverProcess.stdout?.off('data', checkReady);
        resolve();
      }
    };
    
    serverProcess.stdout?.on('data', checkReady);
    serverProcess.stderr?.on('data', (data) => {
      if (global.testConfig.logging.verbose) {
        console.error('[Server Error]', data.toString());
      }
    });
  });
}

// Environment validation
const requiredEnvVars = [
  'NODE_ENV',
  'AKAMAI_CLIENT_SECRET',
  'AKAMAI_HOST',
  'AKAMAI_ACCESS_TOKEN',
  'AKAMAI_CLIENT_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.warn(`
⚠️  Warning: Missing environment variables for E2E tests:
${missingEnvVars.map(v => `   - ${v}`).join('\n')}

Some tests may fail or be skipped.
  `);
}

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toContainBusinessTerms(terms: string[]): R;
      toBeValidMCPResponse(): R;
    }
  }
  
  var testConfig: {
    mcp: {
      startupTimeout: number;
      requestTimeout: number;
      shutdownTimeout: number;
    };
    retries: {
      max: number;
      delay: number;
    };
    logging: {
      verbose: boolean;
      captureServerLogs: boolean;
    };
  };
}