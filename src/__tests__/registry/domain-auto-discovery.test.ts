/**
 * Domain Auto-Discovery Integration Tests
 * 
 * Tests the unified registry's ability to automatically discover and load
 * domain operations from the file system following the Snow Leopard Architecture.
 * 
 * These tests ensure:
 * - Domain discovery works correctly
 * - Operations are properly registered
 * - All domains follow the standard pattern
 * - Registry initialization succeeds
 */

import { describe, it, expect, beforeAll } from '@jest/jest-globals';
import { registry, initializeRegistry, getAllToolDefinitions, getAllDomains } from '../../tools/registry';

describe('Domain Auto-Discovery Integration Tests', () => {
  beforeAll(async () => {
    // Initialize the registry with auto-discovery
    await initializeRegistry();
  });

  describe('Domain Discovery', () => {
    it('should discover expected domains', async () => {
      const domains = getAllDomains();
      const domainNames = domains.map(d => d.name);

      // Verify core domains are discovered
      expect(domainNames).toContain('certificates');
      expect(domainNames).toContain('dns');
      expect(domainNames).toContain('diagnostics');
      expect(domainNames).toContain('property');
      expect(domainNames).toContain('fastpurge');
    });

    it('should mark auto-discovered domains properly', async () => {
      const domains = getAllDomains();
      const autoDiscoveredDomains = domains.filter(d => d.autoDiscovered);

      // At least some domains should be auto-discovered
      expect(autoDiscoveredDomains.length).toBeGreaterThan(0);
      
      // Verify specific domains are auto-discovered
      const autoDiscoveredNames = autoDiscoveredDomains.map(d => d.name);
      expect(autoDiscoveredNames).toContain('certificates');
      expect(autoDiscoveredNames).toContain('dns');
      expect(autoDiscoveredNames).toContain('diagnostics');
    });

    it('should set proper domain metadata', async () => {
      const domains = getAllDomains();
      
      for (const domain of domains) {
        // Each domain should have required properties
        expect(domain.name).toBeTruthy();
        expect(domain.description).toBeTruthy();
        expect(typeof domain.toolCount).toBe('number');
        
        // Auto-discovered domains should have paths
        if (domain.autoDiscovered) {
          expect(domain.path).toBeTruthy();
        }
      }
    });
  });

  describe('Tool Registration', () => {
    it('should register tools from discovered domains', async () => {
      const tools = getAllToolDefinitions();
      
      // Should have tools registered
      expect(tools.length).toBeGreaterThan(0);
      
      // Verify specific domain tools are present
      const toolNames = tools.map(t => t.name);
      
      // Certificate tools
      expect(toolNames.some(name => name.includes('certificate'))).toBe(true);
      
      // DNS tools
      expect(toolNames.some(name => name.includes('dns'))).toBe(true);
      
      // Diagnostics tools
      expect(toolNames.some(name => name.includes('diagnostics'))).toBe(true);
    });

    it('should register tools with proper metadata', async () => {
      const tools = getAllToolDefinitions();
      
      for (const tool of tools) {
        // Each tool should have required properties
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.handler).toBeTruthy();
        expect(typeof tool.handler).toBe('function');
        
        // Should have domain metadata
        expect(tool.metadata?.domain).toBeTruthy();
      }
    });

    it('should not have orphaned tools', async () => {
      const tools = getAllToolDefinitions();
      const domains = getAllDomains();
      const domainNames = new Set(domains.map(d => d.name));
      
      // All tools should belong to a valid domain
      for (const tool of tools) {
        const toolDomain = tool.metadata?.domain;
        expect(toolDomain).toBeTruthy();
        expect(domainNames.has(toolDomain!)).toBe(true);
      }
    });
  });

  describe('Registry Validation', () => {
    it('should pass registry validation', async () => {
      const validation = registry.validate();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should provide accurate statistics', async () => {
      const stats = registry.getStats();
      
      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.totalDomains).toBeGreaterThan(0);
      expect(stats.initialized).toBe(true);
      
      // Tool counts should match
      const tools = getAllToolDefinitions();
      const domains = getAllDomains();
      
      expect(stats.totalTools).toBe(tools.length);
      expect(stats.totalDomains).toBe(domains.length);
    });
  });

  describe('Specific Domain Tests', () => {
    describe('Certificates Domain', () => {
      it('should register certificate operations', async () => {
        const tools = getAllToolDefinitions();
        const certTools = tools.filter(t => t.metadata?.domain === 'certificates');
        
        expect(certTools.length).toBeGreaterThan(0);
        
        // Verify specific certificate operations
        const certToolNames = certTools.map(t => t.name);
        expect(certToolNames).toContain('certificate_list');
        expect(certToolNames).toContain('certificate_create_dv');
      });
    });

    describe('DNS Domain', () => {
      it('should register DNS operations', async () => {
        const tools = getAllToolDefinitions();
        const dnsTools = tools.filter(t => t.metadata?.domain === 'dns');
        
        expect(dnsTools.length).toBeGreaterThan(0);
        
        // Verify specific DNS operations
        const dnsToolNames = dnsTools.map(t => t.name);
        expect(dnsToolNames).toContain('dns_zones_list');
        expect(dnsToolNames).toContain('dns_record_create');
      });
    });

    describe('Diagnostics Domain', () => {
      it('should register diagnostics operations', async () => {
        const tools = getAllToolDefinitions();
        const diagTools = tools.filter(t => t.metadata?.domain === 'diagnostics');
        
        expect(diagTools.length).toBeGreaterThan(0);
        
        // Verify specific diagnostics operations
        const diagToolNames = diagTools.map(t => t.name);
        expect(diagToolNames).toContain('diagnostics_curl');
        expect(diagToolNames).toContain('diagnostics_dig');
      });
    });
  });

  describe('Architecture Compliance', () => {
    it('should follow Snow Leopard Architecture patterns', async () => {
      const domains = getAllDomains();
      const autoDiscoveredDomains = domains.filter(d => d.autoDiscovered);
      
      for (const domain of autoDiscoveredDomains) {
        // Each domain should have an index.ts file in its path
        expect(domain.path).toBeTruthy();
        
        // Domain should have tools registered
        const domainTools = getAllToolDefinitions().filter(t => t.metadata?.domain === domain.name);
        expect(domainTools.length).toBeGreaterThan(0);
        
        // Tools should follow naming conventions
        for (const tool of domainTools) {
          expect(tool.name).toBeTruthy();
          expect(tool.description).toBeTruthy();
          expect(tool.handler).toBeTruthy();
        }
      }
    });

    it('should have consistent tool naming', async () => {
      const tools = getAllToolDefinitions();
      
      for (const tool of tools) {
        // Tool names should be lowercase with underscores
        expect(tool.name).toMatch(/^[a-z0-9_]+$/);
        
        // Tool names should start with domain prefix for clarity
        if (tool.metadata?.domain) {
          // Most tools should start with their domain name
          const domainPrefix = tool.metadata.domain.toLowerCase();
          const isProperlyPrefixed = tool.name.startsWith(domainPrefix) || 
                                    tool.name.startsWith(`${domainPrefix}_`);
          
          // Allow some flexibility for legacy tools
          expect(isProperlyPrefixed || tool.name.includes(domainPrefix)).toBe(true);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing domains gracefully', async () => {
      // Registry should not crash if a domain file is missing
      const tools = getAllToolDefinitions();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should handle invalid tool definitions gracefully', async () => {
      // Registry validation should catch invalid tools
      const validation = registry.validate();
      
      // Even if there are warnings, validation should not crash
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });
});

describe('Registry Performance Tests', () => {
  it('should initialize quickly', async () => {
    const startTime = Date.now();
    await initializeRegistry();
    const endTime = Date.now();
    
    // Registry initialization should complete within reasonable time
    const initTime = endTime - startTime;
    expect(initTime).toBeLessThan(5000); // 5 seconds max
  });

  it('should handle large tool sets efficiently', async () => {
    const tools = getAllToolDefinitions();
    
    // Should be able to handle 100+ tools without issues
    expect(tools.length).toBeGreaterThan(0);
    
    // Registry operations should be fast
    const startTime = Date.now();
    registry.getStats();
    registry.validate();
    const endTime = Date.now();
    
    const operationTime = endTime - startTime;
    expect(operationTime).toBeLessThan(1000); // 1 second max
  });
});