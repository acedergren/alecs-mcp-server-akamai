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
      'dist/servers/property-server.js',
      'dist/servers/dns-server.js',
      'dist/servers/certs-server.js',
    ];
    
    files.forEach(file => {
      const filePath = path.join(__dirname, '../../', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});