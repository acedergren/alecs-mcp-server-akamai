/**
 * MCP Tool Name Transformer
 * 
 * Provides bidirectional transformation between ALECS internal tool naming
 * (dot notation) and MCP-compliant naming (snake_case) as required by the
 * June 2025 MCP specification and community best practices.
 * 
 * Background:
 * - MCP community uses snake_case for 90%+ of tools
 * - Dots are uncommon and can cause client compatibility issues
 * - Our internal architecture uses hierarchical dot notation
 * - This transformer provides compatibility without breaking internal structure
 */

import { logger } from './pino-logger';

export class MCPToolNameTransformer {
  private static readonly INTERNAL_TO_MCP_CACHE = new Map<string, string>();
  private static readonly MCP_TO_INTERNAL_CACHE = new Map<string, string>();
  
  /**
   * Convert internal tool name to MCP-compliant format
   * 
   * Rules:
   * - Replace dots (.) with underscores (_)
   * - Replace hyphens (-) with underscores (_)
   * - Maintain lowercase format
   * - Preserve descriptive naming
   * 
   * @param internalName - Internal tool name (e.g., 'property.list')
   * @returns MCP-compliant name (e.g., 'property_list')
   */
  static toMCPFormat(internalName: string): string {
    // Check cache first
    if (this.INTERNAL_TO_MCP_CACHE.has(internalName)) {
      return this.INTERNAL_TO_MCP_CACHE.get(internalName)!;
    }
    
    // Validate input
    if (!internalName || typeof internalName !== 'string') {
      logger.warn({ internalName }, 'Invalid tool name provided to toMCPFormat');
      return internalName || '';
    }
    
    // Transform to MCP format
    const mcpName = internalName
      .toLowerCase()                // Ensure lowercase
      .replace(/\./g, '_')         // dots to underscores
      .replace(/-/g, '_')          // hyphens to underscores
      .replace(/_{2,}/g, '_')      // collapse multiple underscores
      .replace(/^_|_$/g, '');      // remove leading/trailing underscores
    
    // Validate result
    if (!this.isValidMCPToolName(mcpName)) {
      logger.warn({ 
        internalName, 
        mcpName, 
        reason: 'Generated MCP name failed validation' 
      }, 'Tool name transformation produced invalid result');
    }
    
    // Cache the result
    this.INTERNAL_TO_MCP_CACHE.set(internalName, mcpName);
    this.MCP_TO_INTERNAL_CACHE.set(mcpName, internalName);
    
    logger.debug({ internalName, mcpName }, 'Tool name transformed to MCP format');
    return mcpName;
  }
  
  /**
   * Convert MCP-compliant name back to internal format
   * 
   * Uses intelligent mapping to restore original hierarchical structure
   * 
   * @param mcpName - MCP-compliant name (e.g., 'property_list')
   * @returns Internal tool name (e.g., 'property.list')
   */
  static fromMCPFormat(mcpName: string): string {
    // Check cache first
    if (this.MCP_TO_INTERNAL_CACHE.has(mcpName)) {
      return this.MCP_TO_INTERNAL_CACHE.get(mcpName)!;
    }
    
    // If not in cache, try to reverse-engineer the internal name
    const internalName = this.reverseTransform(mcpName);
    
    logger.debug({ mcpName, internalName }, 'Tool name converted from MCP format');
    return internalName;
  }
  
