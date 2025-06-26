# MCP Evaluation Suite for ALECS

This directory contains comprehensive evaluation tools for testing the ALECS MCP Server using multiple evaluation frameworks.

## Overview

We implement three complementary evaluation approaches:

1. **MCP Evals Framework** - LLM-based scoring of tool performance
2. **mcpx-eval Integration** - Multi-model comparison testing  
3. **Jest Integration Tests** - Automated CI/CD testing

## Quick Start

### Running MCP Evals

```bash
# Run all evaluations
npm test -- __tests__/mcp-evals/run-evals.test.ts

# Run specific evaluation suite
npm test -- __tests__/mcp-evals/run-evals.test.ts -t "Property Management"

# Generate HTML report
npm run eval:report
```

### Using mcpx-eval

```bash
# Install mcpx-eval
uv tool install mcpx-eval

# Get mcp.run session
npx --yes -p @dylibso/mcpx gen-session

# Run evaluations
mcpx-eval test --config __tests__/mcp-evals/mcpx-eval.toml

# Generate comparison report
mcpx-eval gen --html results.html --show
```

## Evaluation Structure

### 1. Property Management (`property-management.eval.ts`)
- Property listing and search
- Property creation workflow
- Activation process
- Edge hostname configuration
- Error handling
- Universal search capabilities

### 2. DNS Management (`dns-management.eval.ts`)
- Zone creation
- Record management (A, CNAME, MX, TXT, etc.)
- Bulk operations
- Validation tools
- Advanced records (SRV, CAA, TLSA)
- DNSSEC configuration

### 3. Framework (`mcp-eval-framework.ts`)
- Scoring system (1-5 scale)
- Multiple evaluation dimensions
- Report generation (JSON, HTML, Markdown)
- Aggregated insights

## Evaluation Metrics

Each evaluation scores tools on:

- **Accuracy** (1-5): Correctness of information
- **Completeness** (1-5): Coverage of requirements
- **Relevance** (1-5): Appropriateness of response
- **Clarity** (1-5): Quality of formatting and explanation
- **Reasoning** (1-5): Logical explanation quality

## Writing New Evaluations

### MCP Eval Format

```typescript
export const myEval: EvalFunction = {
  name: 'My Evaluation',
  description: 'What this eval tests',
  run: async (server: ALECSFullServer) => {
    const prompt = `Detailed evaluation criteria...`;
    
    const response = await server.handleToolCall('tool-name', {
      // tool arguments
    });
    
    return await grade(openai('gpt-4'), prompt, response);
  },
  tags: ['category', 'feature']
};
```

### mcpx-eval Scenario

```toml
[[scenarios]]
name = "scenario-name"
description = "What this scenario tests"
prompt = """
Multi-line prompt that will be sent to the model
"""
expected_tools = ["tool1", "tool2"]
success_criteria = ["criterion1", "criterion2"]
```

## CI/CD Integration

The evaluation suite integrates with Jest and can be run in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run MCP Evaluations
  run: npm test -- __tests__/mcp-evals/run-evals.test.ts
  
- name: Upload Eval Reports
  uses: actions/upload-artifact@v3
  with:
    name: mcp-eval-reports
    path: |
      *-eval-results.json
      *-eval-results.md
      *-eval-results.html
```

## Best Practices

1. **Comprehensive Scenarios**: Test both happy paths and error cases
2. **Clear Criteria**: Define specific success criteria for each eval
3. **Model Agnostic**: Write prompts that work across different LLMs
4. **Performance Tracking**: Monitor evaluation execution time
5. **Regular Updates**: Update evals as new features are added

## Interpreting Results

### Score Ranges
- **4.5-5.0**: Excellent - Tool performs exceptionally well
- **4.0-4.4**: Good - Minor improvements possible
- **3.5-3.9**: Adequate - Some issues to address
- **3.0-3.4**: Needs Improvement - Significant issues
- **Below 3.0**: Poor - Major problems requiring attention

### Common Issues
- Missing error handling
- Unclear response formatting
- Lack of actionable next steps
- Incomplete parameter validation
- Poor explanation of implications

## Advanced Usage

### Custom Evaluation Models

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const config: EvalConfig = {
  model: anthropic('claude-3-opus'), // or any other model
  evals: [...],
  options: {
    // custom options
  }
};
```

### Batch Evaluation

```bash
# Run all evaluation suites
for suite in property dns security; do
  npm test -- __tests__/mcp-evals/$suite.eval.ts
done
```

### Comparative Analysis

```typescript
// Compare results across versions
const v1Results = await runEvals(configV1);
const v2Results = await runEvals(configV2);

const improvement = v2Results.averageScore - v1Results.averageScore;
console.log(`Score improvement: ${improvement}`);
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Add delays between evaluations
2. **Timeout Errors**: Increase timeout in config
3. **Mock Failures**: Ensure comprehensive mock setup
4. **LLM Errors**: Check API keys and quotas

### Debug Mode

```typescript
const config: EvalConfig = {
  // ...
  options: {
    debug: true, // Enable verbose logging
    parallel: false, // Run sequentially for easier debugging
  }
};
```

## Contributing

When adding new evaluations:

1. Follow existing patterns
2. Add comprehensive test scenarios
3. Document expected behavior
4. Include error cases
5. Update this README

## Future Enhancements

- [ ] Real API integration tests
- [ ] Performance benchmarking
- [ ] Multi-language prompt testing
- [ ] Automated regression detection
- [ ] Integration with observability tools