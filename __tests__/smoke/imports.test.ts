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

  it('should import core modules without errors', () => {
    expect(() => {
      require('../../src/index');
    }).not.toThrow();
  });

  it('should import tool modules without errors', () => {
    const toolModules = [
      '../../src/tools/property/consolidated-property-tools',
      '../../src/tools/dns/consolidated-dns-tools',
      '../../src/tools/fastpurge/consolidated-fastpurge-tools',
      '../../src/tools/certificates/consolidated-certificate-tools',
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