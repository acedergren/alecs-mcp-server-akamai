/**
 * Reliable Test Setup
 * Global setup for consistent test environment
 */

// Mock console methods to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Suppress known noisy outputs during testing
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Suppress circuit breaker warnings
  if (message.includes('Circuit breaker') || message.includes('WARN:')) {
    return;
  }
  
  // Suppress auth warnings
  if (message.includes('auth') && message.includes('file')) {
    return;
  }
  
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  // Suppress retry warnings
  if (message.includes('Retry') || message.includes('will retry')) {
    return;
  }
  
  originalConsoleWarn(...args);
};

console.log = (...args: any[]) => {
  const message = args.join(' ');
  
  // Only show test completion messages
  if (message.includes('Tests Complete') || message.includes('Summary:')) {
    originalConsoleLog(...args);
  }
};

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.CI = 'true';
process.env.TEST_MODE = 'reliable';

// Mock global modules that cause issues
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(`
[default]
client_token = test-token
client_secret = test-secret  
access_token = test-access
host = test.akamai.com

[testing]
client_token = test-token
client_secret = test-secret
access_token = test-access
host = test.akamai.com
  `),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
}));

// Mock os module
jest.mock('os', () => ({
  homedir: jest.fn().mockReturnValue('/mock/home'),
  platform: jest.fn().mockReturnValue('linux'),
}));

// Global cleanup function
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear module registry for specific modules to prevent state leakage
  const moduleKeys = Object.keys(require.cache);
  const modulesToClear = moduleKeys.filter(key => 
    key.includes('akamai-client') ||
    key.includes('customer-config') ||
    key.includes('resilience-manager') ||
    key.includes('circuit-breaker')
  );
  
  modulesToClear.forEach(key => {
    delete require.cache[key];
  });
});

// Global error handler
process.on('unhandledRejection', (reason) => {
  // Ignore circuit breaker errors in tests
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as Error).message;
    if (message.includes('Circuit breaker') || message.includes('OPEN for')) {
      return;
    }
  }
  
  console.error('Unhandled Rejection:', reason);
});

// Restore console methods after all tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});