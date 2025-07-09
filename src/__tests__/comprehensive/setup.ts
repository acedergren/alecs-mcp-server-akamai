/**
 * Test Setup and Mock Configuration
 * Sets up the test environment without Jest
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Global test utilities
global.describe = (name: string, fn: () => void) => {
  console.log(`\n📦 ${name}`);
  fn();
};

global.it = global.test = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.log(`  ❌ ${name}: ${error}`);
    throw error;
  }
};

global.beforeEach = async (fn: () => Promise<void>) => {
  await fn();
};

global.afterEach = async (fn: () => Promise<void>) => {
  await fn();
};

global.expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (expected: any) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeTruthy: () => {
    if (!actual) {
      throw new Error(`Expected ${actual} to be truthy`);
    }
  },
  toBeFalsy: () => {
    if (actual) {
      throw new Error(`Expected ${actual} to be falsy`);
    }
  },
  toContain: (expected: any) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`);
    }
  },
  toHaveLength: (expected: number) => {
    if (actual.length !== expected) {
      throw new Error(`Expected length ${actual.length} to be ${expected}`);
    }
  },
  toThrow: () => {
    try {
      actual();
      throw new Error('Expected function to throw');
    } catch (e) {
      // Expected
    }
  }
});

// Mock implementation
export const createMockFn = () => {
  const calls: any[] = [];
  const mockFn = (...args: any[]) => {
    calls.push(args);
    return mockFn.mockReturnValue;
  };
  
  mockFn.calls = calls;
  mockFn.mockReturnValue = undefined;
  mockFn.mockReturnValueOnce = (value: any) => {
    mockFn.mockReturnValue = value;
    return mockFn;
  };
  mockFn.mockResolvedValue = (value: any) => {
    mockFn.mockReturnValue = Promise.resolve(value);
    return mockFn;
  };
  mockFn.mockRejectedValue = (error: any) => {
    mockFn.mockReturnValue = Promise.reject(error);
    return mockFn;
  };
  
  return mockFn;
};

// Setup test directories
export async function setupTestDirectories() {
  const dirs = [
    path.join(__dirname, '../../../test-data'),
    path.join(__dirname, '../../../tools/test-utils'),
    path.join(__dirname, 'reports')
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Export for use in tests
export const jest = {
  fn: createMockFn
};