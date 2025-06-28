/**
 * Safe Console Utility for MCP Server
 * 
 * SNOW LEOPARD ARCHITECTURE:
 * - Prevents stdout contamination in JSON-RPC communication
 * - Redirects all console.log/info to stderr automatically
 * - Maintains consistent logging across all modules
 * - Zero-tolerance for JSON-RPC protocol violations
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * - Systematic protection against stdout pollution
 * - Defensive redirection of all console outputs
 * - Type-safe logging with structured metadata
 * - Comprehensive error prevention
 */

import { logger } from './logger';

/**
 * Safe console replacement that redirects stdout-bound logs to stderr
 * Prevents JSON-RPC protocol corruption in MCP servers
 */
export class SafeConsole {
  /**
   * Safe replacement for console.log - redirects to stderr
   */
  static log(...args: any[]): void {
    // Use console.error to ensure output goes to stderr, not stdout
    console.error('[LOG]', ...args);
  }

  /**
   * Safe replacement for console.info - redirects to stderr
   */
  static info(...args: any[]): void {
    console.error('[INFO]', ...args);
  }

  /**
   * Safe replacement for console.warn - already goes to stderr
   */
  static warn(...args: any[]): void {
    console.warn('[WARN]', ...args);
  }

  /**
   * Safe replacement for console.error - already goes to stderr
   */
  static error(...args: any[]): void {
    console.error('[ERROR]', ...args);
  }

  /**
   * Structured logging for MCP operations
   */
  static mcpLog(level: 'info' | 'warn' | 'error', message: string, metadata?: any): void {
    switch (level) {
      case 'info':
        logger.info(message, metadata);
        break;
      case 'warn':
        logger.warn(message, metadata);
        break;
      case 'error':
        logger.error(message, metadata);
        break;
    }
  }
}

/**
 * Setup function to override global console methods
 * CRITICAL: Must be called before any other imports that might use console.log
 */
export function setupSafeConsole(): void {
  // Override console.log to redirect to stderr
  console.log = (...args: any[]) => {
    console.error('[STDOUT-REDIRECT]', ...args);
  };

  // Override console.info to redirect to stderr
  console.info = (...args: any[]) => {
    console.error('[INFO-REDIRECT]', ...args);
  };

  // Add debug logging for development
  if (process.env['DEBUG_CONSOLE_OVERRIDE'] === '1') {
    console.error('[SAFE-CONSOLE] Console overrides activated - all console.log/info redirected to stderr');
  }
}

/**
 * Progress tracker for long-running operations
 * Safely logs progress to stderr without polluting stdout JSON-RPC stream
 */
export class SafeProgressTracker {
  private operation: string;
  private startTime: number;

  constructor(operationName: string) {
    this.operation = operationName;
    this.startTime = Date.now();
    SafeConsole.mcpLog('info', `Starting ${operationName}...`);
  }

  update(message: string): void {
    SafeConsole.mcpLog('info', `${this.operation}: ${message}`);
  }

  complete(message?: string): void {
    const duration = Date.now() - this.startTime;
    const finalMessage = message || `${this.operation} completed`;
    SafeConsole.mcpLog('info', `${finalMessage} (${duration}ms)`);
  }

  error(error: string | Error): void {
    const duration = Date.now() - this.startTime;
    const errorMessage = error instanceof Error ? error.message : error;
    SafeConsole.mcpLog('error', `${this.operation} failed after ${duration}ms: ${errorMessage}`);
  }
}