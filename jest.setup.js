// Jest setup file

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Cleanup cache after each test to prevent timer leaks
afterEach(async () => {
  jest.clearAllMocks();
  
  // Clean up cache timers to prevent worker hangs
  try {
    const { resetDefaultCache } = require('./src/services/unified-cache-service');
    await resetDefaultCache();
  } catch (error) {
    // Cache might not be initialized, ignore
  }
  
  // Clean up purge queue manager
  try {
    const { PurgeQueueManager } = require('./src/services/PurgeQueueManager');
    const instance = PurgeQueueManager.getInstance();
    await instance.shutdown();
  } catch (error) {
    // Might not be initialized, ignore
  }
});

// Force cleanup on exit
afterAll(async () => {
  // Ensure all intervals are cleared
  try {
    const { resetDefaultCache } = require('./src/services/unified-cache-service');
    await resetDefaultCache();
  } catch (error) {
    // Ignore
  }
});