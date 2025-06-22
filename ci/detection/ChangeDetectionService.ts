import { MCPCapabilities, DetectedChanges, ToolAnalysis } from '../types/TestTypes';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 🔍 INTELLIGENT CHANGE DETECTION
 * Alex Rodriguez: "I can spot changes faster than a hawk spots a mouse!"
 */
export class ChangeDetectionService {
  private cacheDir = path.join(process.cwd(), 'ci/cache');
  private lastCapabilitiesPath = path.join(this.cacheDir, 'last-capabilities.json');
  
  constructor() {
    this.ensureCacheDirectory();
  }
  
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create cache directory:', error);
    }
  }
  
  /**
   * Detect changes since last test run
   */
  async detectChanges(currentCapabilities: MCPCapabilities): Promise<DetectedChanges> {
    const startTime = Date.now();
    console.log('\n🔍 [DETECTION] Alex Rodriguez: Scanning for changes like a detective!');
    
    const lastCapabilities = await this.loadLastCapabilities();
    const changes = new DetectedChanges();
    changes.detectionTime = Date.now() - startTime;
    
    if (!lastCapabilities) {
      console.log('🆕 [DETECTION] First run - all tools are new!');
      changes.newTools = currentCapabilities.tools.map(t => t.analysis);
      await this.saveCurrentCapabilities(currentCapabilities);
      return changes;
    }
    
    // Detect new tools
    changes.newTools = this.findNewTools(lastCapabilities, currentCapabilities);
    if (changes.newTools.length > 0) {
      console.log(`\n🆕 [DETECTION] Found ${changes.newTools.length} new tools! Alex is EXCITED!`);
      changes.newTools.forEach(tool => {
        console.log(`   ➕ ${tool.name} - ${tool.description}`);
      });
    }
    
    // Detect modified tools
    changes.modifiedTools = this.findModifiedTools(lastCapabilities, currentCapabilities);
    if (changes.modifiedTools.length > 0) {
      console.log(`\n🔄 [DETECTION] Found ${changes.modifiedTools.length} modified tools`);
      changes.modifiedTools.forEach(change => {
        console.log(`   🔧 ${change.toolName}: ${change.changeDescription}`);
      });
    }
    
    // Detect removed tools
    changes.removedTools = this.findRemovedTools(lastCapabilities, currentCapabilities);
    if (changes.removedTools.length > 0) {
      console.log(`\n🗑️ [DETECTION] Found ${changes.removedTools.length} removed tools`);
      changes.removedTools.forEach(tool => {
        console.log(`   ➖ ${tool.name} - cleaning up tests`);
      });
    }
    
    // Save current state for next run
    await this.saveCurrentCapabilities(currentCapabilities);
    
    if (!changes.hasChanges()) {
      console.log('✅ [DETECTION] No changes detected - Alex is keeping watch!');
    } else {
      console.log(`\n📊 [DETECTION] Summary: ${changes.getSummary()}`);
    }
    
    return changes;
  }
  
  /**
   * Load last saved capabilities
   */
  private async loadLastCapabilities(): Promise<MCPCapabilities | null> {
    try {
      const data = await fs.readFile(this.lastCapabilitiesPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }
  
  /**
   * Save current capabilities for next run
   */
  private async saveCurrentCapabilities(capabilities: MCPCapabilities): Promise<void> {
    try {
      await fs.writeFile(
        this.lastCapabilitiesPath,
        JSON.stringify(capabilities, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save capabilities:', error);
    }
  }
  
  /**
   * Find new tools that didn't exist in last run
   */
  private findNewTools(
    lastCapabilities: MCPCapabilities, 
    currentCapabilities: MCPCapabilities
  ): ToolAnalysis[] {
    const lastToolNames = new Set(lastCapabilities.tools.map(t => t.name));
    return currentCapabilities.tools
      .filter(t => !lastToolNames.has(t.name))
      .map(t => t.analysis);
  }
  
  /**
   * Find tools with modified signatures or behavior
   */
  private findModifiedTools(
    lastCapabilities: MCPCapabilities,
    currentCapabilities: MCPCapabilities
  ): any[] {
    const modifications: any[] = [];
    
    for (const currentTool of currentCapabilities.tools) {
      const lastTool = lastCapabilities.tools.find(t => t.name === currentTool.name);
      if (!lastTool) continue;
      
      const changes = this.detectToolChanges(lastTool, currentTool);
      if (changes.length > 0) {
        modifications.push({
          toolName: currentTool.name,
          changes: changes,
          changeDescription: changes.join(', '),
          oldAnalysis: lastTool.analysis,
          newAnalysis: currentTool.analysis
        });
      }
    }
    
    return modifications;
  }
  
  /**
   * Find tools that were removed
   */
  private findRemovedTools(
    lastCapabilities: MCPCapabilities,
    currentCapabilities: MCPCapabilities
  ): ToolAnalysis[] {
    const currentToolNames = new Set(currentCapabilities.tools.map(t => t.name));
    return lastCapabilities.tools
      .filter(t => !currentToolNames.has(t.name))
      .map(t => t.analysis);
  }
  
  /**
   * Detect specific changes in a tool
   */
  private detectToolChanges(lastTool: any, currentTool: any): string[] {
    const changes: string[] = [];
    
    // Check schema changes
    if (JSON.stringify(lastTool.inputSchema) !== JSON.stringify(currentTool.inputSchema)) {
      changes.push('schema modified');
      
      // More specific schema change detection
      const lastParams = new Set(Object.keys(lastTool.inputSchema?.properties || {}));
      const currentParams = new Set(Object.keys(currentTool.inputSchema?.properties || {}));
      
      const added = [...currentParams].filter(p => !lastParams.has(p));
      const removed = [...lastParams].filter(p => !currentParams.has(p));
      
      if (added.length > 0) {
        changes.push(`new params: ${added.join(', ')}`);
      }
      if (removed.length > 0) {
        changes.push(`removed params: ${removed.join(', ')}`);
      }
    }
    
    // Check description changes
    if (lastTool.description !== currentTool.description) {
      changes.push('description updated');
    }
    
    // Check required parameters
    const lastRequired = new Set(lastTool.analysis.requiredParams);
    const currentRequired = new Set(currentTool.analysis.requiredParams);
    
    if (!this.setsEqual(lastRequired, currentRequired)) {
      changes.push('required parameters changed');
    }
    
    // Check risk level changes
    if (lastTool.analysis.riskLevel !== currentTool.analysis.riskLevel) {
      changes.push(`risk level: ${lastTool.analysis.riskLevel} → ${currentTool.analysis.riskLevel}`);
    }
    
    return changes;
  }
  
  private setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    return a.size === b.size && [...a].every(value => b.has(value));
  }
}