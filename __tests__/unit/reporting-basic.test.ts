import { describe, test, expect } from '@jest/globals';
import { reportingTools } from '../../src/tools/reporting-tools';

describe('Reporting Tools - Basic Tests', () => {
  test('should export reporting tools array', () => {
    expect(reportingTools).toBeDefined();
    expect(Array.isArray(reportingTools)).toBe(true);
    expect(reportingTools.length).toBeGreaterThan(0);
  });

  test('should have core reporting tools', () => {
    const toolNames = reportingTools.map(tool => tool.name);
    
    const coreTools = [
      'get-traffic-summary',
      'get-timeseries-data', 
      'get-performance-benchmarks',
      'get-cost-optimization-insights',
      'create-reporting-dashboard',
      'export-report-data',
      'configure-monitoring-alerts'
    ];

    coreTools.forEach(toolName => {
      expect(toolNames).toContain(toolName);
    });
  });

  test('should have valid tool schemas', () => {
    reportingTools.forEach(tool => {
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    });
  });

  test('should have get-traffic-summary tool with correct schema', () => {
    const tool = reportingTools.find(t => t.name === 'get-traffic-summary');
    expect(tool).toBeDefined();
    
    if (tool) {
      expect(tool.description).toContain('traffic summary');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toContain('period');
    }
  });

  test('should have export tool with format options', () => {
    const tool = reportingTools.find(t => t.name === 'export-report-data');
    expect(tool).toBeDefined();
    
    if (tool) {
      expect(tool.description?.toLowerCase()).toContain('export');
      expect(tool.inputSchema.required).toContain('format');
      expect(tool.inputSchema.required).toContain('metrics');
    }
  });

  test('should have dashboard creation tool', () => {
    const tool = reportingTools.find(t => t.name === 'create-reporting-dashboard');
    expect(tool).toBeDefined();
    
    if (tool) {
      expect(tool.description).toContain('dashboard');
      expect(tool.inputSchema.required).toContain('name');
      expect(tool.inputSchema.required).toContain('widgets');
    }
  });

  test('should have alert configuration tool', () => {
    const tool = reportingTools.find(t => t.name === 'configure-monitoring-alerts');
    expect(tool).toBeDefined();
    
    if (tool) {
      expect(tool.description).toContain('alert');
      expect(tool.inputSchema.required).toContain('thresholds');
    }
  });
});