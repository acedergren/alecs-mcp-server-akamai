/**
 * MCP Streaming Utility - Perfect UX via Content Chunks
 * 
 * KEY: Use multiple MCP content blocks to create streaming experience
 * APPROACH: Break large responses into digestible chunks with progressive disclosure
 * IMPLEMENTATION: 100% MCP compliant while feeling like real-time streaming
 * 
 * TRANSFORMS: Raw API dumps → Beautiful, progressive, actionable content
 */

import { type MCPToolResponse } from '../types';

/**
 * Content chunk for streaming responses
 */
export interface ContentChunk {
  /** Section title or header */
  title?: string;
  /** Main content */
  content: string;
  /** Visual priority (affects ordering and styling) */
  priority?: 'high' | 'medium' | 'low';
  /** Chunk type for styling */
  type?: 'header' | 'summary' | 'detail' | 'action' | 'error' | 'warning';
}

/**
 * Streaming response builder
 */
export class MCPStreamBuilder {
  private chunks: ContentChunk[] = [];
  private metadata: {
    title: string;
    timestamp: string;
    operation: string;
    duration?: number;
  };

  constructor(operation: string, title: string) {
    this.metadata = {
      title,
      operation,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add header chunk
   */
  addHeader(content: string): this {
    this.chunks.push({
      content: `# ${content}\n`,
      type: 'header',
      priority: 'high',
    });
    return this;
  }

  /**
   * Add summary chunk - most important info first
   */
  addSummary(title: string, content: string): this {
    this.chunks.push({
      title,
      content: `## ${title}\n\n${content}\n`,
      type: 'summary',
      priority: 'high',
    });
    return this;
  }

  /**
   * Add detail chunk - expandable content
   */
  addDetail(title: string, content: string): this {
    this.chunks.push({
      title,
      content: `### ${title}\n\n${content}\n`,
      type: 'detail',
      priority: 'medium',
    });
    return this;
  }

  /**
   * Add action chunk - next steps and suggestions
   */
  addActions(actions: string[]): this {
    let content = '## Next Actions\n\n';
    actions.forEach((action, index) => {
      content += `${index + 1}. ${action}\n`;
    });
    content += '\n';

    this.chunks.push({
      content,
      type: 'action',
      priority: 'high',
    });
    return this;
  }

  /**
   * Add warning chunk
   */
  addWarning(title: string, message: string, suggestions?: string[]): this {
    let content = `## WARNING: ${title}\n\n${message}\n`;
    
    if (suggestions?.length) {
      content += '\n**Suggestions:**\n';
      suggestions.forEach((suggestion, index) => {
        content += `${index + 1}. ${suggestion}\n`;
      });
    }
    content += '\n';

    this.chunks.push({
      content,
      type: 'warning',
      priority: 'high',
    });
    return this;
  }

  /**
   * Add error chunk with recovery guidance
   */
  addError(title: string, error: string, recovery?: string[]): this {
    let content = `## ERROR: ${title}\n\n**Error:** ${error}\n`;
    
    if (recovery?.length) {
      content += '\n**Recovery Steps:**\n';
      recovery.forEach((step, index) => {
        content += `${index + 1}. ${step}\n`;
      });
    }
    content += '\n';

    this.chunks.push({
      content,
      type: 'error',
      priority: 'high',
    });
    return this;
  }

  /**
   * Add table chunk with proper formatting
   */
  addTable(title: string, headers: string[], rows: string[][]): this {
    let content = `### ${title}\n\n`;
    
    // Table header
    content += `| ${headers.join(' | ')} |\n`;
    content += `|${headers.map(() => '-----').join('|')}|\n`;
    
    // Table rows
    rows.forEach(row => {
      content += `| ${row.join(' | ')} |\n`;
    });
    content += '\n';

    this.chunks.push({
      title,
      content,
      type: 'detail',
      priority: 'medium',
    });
    return this;
  }

  /**
   * Add list chunk with formatting
   */
  addList(title: string, items: Array<{ label: string; value: string; status?: string }>): this {
    let content = `### ${title}\n\n`;
    
    items.forEach(item => {
      const status = item.status ? ` ${item.status}` : '';
      content += `- **${item.label}:**${status} ${item.value}\n`;
    });
    content += '\n';

    this.chunks.push({
      title,
      content,
      type: 'detail',
      priority: 'medium',
    });
    return this;
  }

  /**
   * Set operation duration for metadata
   */
  setDuration(duration: number): this {
    this.metadata.duration = duration;
    return this;
  }

  /**
   * Build final MCP response with streaming chunks
   */
  build(): MCPToolResponse {
    // Sort chunks by priority (high first)
    const sortedChunks = this.chunks.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });

    // Add timestamp footer to last chunk
    if (sortedChunks.length > 0) {
      const lastChunk = sortedChunks[sortedChunks.length - 1];
      if (lastChunk) {
        let footer = `\n---\n*${this.metadata.operation} completed`;
        if (this.metadata.duration) {
          footer += ` in ${this.metadata.duration}ms`;
        }
        footer += ` at ${new Date(this.metadata.timestamp).toLocaleString()}*`;
        lastChunk.content += footer;
      }
    }

    // Convert chunks to MCP content blocks
    const content = sortedChunks.map(chunk => ({
      type: 'text' as const,
      text: chunk.content,
    }));

    return { content };
  }
}

