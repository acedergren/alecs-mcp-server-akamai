/**
 * Simple test to validate property consolidation
 */

import { property } from '../../../domains/property';

describe('Property Consolidation Basic Test', () => {
  it('should export property API', () => {
    expect(property).toBeDefined();
    expect(property.list).toBeDefined();
    expect(property.get).toBeDefined();
    expect(property.create).toBeDefined();
    expect(property.version).toBeDefined();
    expect(property.version.create).toBeDefined();
    expect(property.activation).toBeDefined();
    expect(property.activation.create).toBeDefined();
  });
  
  it('should have correct function types', () => {
    expect(typeof property.list).toBe('function');
    expect(typeof property.get).toBe('function');
    expect(typeof property.create).toBe('function');
  });
});