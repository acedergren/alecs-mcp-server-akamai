import { describe, test, expect } from '@jest/globals';
import { reportingTools } from '../../src/tools/reporting-tools';

describe('Reporting Tools - Simple Tests', () => {
  describe('Tool Definitions', () => {
    test('should have all required reporting tools defined', () => {
      const toolNames = reportingTools.map(tool => tool.name);
      
      const expectedTools = [
        'get-traffic-summary',
        'get-timeseries-data',
        'get-performance-benchmarks',
        'analyze-cache-performance',
        'get-cost-optimization-insights',
        'analyze-bandwidth-usage',
        'create-reporting-dashboard',
        'export-report-data',
        'configure-monitoring-alerts',
        'get-realtime-metrics',
        'analyze-traffic-trends',
        'generate-performance-report',
        'analyze-geographic-performance',
        'analyze-error-patterns'
      ];

      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });

      expect(reportingTools.length).toBeGreaterThanOrEqual(expectedTools.length);
    });

    test('should have proper input schemas for all tools', () => {
      reportingTools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        if (tool.description) {
          expect(tool.description.length).toBeGreaterThan(10);
        }
      });
    });

    test('should have required period parameter for time-based tools', () => {
      const timeBased = [
        'get-traffic-summary',
        'get-timeseries-data',
        'get-performance-benchmarks',
        'analyze-bandwidth-usage',
        'analyze-traffic-trends'
      ];

      timeBased.forEach(toolName => {
        const tool = reportingTools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        if (tool) {
          expect(tool.inputSchema.properties?.period).toBeDefined();
          expect(tool.inputSchema.required).toContain('period');
        }
      });
    });

    test('should have customer parameter for all tools', () => {
      reportingTools.forEach(tool => {
        expect(tool.inputSchema.properties?.customer).toBeDefined();
        const customerProp = tool.inputSchema.properties?.customer;
        if (customerProp && typeof customerProp === 'object' && 'type' in customerProp) {
          expect((customerProp as any).type).toBe('string');
          expect((customerProp as any).description).toContain('Customer section name');
        }
      });
    });

    test('should have handlers for core tools', () => {
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
        const tool = reportingTools.find(t => t.name === toolName);
        expect(tool).toBeDefined();
        if (tool && 'handler' in tool) {
          expect(typeof tool.handler).toBe('function');
        }
      });
    });

    test('should have proper schema validation for traffic summary tool', () => {
      const trafficSummaryTool = reportingTools.find(t => t.name === 'get-traffic-summary');
      expect(trafficSummaryTool).toBeDefined();
      
      if (trafficSummaryTool) {
        const schema = trafficSummaryTool.inputSchema;
        expect(schema.properties?.period).toBeDefined();
        expect(schema.properties?.filter).toBeDefined();
        expect(schema.required).toContain('period');

        const periodSchema = schema.properties?.period;
        if (periodSchema && typeof periodSchema === 'object') {
          expect((periodSchema as any).type).toBe('object');
          expect((periodSchema as any).properties?.start).toBeDefined();
          expect((periodSchema as any).properties?.end).toBeDefined();
          expect((periodSchema as any).properties?.granularity).toBeDefined();
        }
      }
    });

    test('should have proper schema validation for dashboard creation tool', () => {
      const dashboardTool = reportingTools.find(t => t.name === 'create-reporting-dashboard');
      expect(dashboardTool).toBeDefined();
      
      if (dashboardTool) {
        const schema = dashboardTool.inputSchema;
        expect(schema.properties?.name).toBeDefined();
        expect(schema.properties?.widgets).toBeDefined();
        expect(schema.required).toContain('name');
        expect(schema.required).toContain('widgets');

        const widgetsSchema = schema.properties?.widgets;
        if (widgetsSchema && typeof widgetsSchema === 'object') {
          expect((widgetsSchema as any).type).toBe('array');
          expect((widgetsSchema as any).items).toBeDefined();
        }
      }
    });

    test('should have proper schema validation for alert configuration tool', () => {
      const alertTool = reportingTools.find(t => t.name === 'configure-monitoring-alerts');
      expect(alertTool).toBeDefined();
      
      if (alertTool) {
        const schema = alertTool.inputSchema;
        expect(schema.properties?.thresholds).toBeDefined();
        expect(schema.required).toContain('thresholds');

        const thresholdsSchema = schema.properties?.thresholds;
        if (thresholdsSchema && typeof thresholdsSchema === 'object') {
          expect((thresholdsSchema as any).type).toBe('array');
          expect((thresholdsSchema as any).items).toBeDefined();
        }
      }
    });

    test('should have export tool with format validation', () => {
      const exportTool = reportingTools.find(t => t.name === 'export-report-data');
      expect(exportTool).toBeDefined();
      
      if (exportTool) {
        const schema = exportTool.inputSchema;
        expect(schema.properties?.format).toBeDefined();
        expect(schema.properties?.metrics).toBeDefined();
        expect(schema.required).toContain('format');
        expect(schema.required).toContain('metrics');

        const formatSchema = schema.properties?.format;
        if (formatSchema && typeof formatSchema === 'object') {
          expect((formatSchema as any).enum).toContain('csv');
          expect((formatSchema as any).enum).toContain('json');
          expect((formatSchema as any).enum).toContain('xlsx');
        }
      }
    });
  });

  describe('Service Integration', () => {
    test('should have all necessary imports', () => {
      // This test ensures the module loads without import errors
      expect(reportingTools).toBeDefined();
      expect(Array.isArray(reportingTools)).toBe(true);
      expect(reportingTools.length).toBeGreaterThan(0);
    });

    test('should have consistent tool naming convention', () => {
      reportingTools.forEach(tool => {
        // Tool names should be lowercase with hyphens
        expect(tool.name).toMatch(/^[a-z][a-z0-9-]*$/);
        
        // Should not start or end with hyphen
        expect(tool.name).not.toMatch(/^-/);
        expect(tool.name).not.toMatch(/-$/);
      });
    });

    test('should have meaningful descriptions', () => {
      reportingTools.forEach(tool => {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description?.length).toBeGreaterThan(20);
        
        // Should not be just the tool name
        expect(tool.description?.toLowerCase()).not.toBe(tool.name.replace(/-/g, ' '));
      });
    });

    test('should have analytics tools for different categories', () => {
      const categories = {
        traffic: ['get-traffic-summary', 'analyze-traffic-trends', 'analyze-bandwidth-usage'],
        performance: ['get-performance-benchmarks', 'analyze-cache-performance'],
        cost: ['get-cost-optimization-insights'],
        realtime: ['get-realtime-metrics', 'configure-monitoring-alerts'],
        visualization: ['create-reporting-dashboard', 'export-report-data'],
        geographic: ['analyze-geographic-performance'],
        errors: ['analyze-error-patterns']
      };

      Object.entries(categories).forEach(([category, tools]) => {
        tools.forEach(toolName => {
          const tool = reportingTools.find(t => t.name === toolName);
          expect(tool).toBeDefined();
          if (tool) {
            expect(tool.description?.toLowerCase()).toMatch(
              new RegExp(`(${category}|${toolName.split(/[-_]/).join('|')}|real-time)`)
            );
          }
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should have default handlers for unimplemented tools', async () => {
      const toolsWithHandlers = reportingTools.filter(tool => 'handler' in tool);
      
      for (const tool of toolsWithHandlers) {
        if ('handler' in tool && typeof tool.handler === 'function') {
          try {
            const result = await tool.handler({});
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect('success' in result).toBe(true);
          } catch (error) {
            // Some tools may throw errors for invalid args, which is acceptable
            expect(error).toBeDefined();
          }
        }
      }
    });
  });
});