/**
 * Dependency Security Analyzer
 */

import { DependencyAnalysisResults, DependencyInfo, VulnerableDependency } from '../../types/SecurityTypes';
import * as fs from 'fs';
import * as path from 'path';

export class DependencyAnalyzer {
  
  async analyze(options: {
    manifestFiles: string[];
    includeDevDependencies: boolean;
    checkForUpdates: boolean;
    validateLicenses: boolean;
    akamaiApprovedOnly: boolean;
  }): Promise<DependencyAnalysisResults> {
    console.log('📦 [DEPS] Analyzing dependency security...');
    
    const dependencies: DependencyInfo[] = [];
    const vulnerableDependencies: VulnerableDependency[] = [];
    
    for (const manifestFile of options.manifestFiles) {
      if (manifestFile.includes('package.json')) {
        const deps = await this.analyzeNpmDependencies(manifestFile, options);
        dependencies.push(...deps.dependencies);
        vulnerableDependencies.push(...deps.vulnerableDependencies);
      }
    }
    
    return {
      dependencies,
      vulnerableDependencies,
      outdatedDependencies: [],
      licenseIssues: [],
      riskAssessment: {
        overallRisk: vulnerableDependencies.length > 0 ? 'HIGH' : 'LOW',
        criticalDependencies: vulnerableDependencies.map(d => d.name),
        recommendations: this.generateRecommendations(vulnerableDependencies)
      }
    };
  }

  private async analyzeNpmDependencies(
    manifestFile: string,
    options: any
  ): Promise<{
    dependencies: DependencyInfo[];
    vulnerableDependencies: VulnerableDependency[];
  }> {
    const dependencies: DependencyInfo[] = [];
    const vulnerableDependencies: VulnerableDependency[] = [];
    
    try {
      const packageJson = JSON.parse(
        await fs.promises.readFile(manifestFile, 'utf-8')
      );
      
      // Analyze production dependencies
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            license: 'MIT', // Would need to check actual license
            dependencies: []
          });
          
          // Check for known vulnerable packages
          if (this.isVulnerablePackage(name, version as string)) {
            vulnerableDependencies.push({
              name,
              version: version as string,
              vulnerabilities: ['Known security vulnerability'],
              severity: 'HIGH',
              fixedIn: 'latest'
            });
          }
        });
      }
      
      // Analyze dev dependencies if requested
      if (options.includeDevDependencies && packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          dependencies.push({
            name,
            version: version as string,
            license: 'MIT',
            dependencies: []
          });
        });
      }
    } catch (error) {
      console.error(`Failed to analyze ${manifestFile}:`, error);
    }
    
    return { dependencies, vulnerableDependencies };
  }

  private isVulnerablePackage(name: string, version: string): boolean {
    // Simplified vulnerability check - in real implementation would use vulnerability database
    const knownVulnerablePackages = [
      'lodash@<4.17.21',
      'minimist@<1.2.6',
      'axios@<0.21.2'
    ];
    
    return false; // Placeholder
  }

  private generateRecommendations(vulnerableDeps: VulnerableDependency[]): string[] {
    const recommendations: string[] = [];
    
    if (vulnerableDeps.length > 0) {
      recommendations.push('Update vulnerable dependencies immediately');
      recommendations.push('Run npm audit fix to apply automatic fixes');
      recommendations.push('Review and update dependency update policies');
    }
    
    recommendations.push('Implement automated dependency scanning in CI/CD');
    recommendations.push('Use dependabot or similar tools for automatic updates');
    
    return recommendations;
  }
}