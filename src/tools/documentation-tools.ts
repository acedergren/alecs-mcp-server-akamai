/**
 * Documentation automation tools for ALECS project
 * Manages documentation generation, updates, and knowledge base
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { type AkamaiClient } from '../akamai-client';
import { type MCPToolResponse } from '../types';

interface DocumentationMetadata {
  title: string;
  description: string;
  category: string;
  tags: string[];
  lastUpdated: string;
  version: string;
  dependencies?: string[];
}

interface DocumentationIndex {
  documents: Map<string, DocumentationMetadata>;
  categories: Map<string, string[]>;
  tags: Map<string, string[]>;
}

/**
 * Generate documentation index from markdown files
 */
export async function generateDocumentationIndex(
  _client: AkamaiClient,
  args: {
    docsPath?: string;
    outputPath?: string;
  },
): Promise<MCPToolResponse> {
  const docsPath = args.docsPath || 'docs';
  const outputPath = args.outputPath || path.join(docsPath, 'index.json');

  try {
    const index: DocumentationIndex = {
      documents: new Map(),
      categories: new Map(),
      tags: new Map(),
    };

    // Read all markdown files
    const files = await fs.readdir(docsPath);
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    for (const file of mdFiles) {
      const filePath = path.join(docsPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract metadata from frontmatter or content
      const metadata = extractDocumentMetadata(file, content);

      // Add to index
      index.documents.set(file, metadata);

      // Update category index
      const categoryDocs = index.categories.get(metadata.category) || [];
      categoryDocs.push(file);
      index.categories.set(metadata.category, categoryDocs);

      // Update tag index
      for (const tag of metadata.tags) {
        const tagDocs = index.tags.get(tag) || [];
        tagDocs.push(file);
        index.tags.set(tag, tagDocs);
      }
    }

    // Save index
    const indexData = {
      generated: new Date().toISOString(),
      documentCount: index.documents.size,
      documents: Object.fromEntries(index.documents),
      categories: Object.fromEntries(index.categories),
      tags: Object.fromEntries(index.tags),
    };

    await fs.writeFile(outputPath, JSON.stringify(indexData, null, 2));

    return {
      content: [
        {
          type: 'text',
          text: `Documentation index generated successfully:
- Documents indexed: ${index.documents.size}
- Categories: ${index.categories.size}
- Unique tags: ${index.tags.size}
- Output: ${outputPath}`,
        },
      ],
    };
  } catch (_error) {
    console.error('[Error]:', _error);
    throw _error;
  }
}

/**
 * Generate API reference documentation from tool definitions
 */
export async function generateAPIReference(
  _client: AkamaiClient,
  args: {
    toolsPath?: string;
    outputPath?: string;
    format?: 'markdown' | 'json';
  },
): Promise<MCPToolResponse> {
  const toolsPath = args.toolsPath || 'src/tools';
  const outputPath = args.outputPath || 'docs/api-reference.md';
  const outputFormat = args.format || 'markdown';

  try {
    // Scan for tool files
    const files = await fs.readdir(toolsPath);
    const toolFiles = files.filter((f) => f.endsWith('-tools.ts') || f.endsWith('-tools.js'));

    const toolDefinitions: any[] = [];

    for (const file of toolFiles) {
      const filePath = path.join(toolsPath, file);
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract function definitions and JSDoc comments
      const tools = extractToolDefinitions(content);
      toolDefinitions.push(
        ...tools.map((tool) => ({
          ...tool,
          file: file,
          category: getCategoryFromFilename(file),
        })),
      );
    }

    // Generate output
    let output: string;
    if (outputFormat === 'markdown') {
      output = generateMarkdownAPIReference(toolDefinitions);
    } else {
      output = JSON.stringify(toolDefinitions, null, 2);
    }

    await fs.writeFile(outputPath, output);

    return {
      content: [
        {
          type: 'text',
          text: `API reference generated successfully:
- Tools documented: ${toolDefinitions.length}
- Categories: ${new Set(toolDefinitions.map((t) => t.category)).size}
- Output format: ${outputFormat}
- Output file: ${outputPath}`,
        },
      ],
    };
  } catch (_error) {
    console.error('[Error]:', _error);
    throw _error;
  }
}

/**
 * Generate feature documentation from code analysis
 */
export async function generateFeatureDocumentation(
  _client: AkamaiClient,
  args: {
    feature: string;
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
    includeExamples?: boolean;
    outputPath?: string;
  },
): Promise<MCPToolResponse> {
  const depth = args.analysisDepth || 'detailed';
  const includeExamples = args.includeExamples ?? true;
  const outputPath = args.outputPath || `docs/features/${args.feature}.md`;

  try {
    // Analyze feature implementation
    const analysis = await analyzeFeature(args.feature);

    // Generate documentation
    let doc = `# ${formatFeatureName(args.feature)}\n\n`;
    doc += `${analysis.description}\n\n`;

    // Add overview
    doc += `## Overview\n\n${analysis.overview}\n\n`;

    // Add capabilities
    if (analysis.capabilities.length > 0) {
      doc += '## Capabilities\n\n';
      for (const capability of analysis.capabilities) {
        doc += `- ${capability}\n`;
      }
      doc += '\n';
    }

    // Add usage
    doc += `## Usage\n\n${analysis.usage}\n\n`;

    // Add examples if requested
    if (includeExamples && analysis.examples.length > 0) {
      doc += '## Examples\n\n';
      for (const example of analysis.examples) {
        doc += `### ${example.title}\n\n`;
        doc += '```typescript\n';
        doc += example.code;
        doc += '\n```\n\n';
        if (example.description) {
          doc += `${example.description}\n\n`;
        }
      }
    }

    // Add API reference
    if (analysis.apis.length > 0) {
      doc += '## API Reference\n\n';
      for (const api of analysis.apis) {
        doc += `### ${api.name}\n\n`;
        doc += `${api.description}\n\n`;
        if (api.parameters.length > 0) {
          doc += '**Parameters:**\n\n';
          for (const param of api.parameters) {
            doc += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          }
          doc += '\n';
        }
        if (api.returns) {
          doc += `**Returns:** ${api.returns}\n\n`;
        }
      }
    }

    // Add related documentation
    if (analysis.related.length > 0) {
      doc += '## Related Documentation\n\n';
      for (const related of analysis.related) {
        doc += `- [${related.title}](${related.path})\n`;
      }
      doc += '\n';
    }

    // Save documentation
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, doc);

    return {
      content: [
        {
          type: 'text',
          text: `Feature documentation generated successfully:
- Feature: ${args.feature}
- Analysis depth: ${depth}
- Examples included: ${includeExamples}
- Output: ${outputPath}`,
        },
      ],
    };
  } catch (_error) {
    console.error('[Error]:', _error);
    throw _error;
  }
}

