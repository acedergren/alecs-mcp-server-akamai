import { spawn } from 'child_process';
import { MCPCapabilities, ToolAnalysis, ToolCategory, RiskLevel, TestComplexity } from '../types/TestTypes';
import { AlexPersonality } from '../utils/AlexPersonality';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 🔍 DYNAMIC TEST DISCOVERY ENGINE
 * Alex Rodriguez: "Tests should discover functionality, not hardcode assumptions!"
 */
export class DynamicTestDiscovery {
  
  /**
   * Discovers all current MCP server capabilities by introspecting the live server
   */
  async discoverMCPCapabilities(): Promise<MCPCapabilities> {
    console.log('🔍 [DISCOVERY] Alex Rodriguez: Scanning MCP server for capabilities...');
    console.log(AlexPersonality.getMotivationalMessage());
    
    const capabilities: MCPCapabilities = {
      tools: [],
      resources: [],
      prompts: [],
      metadata: {
        discoveredAt: new Date().toISOString(),
        serverVersion: await this.getServerVersion(),
        commitHash: await this.getCommitHash()
      }
    };
    
    try {
      // Start MCP server and discover tools
      const tools = await this.discoverToolsFromServer();
      
      // Analyze each tool in detail
      for (const tool of tools) {
        console.log(`🔧 [DISCOVERY] Analyzing tool: ${tool.name}`);
        
        const toolAnalysis = await this.analyzeToolCapabilities(tool);
        capabilities.tools.push({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          analysis: toolAnalysis
        });
      }
      
      console.log(`✅ [DISCOVERY] Found ${capabilities.tools.length} tools to test`);
      console.log(`📊 [DISCOVERY] Tool categories: ${this.summarizeCategories(capabilities.tools)}`);
      
      return capabilities;
      
    } catch (error) {
      console.error('❌ [DISCOVERY] Failed to discover MCP capabilities:', error);
      throw error;
    }
  }
  
