/**
 * Configuration Hints Service
 * Temporary compatibility layer for workflow orchestrator
 */

export interface ConfigurationHint {
  message: string;
  type: 'info' | 'warning' | 'error';
  context?: Record<string, any>;
}

export class ConfigurationHintsService {
  private static instance: ConfigurationHintsService;
  
  private constructor() {}
  
  static getInstance(): ConfigurationHintsService {
    if (!ConfigurationHintsService.instance) {
      ConfigurationHintsService.instance = new ConfigurationHintsService();
    }
    return ConfigurationHintsService.instance;
  }
  
  getHints(_operation: string, _context?: Record<string, any>): ConfigurationHint[] {
    // Placeholder implementation
    return [];
  }
  
  addHint(_hint: ConfigurationHint): void {
    // Placeholder implementation
  }
}