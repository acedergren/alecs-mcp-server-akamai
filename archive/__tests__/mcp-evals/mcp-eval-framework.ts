/**
 * MCP Evaluation Framework
 * 
 * A lightweight framework for evaluating MCP server implementations
 * using LLM-based grading. Inspired by MCP Evals and OpenAI Evals.
 */

import { z } from 'zod';

/**
 * Evaluation result schema
 */
export const EvalResultSchema = z.object({
  accuracy: z.number().min(1).max(5),
  completeness: z.number().min(1).max(5),
  relevance: z.number().min(1).max(5),
  clarity: z.number().min(1).max(5),
  reasoning: z.number().min(1).max(5),
  overall_score: z.number().min(1).max(5),
  overall_comments: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()).optional()
});

export type EvalResult = z.infer<typeof EvalResultSchema>;

/**
 * Individual evaluation function
 */
export interface EvalFunction {
  name: string;
  description: string;
  run: (server: any) => Promise<EvalResult>;
  weight?: number; // Optional weight for this eval in overall score
  tags?: string[]; // Optional tags for categorization
}

/**
 * Configuration for evaluation runs
 */
export interface EvalConfig {
  model: any; // LLM model instance
  evals: EvalFunction[];
  options?: {
    parallel?: boolean;
    timeout?: number;
    retries?: number;
    output?: {
      format?: 'json' | 'html' | 'markdown';
      file?: string;
      console?: boolean;
    };
  };
}

/**
 * Mock grading function for testing
 * In production, this would call the actual LLM
 */
export async function grade(
  model: any,
  prompt: string,
  response: any
): Promise<EvalResult> {
  // For testing, return mock scores
  // In production, this would:
  // 1. Format the prompt with the response
  // 2. Call the LLM with evaluation criteria
  // 3. Parse and validate the LLM response
  
  const mockResult: EvalResult = {
    accuracy: 4.5,
    completeness: 4.0,
    relevance: 5.0,
    clarity: 4.5,
    reasoning: 4.0,
    overall_score: 4.4,
    overall_comments: "The tool provides accurate and relevant information with clear formatting. Response includes helpful next steps.",
    strengths: [
      "Clear and well-formatted responses",
      "Includes actionable next steps",
      "Handles errors gracefully"
    ],
    weaknesses: [
      "Could provide more context about implications",
      "Some technical terms not explained"
    ],
    suggestions: [
      "Add examples for complex configurations",
      "Include links to relevant documentation"
    ]
  };
  
  return mockResult;
}

/**
 * Run evaluation suite
 */
export async function runEvals(config: EvalConfig): Promise<EvalSuiteResult> {
  const results: EvalRunResult[] = [];
  const startTime = Date.now();
  
  // Initialize server instance (would be passed in production)
  const server = {}; // Mock server for testing
  
  for (const evalFn of config.evals) {
    console.log(`Running eval: ${evalFn.name}`);
    
    try {
      const evalStartTime = Date.now();
      const result = await evalFn.run(server);
      const duration = Date.now() - evalStartTime;
      
      results.push({
        name: evalFn.name,
        description: evalFn.description,
        result,
        duration,
        status: 'passed',
        tags: evalFn.tags
      });
      
      if (config.options?.output?.console) {
        console.log(`✓ ${evalFn.name}: ${result.overall_score}/5`);
      }
    } catch (error) {
      results.push({
        name: evalFn.name,
        description: evalFn.description,
        result: null,
        duration: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        tags: evalFn.tags
      });
      
      if (config.options?.output?.console) {
        console.error(`✗ ${evalFn.name}: Failed - ${error}`);
      }
    }
  }
  
  const totalDuration = Date.now() - startTime;
  const suiteResult = calculateSuiteResult(results, totalDuration);
  
  // Output results
  if (config.options?.output) {
    await outputResults(suiteResult, config.options.output);
  }
  
  return suiteResult;
}

/**
 * Individual evaluation run result
 */
export interface EvalRunResult {
  name: string;
  description: string;
  result: EvalResult | null;
  duration: number;
  status: 'passed' | 'failed';
  error?: string;
  tags?: string[];
}

/**
 * Complete evaluation suite result
 */
export interface EvalSuiteResult {
  timestamp: string;
  duration: number;
  totalEvals: number;
  passed: number;
  failed: number;
  averageScore: number;
  results: EvalRunResult[];
  summary: {
    byCategory: Record<string, number>;
    topStrengths: string[];
    topWeaknesses: string[];
    overallRecommendations: string[];
  };
}

/**
 * Calculate overall suite results
 */