  /**
   * Discover tools by starting the MCP server and querying it
   */
  private async discoverToolsFromServer(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      console.log('🚀 [DISCOVERY] Starting MCP server for tool discovery...');
      
      const serverProcess = spawn('npm', ['run', 'dev:full'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let output = '';
      let hasResponded = false;
      
      // Send discovery request
      const discoveryRequest = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }) + '\n';
      
      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        
        // Try to parse complete JSON responses
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.trim() && line.includes('"jsonrpc"')) {
            try {
              const response = JSON.parse(line);
              if (response.id === 1 && response.result?.tools) {
                hasResponded = true;
                serverProcess.kill();
                resolve(response.result.tools);
              }
            } catch (e) {
              // Not a complete JSON yet, continue
            }
          }
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error('[DISCOVERY] Server error:', data.toString());
      });
      
      serverProcess.on('close', (code) => {
        if (!hasResponded) {
          reject(new Error(`Server exited with code ${code} without providing tools`));
        }
      });
      
      // Send the discovery request after server starts
      setTimeout(() => {
        serverProcess.stdin.write(discoveryRequest);
      }, 1000);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!hasResponded) {
          serverProcess.kill();
          reject(new Error('Timeout waiting for server response'));
        }
      }, 10000);
    });
  }
  
  /**
   * Deep analysis of individual tool capabilities
   */
  private async analyzeToolCapabilities(tool: any): Promise<ToolAnalysis> {
    const analysis: ToolAnalysis = {
      name: tool.name,
      description: tool.description,
      schema: tool.inputSchema,
      category: this.categorizeToolByName(tool.name),
      requiredParams: this.extractRequiredParams(tool.inputSchema),
      optionalParams: this.extractOptionalParams(tool.inputSchema),
      exampleUsage: await this.generateExampleUsage(tool),
      riskLevel: this.assessRiskLevel(tool),
      testComplexity: this.assessTestComplexity(tool),
      lastModified: await this.getToolLastModified(tool.name)
    };
    
    // Generate realistic test data for this tool
    analysis.testDataSets = await this.generateTestDataSets(analysis);
    
    return analysis;
  }
  
  /**
   * Categorize tools by their naming patterns
   */
  private categorizeToolByName(toolName: string): ToolCategory {
    const patterns: [RegExp, ToolCategory][] = [
      [/property|prop_/i, 'property-management'],
      [/activate|deploy/i, 'property-deployment'],
      [/dns|zone|record/i, 'dns-management'],
      [/cert|enrollment|ssl|tls/i, 'certificate-management'],
      [/security|waf|appsec|network.*list/i, 'security-management'],
      [/purge|cache|content/i, 'content-management'],
      [/report|analytics|metrics/i, 'reporting'],
    ];
    
    for (const [pattern, category] of patterns) {
      if (pattern.test(toolName)) {
        return category;
      }
    }
    
    return 'general';
  }
  
  /**
   * Extract required parameters from schema
   */
  private extractRequiredParams(schema: any): string[] {
    if (!schema || typeof schema !== 'object') return [];
    
    if (schema.type === 'object' && Array.isArray(schema.required)) {
      return schema.required;
    }
    
    return [];
  }
  
  /**
   * Extract optional parameters from schema
   */
  private extractOptionalParams(schema: any): string[] {
    if (!schema || typeof schema !== 'object' || !schema.properties) return [];
    
    const required = new Set(this.extractRequiredParams(schema));
    const allParams = Object.keys(schema.properties);
    
    return allParams.filter(param => !required.has(param));
  }
  
  /**
   * Generate example usage for documentation and testing
   */
  private async generateExampleUsage(tool: any): Promise<string[]> {
    const examples: string[] = [];
    
    // Generate examples based on tool name patterns
    const name = tool.name.toLowerCase();
    
    if (name.includes('list')) {
      const resource = name.replace(/list[_-]?/, '').replace(/_/g, ' ');
      examples.push(`Show me all ${resource} for solutionsedge`);
      examples.push(`What ${resource} do I have?`);
    }
    
    if (name.includes('create')) {
      const resource = name.replace(/create[_-]?/, '').replace(/_/g, ' ');
      examples.push(`Create a new ${resource} for solutionsedge.io`);
      examples.push(`Set up a ${resource} for the blog subdomain`);
    }
    
    if (name.includes('activate') || name.includes('deploy')) {
      examples.push(`Deploy the solutionsedge.io changes to staging`);
      examples.push(`Activate the latest version to production`);
    }
    
    if (name.includes('get') || name.includes('show')) {
      const resource = name.replace(/get[_-]?|show[_-]?/, '').replace(/_/g, ' ');
      examples.push(`Show me the ${resource} details`);
      examples.push(`Get information about the ${resource}`);
    }
    
    return examples;
  }
  
  /**
   * Assess risk level of a tool based on its operations
   */
  private assessRiskLevel(tool: any): RiskLevel {
    const name = tool.name.toLowerCase();
    
    // High risk operations
    if (name.includes('delete') || name.includes('remove') || 
        name.includes('activate') || name.includes('production') ||
        name.includes('purge')) {
      return 'high';
    }
    
    // Medium risk operations
    if (name.includes('create') || name.includes('update') || 
        name.includes('modify') || name.includes('staging')) {
      return 'medium';
    }
    
    // Low risk operations
    return 'low';
  }
  
  /**
   * Assess test complexity based on tool characteristics
   */
  private assessTestComplexity(tool: any): TestComplexity {
    const paramCount = this.extractRequiredParams(tool.inputSchema).length +
                      this.extractOptionalParams(tool.inputSchema).length;
    
    if (paramCount > 5 || tool.name.includes('workflow') || tool.name.includes('batch')) {
      return 'complex';
    }
    
    if (paramCount > 2 || this.assessRiskLevel(tool) === 'high') {
      return 'moderate';
    }
    
    return 'simple';
  }
  
  /**
   * Generate test data sets for comprehensive testing
   */
  private async generateTestDataSets(analysis: ToolAnalysis): Promise<any[]> {
    const dataSets = [];
    
    // Base solutionsedge.io test data
    const baseData = {
      name: 'solutionsedge.io production data',
      description: 'Real-world test data based on solutionsedge.io',
      data: {
        customer: 'solutionsedge',
        domain: 'solutionsedge.io',
        hostname: 'www.solutionsedge.io',
        propertyName: 'solutionsedge.io',
        network: 'staging'
      },
      expectedOutcome: 'Success with solutionsedge.io configuration'
    };
    
    dataSets.push(baseData);
    
    // Add category-specific test data
    if (analysis.category === 'property-management') {
      dataSets.push({
        name: 'Multi-property test',
        description: 'Test with multiple solutionsedge.io properties',
        data: {
          ...baseData.data,
          properties: ['www.solutionsedge.io', 'api.solutionsedge.io', 'blog.solutionsedge.io']
        },
        expectedOutcome: 'Handles multiple properties correctly'
      });
    }
    
    return dataSets;
  }
  
  private async getServerVersion(): Promise<string> {
    try {
      const packageJson = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8');
      const pkg = JSON.parse(packageJson);
      return pkg.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  private async getCommitHash(): Promise<string> {
    // In a real implementation, this would get the git commit hash
    return process.env.GITHUB_SHA || 'local-development';
  }
  
  private async getToolLastModified(toolName: string): Promise<string> {
    // In a real implementation, this would check git history for the tool file
    return new Date().toISOString();
  }
  
  private summarizeCategories(tools: any[]): string {
    const categories = new Map<string, number>();
    tools.forEach(tool => {
      const category = tool.analysis.category;
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    return Array.from(categories.entries())
      .map(([cat, count]) => `${cat}(${count})`)
      .join(', ');
  }
}