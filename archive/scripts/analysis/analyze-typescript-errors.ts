#!/usr/bin/env tsx
/**
 * TypeScript Error Analysis and Risk Assessment
 * 
 * Analyzes all TypeScript compilation errors and categorizes them by:
 * - Risk level (CRITICAL, HIGH, MEDIUM, LOW)
 * - Dependency impact (how many files depend on error-containing files)
 * - Error patterns and types
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';

interface ErrorInfo {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  pattern: string;
}

interface FileAnalysis {
  file: string;
  errors: ErrorInfo[];
  errorCount: number;
  importedBy: string[];
  imports: string[];
  dependencyCount: number;
  isLeaf: boolean;
  isRoot: boolean;
  riskScore: number;
  category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface DependencyMap {
  [file: string]: {
    imports: string[];
    importedBy: string[];
  };
}

class TypeScriptErrorAnalyzer {
  private projectRoot: string;
  private dependencyMap: DependencyMap = {};
  private errors: ErrorInfo[] = [];
  private fileAnalysis: Map<string, FileAnalysis> = new Map();

  constructor() {
    this.projectRoot = process.cwd();
  }

  async analyze() {
    console.log('🔍 Analyzing TypeScript errors and dependencies...\n');
    
    // Step 1: Build dependency map
    console.log('📊 Building dependency map...');
    await this.buildDependencyMap();
    
    // Step 2: Collect TypeScript errors
    console.log('🚨 Collecting TypeScript errors...');
    this.collectTypeScriptErrors();
    
    // Step 3: Categorize errors by risk
    console.log('🎯 Categorizing errors by risk level...');
    this.categorizeErrors();
    
    // Step 4: Calculate dependency impact
    console.log('🔗 Calculating dependency impact...');
    this.calculateDependencyImpact();
    
    // Step 5: Generate report
    console.log('📝 Generating prioritized error report...');
    this.generateReport();
  }

  private async buildDependencyMap() {
    const tsFiles = await glob('src/**/*.{ts,tsx}', { 
      cwd: this.projectRoot,
      ignore: ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts']
    });

    for (const file of tsFiles) {
      const fullPath = join(this.projectRoot, file);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf-8');
      const imports = this.extractImports(content, file);
      
      if (!this.dependencyMap[file]) {
        this.dependencyMap[file] = { imports: [], importedBy: [] };
      }
      
      this.dependencyMap[file].imports = imports;
      
      // Build reverse dependencies
      for (const imp of imports) {
        if (!this.dependencyMap[imp]) {
          this.dependencyMap[imp] = { imports: [], importedBy: [] };
        }
        if (!this.dependencyMap[imp].importedBy.includes(file)) {
          this.dependencyMap[imp].importedBy.push(file);
        }
      }
    }
  }

  private extractImports(content: string, currentFile: string): string[] {
    const imports: string[] = [];
    const importRegex = /(?:import|export)\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(?:\{[^}]*\}|\w+))?\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = this.resolveImportPath(importPath, currentFile);
      if (resolvedPath && resolvedPath.startsWith('src/')) {
        imports.push(resolvedPath);
      }
    }
    
    return [...new Set(imports)];
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    // Skip external modules
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      return null;
    }

    // Handle relative imports
    if (importPath.startsWith('.')) {
      const dir = join(this.projectRoot, fromFile, '..');
      let resolved = join(dir, importPath);
      resolved = relative(this.projectRoot, resolved);
      
      // Try with .ts extension
      if (existsSync(join(this.projectRoot, resolved + '.ts'))) {
        return resolved + '.ts';
      }
      if (existsSync(join(this.projectRoot, resolved + '.tsx'))) {
        return resolved + '.tsx';
      }
      if (existsSync(join(this.projectRoot, resolved, 'index.ts'))) {
        return join(resolved, 'index.ts');
      }
    }

    // Handle alias imports
    if (importPath.startsWith('@/')) {
      const resolved = importPath.replace('@/', 'src/');
      if (existsSync(join(this.projectRoot, resolved + '.ts'))) {
        return resolved + '.ts';
      }
      if (existsSync(join(this.projectRoot, resolved + '.tsx'))) {
        return resolved + '.tsx';
      }
    }

    return null;
  }

  private collectTypeScriptErrors() {
    try {
      // Run TypeScript compiler and capture errors
      execSync('npx tsc --noEmit', { 
        cwd: this.projectRoot,
        encoding: 'utf-8'
      });
    } catch (error: any) {
      // TypeScript exits with error code when there are compilation errors
      const output = error.stdout || error.output?.join('') || '';
      this.parseTypeScriptOutput(output);
    }
  }

  private parseTypeScriptOutput(output: string) {
    const lines = output.split('\n');
    const errorRegex = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;

    for (const line of lines) {
      const match = line.match(errorRegex);
      if (match) {
        const [, filePath, lineStr, colStr, code, message] = match;
        const file = relative(this.projectRoot, filePath);
        
        this.errors.push({
          file,
          line: parseInt(lineStr),
          column: parseInt(colStr),
          code,
          message,
          category: 'MEDIUM', // Will be updated in categorizeErrors
          pattern: this.identifyErrorPattern(code, message)
        });
      }
    }
  }

  private identifyErrorPattern(code: string, message: string): string {
    const patterns: Record<string, string> = {
      'TS2304': 'Cannot find name',
      'TS2322': 'Type assignment error',
      'TS2339': 'Property does not exist',
      'TS2345': 'Argument type mismatch',
      'TS2375': 'exactOptionalPropertyTypes',
      'TS2379': 'exactOptionalPropertyTypes argument',
      'TS2412': 'exactOptionalPropertyTypes assignment',
      'TS2551': 'Property misspelling',
      'TS2552': 'Cannot find name suggestion',
      'TS4111': 'Index signature access',
      'TS6133': 'Unused variable',
      'TS6138': 'Property declared but not read',
      'TS7006': 'Parameter implicitly any',
      'TS7053': 'Element implicitly any'
    };

    return patterns[code] || 'Other';
  }

  private categorizeErrors() {
    for (const error of this.errors) {
      error.category = this.determineRiskCategory(error);
    }
  }

  private determineRiskCategory(error: ErrorInfo): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const file = error.file;
    
    // CRITICAL: Core business logic and data models
    if (file.includes('/models/') || 
        file.includes('/types/api') ||
        file.includes('/utils/edgegrid') ||
        file.includes('/services/') && file.includes('Service.ts') ||
        file.includes('/validation/') ||
        file.includes('property-manager') ||
        file.includes('dns-') ||
        file.includes('certificate-')) {
      // Type safety errors in core business logic
      if (['TS2322', 'TS2345', 'TS2339', 'TS7053'].includes(error.code)) {
        return 'CRITICAL';
      }
    }

    // HIGH: Shared utilities and common components
    if (file.includes('/utils/') ||
        file.includes('/tools/') ||
        file.includes('/agents/') ||
        file.includes('/templates/') ||
        file.includes('transport') ||
        file.includes('resilience') ||
        file.includes('error')) {
      if (!['TS6133', 'TS6138'].includes(error.code)) {
        return 'HIGH';
      }
    }

    // LOW: Cosmetic or non-breaking issues
    if (error.code === 'TS6133' || // Unused variable
        error.code === 'TS6138' || // Property not read
        error.code === 'TS2304' && error.message.includes('console') ||
        file.includes('.test.ts') ||
        file.includes('.spec.ts') ||
        file.includes('/scripts/')) {
      return 'LOW';
    }

    // Default to MEDIUM
    return 'MEDIUM';
  }

  private calculateDependencyImpact() {
    // Group errors by file
    const errorsByFile = new Map<string, ErrorInfo[]>();
    for (const error of this.errors) {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    }

    // Create file analysis for each file with errors
    for (const [file, errors] of errorsByFile) {
      const deps = this.dependencyMap[file] || { imports: [], importedBy: [] };
      const dependencyCount = deps.importedBy.length;
      
      // Determine file type
      const isLeaf = dependencyCount === 0;
      const isRoot = dependencyCount > 10; // Files imported by many others
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(errors, dependencyCount, file);
      
      // Determine overall category based on highest error category
      const categories = errors.map(e => e.category);
      let category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (categories.includes('CRITICAL')) category = 'CRITICAL';
      else if (categories.includes('HIGH')) category = 'HIGH';
      else if (categories.includes('MEDIUM')) category = 'MEDIUM';

      this.fileAnalysis.set(file, {
        file,
        errors,
        errorCount: errors.length,
        importedBy: deps.importedBy,
        imports: deps.imports,
        dependencyCount,
        isLeaf,
        isRoot,
        riskScore,
        category
      });
    }
  }

  private calculateRiskScore(errors: ErrorInfo[], dependencyCount: number, file: string): number {
    // Base score from error categories
    const categoryScores = {
      'CRITICAL': 100,
      'HIGH': 50,
      'MEDIUM': 20,
      'LOW': 5
    };

    let baseScore = 0;
    for (const error of errors) {
      baseScore += categoryScores[error.category];
    }

    // Multiply by dependency impact
    const dependencyMultiplier = 1 + (dependencyCount * 0.1);
    
    // Additional multipliers for critical paths
    let pathMultiplier = 1;
    if (file.includes('/services/')) pathMultiplier = 1.5;
    if (file.includes('/utils/edgegrid')) pathMultiplier = 2;
    if (file.includes('/models/')) pathMultiplier = 1.8;
    if (file.includes('transport')) pathMultiplier = 1.7;

    return Math.round(baseScore * dependencyMultiplier * pathMultiplier);
  }

  private generateReport() {
    // Sort files by risk score
    const sortedFiles = Array.from(this.fileAnalysis.values())
      .sort((a, b) => b.riskScore - a.riskScore);

    // Generate summary statistics
    const summary = {
      totalErrors: this.errors.length,
      totalFiles: sortedFiles.length,
      errorsByCategory: {
        CRITICAL: this.errors.filter(e => e.category === 'CRITICAL').length,
        HIGH: this.errors.filter(e => e.category === 'HIGH').length,
        MEDIUM: this.errors.filter(e => e.category === 'MEDIUM').length,
        LOW: this.errors.filter(e => e.category === 'LOW').length
      },
      errorsByPattern: this.getErrorPatternSummary(),
      topRiskFiles: sortedFiles.slice(0, 10).map(f => ({
        file: f.file,
        riskScore: f.riskScore,
        category: f.category,
        errorCount: f.errorCount,
        dependencyCount: f.dependencyCount
      })),
      leafFiles: sortedFiles.filter(f => f.isLeaf).length,
      rootFiles: sortedFiles.filter(f => f.isRoot).length
    };

    // Create detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      files: sortedFiles.map(f => ({
        file: f.file,
        riskScore: f.riskScore,
        category: f.category,
        errorCount: f.errorCount,
        dependencyCount: f.dependencyCount,
        isLeaf: f.isLeaf,
        isRoot: f.isRoot,
        importedBy: f.importedBy,
        errors: f.errors.map(e => ({
          line: e.line,
          column: e.column,
          code: e.code,
          pattern: e.pattern,
          category: e.category,
          message: e.message
        }))
      }))
    };

    // Write report
    const outputPath = join(this.projectRoot, 'prioritized_errors.json');
    writeFileSync(outputPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n📊 Analysis Complete!\n');
    console.log(`Total Errors: ${summary.totalErrors}`);
    console.log(`Affected Files: ${summary.totalFiles}`);
    console.log('\nErrors by Category:');
    console.log(`  🔴 CRITICAL: ${summary.errorsByCategory.CRITICAL}`);
    console.log(`  🟠 HIGH: ${summary.errorsByCategory.HIGH}`);
    console.log(`  🟡 MEDIUM: ${summary.errorsByCategory.MEDIUM}`);
    console.log(`  🟢 LOW: ${summary.errorsByCategory.LOW}`);
    console.log('\nTop Risk Files:');
    summary.topRiskFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.file} (Risk: ${f.riskScore}, Deps: ${f.dependencyCount})`);
    });
    console.log(`\n✅ Full report saved to: ${outputPath}`);
  }

  private getErrorPatternSummary(): Record<string, number> {
    const patterns: Record<string, number> = {};
    for (const error of this.errors) {
      patterns[error.pattern] = (patterns[error.pattern] || 0) + 1;
    }
    return patterns;
  }
}

// Run analyzer
const analyzer = new TypeScriptErrorAnalyzer();
analyzer.analyze().catch(console.error);