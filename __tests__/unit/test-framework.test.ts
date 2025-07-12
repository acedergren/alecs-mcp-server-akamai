/**
 * Test Framework Validation
 * 
 * Ensures the testing framework components work correctly
 */

import { TestDataGenerator } from '../../testing/test-framework';

describe('Test Framework', () => {
  it('should generate valid property test data', () => {
    const property = TestDataGenerator.generateProperty();
    
    expect(property).toBeDefined();
    expect(property.propertyId).toMatch(/^prp_\d+$/);
    expect(property.propertyName).toBeTruthy();
    expect(property.contractId).toMatch(/^ctr_/);
    expect(property.groupId).toMatch(/^grp_/);
  });
  
  it('should generate valid DNS zone test data', () => {
    const zone = TestDataGenerator.generateDnsZone();
    
    expect(zone).toBeDefined();
    expect(zone.zone).toMatch(/\.com$/);
    expect(zone.type).toBe('PRIMARY');
    expect(zone.contractId).toMatch(/^ctr_/);
  });
  
  it('should generate valid error responses', () => {
    const error403 = TestDataGenerator.generateErrorResponse(403, 'Access denied');
    
    expect(error403).toBeDefined();
    expect(error403.type).toBe('https://problems.luna.akamaiapis.net/common/error');
    expect(error403.title).toBe('Error 403');
    expect(error403.detail).toBe('Access denied');
    expect(error403.status).toBe(403);
  });
});