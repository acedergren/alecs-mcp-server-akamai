#!/usr/bin/env tsx
/**
 * Comprehensive TypeScript Dependency Analysis
 * 
 * Analyzes the entire codebase to create a complete dependency map including:
 * - All TypeScript files and their relationships
 * - Circular dependency detection
 * - External package dependencies
 * - Risk assessment scores
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import { execSync } from 'child_process';

interface FileNode {
  path: string;
  imports: string[];
  exports: string[];
  importedBy: string[];
  externalDependencies: string[];
  isEntryPoint: boolean;
  hasCircularDependency: boolean;
  circularPaths: string[][];
  riskScore: number;
  metrics: {
    linesOfCode: number;
    complexity: number;
    dependencyCount: number;
    dependentCount: number;
  };
}

interface DependencyMap {
  timestamp: string;
  projectRoot: string;
  files: Map<string, FileNode>;
  circularDependencies: string[][];
  externalPackages: Map<string, string[]>; // package -> files using it
  tsConfigFiles: string[];
  entryPoints: string[];
  statistics: {
    totalFiles: number;
    totalDependencies: number;
    circularDependencyCount: number;
    averageDependencies: number;
    maxDependencyDepth: number;
  };
}

class DependencyAnalyzer {
  private projectRoot: string;
  private dependencyMap: DependencyMap;
  private visitedInCycle: Set<string> = new Set();
  private packageJson: any;

  constructor() {
    this.projectRoot = process.cwd();
    this.packageJson = JSON.parse(readFileSync(join(this.projectRoot, 'package.json'), 'utf-8'));
    
    this.dependencyMap = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      files: new Map(),
      circularDependencies: [],
      externalPackages: new Map(),
      tsConfigFiles: [],
      entryPoints: [],
      statistics: {
        totalFiles: 0,
        totalDependencies: 0,
        circularDependencyCount: 0,
        averageDependencies: 0,
        maxDependencyDepth: 0
      }
    };
  }

  async analyze() {
    console.log('🔍 Starting comprehensive dependency analysis...\n');
    
    // Step 1: Find all TypeScript configuration files
    console.log('📋 Finding TypeScript configuration files...');
    this.findTsConfigFiles();
    
    // Step 2: Scan all TypeScript files
    console.log('📂 Scanning TypeScript files...');
    this.scanTypeScriptFiles();
    
    // Step 3: Build dependency graph
    console.log('🔗 Building dependency graph...');
    this.buildDependencyGraph();
    
    // Step 4: Detect circular dependencies
    console.log('🔄 Detecting circular dependencies...');
    this.detectCircularDependencies();
    
    // Step 5: Identify entry points
    console.log('🚪 Identifying entry points...');
    this.identifyEntryPoints();
    
    // Step 6: Calculate risk scores
    console.log('⚠️  Calculating risk scores...');
    this.calculateRiskScores();
    
    // Step 7: Analyze external dependencies
    console.log('📦 Analyzing external package usage...');
    this.analyzeExternalDependencies();
    
    // Step 8: Generate statistics
    console.log('📊 Generating statistics...');
    this.generateStatistics();
    
    // Step 9: Export results
    console.log('💾 Exporting results...');
    this.exportResults();
  }

  private findTsConfigFiles() {
    const findFiles = (dir: string): string[] => {
      const files: string[] = [];
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
          files.push(...findFiles(fullPath));
        } else if (item.startsWith('tsconfig') && item.endsWith('.json')) {
          files.push(relative(this.projectRoot, fullPath));
        }
      }
      
      return files;
    };
    
    this.dependencyMap.tsConfigFiles = findFiles(this.projectRoot);
    console.log(`  Found ${this.dependencyMap.tsConfigFiles.length} TypeScript config files`);
  }

  private scanTypeScriptFiles() {
    const scanDir = (dir: string): void => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
          scanDir(fullPath);
        } else if ((item.endsWith('.ts') || item.endsWith('.tsx')) && !item.endsWith('.d.ts')) {
          const relativePath = relative(this.projectRoot, fullPath);
          this.analyzeFile(relativePath);
        }
      }
    };
    
    scanDir(join(this.projectRoot, 'src'));
    console.log(`  Found ${this.dependencyMap.files.size} TypeScript files`);
  }

  private analyzeFile(filePath: string) {
    const fullPath = join(this.projectRoot, filePath);
    const content = readFileSync(fullPath, 'utf-8');
    
    const fileNode: FileNode = {
      path: filePath,
      imports: [],
      exports: [],
      importedBy: [],
      externalDependencies: [],
      isEntryPoint: false,
      hasCircularDependency: false,
      circularPaths: [],
      riskScore: 0,
      metrics: {
        linesOfCode: content.split('\n').length,
        complexity: this.calculateComplexity(content),
        dependencyCount: 0,
        dependentCount: 0
      }
    };
    
    // Extract imports
    const importRegex = /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      if (importPath.startsWith('.')) {
        // Local import
        const resolvedPath = this.resolveImportPath(importPath, filePath);
        if (resolvedPath) {
          fileNode.imports.push(resolvedPath);
        }
      } else if (!importPath.startsWith('@/')) {
        // External package
        const packageName = this.extractPackageName(importPath);
        if (!fileNode.externalDependencies.includes(packageName)) {
          fileNode.externalDependencies.push(packageName);
        }
      }
    }
    
    // Extract exports
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      fileNode.exports.push(match[1]);
    }
    
    // Check for default export
    if (/export\s+default\s+/.test(content)) {
      fileNode.exports.push('default');
    }
    
    fileNode.metrics.dependencyCount = fileNode.imports.length + fileNode.externalDependencies.length;
    
    this.dependencyMap.files.set(filePath, fileNode);
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    const dir = dirname(fromFile);
    let resolved = join(dir, importPath);
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
    
    for (const ext of extensions) {
      const tryPath = resolved + ext;
      const normalizedPath = tryPath.replace(/\\/g, '/');
      
      if (existsSync(join(this.projectRoot, normalizedPath))) {
        return normalizedPath;
      }
    }
    
    // Try without extension
    if (existsSync(join(this.projectRoot, resolved))) {
      return resolved;
    }
    
    return null;
  }

  private extractPackageName(importPath: string): string {
    if (importPath.startsWith('@')) {
      // Scoped package
      const parts = importPath.split('/');
      return parts.slice(0, 2).join('/');
    } else {
      // Regular package
      return importPath.split('/')[0];
    }
  }

  private calculateComplexity(content: string): number {
    // Simple complexity calculation based on control flow statements
    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcatch\s*\(/g,
      /\?\s*[^:]+\s*:/g, // ternary operator
    ];
    
    let complexity = 1; // Base complexity
    
    for (const pattern of complexityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  private buildDependencyGraph() {
    // Build reverse dependencies (importedBy)
    for (const [filePath, fileNode] of this.dependencyMap.files) {
      for (const importPath of fileNode.imports) {
        const importedFile = this.dependencyMap.files.get(importPath);
        if (importedFile) {
          importedFile.importedBy.push(filePath);
          importedFile.metrics.dependentCount++;
        }
      }
    }
  }

  private detectCircularDependencies() {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularPaths: string[][] = [];
    
    const dfs = (filePath: string, path: string[]): void => {
      visited.add(filePath);
      recursionStack.add(filePath);
      
      const fileNode = this.dependencyMap.files.get(filePath);
      if (!fileNode) return;
      
      for (const importPath of fileNode.imports) {
        if (!visited.has(importPath)) {
          dfs(importPath, [...path, importPath]);
        } else if (recursionStack.has(importPath)) {
          // Found circular dependency
          const cycleStart = path.indexOf(importPath);
          const cycle = [...path.slice(cycleStart), importPath];
          circularPaths.push(cycle);
          
          // Mark all files in cycle
          for (const file of cycle) {
            const node = this.dependencyMap.files.get(file);
            if (node) {
              node.hasCircularDependency = true;
              node.circularPaths.push(cycle);
            }
          }
        }
      }
      
      recursionStack.delete(filePath);
    };
    
    // Run DFS from each unvisited node
    for (const filePath of this.dependencyMap.files.keys()) {
      if (!visited.has(filePath)) {
        dfs(filePath, [filePath]);
      }
    }
    
    // Remove duplicate cycles
    const uniqueCycles = new Set(circularPaths.map(p => p.sort().join(' -> ')));
    this.dependencyMap.circularDependencies = Array.from(uniqueCycles).map(s => s.split(' -> '));
    
    console.log(`  Found ${this.dependencyMap.circularDependencies.length} circular dependencies`);
  }

  private identifyEntryPoints() {
    // Entry points are files that are not imported by any other file
    const entryPoints: string[] = [];
    
    for (const [filePath, fileNode] of this.dependencyMap.files) {
      if (fileNode.importedBy.length === 0) {
        fileNode.isEntryPoint = true;
        entryPoints.push(filePath);
      }
    }
    
    // Also check package.json for explicit entry points
    if (this.packageJson.main) {
      const mainPath = this.packageJson.main.replace('dist/', 'src/').replace('.js', '.ts');
      if (!entryPoints.includes(mainPath)) {
        entryPoints.push(mainPath);
        const node = this.dependencyMap.files.get(mainPath);
        if (node) node.isEntryPoint = true;
      }
    }
    
    this.dependencyMap.entryPoints = entryPoints;
    console.log(`  Found ${entryPoints.length} entry points`);
  }

  private calculateRiskScores() {
    for (const [filePath, fileNode] of this.dependencyMap.files) {
      let riskScore = 0;
      
      // Factor 1: Number of dependents (higher = more risk)
      riskScore += fileNode.metrics.dependentCount * 10;
      
      // Factor 2: Complexity
      riskScore += fileNode.metrics.complexity * 2;
      
      // Factor 3: Circular dependencies
      if (fileNode.hasCircularDependency) {
        riskScore += 50;
        riskScore += fileNode.circularPaths.length * 10;
      }
      
      // Factor 4: External dependencies
      riskScore += fileNode.externalDependencies.length * 3;
      
      // Factor 5: File type and location
      if (filePath.includes('/utils/') || filePath.includes('/core/')) {
        riskScore *= 1.5;
      }
      if (filePath.includes('/services/')) {
        riskScore *= 1.3;
      }
      if (filePath.includes('/types/')) {
        riskScore *= 0.8; // Types are lower risk
      }
      
      // Factor 6: Entry point bonus
      if (fileNode.isEntryPoint) {
        riskScore *= 1.2;
      }
      
      fileNode.riskScore = Math.round(riskScore);
    }
  }

  private analyzeExternalDependencies() {
    // Map external packages to files that use them
    for (const [filePath, fileNode] of this.dependencyMap.files) {
      for (const pkg of fileNode.externalDependencies) {
        if (!this.dependencyMap.externalPackages.has(pkg)) {
          this.dependencyMap.externalPackages.set(pkg, []);
        }
        this.dependencyMap.externalPackages.get(pkg)!.push(filePath);
      }
    }
    
    console.log(`  Found ${this.dependencyMap.externalPackages.size} external packages used`);
  }

  private generateStatistics() {
    const stats = this.dependencyMap.statistics;
    
    stats.totalFiles = this.dependencyMap.files.size;
    stats.totalDependencies = Array.from(this.dependencyMap.files.values())
      .reduce((sum, node) => sum + node.imports.length, 0);
    stats.circularDependencyCount = this.dependencyMap.circularDependencies.length;
    stats.averageDependencies = stats.totalDependencies / stats.totalFiles;
    
    // Calculate max dependency depth
    const calculateDepth = (filePath: string, visited = new Set<string>()): number => {
      if (visited.has(filePath)) return 0;
      visited.add(filePath);
      
      const node = this.dependencyMap.files.get(filePath);
      if (!node || node.imports.length === 0) return 1;
      
      let maxDepth = 0;
      for (const imp of node.imports) {
        maxDepth = Math.max(maxDepth, calculateDepth(imp, new Set(visited)));
      }
      
      return maxDepth + 1;
    };
    
    let maxDepth = 0;
    for (const filePath of this.dependencyMap.entryPoints) {
      maxDepth = Math.max(maxDepth, calculateDepth(filePath));
    }
    stats.maxDependencyDepth = maxDepth;
  }

  private exportResults() {
    // Convert Map to object for JSON serialization
    const output = {
      timestamp: this.dependencyMap.timestamp,
      projectRoot: this.dependencyMap.projectRoot,
      tsConfigFiles: this.dependencyMap.tsConfigFiles,
      entryPoints: this.dependencyMap.entryPoints,
      statistics: this.dependencyMap.statistics,
      packageJsonDependencies: {
        dependencies: Object.keys(this.packageJson.dependencies || {}),
        devDependencies: Object.keys(this.packageJson.devDependencies || {}),
        peerDependencies: Object.keys(this.packageJson.peerDependencies || {}),
        optionalDependencies: Object.keys(this.packageJson.optionalDependencies || {})
      },
      circularDependencies: this.dependencyMap.circularDependencies,
      externalPackageUsage: Object.fromEntries(this.dependencyMap.externalPackages),
      files: Object.fromEntries(
        Array.from(this.dependencyMap.files.entries())
          .sort((a, b) => b[1].riskScore - a[1].riskScore)
      ),
      riskySummary: {
        highRiskFiles: Array.from(this.dependencyMap.files.entries())
          .filter(([_, node]) => node.riskScore > 100)
          .map(([path, node]) => ({
            path,
            riskScore: node.riskScore,
            reasons: this.getRiskReasons(node)
          }))
          .slice(0, 20),
        unusedFiles: Array.from(this.dependencyMap.files.entries())
          .filter(([_, node]) => node.importedBy.length === 0 && !node.isEntryPoint)
          .map(([path]) => path),
        mostDependedOn: Array.from(this.dependencyMap.files.entries())
          .sort((a, b) => b[1].metrics.dependentCount - a[1].metrics.dependentCount)
          .slice(0, 10)
          .map(([path, node]) => ({
            path,
            dependentCount: node.metrics.dependentCount
          }))
      }
    };
    
    const outputPath = join(this.projectRoot, 'dependency_map.json');
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\n✅ Analysis complete! Results saved to: ${outputPath}`);
    console.log('\nSummary:');
    console.log(`  Total files: ${this.dependencyMap.statistics.totalFiles}`);
    console.log(`  Total dependencies: ${this.dependencyMap.statistics.totalDependencies}`);
    console.log(`  Circular dependencies: ${this.dependencyMap.statistics.circularDependencyCount}`);
    console.log(`  External packages used: ${this.dependencyMap.externalPackages.size}`);
    console.log(`  High risk files: ${output.riskySummary.highRiskFiles.length}`);
  }

  private getRiskReasons(node: FileNode): string[] {
    const reasons: string[] = [];
    
    if (node.metrics.dependentCount > 10) {
      reasons.push(`High dependent count (${node.metrics.dependentCount})`);
    }
    if (node.metrics.complexity > 20) {
      reasons.push(`High complexity (${node.metrics.complexity})`);
    }
    if (node.hasCircularDependency) {
      reasons.push(`Circular dependencies (${node.circularPaths.length})`);
    }
    if (node.externalDependencies.length > 5) {
      reasons.push(`Many external deps (${node.externalDependencies.length})`);
    }
    
    return reasons;
  }
}

// Run the analyzer
const analyzer = new DependencyAnalyzer();
analyzer.analyze().catch(console.error);