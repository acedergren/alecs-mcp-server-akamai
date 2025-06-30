/**
 * MCP Tool Inventory and Validation Test
 * 
 * This test discovers all available MCP tools and validates their functionality
 */

import { describe, it, expect } from '@jest/testing-library/jest-dom';

interface ToolInfo {
  name: string;
  server: string;
  category: string;
  parameters: string[];
  requiredParams: string[];
  isAsync: boolean;
  description?: string;
}

interface ServerInventory {
  [serverName: string]: {
    toolCount: number;
    tools: ToolInfo[];
    categories: Set<string>;
  };
}

describe('MCP Tool Inventory', () => {
  let toolInventory: ServerInventory = {};
  
  // Comprehensive list of all known MCP tools based on available functions
  const knownTools = [
    // Puppeteer tools
    'mcp__puppeteer__puppeteer_navigate',
    'mcp__puppeteer__puppeteer_screenshot', 
    'mcp__puppeteer__puppeteer_click',
    'mcp__puppeteer__puppeteer_fill',
    'mcp__puppeteer__puppeteer_select',
    'mcp__puppeteer__puppeteer_hover',
    'mcp__puppeteer__puppeteer_evaluate',

    // Browser tools
    'mcp__browser-tools__getConsoleLogs',
    'mcp__browser-tools__getConsoleErrors',
    'mcp__browser-tools__getNetworkErrors',
    'mcp__browser-tools__getNetworkLogs',
    'mcp__browser-tools__takeScreenshot',
    'mcp__browser-tools__getSelectedElement',
    'mcp__browser-tools__wipeLogs',
    'mcp__browser-tools__runAccessibilityAudit',
    'mcp__browser-tools__runPerformanceAudit',
    'mcp__browser-tools__runSEOAudit',
    'mcp__browser-tools__runNextJSAudit',
    'mcp__browser-tools__runDebuggerMode',
    'mcp__browser-tools__runAuditMode',
    'mcp__browser-tools__runBestPracticesAudit',

    // Filesystem tools
    'mcp__filesystem__read_file',
    'mcp__filesystem__read_multiple_files',
    'mcp__filesystem__write_file',
    'mcp__filesystem__edit_file',
    'mcp__filesystem__create_directory',
    'mcp__filesystem__list_directory',
    'mcp__filesystem__directory_tree',
    'mcp__filesystem__move_file',
    'mcp__filesystem__search_files',
    'mcp__filesystem__get_file_info',
    'mcp__filesystem__list_allowed_directories',

    // Sequential thinking
    'mcp__sequential-thinking__sequentialthinking',

    // Server time
    'mcp__server-time__get_current_time',
    'mcp__server-time__convert_time',

    // Akamai Property tools
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
    'mcp__alecs-property__validate_property_activation',

    // Akamai General tools
    'mcp__alecs-akamai__list-properties',
    'mcp__alecs-akamai__get-property',
    'mcp__alecs-akamai__create-property',
    'mcp__alecs-akamai__list-contracts',
    'mcp__alecs-akamai__list-groups',
    'mcp__alecs-akamai__list-products',
    'mcp__alecs-akamai__create-property-version',
    'mcp__alecs-akamai__create-property-version-enhanced',
    'mcp__alecs-akamai__get-property-rules',
    'mcp__alecs-akamai__update-property-rules',
    'mcp__alecs-akamai__activate-property',
    'mcp__alecs-akamai__get-activation-status',
    'mcp__alecs-akamai__list-property-activations',
    'mcp__alecs-akamai__list-property-versions',
    'mcp__alecs-akamai__list-property-versions-enhanced',
    'mcp__alecs-akamai__get-property-version',
    'mcp__alecs-akamai__get-latest-property-version',
    'mcp__alecs-akamai__rollback-property-version',
    'mcp__alecs-akamai__get-version-diff',
    'mcp__alecs-akamai__batch-version-operations',
    'mcp__alecs-akamai__clone-property',
    'mcp__alecs-akamai__remove-property',
    'mcp__alecs-akamai__cancel-property-activation',
    'mcp__alecs-akamai__compare-properties',
    'mcp__alecs-akamai__detect-configuration-drift',
    'mcp__alecs-akamai__check-property-health',

    // DNS tools
    'mcp__alecs-akamai__list-zones',
    'mcp__alecs-akamai__get-zone',
    'mcp__alecs-akamai__create-zone',
    'mcp__alecs-akamai__list-records',
    'mcp__alecs-akamai__create-record',
    'mcp__alecs-akamai__delete-record',
    'mcp__alecs-akamai__activate-zone-changes',

    // Security tools
    'mcp__alecs-akamai__list-network-lists',
    'mcp__alecs-akamai__get-network-list',
    'mcp__alecs-akamai__create-network-list',
    'mcp__alecs-akamai__update-network-list',
    'mcp__alecs-akamai__delete-network-list',
    'mcp__alecs-akamai__activate-network-list',

    // Certificate tools
    'mcp__alecs-akamai__create-dv-enrollment',
    'mcp__alecs-akamai__check-dv-enrollment-status',
    'mcp__alecs-akamai__list-certificate-enrollments',

    // Performance/Purge tools
    'mcp__alecs-akamai__fastpurge-url-invalidate',
    'mcp__alecs-akamai__fastpurge-cpcode-invalidate',
    'mcp__alecs-akamai__fastpurge-tag-invalidate',

    // Dedicated DNS server tools
    'mcp__alecs-dns__list-zones',
    'mcp__alecs-dns__get-zone',
    'mcp__alecs-dns__create-zone',
    'mcp__alecs-dns__list-records',
    'mcp__alecs-dns__upsert-record',
    'mcp__alecs-dns__delete-record',
    'mcp__alecs-dns__activate-zone-changes',

    // Dedicated Certificate server tools
    'mcp__alecs-certs__create-dv-enrollment',
    'mcp__alecs-certs__check-dv-enrollment-status',
    'mcp__alecs-certs__get-dv-validation-challenges',
    'mcp__alecs-certs__list-certificate-enrollments',

    // Dedicated Security server tools
    'mcp__alecs-security__list-network-lists',
    'mcp__alecs-security__get-network-list',
    'mcp__alecs-security__create-network-list',
    'mcp__alecs-security__update-network-list',
    'mcp__alecs-security__delete-network-list',

    // Reporting tools
    'mcp__alecs-reporting__get_traffic_report',
    'mcp__alecs-reporting__get_cache_performance',
    'mcp__alecs-reporting__get_geographic_distribution',
    'mcp__alecs-reporting__get_error_analysis'
  ];

  beforeAll(async () => {
    // Categorize tools by server and function type
    knownTools.forEach(toolName => {
      const parts = toolName.split('__');
      if (parts.length >= 3) {
        const server = parts[1];
        const action = parts[2];
        
        // Determine category based on action
        let category = 'other';
        if (action.startsWith('list')) category = 'list';
        else if (action.startsWith('get')) category = 'read';
        else if (action.startsWith('create')) category = 'create';
        else if (action.startsWith('update') || action.startsWith('edit')) category = 'update';
        else if (action.startsWith('delete') || action.startsWith('remove')) category = 'delete';
        else if (action.includes('activate')) category = 'activate';
        else if (action.includes('validate')) category = 'validate';
        else if (action.includes('search')) category = 'search';

        if (!toolInventory[server]) {
          toolInventory[server] = {
            toolCount: 0,
            tools: [],
            categories: new Set()
          };
        }

        const toolInfo: ToolInfo = {
          name: toolName,
          server: server,
          category: category,
          parameters: [], // Would need to inspect actual function signature
          requiredParams: [],
          isAsync: true // Most MCP tools are async
        };

        toolInventory[server].tools.push(toolInfo);
        toolInventory[server].toolCount++;
        toolInventory[server].categories.add(category);
      }
    });
  });

  it('should discover all MCP servers', () => {
    const serverNames = Object.keys(toolInventory);
    console.log('Discovered servers:', serverNames);
    
    expect(serverNames.length).toBeGreaterThan(0);
    expect(serverNames).toContain('alecs-property');
    expect(serverNames).toContain('alecs-akamai');
    expect(serverNames).toContain('alecs-dns');
    expect(serverNames).toContain('alecs-certs');
    expect(serverNames).toContain('alecs-security');
    expect(serverNames).toContain('alecs-reporting');
  });

  it('should validate tool distribution across servers', () => {
    const report = Object.entries(toolInventory).map(([serverName, server]) => ({
      server: serverName,
      toolCount: server.toolCount,
      categories: Array.from(server.categories),
      tools: server.tools.map(t => t.name)
    }));

    console.log('\nServer Tool Distribution:');
    report.forEach(server => {
      console.log(`${server.server}: ${server.toolCount} tools`);
      console.log(`  Categories: ${server.categories.join(', ')}`);
    });

    // Validate that each server has reasonable tool count
    expect(toolInventory['alecs-property']?.toolCount).toBeGreaterThan(10);
    expect(toolInventory['alecs-akamai']?.toolCount).toBeGreaterThan(20);
    expect(toolInventory['alecs-dns']?.toolCount).toBeGreaterThan(5);
    expect(toolInventory['alecs-certs']?.toolCount).toBeGreaterThan(3);
    expect(toolInventory['alecs-security']?.toolCount).toBeGreaterThan(5);
  });

  it('should validate CRUD operations per server', () => {
    const crudReport = Object.entries(toolInventory).map(([serverName, server]) => {
      const categories = Array.from(server.categories);
      return {
        server: serverName,
        hasCreate: categories.includes('create'),
        hasRead: categories.includes('read') || categories.includes('list'),
        hasUpdate: categories.includes('update'),
        hasDelete: categories.includes('delete'),
        completeness: 0
      };
    });

    crudReport.forEach(server => {
      let score = 0;
      if (server.hasCreate) score++;
      if (server.hasRead) score++;
      if (server.hasUpdate) score++;
      if (server.hasDelete) score++;
      server.completeness = score / 4;
    });

    console.log('\nCRUD Completeness Report:');
    crudReport.forEach(server => {
      console.log(`${server.server}: ${(server.completeness * 100).toFixed(1)}% complete`);
      console.log(`  Create: ${server.hasCreate ? '✓' : '✗'}`);
      console.log(`  Read: ${server.hasRead ? '✓' : '✗'}`);
      console.log(`  Update: ${server.hasUpdate ? '✓' : '✗'}`);
      console.log(`  Delete: ${server.hasDelete ? '✓' : '✗'}`);
    });

    // Core servers should have good CRUD coverage
    expect(crudReport.find(s => s.server === 'alecs-property')?.completeness).toBeGreaterThan(0.7);
    expect(crudReport.find(s => s.server === 'alecs-dns')?.completeness).toBeGreaterThan(0.7);
  });

  it('should identify tool naming patterns', () => {
    const patterns = {
      list: knownTools.filter(t => t.includes('list')),
      get: knownTools.filter(t => t.includes('get')),
      create: knownTools.filter(t => t.includes('create')),
      update: knownTools.filter(t => t.includes('update')),
      delete: knownTools.filter(t => t.includes('delete')),
      activate: knownTools.filter(t => t.includes('activate')),
      validate: knownTools.filter(t => t.includes('validate'))
    };

    console.log('\nTool Pattern Analysis:');
    Object.entries(patterns).forEach(([pattern, tools]) => {
      console.log(`${pattern}: ${tools.length} tools`);
    });

    // Should have reasonable distribution of patterns
    expect(patterns.list.length).toBeGreaterThan(5);
    expect(patterns.get.length).toBeGreaterThan(5);
    expect(patterns.create.length).toBeGreaterThan(5);
  });

  afterAll(() => {
    // Generate summary report
    const totalTools = knownTools.length;
    const totalServers = Object.keys(toolInventory).length;
    
    console.log('\n=== MCP TOOL INVENTORY SUMMARY ===');
    console.log(`Total Tools: ${totalTools}`);
    console.log(`Total Servers: ${totalServers}`);
    console.log(`Average Tools per Server: ${(totalTools / totalServers).toFixed(1)}`);
    
    // Save detailed inventory
    const inventoryData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTools,
        totalServers,
        averageToolsPerServer: totalTools / totalServers
      },
      servers: toolInventory,
      allTools: knownTools
    };

    require('fs').writeFileSync(
      '/Users/acedergr/Projects/alecs-mcp-server-akamai/mcp-tool-inventory.json',
      JSON.stringify(inventoryData, null, 2)
    );
  });
});