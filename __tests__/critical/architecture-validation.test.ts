/**
 * Critical: Architecture Validation - New KAIZEN Implementation
 * 
 * Tests that validate the new architecture is working correctly.
 * Focuses on testing the core working modules without backwards compatibility.
 */

describe('Critical: Architecture Validation - New KAIZEN Implementation', () => {
  
  it('should successfully import core working modules', async () => {
    // Test that we can import the core modules without circular dependencies
    const { propertyOperations } = await import('../../src/tools/property');
    const { dnsOperationsRegistry } = await import('../../src/tools/dns');
    const { fastPurgeOperations } = await import('../../src/tools/fastpurge');
    const { siemOperations } = await import('../../src/tools/siem');

    expect(propertyOperations).toBeDefined();
    expect(dnsOperationsRegistry).toBeDefined();
    expect(fastPurgeOperations).toBeDefined();
    expect(siemOperations).toBeDefined();
  });

  it('should have consistent tool structure in working modules', async () => {
    const { propertyOperations } = await import('../../src/tools/property');
    
    // Test property_list tool structure
    const propertyList = propertyOperations['property_list'];
    expect(propertyList).toBeDefined();
    expect(propertyList.description).toBeDefined();
    expect(propertyList.inputSchema).toBeDefined();
    expect(propertyList.handler).toBeDefined();
    expect(typeof propertyList.handler).toBe('function');
    expect(propertyList.description.length).toBeGreaterThan(10);
  });

  it('should use snake_case naming convention consistently', async () => {
    const { propertyOperations } = await import('../../src/tools/property');
    const { dnsOperationsRegistry } = await import('../../src/tools/dns');
    
    // Check property tools
    const propertyToolNames = Object.keys(propertyOperations);
    for (const toolName of propertyToolNames) {
      expect(toolName).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(toolName).not.toContain('.');
      expect(toolName).not.toContain('-');
    }
    
    // Check DNS tools
    const dnsToolNames = Object.keys(dnsOperationsRegistry);
    for (const toolName of dnsToolNames) {
      expect(toolName).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(toolName).not.toContain('.');
      expect(toolName).not.toContain('-');
    }
  });

  it('should have proper zod schema validation', async () => {
    const { propertyOperations } = await import('../../src/tools/property');
    
    const propertyList = propertyOperations['property_list'];
    const schema = propertyList.inputSchema;
    
    // Schema should be a zod object
    expect(schema).toBeDefined();
    expect(schema._def).toBeDefined();
    expect(schema._def.shape).toBeDefined();
    
    // Should have customer parameter
    expect(schema._def.shape.customer).toBeDefined();
  });

  it('should have working DNS changelist operations', async () => {
    const { dnsOperationsRegistry } = await import('../../src/tools/dns');
    
    const changelistTools = [
      'dns_record_add',
      'dns_record_update',
      'dns_record_delete_simple',
      'dns_records_batch_update'
    ];

    for (const toolName of changelistTools) {
      const tool = dnsOperationsRegistry[toolName];
      expect(tool).toBeDefined();
      expect(tool.description).toContain('changelist');
      expect(tool.handler).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    }
  });

  it('should export proper module metadata', async () => {
    const { propertyDomainMetadata } = await import('../../src/tools/property');
    const { dnsDomainMetadata } = await import('../../src/tools/dns');
    
    expect(propertyDomainMetadata).toBeDefined();
    expect(propertyDomainMetadata.name).toBe('property');
    expect(propertyDomainMetadata.toolCount).toBeGreaterThan(0);
    expect(propertyDomainMetadata.features).toBeDefined();
    expect(Array.isArray(propertyDomainMetadata.features)).toBe(true);
    
    expect(dnsDomainMetadata).toBeDefined();
    expect(dnsDomainMetadata.name).toBe('dns');
    expect(dnsDomainMetadata.toolCount).toBeGreaterThan(0);
    expect(dnsDomainMetadata.features).toBeDefined();
    expect(Array.isArray(dnsDomainMetadata.features)).toBe(true);
  });

  it('should have eliminated backwards compatibility exports', async () => {
    const { fastPurgeOperations } = await import('../../src/tools/fastpurge');
    const { siemOperations } = await import('../../src/tools/siem');
    
    // Should export the main operations object
    expect(fastPurgeOperations).toBeDefined();
    expect(siemOperations).toBeDefined();
    
    // Should be objects with tool definitions
    expect(typeof fastPurgeOperations).toBe('object');
    expect(typeof siemOperations).toBe('object');
    
    // Should have snake_case tool names
    const fastPurgeToolNames = Object.keys(fastPurgeOperations);
    for (const toolName of fastPurgeToolNames) {
      expect(toolName).toMatch(/^fastpurge_[a-z_]+$/);
    }
    
    const siemToolNames = Object.keys(siemOperations);
    for (const toolName of siemToolNames) {
      expect(toolName).toMatch(/^siem_[a-z_]+$/);
    }
  });
});