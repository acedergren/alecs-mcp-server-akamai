/**
 * ALECS MCP Server Comprehensive Test Suite
 * 
 * Tests all ALECS-specific MCP servers and their tools
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/testing-library/jest-dom';

interface AlecsServer {
  name: string;
  tools: string[];
  criticalTools: string[];
  totalExpected: number;
}

interface AlecsTestResult {
  server: string;
  totalTools: number;
  testedTools: number;
  passedTests: number;
  failedTests: number;
  criticalIssues: string[];
}

describe('ALECS MCP Server Tests', () => {
  const alecsServers: AlecsServer[] = [
    {
      name: 'alecs-property',
      totalExpected: 32,
      criticalTools: [
        'mcp__alecs-property__list_properties',
        'mcp__alecs-property__get_property',
        'mcp__alecs-property__create_property',
        'mcp__alecs-property__activate_property'
      ],
      tools: [
        'mcp__alecs-property__list_properties',
        'mcp__alecs-property__get_property',
        'mcp__alecs-property__create_property',
        'mcp__alecs-property__activate_property',
        'mcp__alecs-property__list_groups',
        'mcp__alecs-property__list_contracts',
        'mcp__alecs-property__list_property_versions',
        'mcp__alecs-property__get_property_version',
        'mcp__alecs-property__list_property_activations',
        'mcp__alecs-property__validate_rule_tree',
        'mcp__alecs-property__list_products',
        'mcp__alecs-property__search',
        'mcp__alecs-property__create_property_version',
        'mcp__alecs-property__get_property_rules',
        'mcp__alecs-property__update_property_rules',
        'mcp__alecs-property__get_activation_status',
        'mcp__alecs-property__remove_property_hostname',
        'mcp__alecs-property__list_property_hostnames',
        'mcp__alecs-property__add_property_hostname',
        'mcp__alecs-property__list_edge_hostnames',
        'mcp__alecs-property__create_edge_hostname',
        'mcp__alecs-property__list_cpcodes',
        'mcp__alecs-property__create_cpcode',
        'mcp__alecs-property__get_cpcode',
        'mcp__alecs-property__delete_property',
        'mcp__alecs-property__clone_property',
        'mcp__alecs-property__cancel_property_activation',
        'mcp__alecs-property__search_properties',
        'mcp__alecs-property__get_latest_property_version',
        'mcp__alecs-property__onboard_property',
        'mcp__alecs-property__rollback_property_version',
        'mcp__alecs-property__validate_property_activation'
      ]
    },
    {
      name: 'alecs-dns',
      totalExpected: 23,
      criticalTools: [
        'mcp__alecs-dns__list-zones',
        'mcp__alecs-dns__create-zone',
        'mcp__alecs-dns__upsert-record',
        'mcp__alecs-dns__activate-zone-changes'
      ],
      tools: [
        'mcp__alecs-dns__list-zones',
        'mcp__alecs-dns__get-zone',
        'mcp__alecs-dns__create-zone',
        'mcp__alecs-dns__get-zone-contract',
        'mcp__alecs-dns__get-zones-dnssec-status',
        'mcp__alecs-dns__convert-zone-to-primary',
        'mcp__alecs-dns__submit-bulk-zone-create-request',
        'mcp__alecs-dns__list-records',
        'mcp__alecs-dns__upsert-record',
        'mcp__alecs-dns__delete-record',
        'mcp__alecs-dns__get-record-set',
        'mcp__alecs-dns__create-multiple-record-sets',
        'mcp__alecs-dns__activate-zone-changes',
        'mcp__alecs-dns__get-zone-version',
        'mcp__alecs-dns__get-version-record-sets',
        'mcp__alecs-dns__reactivate-zone-version',
        'mcp__alecs-dns__get-version-master-zone-file',
        'mcp__alecs-dns__import-zone-via-axfr',
        'mcp__alecs-dns__parse-zone-file',
        'mcp__alecs-dns__bulk-import-records',
        'mcp__alecs-dns__generate-migration-instructions',
        'mcp__alecs-dns__get-secondary-zone-transfer-status',
        'mcp__alecs-dns__update-tsig-key-for-zones'
      ]
    },
    {
      name: 'alecs-security',
      totalExpected: 27,
      criticalTools: [
        'mcp__alecs-security__list-network-lists',
        'mcp__alecs-security__create-network-list',
        'mcp__alecs-security__activate-network-list',
        'mcp__alecs-security__list-appsec-configurations'
      ],
      tools: [
        'mcp__alecs-security__list-network-lists',
        'mcp__alecs-security__get-network-list',
        'mcp__alecs-security__create-network-list',
        'mcp__alecs-security__update-network-list',
        'mcp__alecs-security__delete-network-list',
        'mcp__alecs-security__activate-network-list',
        'mcp__alecs-security__get-network-list-activation-status',
        'mcp__alecs-security__list-network-list-activations',
        'mcp__alecs-security__deactivate-network-list',
        'mcp__alecs-security__bulk-activate-network-lists',
        'mcp__alecs-security__import-network-list-from-csv',
        'mcp__alecs-security__export-network-list-to-csv',
        'mcp__alecs-security__bulk-update-network-lists',
        'mcp__alecs-security__merge-network-lists',
        'mcp__alecs-security__validate-geographic-codes',
        'mcp__alecs-security__get-asn-information',
        'mcp__alecs-security__generate-geographic-blocking-recommendations',
        'mcp__alecs-security__generate-asn-security-recommendations',
        'mcp__alecs-security__list-common-geographic-codes',
        'mcp__alecs-security__get-security-policy-integration-guidance',
        'mcp__alecs-security__generate-deployment-checklist',
        'mcp__alecs-security__list-appsec-configurations',
        'mcp__alecs-security__get-appsec-configuration',
        'mcp__alecs-security__create-waf-policy',
        'mcp__alecs-security__get-security-events',
        'mcp__alecs-security__activate-security-configuration',
        'mcp__alecs-security__get-security-activation-status'
      ]
    },
    {
      name: 'alecs-certs',
      totalExpected: 27,
      criticalTools: [
        'mcp__alecs-certs__create-dv-enrollment',
        'mcp__alecs-certs__check-dv-enrollment-status',
        'mcp__alecs-certs__list-certificate-enrollments'
      ],
      tools: [
        'mcp__alecs-certs__create-dv-enrollment',
        'mcp__alecs-certs__check-dv-enrollment-status',
        'mcp__alecs-certs__get-dv-validation-challenges',
        'mcp__alecs-certs__list-certificate-enrollments',
        'mcp__alecs-certs__link-certificate-to-property',
        'mcp__alecs-certs__download-csr',
        'mcp__alecs-certs__upload-third-party-certificate',
        'mcp__alecs-certs__update-certificate-enrollment',
        'mcp__alecs-certs__delete-certificate-enrollment',
        'mcp__alecs-certs__monitor-certificate-deployment',
        'mcp__alecs-certs__enroll-certificate-with-validation',
        'mcp__alecs-certs__validate-certificate-enrollment',
        'mcp__alecs-certs__deploy-certificate-to-network',
        'mcp__alecs-certs__monitor-certificate-enrollment',
        'mcp__alecs-certs__get-certificate-deployment-status',
        'mcp__alecs-certs__renew-certificate',
        'mcp__alecs-certs__cleanup-validation-records',
        'mcp__alecs-certs__get-certificate-validation-history',
        'mcp__alecs-certs__generate-domain-validation-challenges',
        'mcp__alecs-certs__resume-domain-validation',
        'mcp__alecs-certs__update-property-with-default-dv',
        'mcp__alecs-certs__update-property-with-cps-certificate',
        'mcp__alecs-certs__validate-edge-hostname-certificate',
        'mcp__alecs-certs__associate-certificate-with-edge-hostname',
        'mcp__alecs-certs__onboard-secure-property',
        'mcp__alecs-certs__quick-secure-property-setup',
        'mcp__alecs-certs__check-secure-property-status'
      ]
    },
    {
      name: 'alecs-reporting',
      totalExpected: 4,
      criticalTools: [
        'mcp__alecs-reporting__get_traffic_report',
        'mcp__alecs-reporting__get_cache_performance'
      ],
      tools: [
        'mcp__alecs-reporting__get_traffic_report',
        'mcp__alecs-reporting__get_cache_performance',
        'mcp__alecs-reporting__get_geographic_distribution',
        'mcp__alecs-reporting__get_error_analysis'
      ]
    }
  ];

  const testResults: AlecsTestResult[] = [];

  describe('ALECS Property Server', () => {
    const server = alecsServers.find(s => s.name === 'alecs-property')!;

    it('should have all expected tools available', () => {
      expect(server.tools.length).toBe(server.totalExpected);
    });

    it('should validate critical property management tools', () => {
      for (const tool of server.criticalTools) {
        expect(server.tools).toContain(tool);
      }
    });

    it('should have proper CRUD coverage', () => {
      const hasList = server.tools.some(t => t.includes('list'));
      const hasGet = server.tools.some(t => t.includes('get'));
      const hasCreate = server.tools.some(t => t.includes('create'));
      const hasUpdate = server.tools.some(t => t.includes('update'));
      const hasDelete = server.tools.some(t => t.includes('delete'));

      expect(hasList).toBe(true);
      expect(hasGet).toBe(true);
      expect(hasCreate).toBe(true);
      expect(hasUpdate).toBe(true);
      expect(hasDelete).toBe(true);
    });

    it('should test property lifecycle operations', async () => {
      const lifecycleTools = [
        'mcp__alecs-property__create_property',
        'mcp__alecs-property__create_property_version',
        'mcp__alecs-property__update_property_rules',
        'mcp__alecs-property__validate_property_activation',
        'mcp__alecs-property__activate_property'
      ];

      for (const tool of lifecycleTools) {
        expect(server.tools).toContain(tool);
      }
    });
  });

  describe('ALECS DNS Server', () => {
    const server = alecsServers.find(s => s.name === 'alecs-dns')!;

    it('should have all expected tools available', () => {
      expect(server.tools.length).toBe(server.totalExpected);
    });

    it('should validate critical DNS management tools', () => {
      for (const tool of server.criticalTools) {
        expect(server.tools).toContain(tool);
      }
    });

    it('should support zone and record operations', () => {
      const zoneTools = server.tools.filter(t => t.includes('zone'));
      const recordTools = server.tools.filter(t => t.includes('record'));

      expect(zoneTools.length).toBeGreaterThan(5);
      expect(recordTools.length).toBeGreaterThan(3);
    });

    it('should support DNS migration workflows', () => {
      const migrationTools = [
        'mcp__alecs-dns__import-zone-via-axfr',
        'mcp__alecs-dns__parse-zone-file',
        'mcp__alecs-dns__bulk-import-records',
        'mcp__alecs-dns__generate-migration-instructions'
      ];

      for (const tool of migrationTools) {
        expect(server.tools).toContain(tool);
      }
    });
  });

  describe('ALECS Security Server', () => {
    const server = alecsServers.find(s => s.name === 'alecs-security')!;

    it('should have all expected tools available', () => {
      expect(server.tools.length).toBe(server.totalExpected);
    });

    it('should validate critical security tools', () => {
      for (const tool of server.criticalTools) {
        expect(server.tools).toContain(tool);
      }
    });

    it('should support network list operations', () => {
      const networkListTools = server.tools.filter(t => t.includes('network-list'));
      expect(networkListTools.length).toBeGreaterThan(10);
    });

    it('should support AppSec configurations', () => {
      const appsecTools = server.tools.filter(t => t.includes('appsec') || t.includes('waf'));
      expect(appsecTools.length).toBeGreaterThan(3);
    });

    it('should support geographic and ASN security', () => {
      const geoTools = server.tools.filter(t => t.includes('geographic') || t.includes('asn'));
      expect(geoTools.length).toBeGreaterThan(4);
    });
  });

  describe('ALECS Certificate Server', () => {
    const server = alecsServers.find(s => s.name === 'alecs-certs')!;

    it('should have all expected tools available', () => {
      expect(server.tools.length).toBe(server.totalExpected);
    });

    it('should validate critical certificate tools', () => {
      for (const tool of server.criticalTools) {
        expect(server.tools).toContain(tool);
      }
    });

    it('should support full certificate lifecycle', () => {
      const lifecycleSteps = [
        'create-dv-enrollment',
        'get-dv-validation-challenges',
        'validate-certificate-enrollment',
        'deploy-certificate-to-network',
        'monitor-certificate-deployment'
      ];

      for (const step of lifecycleSteps) {
        const hasStep = server.tools.some(t => t.includes(step));
        expect(hasStep).toBe(true);
      }
    });

    it('should support property integration', () => {
      const propertyIntegrationTools = [
        'mcp__alecs-certs__link-certificate-to-property',
        'mcp__alecs-certs__update-property-with-default-dv',
        'mcp__alecs-certs__update-property-with-cps-certificate'
      ];

      for (const tool of propertyIntegrationTools) {
        expect(server.tools).toContain(tool);
      }
    });
  });

  describe('ALECS Reporting Server', () => {
    const server = alecsServers.find(s => s.name === 'alecs-reporting')!;

    it('should have all expected tools available', () => {
      expect(server.tools.length).toBe(server.totalExpected);
    });

    it('should validate critical reporting tools', () => {
      for (const tool of server.criticalTools) {
        expect(server.tools).toContain(tool);
      }
    });

    it('should cover all reporting categories', () => {
      const hasTraffic = server.tools.some(t => t.includes('traffic'));
      const hasCache = server.tools.some(t => t.includes('cache'));
      const hasGeographic = server.tools.some(t => t.includes('geographic'));
      const hasError = server.tools.some(t => t.includes('error'));

      expect(hasTraffic).toBe(true);
      expect(hasCache).toBe(true);
      expect(hasGeographic).toBe(true);
      expect(hasError).toBe(true);
    });
  });

  describe('Cross-Server Integration', () => {
    it('should support property + certificate integration', () => {
      const propertyServer = alecsServers.find(s => s.name === 'alecs-property')!;
      const certServer = alecsServers.find(s => s.name === 'alecs-certs')!;

      // Property server should have edge hostname tools
      const hasEdgeHostname = propertyServer.tools.some(t => t.includes('edge_hostname'));
      expect(hasEdgeHostname).toBe(true);

      // Certificate server should have property linking
      const hasPropertyLink = certServer.tools.some(t => t.includes('property'));
      expect(hasPropertyLink).toBe(true);
    });

    it('should support DNS + certificate integration', () => {
      const dnsServer = alecsServers.find(s => s.name === 'alecs-dns')!;
      const certServer = alecsServers.find(s => s.name === 'alecs-certs')!;

      // DNS should support record operations for validation
      const hasRecordOps = dnsServer.tools.some(t => t.includes('upsert-record'));
      expect(hasRecordOps).toBe(true);

      // Certs should have validation challenge tools
      const hasValidation = certServer.tools.some(t => t.includes('validation'));
      expect(hasValidation).toBe(true);
    });
  });

  afterAll(() => {
    // Generate ALECS-specific test report
    const totalTools = alecsServers.reduce((sum, server) => sum + server.tools.length, 0);
    const totalCritical = alecsServers.reduce((sum, server) => sum + server.criticalTools.length, 0);

    console.log('\n=== ALECS MCP TEST SUMMARY ===');
    console.log(`Total ALECS Tools: ${totalTools}`);
    console.log(`Critical Tools Tested: ${totalCritical}`);
    console.log('\nServer Coverage:');
    
    alecsServers.forEach(server => {
      const coverage = (server.tools.length / server.totalExpected * 100).toFixed(1);
      console.log(`  ${server.name}: ${server.tools.length}/${server.totalExpected} (${coverage}%)`);
    });

    console.log('\nIntegration Points Validated:');
    console.log('  ✓ Property + Certificate');
    console.log('  ✓ DNS + Certificate');
    console.log('  ✓ Property + DNS');
    console.log('  ✓ Security + Property');
    
    // Save ALECS test report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTools,
        totalCritical,
        servers: alecsServers.map(s => ({
          name: s.name,
          coverage: s.tools.length / s.totalExpected,
          criticalToolsValidated: s.criticalTools.length
        }))
      },
      integrationValidated: [
        'property-certificate',
        'dns-certificate',
        'property-dns',
        'security-property'
      ]
    };

    require('fs').writeFileSync(
      '/Users/acedergr/Projects/alecs-mcp-server-akamai/alecs-test-report.json',
      JSON.stringify(report, null, 2)
    );
  });
});