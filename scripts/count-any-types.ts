#!/usr/bin/env tsx
/**
 * Count actual TypeScript 'any' type violations
 * Excludes comments and string literals
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function countAnyTypesInFile(filePath: string): number {
  const content = readFileSync(filePath, 'utf8');
  
  // Remove comments and string literals to avoid false positives
  let cleanContent = content;
  
  // Remove single-line comments
  cleanContent = cleanContent.replace(/\/\/.*$/gm, '');
  
  // Remove multi-line comments
  cleanContent = cleanContent.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove string literals (basic approach - not perfect but good enough)
  cleanContent = cleanContent.replace(/'[^']*'/g, '""');
  cleanContent = cleanContent.replace(/"[^"]*"/g, '""');
  cleanContent = cleanContent.replace(/`[^`]*`/g, '""');
  
  // Count occurrences of 'any' as a type
  const matches = cleanContent.match(/\bany\b/g) || [];
  
  // Filter out false positives (like 'many', 'company', etc.)
  const realMatches = matches.filter((match, index) => {
    const startIndex = cleanContent.indexOf(match, index > 0 ? cleanContent.indexOf(matches[index - 1]) + 1 : 0);
    const beforeChar = startIndex > 0 ? cleanContent[startIndex - 1] : ' ';
    const afterChar = startIndex + match.length < cleanContent.length ? cleanContent[startIndex + match.length] : ' ';
    
    // Check if it's actually the word 'any' and not part of another word
    return /[^a-zA-Z]/.test(beforeChar) && /[^a-zA-Z]/.test(afterChar);
  });
  
  return realMatches.length;
}

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip directories
      if (entry === 'node_modules' || 
          entry === '.git' || 
          entry === 'dist' || 
          entry === 'build' ||
          entry === '.archive' ||
          entry === 'coverage') {
        continue;
      }
      findTypeScriptFiles(fullPath, files);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function main() {
  console.log('🔍 Counting TypeScript "any" Type Violations');
  console.log('==========================================\n');
  
  const srcPath = join(process.cwd(), 'src');
  const files = findTypeScriptFiles(srcPath);
  
  let totalCount = 0;
  const fileViolations: { path: string; count: number }[] = [];
  
  for (const file of files) {
    try {
      const count = countAnyTypesInFile(file);
      if (count > 0) {
        totalCount += count;
        fileViolations.push({
          path: file.replace(process.cwd() + '/', ''),
          count
        });
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  console.log(`Total TypeScript files analyzed: ${files.length}`);
  console.log(`Total 'any' type violations found: ${totalCount}`);
  console.log(`Files with violations: ${fileViolations.length}\n`);
  
  if (fileViolations.length > 0) {
    console.log('Top 20 files with most violations:');
    console.log('===================================');
    
    fileViolations
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .forEach((file, index) => {
        console.log(`${(index + 1).toString().padStart(2)}. ${file.path}: ${file.count} violations`);
      });
  }
}

main().catch(console.error);