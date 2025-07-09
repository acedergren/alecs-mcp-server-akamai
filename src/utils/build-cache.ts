/**
 * Build Cache Utility for ALECSCore
 * 
 * CODE KAI PRINCIPLES APPLIED:
 * Key: Intelligent caching for faster builds
 * Approach: Content-based hashing with dependency tracking
 * Implementation: File-level caching with incremental compilation
 */

import { promises as fs } from 'fs';
import { join, relative, dirname } from 'path';
import { createHash } from 'crypto';
import { performance } from 'perf_hooks';
import { createLogger } from './pino-logger';

const logger = createLogger('build-cache');

interface CacheEntry {
  /**
   * File content hash
   */
  hash: string;
  
  /**
   * Last modified time
   */
  mtime: number;
  
  /**
   * File dependencies
   */
  dependencies: string[];
  
  /**
   * Compilation output
   */
  output?: {
    js?: string;
    dts?: string;
    map?: string;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  totalFiles: number;
  cacheSize: number;
}

export class BuildCache {
  private cacheDir: string;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    totalFiles: 0,
    cacheSize: 0
  };
  
  constructor(cacheDir: string = '.build-cache') {
    this.cacheDir = cacheDir;
  }
  
  /**
   * Initialize cache
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      
      const cacheFile = join(this.cacheDir, 'cache.json');
      if (await this.fileExists(cacheFile)) {
        const data = await fs.readFile(cacheFile, 'utf-8');
        const entries = JSON.parse(data);
        this.cache = new Map(Object.entries(entries));
        this.stats.totalFiles = this.cache.size;
        
        logger.info({ 
          entries: this.cache.size,
          duration: performance.now() - startTime 
        }, 'Build cache loaded');
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to load build cache');
    }
  }
  
  /**
   * Check if file needs rebuild
   */
  async needsRebuild(filePath: string): Promise<boolean> {
    const relativePath = this.getRelativePath(filePath);
    const entry = this.cache.get(relativePath);
    
    if (!entry) {
      this.stats.misses++;
      return true;
    }
    
    try {
      // Check file hash
      const currentHash = await this.getFileHash(filePath);
      if (currentHash !== entry.hash) {
        this.stats.invalidations++;
        return true;
      }
      
      // Check modification time
      const stats = await fs.stat(filePath);
      if (stats.mtimeMs > entry.mtime) {
        this.stats.invalidations++;
        return true;
      }
      
      // Check dependencies
      for (const dep of entry.dependencies) {
        if (await this.needsRebuild(dep)) {
          this.stats.invalidations++;
          return true;
        }
      }
      
      this.stats.hits++;
      return false;
    } catch {
      this.stats.misses++;
      return true;
    }
  }
  
  /**
   * Get cached output
   */
  async getCachedOutput(filePath: string): Promise<CacheEntry['output'] | null> {
    const relativePath = this.getRelativePath(filePath);
    const entry = this.cache.get(relativePath);
    
    if (!entry || !entry.output) {
      return null;
    }
    
    // Verify cache is still valid
    if (await this.needsRebuild(filePath)) {
      return null;
    }
    
    return entry.output;
  }
  
  /**
   * Update cache entry
   */
  async updateCache(
    filePath: string, 
    dependencies: string[] = [],
    output?: CacheEntry['output']
  ): Promise<void> {
    const relativePath = this.getRelativePath(filePath);
    
    try {
      const hash = await this.getFileHash(filePath);
      const stats = await fs.stat(filePath);
      
      const entry: CacheEntry = {
        hash,
        mtime: stats.mtimeMs,
        dependencies: dependencies.map(dep => this.getRelativePath(dep)),
        output
      };
      
      this.cache.set(relativePath, entry);
      this.stats.totalFiles = this.cache.size;
      
      logger.debug({ file: relativePath }, 'Cache entry updated');
    } catch (error) {
      logger.error({ error, file: filePath }, 'Failed to update cache');
    }
  }
  
  /**
   * Save cache to disk
   */
  async save(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const cacheFile = join(this.cacheDir, 'cache.json');
      const data = JSON.stringify(
        Object.fromEntries(this.cache),
        null,
        2
      );
      
      await fs.writeFile(cacheFile, data);
      this.stats.cacheSize = Buffer.byteLength(data);
      
      logger.info({ 
        entries: this.cache.size,
        size: this.stats.cacheSize,
        duration: performance.now() - startTime
      }, 'Build cache saved');
    } catch (error) {
      logger.error({ error }, 'Failed to save build cache');
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Clear cache
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalFiles: 0,
      cacheSize: 0
    };
    
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      await fs.mkdir(this.cacheDir, { recursive: true });
      logger.info('Build cache cleared');
    } catch (error) {
      logger.error({ error }, 'Failed to clear build cache');
    }
  }
  
  /**
   * Get file hash
   */
  private async getFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    return createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Get relative path
   */
  private getRelativePath(filePath: string): string {
    return relative(process.cwd(), filePath);
  }
  
  /**
   * Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Analyze dependencies from TypeScript file
   */
  async analyzeDependencies(filePath: string): Promise<string[]> {
    const dependencies: Set<string> = new Set();
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const importRegex = /(?:import|export)\s+.*?\s+from\s+['"](.+?)['"]/g;
      const requireRegex = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
      
      let match;
      
      // Find imports
      while ((match = importRegex.exec(content)) !== null) {
        const dep = match[1];
        if (dep && dep.startsWith('.')) {
          const resolvedPath = await this.resolvePath(dirname(filePath), dep);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
          }
        }
      }
      
      // Find requires
      while ((match = requireRegex.exec(content)) !== null) {
        const dep = match[1];
        if (dep && dep.startsWith('.')) {
          const resolvedPath = await this.resolvePath(dirname(filePath), dep);
          if (resolvedPath) {
            dependencies.add(resolvedPath);
          }
        }
      }
    } catch (error) {
      logger.debug({ error, file: filePath }, 'Failed to analyze dependencies');
    }
    
    return Array.from(dependencies);
  }
  
  /**
   * Resolve import path
   */
  private async resolvePath(basePath: string, importPath: string): Promise<string | null> {
    const extensions = ['.ts', '.js', '.json', ''];
    
    for (const ext of extensions) {
      const fullPath = join(basePath, importPath + ext);
      if (await this.fileExists(fullPath)) {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          return fullPath;
        }
      }
      
      // Check for index file
      const indexPath = join(fullPath, 'index.ts');
      if (await this.fileExists(indexPath)) {
        return indexPath;
      }
    }
    
    return null;
  }
}

/**
 * Global build cache instance
 */
export const buildCache = new BuildCache();