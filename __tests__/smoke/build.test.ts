/**
 * Smoke Test: Can the project build?
 * If this fails, nothing else matters.
 */

describe('Build Smoke Test', () => {
  it('should have a dist directory after build', () => {
    // This test runs AFTER npm run build in CI
    const fs = require('fs');
    const path = require('path');
    
    const distPath = path.join(__dirname, '../../dist');
    expect(fs.existsSync(distPath)).toBe(true);
  });

  it('should have compiled index.js', () => {
    const fs = require('fs');
    const path = require('path');
    
    const indexPath = path.join(__dirname, '../../dist/index.js');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should have modular server files', () => {
    const fs = require('fs');
    const path = require('path');
    
    const files = [
      'dist/servers/property-server-alecscore.js',
      'dist/servers/dns-server-alecscore.js',
      'dist/servers/certs-server-alecscore.js',
      'dist/servers/security-server-alecscore.js',
      'dist/servers/reporting-server-alecscore.js',
      'dist/servers/fastpurge-server-alecscore.js',
      'dist/servers/siem-server-alecscore.js',
    ];
    
    files.forEach(file => {
      const filePath = path.join(__dirname, '../../', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});