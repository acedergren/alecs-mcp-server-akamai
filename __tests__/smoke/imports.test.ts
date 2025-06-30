/**
 * Smoke Test: Do the main modules load without exploding?
 * Tests basic import integrity.
 */

describe('Import Smoke Test', () => {
  it('should import AkamaiClient without errors', () => {
    expect(() => {
      require('../../src/akamai-client');
    }).not.toThrow();
  });

  it('should import MCP server without errors', () => {
    expect(() => {
      require('../../src/mcp-server');
    }).not.toThrow();
  });

  it('should import tool modules without errors', () => {
    const toolModules = [
      '../../src/tools/property-manager',
      '../../src/tools/dns-tools',
      '../../src/tools/fast-purge',
      '../../src/tools/certificate-tools',
    ];
    
    toolModules.forEach(module => {
      expect(() => {
        require(module);
      }).not.toThrow();
    });
  });

  it('should have required environment setup', () => {
    // Just check that we can access process.env
    expect(process.env).toBeDefined();
    expect(typeof process.env).toBe('object');
  });
});