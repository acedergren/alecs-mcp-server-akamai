#!/usr/bin/env tsx
/**
 * Tool Counter Script
 * Counts the actual number of tools registered in the MCP server
 */

import { getAllToolDefinitions } from '../src/tools/all-tools-registry';

// Get all tools
const allTools = getAllToolDefinitions();

// Count tools by category
const toolsByCategory: Record<string, number> = {};
const categoryTotals: Record<string, string[]> = {};

allTools.forEach(tool => {
  // Extract category from tool name (first part before underscore)
  const parts = tool.name.split('_');
  const category = parts[0];
  
  if (!toolsByCategory[category]) {
    toolsByCategory[category] = 0;
    categoryTotals[category] = [];
  }
  
  toolsByCategory[category]++;
  categoryTotals[category].push(tool.name);
});

console.log('=== ALECS MCP Server Tool Count ===\n');

// Sort categories alphabetically
const sortedCategories = Object.keys(toolsByCategory).sort();

sortedCategories.forEach(category => {
  console.log(`${category}: ${toolsByCategory[category]} tools`);
});

console.log('\n=== Total Tools ===');
console.log(`Total: ${allTools.length} tools`);

// Check for duplicates
const toolNames = allTools.map(t => t.name);
const uniqueNames = new Set(toolNames);
if (toolNames.length !== uniqueNames.size) {
  console.log(`\n⚠️  Warning: Found ${toolNames.length - uniqueNames.size} duplicate tool names!`);
  
  // Find duplicates
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  toolNames.forEach(name => {
    if (seen.has(name)) {
      duplicates.add(name);
    }
    seen.add(name);
  });
  
  console.log('Duplicates:', Array.from(duplicates).join(', '));
}

// Display detailed breakdown
console.log('\n=== Detailed Breakdown ===');
sortedCategories.forEach(category => {
  console.log(`\n${category} (${toolsByCategory[category]} tools):`);
  categoryTotals[category].sort().forEach(tool => {
    console.log(`  - ${tool}`);
  });
});