/**
 * Tests for documentation automation tools
 */

import { 
  generateDocumentationIndex,
  generateAPIReference,
  generateFeatureDocumentation,
  updateDocumentation,
  generateChangelog,
  createKnowledgeArticle
} from '../../src/tools/documentation-tools';
import { AkamaiClient } from '../../src/akamai-client';
import * as fs from 'fs/promises';

// Mock dependencies
jest.mock('../akamai-client');
jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Documentation Tools', () => {
  let mockClient: jest.Mocked<AkamaiClient>;

  beforeEach(() => {
    mockClient = new AkamaiClient() as jest.Mocked<AkamaiClient>;
    jest.clearAllMocks();
  });

  describe('generateDocumentationIndex', () => {
    it('should generate index from markdown files', async () => {
      // Mock file system
      mockFs.readdir.mockResolvedValue(['guide.md', 'api.md', 'readme.txt'] as any);
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('guide.md')) {
          return Promise.resolve(`# Setup Guide\n\nThis is a setup guide.`);
        }
        if (filePath.toString().includes('api.md')) {
          return Promise.resolve(`---
title: API Reference
category: API
tags: api, reference
---

# API Reference`);
        }
        return Promise.resolve('');
      });
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await generateDocumentationIndex(mockClient, {
        docsPath: 'docs',
        outputPath: 'docs/index.json'
      });

      expect(result.content[0]?.text).toContain('Documentation index generated successfully');
      expect(result.content[0]?.text).toContain('Documents indexed: 2');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'docs/index.json',
        expect.stringContaining('"documentCount": 2')
      );
    });

    it('should handle empty documentation directory', async () => {
      mockFs.readdir.mockResolvedValue([] as any);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await generateDocumentationIndex(mockClient, {});

      expect(result.content[0]?.text).toContain('Documents indexed: 0');
    });
  });

  describe('generateAPIReference', () => {
    it('should generate markdown API reference from tool files', async () => {
      mockFs.readdir.mockResolvedValue(['property-tools.ts', 'dns-tools.ts'] as any);
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('property-tools.ts')) {
          return Promise.resolve(`
/**
 * List all properties
 * @returns List of properties
 */
export async function listProperties(client: AkamaiClient, args: any): Promise<MCPToolResponse> {
  // implementation
}`);
        }
        return Promise.resolve('');
      });
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await generateAPIReference(mockClient, {
        format: 'markdown'
      });

      expect(result.content[0]?.text).toContain('API reference generated successfully');
      expect(result.content[0]?.text).toContain('Tools documented:');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'docs/api-reference.md',
        expect.stringContaining('# API Reference')
      );
    });

    it('should generate JSON API reference when requested', async () => {
      mockFs.readdir.mockResolvedValue(['tool.ts'] as any);
      mockFs.readFile.mockResolvedValue('export async function test() {}');
      mockFs.writeFile.mockResolvedValue(undefined);

      await generateAPIReference(mockClient, {
        format: 'json',
        outputPath: 'api.json'
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'api.json',
        expect.stringMatching(/^\[.*\]$/)
      );
    });
  });

  describe('generateFeatureDocumentation', () => {
    it('should generate feature documentation', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await generateFeatureDocumentation(mockClient, {
        feature: 'dns-management',
        analysisDepth: 'detailed',
        includeExamples: true
      });

      expect(result.content[0]?.text).toContain('Feature documentation generated successfully');
      expect(result.content[0]?.text).toContain('Feature: dns-management');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'docs/features/dns-management.md',
        expect.stringContaining('# Dns Management')
      );
    });

    it('should use custom output path when provided', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await generateFeatureDocumentation(mockClient, {
        feature: 'test',
        outputPath: 'custom/path.md'
      });

      expect(mockFs.mkdir).toHaveBeenCalledWith('custom', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'custom/path.md',
        expect.any(String)
      );
    });
  });

  describe('updateDocumentation', () => {
    it('should update document sections', async () => {
      const originalContent = `# Title

## Overview
Old overview content

## Usage
Old usage content`;

      mockFs.readFile.mockResolvedValue(originalContent);
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await updateDocumentation(mockClient, {
        document: 'test.md',
        updates: {
          sections: {
            'Overview': 'New overview content',
            'Installation': 'New installation section'
          }
        }
      });

      expect(result.content[0]?.text).toContain('Documentation updated successfully');
      expect(result.content[0]?.text).toContain('Sections updated: 2');
      
      // Check that backup was created
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringMatching(/test\.md\.backup\.\d+/),
        originalContent
      );

      // Check that content was updated
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'docs/test.md',
        expect.stringContaining('New overview content')
      );
    });

    it('should add examples to document', async () => {
      mockFs.readFile.mockResolvedValue('# Title\n\nContent');
      mockFs.writeFile.mockResolvedValue(undefined);

      await updateDocumentation(mockClient, {
        document: 'test.md',
        updates: {
          examples: [{
            title: 'Example 1',
            code: 'const result = await api.call();',
            description: 'This is an example'
          }]
        },
        createBackup: false
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'docs/test.md',
        expect.stringContaining('## Examples')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'docs/test.md',
        expect.stringContaining('### Example 1')
      );
    });
  });

  describe('generateChangelog', () => {
    it('should generate changelog structure', async () => {
      mockFs.writeFile.mockResolvedValue(undefined);
      jest.spyOn(mockFs, 'access' as any).mockRejectedValue(new Error('Not found'));

      const result = await generateChangelog(mockClient, {
        toVersion: '1.2.0'
      });

      expect(result.content[0]?.text).toContain('Changelog generated successfully');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'CHANGELOG.md',
        expect.stringContaining('# Changelog')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'CHANGELOG.md',
        expect.stringContaining('[1.2.0]')
      );
    });
  });

  describe('createKnowledgeArticle', () => {
    it('should create knowledge base article', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      jest.spyOn(mockFs, 'access' as any).mockRejectedValue(new Error('Not found'));

      const result = await createKnowledgeArticle(mockClient, {
        title: 'How to Configure DNS',
        category: 'tutorials',
        content: 'This article explains DNS configuration...',
        tags: ['dns', 'configuration'],
        relatedArticles: ['DNS Basics']
      });

      expect(result.content[0]?.text).toContain('Knowledge article created successfully');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('docs/knowledge-base/tutorials/how-to-configure-dns.md'),
        expect.stringContaining('# How to Configure DNS')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('docs/knowledge-base/tutorials/how-to-configure-dns.md'),
        expect.stringContaining('tags: dns, configuration')
      );
    });

    it('should use custom output path when provided', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      jest.spyOn(mockFs, 'access' as any).mockRejectedValue(new Error('Not found'));

      await createKnowledgeArticle(mockClient, {
        title: 'Test',
        category: 'test',
        content: 'Content',
        outputPath: 'custom/article.md'
      });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        'custom/article.md',
        expect.any(String)
      );
    });
  });
});