function calculateSuiteResult(
  results: EvalRunResult[],
  duration: number
): EvalSuiteResult {
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  
  // Calculate average scores
  const validResults = results
    .filter(r => r.result !== null)
    .map(r => r.result!);
  
  const averageScore = validResults.length > 0
    ? validResults.reduce((sum, r) => sum + r.overall_score, 0) / validResults.length
    : 0;
  
  // Aggregate categories
  const categoryScores: Record<string, number[]> = {
    accuracy: [],
    completeness: [],
    relevance: [],
    clarity: [],
    reasoning: []
  };
  
  validResults.forEach(result => {
    categoryScores.accuracy.push(result.accuracy);
    categoryScores.completeness.push(result.completeness);
    categoryScores.relevance.push(result.relevance);
    categoryScores.clarity.push(result.clarity);
    categoryScores.reasoning.push(result.reasoning);
  });
  
  const byCategory: Record<string, number> = {};
  for (const [category, scores] of Object.entries(categoryScores)) {
    byCategory[category] = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
  }
  
  // Aggregate strengths and weaknesses
  const allStrengths = validResults.flatMap(r => r.strengths);
  const allWeaknesses = validResults.flatMap(r => r.weaknesses);
  const allSuggestions = validResults.flatMap(r => r.suggestions || []);
  
  return {
    timestamp: new Date().toISOString(),
    duration,
    totalEvals: results.length,
    passed,
    failed,
    averageScore,
    results,
    summary: {
      byCategory,
      topStrengths: getTopItems(allStrengths, 5),
      topWeaknesses: getTopItems(allWeaknesses, 5),
      overallRecommendations: getTopItems(allSuggestions, 5)
    }
  };
}

/**
 * Get most common items from array
 */
function getTopItems(items: string[], count: number): string[] {
  const frequency = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([item]) => item);
}

/**
 * Output results in various formats
 */
async function outputResults(
  results: EvalSuiteResult,
  options: NonNullable<EvalConfig['options']>['output']
): Promise<void> {
  if (!options) return;
  
  if (options.console) {
    console.log('\n=== Evaluation Summary ===');
    console.log(`Total Evals: ${results.totalEvals}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Average Score: ${results.averageScore.toFixed(2)}/5`);
    console.log('\nScores by Category:');
    for (const [category, score] of Object.entries(results.summary.byCategory)) {
      console.log(`  ${category}: ${score.toFixed(2)}/5`);
    }
  }
  
  if (options.file) {
    const fs = await import('fs/promises');
    
    switch (options.format) {
      case 'json':
        await fs.writeFile(
          options.file,
          JSON.stringify(results, null, 2)
        );
        break;
        
      case 'html':
        await fs.writeFile(
          options.file,
          generateHTMLReport(results)
        );
        break;
        
      case 'markdown':
        await fs.writeFile(
          options.file,
          generateMarkdownReport(results)
        );
        break;
    }
  }
}

/**
 * Generate HTML report
 */
function generateHTMLReport(results: EvalSuiteResult): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>MCP Evaluation Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; }
    .eval { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
    .passed { border-left: 4px solid #4CAF50; }
    .failed { border-left: 4px solid #f44336; }
    .score { font-size: 24px; font-weight: bold; }
    .category { display: inline-block; margin: 5px; padding: 5px 10px; background: #e0e0e0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>MCP Evaluation Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Generated: ${results.timestamp}</p>
    <p>Duration: ${results.duration}ms</p>
    <p class="score">Overall Score: ${results.averageScore.toFixed(2)}/5</p>
    <p>Passed: ${results.passed}/${results.totalEvals}</p>
  </div>
  
  <h2>Results</h2>
  ${results.results.map(r => `
    <div class="eval ${r.status}">
      <h3>${r.name}</h3>
      <p>${r.description}</p>
      ${r.result ? `
        <p>Score: ${r.result.overall_score}/5</p>
        <p>${r.result.overall_comments}</p>
      ` : `
        <p>Error: ${r.error}</p>
      `}
    </div>
  `).join('')}
</body>
</html>
  `;
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(results: EvalSuiteResult): string {
  return `
# MCP Evaluation Report

Generated: ${results.timestamp}

## Summary

- **Overall Score**: ${results.averageScore.toFixed(2)}/5
- **Total Evaluations**: ${results.totalEvals}
- **Passed**: ${results.passed}
- **Failed**: ${results.failed}
- **Duration**: ${results.duration}ms

### Scores by Category

${Object.entries(results.summary.byCategory)
  .map(([cat, score]) => `- **${cat}**: ${score.toFixed(2)}/5`)
  .join('\n')}

### Top Strengths

${results.summary.topStrengths.map(s => `- ${s}`).join('\n')}

### Areas for Improvement

${results.summary.topWeaknesses.map(w => `- ${w}`).join('\n')}

## Detailed Results

${results.results.map(r => `
### ${r.name}

${r.description}

- **Status**: ${r.status}
- **Duration**: ${r.duration}ms
${r.result ? `
- **Score**: ${r.result.overall_score}/5
- **Comments**: ${r.result.overall_comments}

**Strengths**:
${r.result.strengths.map(s => `- ${s}`).join('\n')}

**Weaknesses**:
${r.result.weaknesses.map(w => `- ${w}`).join('\n')}
` : `
- **Error**: ${r.error}
`}
`).join('\n')}
  `;
}