/**
 * Update documentation with latest changes
 */
export async function updateDocumentation(
  _client: AkamaiClient,
  args: {
    document: string;
    updates: {
      sections?: Record<string, string>;
      examples?: Array<{ title: string; code: string; description?: string }>;
      metadata?: Partial<DocumentationMetadata>;
    };
    createBackup?: boolean;
  },
): Promise<MCPToolResponse> {
  const docPath = args.document.startsWith('docs/') ? args.document : `docs/${args.document}`;
  const createBackup = args.createBackup ?? true;

  try {
    // Read existing document
    const content = await fs.readFile(docPath, 'utf-8');

    // Create backup if requested
    if (createBackup) {
      const backupPath = `${docPath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, content);
    }

    // Parse document structure
    let updatedContent = content;

    // Update sections
    if (args.updates.sections) {
      for (const [section, newContent] of Object.entries(args.updates.sections)) {
        updatedContent = updateDocumentSection(updatedContent, section, newContent);
      }
    }

    // Add examples
    if (args.updates.examples && args.updates.examples.length > 0) {
      updatedContent = addExamplesToDocument(updatedContent, args.updates.examples);
    }

    // Update metadata
    if (args.updates.metadata) {
      updatedContent = updateDocumentMetadata(updatedContent, args.updates.metadata);
    }

    // Update last modified date
    updatedContent = updateLastModified(updatedContent);

    // Save updated document
    await fs.writeFile(docPath, updatedContent);

    return {
      content: [
        {
          type: 'text',
          text: `Documentation updated successfully:
- Document: ${docPath}
- Sections updated: ${Object.keys(args.updates.sections || {}).length}
- Examples added: ${args.updates.examples?.length || 0}
- Backup created: ${createBackup}`,
        },
      ],
    };
  } catch (_error) {
    console.error('[Error]:', _error);
    throw _error;
  }
}

/**
 * Generate changelog from git history and PR information
 */
export async function generateChangelog(
  _client: AkamaiClient,
  args: {
    fromVersion?: string;
    toVersion?: string;
    outputPath?: string;
    includeBreakingChanges?: boolean;
    groupByCategory?: boolean;
  },
): Promise<MCPToolResponse> {
  const outputPath = args.outputPath || 'CHANGELOG.md';
  const includeBreaking = args.includeBreakingChanges ?? true;
  const groupByCategory = args.groupByCategory ?? true;

  try {
    // Get git history
    const commits = await getGitCommits(args.fromVersion, args.toVersion);

    // Parse commits for conventional format
    const changes = parseConventionalCommits(commits);

    // Group changes
    const grouped = groupByCategory ? groupChangesByCategory(changes) : { all: changes };

    // Generate changelog
    let changelog = '# Changelog\n\n';

    if (args.toVersion) {
      changelog += `## [${args.toVersion}] - ${new Date().toISOString().split('T')[0]}\n\n`;
    }

    // Add breaking changes section
    if (includeBreaking) {
      const breakingChanges = changes.filter((c) => c.breaking);
      if (breakingChanges.length > 0) {
        changelog += '### ⚠️ Breaking Changes\n\n';
        for (const change of breakingChanges) {
          changelog += `- ${change.description}\n`;
        }
        changelog += '\n';
      }
    }

    // Add categorized changes
    for (const [category, categoryChanges] of Object.entries(grouped)) {
      if (category === 'all' || categoryChanges.length === 0) {
        continue;
      }

      changelog += `### ${formatCategory(category)}\n\n`;
      for (const change of categoryChanges) {
        changelog += `- ${change.description}`;
        if (change.scope) {
          changelog += ` (${change.scope})`;
        }
        if (change.pr) {
          changelog += ` (#${change.pr})`;
        }
        changelog += '\n';
      }
      changelog += '\n';
    }

    // Add contributors section
    const contributors = getUniqueContributors(commits);
    if (contributors.length > 0) {
      changelog += '### Contributors\n\n';
      for (const contributor of contributors) {
        changelog += `- ${contributor}\n`;
      }
      changelog += '\n';
    }

    // Save or append to existing changelog
    if (await fileExists(outputPath)) {
      const existing = await fs.readFile(outputPath, 'utf-8');
      changelog = changelog + '\n' + existing;
    }

    await fs.writeFile(outputPath, changelog);

    return {
      content: [
        {
          type: 'text',
          text: `Changelog generated successfully:
- Commits analyzed: ${commits.length}
- Changes documented: ${changes.length}
- Breaking changes: ${changes.filter((c) => c.breaking).length}
- Output: ${outputPath}`,
        },
      ],
    };
  } catch (_error) {
    console.error('[Error]:', _error);
    throw _error;
  }
}