  /**
   * Reverse-engineer internal name from MCP format
   * Uses pattern matching to restore dot notation where appropriate
   */
  private static reverseTransform(mcpName: string): string {
    // Common patterns for dot restoration
    const patterns = [
      // Domain.action patterns
      { pattern: /^(property|dns|certificate|security|appsec|fastpurge|reporting|utility)_(.+)$/, 
        replacement: '$1.$2' },
      
      // Domain.subdomain.action patterns
      { pattern: /^(dns)_(zone|record|traffic)_(.+)$/, 
        replacement: '$1.$2.$3' },
      { pattern: /^(property)_(rules|version|activation|hostnames)_(.+)$/, 
        replacement: '$1.$2.$3' },
      { pattern: /^(certificate)_(enrollment|deployment|validation)_(.+)$/, 
        replacement: '$1.$2.$3' },
      { pattern: /^(security|appsec)_(config|waf|rate)_(.+)$/, 
        replacement: '$1.$2.$3' },
      { pattern: /^(reporting)_(traffic|billing|performance)_(.+)$/, 
        replacement: '$1.$2.$3' },
      
      // Complex nested patterns
      { pattern: /^(dns)_(traffic)_(load_balancing|failover|geographic|performance|policy|health_check)_(.+)$/, 
        replacement: '$1.$2.$3.$4' },
    ];
    
    // Try each pattern
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(mcpName)) {
        const result = mcpName.replace(pattern, replacement);
        // Convert remaining underscores in action part back to hyphens where appropriate
        return this.restoreHyphens(result);
      }
    }
    
    // Fallback: just convert first underscore to dot if it looks like domain_action
    const parts = mcpName.split('_');
    if (parts.length >= 2) {
      const domain = parts[0];
      const action = parts.slice(1).join('_');
      return `${domain}.${this.restoreHyphens(action)}`;
    }
    
    return mcpName;
  }
  
  /**
   * Restore hyphens in action names where they were originally used
   */
  private static restoreHyphens(name: string): string {
    const hyphenatedTerms = [
      'load_balancing' // load-balancing
    ];
    
    let result = name;
    for (const term of hyphenatedTerms) {
      const hyphenated = term.replace(/_/g, '-');
      result = result.replace(new RegExp(term, 'g'), hyphenated);
    }
    
    return result;
  }
  
  /**
   * Validate that a tool name is MCP-compliant
   * 
   * Based on community best practices:
   * - snake_case format
   * - alphanumeric + underscores only
   * - reasonable length (1-64 characters)
   * - descriptive naming
   */
  static isValidMCPToolName(name: string): boolean {
    if (!name || typeof name !== 'string') {
      return false;
    }
    
    // Check length (reasonable limit)
    if (name.length < 1 || name.length > 64) {
      return false;
    }
    
    // Check format: lowercase alphanumeric with underscores
    if (!/^[a-z0-9_]+$/.test(name)) {
      return false;
    }
    
    // Check for valid structure (no leading/trailing/consecutive underscores)
    if (/^_|_$|_{2,}/.test(name)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Transform all tools in a tool registry to MCP format
   */
  static transformToolRegistry<T extends Record<string, any>>(tools: T): Record<string, T[keyof T]> {
    const transformed: Record<string, T[keyof T]> = {};
    
    for (const [internalName, toolDef] of Object.entries(tools)) {
      const mcpName = this.toMCPFormat(internalName);
      transformed[mcpName] = toolDef;
    }
    
    logger.info({ 
      originalCount: Object.keys(tools).length,
      transformedCount: Object.keys(transformed).length 
    }, 'Tool registry transformed to MCP format');
    
    return transformed;
  }
  
  /**
   * Get statistics about tool name transformations
   */
  static getTransformationStats(): {
    totalTransformations: number;
    cacheHitRate: number;
    validationFailures: number;
  } {
    return {
      totalTransformations: this.INTERNAL_TO_MCP_CACHE.size,
      cacheHitRate: this.INTERNAL_TO_MCP_CACHE.size > 0 ? 1.0 : 0.0, // Simplified calculation
      validationFailures: 0 // Would need to track this during runtime
    };
  }
  
  /**
   * Clear transformation caches (for testing)
   */
  static clearCache(): void {
    this.INTERNAL_TO_MCP_CACHE.clear();
    this.MCP_TO_INTERNAL_CACHE.clear();
  }
  
  /**
   * Get all cached transformations (for debugging)
   */
  static getCachedTransformations(): Array<{ internal: string; mcp: string }> {
    return Array.from(this.INTERNAL_TO_MCP_CACHE.entries()).map(([internal, mcp]) => ({
      internal,
      mcp
    }));
  }
}

/**
 * Convenience function for quick transformation
 */
export function toMCPToolName(internalName: string): string {
  return MCPToolNameTransformer.toMCPFormat(internalName);
}

/**
 * Convenience function for reverse transformation
 */
export function fromMCPToolName(mcpName: string): string {
  return MCPToolNameTransformer.fromMCPFormat(mcpName);
}