/**
 * Quick builders for common patterns
 */
export class PropertyResponseBuilder extends MCPStreamBuilder {
  constructor(operation: string) {
    super(operation, `Property ${operation}`);
  }

  /**
   * Add property status summary
   */
  addPropertyStatus(
    propertyName: string,
    propertyId: string,
    status: {
      latestVersion?: number;
      productionVersion?: number;
      stagingVersion?: number;
      hasErrors?: boolean;
      hasWarnings?: boolean;
    }
  ): this {
    let statusIcon = '[ACTIVE]';
    let statusText = 'Active';
    
    if (status.hasErrors) {
      statusIcon = '[ERROR]';
      statusText = 'Has errors';
    } else if (status.hasWarnings) {
      statusIcon = '[WARNING]';
      statusText = 'Has warnings';
    } else if (status.latestVersion && status.latestVersion > (status.productionVersion || 0)) {
      statusIcon = '[PENDING]';
      statusText = 'Draft changes ready';
    }

    let content = `${statusIcon} **${propertyName}** (${propertyId})\n`;
    content += `Status: ${statusText}\n\n`;

    if (status.productionVersion) {
      content += `- **Production:** v${status.productionVersion} (active)\n`;
    }
    if (status.stagingVersion) {
      content += `- **Staging:** v${status.stagingVersion} (testing)\n`;
    }
    if (status.latestVersion) {
      content += `- **Latest:** v${status.latestVersion}`;
      if (status.latestVersion > (status.productionVersion || 0)) {
        content += ' (ready to deploy)';
      }
      content += '\n';
    }

    this.addSummary('Property Overview', content);
    return this;
  }

  /**
   * Add hostname summary
   */
  addHostnameStatus(hostnames: Array<{ hostname: string; edgeHostname: string; status?: string }>): this {
    if (hostnames.length === 0) {
      this.addWarning('No Hostnames', 'This property has no hostnames configured.', [
        'Add hostnames using: `add_property_hostname`',
        'Configure DNS CNAME records after adding hostnames'
      ]);
      return this;
    }

    const headers = ['Hostname', 'Edge Hostname', 'Status'];
    const rows = hostnames.map(h => [
      h.hostname,
      h.edgeHostname,
      h.status || '[ACTIVE] Active'
    ]);

    this.addTable('Hostnames', headers, rows);
    return this;
  }

  /**
   * Add suggested property actions based on state
   */
  addPropertyActions(
    propertyId: string,
    context: {
      latestVersion?: number;
      hasUnsavedChanges?: boolean;
      hasValidationErrors?: boolean;
      needsActivation?: boolean;
    }
  ): this {
    const actions: string[] = [];

    if (context.hasValidationErrors) {
      actions.push(`Fix validation errors: \`get_validation_errors ${propertyId}\``);
    }

    if (context.latestVersion) {
      actions.push(`View rules: \`get_property_rules ${propertyId} version=${context.latestVersion}\``);
      actions.push(`View hostnames: \`list_property_hostnames ${propertyId}\``);
      
      if (context.needsActivation && !context.hasValidationErrors) {
        actions.push(`Deploy to staging: \`activate_property ${propertyId} version=${context.latestVersion} network=staging\``);
      }
    }

    actions.push(`View all versions: \`list_property_versions ${propertyId}\``);
    actions.push(`Clone property: \`clone_property sourcePropertyId=${propertyId} propertyName="new-name"\``);

    this.addActions(actions);
    return this;
  }
}

/**
 * Utility functions for common formatting patterns
 */
export const FormatUtils = {
  /**
   * Format file size for human readability
   */
  formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Format duration for human readability
   */
  formatDuration(ms: number): string {
    if (ms < 1000) {return `${ms}ms`;}
    if (ms < 60000) {return `${(ms / 1000).toFixed(1)}s`;}
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  },

  /**
   * Format timestamp for human readability
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {return 'Today';}
    if (diffDays === 1) {return 'Yesterday';}
    if (diffDays < 7) {return `${diffDays} days ago`;}
    return date.toLocaleDateString();
  },

  /**
   * Create status indicator based on state
   */
  statusIndicator(state: 'active' | 'pending' | 'error' | 'warning' | 'inactive'): string {
    const indicators = {
      active: '[ACTIVE]',
      pending: '[PENDING]',
      error: '[ERROR]',
      warning: '[WARNING]',
      inactive: '[INACTIVE]'
    };
    return indicators[state] || '[INACTIVE]';
  }
};

/**
 * Export convenience function for quick streaming responses
 */
export function createStreamingResponse(operation: string, builderFn: (builder: MCPStreamBuilder) => void): MCPToolResponse {
  const builder = new MCPStreamBuilder(operation, `${operation} Results`);
  builderFn(builder);
  return builder.build();
}