/**
 * Create knowledge base article
 */
export async function createKnowledgeArticle(
  _client: AkamaiClient,
  args: {
    title: string;
    category: string;
    content: string;
    tags?: string[];
    relatedArticles?: string[];
    outputPath?: string;
  },
): Promise<MCPToolResponse> {
  const slug = generateSlug(args.title);
  const outputPath = args.outputPath || `docs/knowledge-base/${args.category}/${slug}.md`;

  try {
    // Create knowledge article
    let article = `# ${args.title}\n\n`;

    // Add metadata
    article += '---\n';
    article += `category: ${args.category}\n`;
    article += `tags: ${(args.tags || []).join(', ')}\n`;
    article += `created: ${new Date().toISOString()}\n`;
    article += '---\n\n';

    // Add content
    article += args.content + '\n\n';

    // Add related articles section
    if (args.relatedArticles && args.relatedArticles.length > 0) {
      article += '## Related Articles\n\n';
      for (const related of args.relatedArticles) {
        article += `- [${related}](../${generateSlug(related)}.md)\n`;
      }
      article += '\n';
    }

    // Create directory if needed
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Save article
    await fs.writeFile(outputPath, article);

    // Update knowledge base index
    await updateKnowledgeBaseIndex(outputPath, {
      title: args.title,
      category: args.category,
      tags: args.tags || [],
      path: outputPath,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Knowledge article created successfully:
- Title: ${args.title}
- Category: ${args.category}
- Tags: ${args.tags?.join(', ') || 'none'}
- Output: ${outputPath}`,
        },
      ],
    };
  } catch (_error) {
    console.error('[Error]:', _error);
    throw _error;
  }
}

// Helper functions

function extractDocumentMetadata(filename: string, content: string): DocumentationMetadata {
  // Extract from frontmatter if present
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    // Parse YAML-like frontmatter
    const frontmatter = frontmatterMatch[1];
    const metadata: any = {};
    if (frontmatter) {
      frontmatter.split('\n').forEach((line) => {
        const [key, value] = line.split(':').map((s) => s.trim());
        if (key && value) {
          metadata[key] = value;
        }
      });
    }
    return {
      title: metadata.title || getTitleFromFilename(filename),
      description: metadata.description || '',
      category: metadata.category || getCategoryFromFilename(filename),
      tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : [],
      lastUpdated: metadata.lastUpdated || new Date().toISOString(),
      version: metadata.version || '1.0.0',
    };
  }

  // Extract from content
  const titleMatch = content.match(/^# (.+)$/m);
  return {
    title: titleMatch?.[1] || getTitleFromFilename(filename),
    description: extractFirstParagraph(content),
    category: getCategoryFromFilename(filename),
    tags: extractTags(content),
    lastUpdated: new Date().toISOString(),
    version: '1.0.0',
  };
}

function getTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getCategoryFromFilename(filename: string): string {
  if (filename.includes('api')) {
    return 'API Reference';
  }
  if (filename.includes('guide')) {
    return 'Guides';
  }
  if (filename.includes('tool')) {
    return 'Tools';
  }
  if (filename.includes('feature')) {
    return 'Features';
  }
  if (filename.includes('test')) {
    return 'Testing';
  }
  return 'General';
}

function extractFirstParagraph(content: string): string {
  const lines = content.split('\n');
  let inParagraph = false;
  let paragraph = '';

  for (const line of lines) {
    if (line.trim() === '') {
      if (inParagraph) {
        break;
      }
      continue;
    }
    if (line.startsWith('#')) {
      continue;
    }
    inParagraph = true;
    paragraph += line + ' ';
  }

  return paragraph.trim();
}

function extractTags(content: string): string[] {
  const tags = new Set<string>();

  // Look for common keywords
  const keywords = ['API', 'MCP', 'Akamai', 'CDN', 'DNS', 'Certificate', 'Property', 'Security'];
  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      tags.add(keyword.toLowerCase());
    }
  }

  return Array.from(tags);
}

function extractToolDefinitions(content: string): any[] {
  const tools: any[] = [];

  // Regular expression to match exported functions with JSDoc
  const functionRegex = /\/\*\*[\s\S]*?\*\/\s*export\s+async\s+function\s+(\w+)\s*\([^)]*\)/g;

  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const functionName = match[1];
    const jsdocMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);

    if (jsdocMatch) {
      const jsdoc = jsdocMatch[1] || '';
      const description = jsdoc.match(/\* (.+)$/m)?.[1] || '';

      tools.push({
        name: functionName,
        description: description.trim(),
        parameters: extractParameters(match[0]),
        returns: extractReturns(jsdoc),
      });
    }
  }

  return tools;
}

function extractParameters(functionDef: string): any[] {
  const params: any[] = [];
  const paramMatch = functionDef.match(/\(([^)]*)\)/);

  if (paramMatch && paramMatch[1]) {
    const paramList = paramMatch[1];
    // Simple parameter extraction - could be enhanced
    const paramParts = paramList.split(',').map((p) => p.trim());

    for (const part of paramParts) {
      if (part.includes(':')) {
        const [name, type] = part.split(':').map((s) => s.trim());
        params.push({ name, type });
      }
    }
  }

  return params;
}

function extractReturns(jsdoc: string | undefined): string {
  if (!jsdoc) {
    return 'Promise<MCPToolResponse>';
  }
  const returnMatch = jsdoc.match(/@returns?\s+(.+)$/m);
  return returnMatch?.[1]?.trim() || 'Promise<MCPToolResponse>';
}

function generateMarkdownAPIReference(tools: any[]): string {
  let doc = '# API Reference\n\n';
  doc += `Generated on ${new Date().toISOString()}\n\n`;

  // Group by category
  const byCategory = new Map<string, any[]>();
  for (const tool of tools) {
    const categoryTools = byCategory.get(tool.category) || [];
    categoryTools.push(tool);
    byCategory.set(tool.category, categoryTools);
  }

  // Generate sections
  for (const [category, categoryTools] of byCategory) {
    doc += `## ${category}\n\n`;

    for (const tool of categoryTools) {
      doc += `### ${tool.name}\n\n`;
      doc += `${tool.description}\n\n`;

      if (tool.parameters.length > 0) {
        doc += '**Parameters:**\n\n';
        for (const param of tool.parameters) {
          doc += `- \`${param.name}\`: ${param.type}\n`;
        }
        doc += '\n';
      }

      doc += `**Returns:** ${tool.returns}\n\n`;
      doc += `**Source:** \`${tool.file}\`\n\n`;
      doc += '---\n\n';
    }
  }

  return doc;
}

async function analyzeFeature(feature: string): Promise<any> {
  // This would analyze the codebase for the feature
  // For now, return a mock analysis
  return {
    description: `The ${feature} feature provides...`,
    overview: 'This feature enables...',
    capabilities: [`Capability 1 for ${feature}`, `Capability 2 for ${feature}`],
    usage: `To use ${feature}, you need to...`,
    examples: [],
    apis: [],
    related: [],
  };
}

function formatFeatureName(feature: string): string {
  return feature.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function updateDocumentSection(content: string, section: string, newContent: string): string {
  const sectionRegex = new RegExp(`(## ${section}\\n\\n)[\\s\\S]*?(?=\\n## |$)`, 'i');

  if (sectionRegex.test(content)) {
    return content.replace(sectionRegex, `$1${newContent}\n`);
  } else {
    // Add new section
    return content + `\n## ${section}\n\n${newContent}\n`;
  }
}

function addExamplesToDocument(content: string, examples: any[]): string {
  let examplesSection = '';
  for (const example of examples) {
    examplesSection += `### ${example.title}\n\n`;
    examplesSection += '```typescript\n';
    examplesSection += example.code;
    examplesSection += '\n```\n\n';
    if (example.description) {
      examplesSection += `${example.description}\n\n`;
    }
  }

  return updateDocumentSection(content, 'Examples', examplesSection);
}

function updateDocumentMetadata(content: string, metadata: Partial<DocumentationMetadata>): string {
  // Update frontmatter if it exists
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (frontmatterMatch) {
    let frontmatter = frontmatterMatch[1] || '';

    for (const [key, value] of Object.entries(metadata)) {
      const keyRegex = new RegExp(`^${key}:.*$`, 'm');
      if (frontmatter && keyRegex.test(frontmatter)) {
        frontmatter = frontmatter.replace(keyRegex, `${key}: ${value}`);
      } else {
        frontmatter = (frontmatter || '') + `\n${key}: ${value}`;
      }
    }

    return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
  }

  return content;
}

function updateLastModified(content: string): string {
  const date = new Date().toISOString();
  return updateDocumentMetadata(content, { lastUpdated: date });
}

async function getGitCommits(_fromVersion?: string, _toVersion?: string): Promise<any[]> {
  // This would use git commands to get commits
  // For now, return empty array
  return [];
}

function parseConventionalCommits(_commits: any[]): any[] {
  // Parse commits following conventional commit format
  return [];
}

function groupChangesByCategory(changes: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {
    featu_res: [],
    fixes: [],
    performance: [],
    documentation: [],
    other: [],
  };

  for (const change of changes) {
    const category = change.type || 'other';
    if (grouped[category]) {
      grouped[category].push(change);
    } else {
      if (grouped.other) {
        grouped.other.push(change);
      }
    }
  }

  return grouped;
}

function formatCategory(_category: string): string {
  const categoryNames: Record<string, string> = {
    featu_res: '✨ Features',
    fixes: '🐛 Bug Fixes',
    performance: '⚡ Performance',
    documentation: '📚 Documentation',
    other: '🔧 Other Changes',
  };

  return categoryNames[_category] || _category;
}

function getUniqueContributors(_commits: any[]): string[] {
  // Extract unique contributors from commits
  return [];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function updateKnowledgeBaseIndex(_articlePath: string, metadata: any): Promise<void> {
  const indexPath = 'docs/knowledge-base/index.json';

  try {
    let index: any = {};

    if (await fileExists(indexPath)) {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    }

    if (!index.articles) {
      index.articles = [];
    }

    index.articles.push({
      ...metadata,
      created: new Date().toISOString(),
    });

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  } catch (_error) {
    console.error('[Error]:', _error);
  }
}
