/**
 * Format Middleware - Response formatting for ALECSCore
 * 
 * Provides consistent response formatting across all tools
 * Supports JSON, text, and markdown formats
 */

import { z } from 'zod';

export const FormatSchema = z.enum(['json', 'text', 'markdown']).optional();

export interface FormatOptions {
  format?: 'json' | 'text' | 'markdown';
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

export class FormatMiddleware {
  /**
   * Format response based on requested format
   */
  static format(data: any, options: FormatOptions = {}): string {
    const { format = 'json', prettyPrint = true } = options;
    
    switch (format) {
      case 'markdown':
        return FormatMiddleware.toMarkdown(data);
      case 'text':
        return FormatMiddleware.toText(data);
      case 'json':
      default:
        return JSON.stringify(data, null, prettyPrint ? 2 : 0);
    }
  }
  
  /**
   * Convert data to markdown format
   */
  static toMarkdown(data: any): string {
    if (typeof data === 'string') return data;
    
    if (Array.isArray(data)) {
      if (data.length === 0) return '_No data found._';
      
      // Check if array of objects
      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0]);
        let markdown = `| ${headers.join(' | ')} |\n`;
        markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
        
        data.forEach(row => {
          markdown += `| ${headers.map(h => FormatMiddleware.escapeMarkdown(String(row[h] || ''))).join(' | ')} |\n`;
        });
        
        return markdown;
      }
      
      // Simple array
      return data.map((item, index) => `${index + 1}. ${FormatMiddleware.formatValue(item)}`).join('\n');
    }
    
    // Object to markdown
    if (typeof data === 'object' && data !== null) {
      let markdown = '';
      for (const [key, value] of Object.entries(data)) {
        markdown += `**${FormatMiddleware.formatKey(key)}**: ${FormatMiddleware.formatValue(value)}\n`;
      }
      return markdown;
    }
    
    return String(data);
  }
  
  /**
   * Convert data to plain text format
   */
  static toText(data: any): string {
    if (typeof data === 'string') return data;
    
    if (Array.isArray(data)) {
      if (data.length === 0) return 'No data found.';
      
      // Check if array of objects
      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0]);
        const maxLengths = headers.map(h => 
          Math.max(h.length, ...data.map(row => String(row[h] || '').length))
        );
        
        let text = headers.map((h, i) => h.padEnd(maxLengths[i])).join(' | ') + '\n';
        text += maxLengths.map(len => '-'.repeat(len)).join('-+-') + '\n';
        
        data.forEach(row => {
          text += headers.map((h, i) => String(row[h] || '').padEnd(maxLengths[i])).join(' | ') + '\n';
        });
        
        return text;
      }
      
      // Simple array
      return data.map((item, index) => `${index + 1}. ${FormatMiddleware.formatValue(item)}`).join('\n');
    }
    
    // Object to text
    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data);
      const maxKeyLength = Math.max(...entries.map(([k]) => k.length));
      
      return entries
        .map(([key, value]) => `${key.padEnd(maxKeyLength)}: ${FormatMiddleware.formatValue(value)}`)
        .join('\n');
    }
    
    return String(data);
  }
  
  /**
   * Format a key for display
   */
  private static formatKey(key: string): string {
    // Convert camelCase/snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Format a value for display
   */
  private static formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  
  /**
   * Escape special markdown characters
   */
  private static escapeMarkdown(text: string): string {
    return text.replace(/[|\\`*_{}[\]()#+\-.!]/g, '\\$&');
  }
  
  /**
   * Create a summary table from an array of objects
   */
  static createSummaryTable(data: any[], fields: string[]): string {
    if (data.length === 0) return '_No data to summarize._';
    
    const headers = fields;
    let markdown = `| ${headers.join(' | ')} |\n`;
    markdown += `| ${headers.map(() => '---').join(' | ')} |\n`;
    
    data.forEach(row => {
      markdown += `| ${headers.map(h => FormatMiddleware.escapeMarkdown(String(row[h] || ''))).join(' | ')} |\n`;
    });
    
    return markdown;
  }
  
  /**
   * Create a formatted error response
   */
  static formatError(error: any, format: 'json' | 'text' | 'markdown' = 'text'): string {
    const errorObj = {
      error: true,
      message: error.message || String(error),
      code: error.code || 'UNKNOWN_ERROR',
      details: error.details || {},
    };
    
    return FormatMiddleware.format(errorObj, { format });
  }
}