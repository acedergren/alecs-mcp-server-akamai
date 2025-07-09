#!/usr/bin/env tsx

/**
 * MCP Specification Fetcher
 * Uses Puppeteer to browse and extract the official MCP specification
 * to ensure ALECS compliance with expected behavior
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MCPSpecSection {
  title: string;
  content: string;
  url: string;
  subsections?: MCPSpecSection[];
}

class MCPSpecificationFetcher {
  private browser?: puppeteer.Browser;
  private baseUrl = 'https://modelcontextprotocol.io/specification/2025-06-18';

  async init() {
    console.log('🚀 Initializing Puppeteer browser...');
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async fetchSpecificationContent(): Promise<MCPSpecSection[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    console.log(`📖 Fetching MCP specification from ${this.baseUrl}...`);
    
    try {
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Extract main specification content
      const mainContent = await this.extractMainContent(page);
      
      // Look for navigation links to other sections
      const navigationLinks = await this.extractNavigationLinks(page);
      
      const sections: MCPSpecSection[] = [mainContent];
      
      // Fetch additional sections
      for (const link of navigationLinks) {
        try {
          console.log(`📄 Fetching section: ${link.title}`);
          await page.goto(link.url, { waitUntil: 'networkidle0', timeout: 15000 });
          const sectionContent = await this.extractMainContent(page);
          sections.push(sectionContent);
          
          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn(`⚠️ Could not fetch section ${link.title}: ${error}`);
        }
      }
      
      return sections;
      
    } catch (error) {
      console.error('❌ Error fetching specification:', error);
      throw error;
    }
  }

  private async extractMainContent(page: puppeteer.Page): Promise<MCPSpecSection> {
    const content = await page.evaluate(() => {
      // Simple content extraction without complex recursion
      const title = document.title || 'MCP Specification';
      const url = window.location.href;
      
      // Get all text content from the page
      let content = '';
      
      // Try to get main content area
      const mainSelectors = ['main', '.content', '.specification-content', 'article', '[role="main"]'];
      let mainElement = null;
      
      for (const selector of mainSelectors) {
        mainElement = document.querySelector(selector);
        if (mainElement) break;
      }
      
      if (!mainElement) {
        mainElement = document.body;
      }
      
      // Extract all text content
      const allElements = mainElement.querySelectorAll('*');
      const textContent = [];
      
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent?.trim();
        
        if (text && text.length > 0) {
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            textContent.push(`\n\n## ${text}\n\n`);
          } else if (tagName === 'p') {
            textContent.push(text + '\n\n');
          } else if (tagName === 'li') {
            textContent.push(`- ${text}\n`);
          } else if (tagName === 'code' || tagName === 'pre') {
            textContent.push(`\`${text}\``);
          } else if (['span', 'div', 'section'].includes(tagName)) {
            // Only add if it's not already included by parent
            if (!textContent.some(existing => existing.includes(text))) {
              textContent.push(text + ' ');
            }
          }
        }
      }
      
      content = textContent.join('');
      
      return {
        title: title,
        content: content,
        url: url
      };
    });
    
    return content;
  }

  private async extractNavigationLinks(page: puppeteer.Page): Promise<Array<{title: string, url: string}>> {
    return await page.evaluate(() => {
      const links: Array<{title: string, url: string}> = [];
      
      // Look for navigation elements
      const navSelectors = [
        'nav a',
        '.nav a',
        '.navigation a',
        '.sidebar a',
        '.menu a',
        '[role="navigation"] a'
      ];
      
      for (const selector of navSelectors) {
        const navLinks = document.querySelectorAll(selector);
        
        for (const link of navLinks) {
          const anchor = link as HTMLAnchorElement;
          const href = anchor.href;
          const title = anchor.textContent?.trim() || anchor.title || href;
          
          // Filter for specification-related links
          if (href && href.includes('specification') && title) {
            // Avoid duplicates
            if (!links.some(l => l.url === href)) {
              links.push({ title, url: href });
            }
          }
        }
        
        // If we found links, stop looking
        if (links.length > 0) break;
      }
      
      return links;
    });
  }

  async analyzeToolNamingRequirements(sections: MCPSpecSection[]): Promise<{
    toolNamingRules: string[];
    serverBehavior: string[];
    clientBehavior: string[];
    transportRequirements: string[];
  }> {
    console.log('🔍 Analyzing MCP specification for tool naming and behavior requirements...');
    
    const analysis = {
      toolNamingRules: [] as string[],
      serverBehavior: [] as string[],
      clientBehavior: [] as string[],
      transportRequirements: [] as string[]
    };
    
    // Keywords to search for
    const toolKeywords = ['tool name', 'tool naming', 'name format', 'identifier', 'naming convention'];
    const serverKeywords = ['server', 'tool registration', 'tool handler', 'server behavior'];
    const clientKeywords = ['client', 'tool call', 'client behavior'];
    const transportKeywords = ['transport', 'stdio', 'websocket', 'connection'];
    
    for (const section of sections) {
      const content = section.content.toLowerCase();
      
      // Extract tool naming rules
      for (const keyword of toolKeywords) {
        if (content.includes(keyword)) {
          const sentences = this.extractRelevantSentences(section.content, keyword);
          analysis.toolNamingRules.push(...sentences);
        }
      }
      
      // Extract server behavior requirements
      for (const keyword of serverKeywords) {
        if (content.includes(keyword)) {
          const sentences = this.extractRelevantSentences(section.content, keyword);
          analysis.serverBehavior.push(...sentences);
        }
      }
      
      // Extract client behavior requirements
      for (const keyword of clientKeywords) {
        if (content.includes(keyword)) {
          const sentences = this.extractRelevantSentences(section.content, keyword);
          analysis.clientBehavior.push(...sentences);
        }
      }
      
      // Extract transport requirements
      for (const keyword of transportKeywords) {
        if (content.includes(keyword)) {
          const sentences = this.extractRelevantSentences(section.content, keyword);
          analysis.transportRequirements.push(...sentences);
        }
      }
    }
    
    // Remove duplicates and clean up
    analysis.toolNamingRules = [...new Set(analysis.toolNamingRules)].filter(s => s.length > 10);
    analysis.serverBehavior = [...new Set(analysis.serverBehavior)].filter(s => s.length > 10);
    analysis.clientBehavior = [...new Set(analysis.clientBehavior)].filter(s => s.length > 10);
    analysis.transportRequirements = [...new Set(analysis.transportRequirements)].filter(s => s.length > 10);
    
    return analysis;
  }

  private extractRelevantSentences(content: string, keyword: string): string[] {
    const sentences: string[] = [];
    const lowerContent = content.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    
    // Split into sentences (rough approximation)
    const sentencePattern = /[.!?]+\s+/g;
    const allSentences = content.split(sentencePattern);
    
    for (const sentence of allSentences) {
      if (sentence.toLowerCase().includes(lowerKeyword)) {
        // Also include the next sentence for context
        const index = allSentences.indexOf(sentence);
        let contextualSentence = sentence.trim();
        if (index < allSentences.length - 1) {
          contextualSentence += ' ' + allSentences[index + 1].trim();
        }
        
        if (contextualSentence.length > 20) {
          sentences.push(contextualSentence);
        }
      }
    }
    
    return sentences;
  }

  async generateComplianceReport(analysis: any, sections: MCPSpecSection[]): Promise<string> {
    const report = `# MCP Specification Compliance Analysis
## Generated: ${new Date().toISOString()}

## Specification Source
- **URL**: ${this.baseUrl}
- **Sections Analyzed**: ${sections.length}
- **Total Content**: ${sections.reduce((sum, s) => sum + s.content.length, 0)} characters

## Tool Naming Requirements

${analysis.toolNamingRules.length > 0 ? 
  analysis.toolNamingRules.map((rule: string) => `- ${rule}`).join('\n') : 
  '- No explicit tool naming requirements found in specification'}

## Server Behavior Requirements

${analysis.serverBehavior.length > 0 ? 
  analysis.serverBehavior.slice(0, 10).map((req: string) => `- ${req}`).join('\n') : 
  '- No specific server behavior requirements found'}

## Client Behavior Requirements

${analysis.clientBehavior.length > 0 ? 
  analysis.clientBehavior.slice(0, 10).map((req: string) => `- ${req}`).join('\n') : 
  '- No specific client behavior requirements found'}

## Transport Requirements

${analysis.transportRequirements.length > 0 ? 
  analysis.transportRequirements.slice(0, 10).map((req: string) => `- ${req}`).join('\n') : 
  '- No specific transport requirements found'}

## ALECS Compliance Assessment

### Current ALECS Implementation

#### Tool Naming
- **Current Pattern**: Dot notation (e.g., \`property.list\`, \`dns.zone.create\`)
- **Total Tools**: 287
- **Naming Convention**: Hierarchical domain.subdomain.action

#### Server Behavior
- **Framework**: @modelcontextprotocol/sdk/server
- **Transport**: StdioServerTransport
- **Tool Registration**: Dynamic via tool registry
- **Validation**: Custom tool name validation with regex pattern

#### Client Support
- **Test Implementation**: Direct MCP SDK client testing
- **Transport Support**: Stdio and WebSocket
- **Multi-tenant**: Customer isolation support

### Compliance Recommendations

Based on this analysis:

1. **Tool Naming**: ${analysis.toolNamingRules.length > 0 ? 
   'Review specification requirements and adjust if needed' : 
   'No specific naming requirements found - current implementation appears flexible'}

2. **Server Implementation**: Ensure MCP SDK compliance and proper error handling

3. **Transport Layer**: Verify stdio and websocket transport implementations

4. **Testing Strategy**: Continue with genuine MCP client testing approach

## Next Steps

1. Review any specific requirements found above
2. Test ALECS against official MCP clients
3. Validate transport layer compliance
4. Ensure proper error handling per MCP specification

## Raw Specification Content

${sections.map(section => `### ${section.title}\n**URL**: ${section.url}\n\n${section.content.substring(0, 2000)}...\n\n`).join('\n')}
`;

    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run(): Promise<void> {
    try {
      await this.init();
      
      const sections = await this.fetchSpecificationContent();
      console.log(`✅ Fetched ${sections.length} sections from MCP specification`);
      
      const analysis = await this.analyzeToolNamingRequirements(sections);
      
      const report = await this.generateComplianceReport(analysis, sections);
      
      // Save the report
      const reportsDir = path.join(process.cwd(), 'docs', 'compliance');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const reportPath = path.join(reportsDir, `mcp-specification-analysis-${Date.now()}.md`);
      await fs.writeFile(reportPath, report);
      
      console.log(`📄 MCP Specification analysis saved to: ${reportPath}`);
      
      // Also save raw specification content
      const rawDataPath = path.join(reportsDir, `mcp-specification-raw-${Date.now()}.json`);
      await fs.writeFile(rawDataPath, JSON.stringify(sections, null, 2));
      
      console.log(`💾 Raw specification data saved to: ${rawDataPath}`);
      
      // Print key findings
      console.log('\n🔍 KEY FINDINGS:');
      console.log(`- Tool naming rules found: ${analysis.toolNamingRules.length}`);
      console.log(`- Server behavior requirements: ${analysis.serverBehavior.length}`);
      console.log(`- Client behavior requirements: ${analysis.clientBehavior.length}`);
      console.log(`- Transport requirements: ${analysis.transportRequirements.length}`);
      
      if (analysis.toolNamingRules.length > 0) {
        console.log('\n📋 TOOL NAMING RULES:');
        analysis.toolNamingRules.slice(0, 3).forEach(rule => {
          console.log(`  - ${rule.substring(0, 100)}...`);
        });
      }
      
    } finally {
      await this.cleanup();
    }
  }
}

// Main execution
async function main() {
  console.log('═'.repeat(60));
  console.log('🔍 MCP Specification Fetcher & Compliance Analyzer');
  console.log('═'.repeat(60));
  
  const fetcher = new MCPSpecificationFetcher();
  await fetcher.run();
}

if (require.main === module) {
  main().catch(console.error);
}