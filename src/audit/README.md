# ALECS MCP Server Audit Framework

A comprehensive code quality audit framework designed for MCP (Model Context Protocol) servers, with built-in SonarQube integration and automated fix capabilities.

## Overview

This audit framework provides:
- 🔍 **50+ audit rules** across security, performance, API compliance, and code quality
- 🤖 **Automated fix generation** for common issues
- 📊 **SonarQube Cloud integration** for continuous quality monitoring
- 🔧 **Fix orchestration** with validation and issue closure workflow
- 📈 **Progress tracking** and reporting

## Quick Start

### Running a Basic Audit

```bash
# Run comprehensive audit
npm run audit

# Run audit with auto-fix
npm run audit:fix

# Run SonarQube integration
npx tsx src/audit/run-sonarqube-audit.ts
```

### Running SonarQube Fix Orchestration

```bash
# Dry run to see what would be fixed
npx tsx src/audit/sonarqube-fix-orchestrator.ts --dry-run

# Apply auto-fixes only
npx tsx src/audit/sonarqube-fix-orchestrator.ts --auto-fix-only

# Full orchestration (fix, validate, close issues)
npx tsx src/audit/sonarqube-fix-orchestrator.ts
```

## Architecture

### Core Components

1. **AuditFramework** (`audit-framework.ts`)
   - Central orchestrator for all audit rules
   - Manages rule execution and issue collection
   - Generates comprehensive reports

2. **SonarQubeIntegration** (`sonarqube-integration.ts`)
   - Converts SonarQube issues to audit format
   - Generates fix workflows
   - Maps severities and categories

3. **SonarQubeIssueManager** (`sonarqube-issue-manager.ts`)
   - Tracks issue lifecycle (open → fixed → verified → closed)
   - Manages fix validation
   - Handles SonarQube API updates

4. **SonarQubeFixOrchestrator** (`sonarqube-fix-orchestrator.ts`)
   - Orchestrates complete fix workflow
   - Applies automated fixes
   - Validates with tests/lint/build
   - Closes verified issues in SonarQube

## Audit Rules

### Categories

- **Security**: Authentication, authorization, input validation, secrets
- **Performance**: N+1 queries, synchronous operations, caching
- **API Compliance**: Response formats, error handling, parameter validation
- **Code Quality**: Complexity, duplications, naming conventions
- **MCP Specific**: Tool naming, schema validation, protocol compliance

### Adding Custom Rules

Create a new rule in `src/audit/rules/`:

```typescript
export const customRules: AuditRule[] = [
  {
    id: 'custom-rule-001',
    name: 'My Custom Rule',
    category: 'code-quality',
    severity: 'high',
    description: 'Description of what this rule checks',
    check: async (framework: AuditFramework): Promise<AuditIssue[]> => {
      const issues: AuditIssue[] = [];
      
      // Your rule logic here
      const files = await framework.glob('**/*.ts');
      for (const file of files) {
        const content = await framework.readFile(file);
        
        if (/* your condition */) {
          issues.push({
            rule: 'custom-rule-001',
            severity: 'high',
            category: 'code-quality',
            message: 'Issue description',
            file,
            line: 1,
            suggestion: 'How to fix this issue'
          });
        }
      }
      
      return issues;
    }
  }
];
```

## SonarQube Integration

### Configuration

1. Set up SonarQube environment variables:
```bash
export SONARQUBE_TOKEN=your-token
export SONARQUBE_ORG=your-org
export SONARQUBE_PROJECT=your-project
```

2. Configure MCP tools (if using MCP-based integration):
```json
{
  "mcpServers": {
    "sonarqube": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-sonarqube"],
      "env": {
        "SONARQUBE_TOKEN": "your-token",
        "SONARQUBE_URL": "https://sonarcloud.io"
      }
    }
  }
}
```

### Workflow

1. **Fetch Issues**: Retrieves issues from SonarQube Cloud
2. **Analyze**: Categorizes issues as auto-fixable or manual
3. **Apply Fixes**: Runs automated fixes for supported rules
4. **Validate**: Tests, lints, and builds to ensure fixes work
5. **Close Issues**: Updates SonarQube to mark issues as resolved

### Supported Auto-Fix Rules

- `typescript:S1172` - Unused function parameters
- `typescript:S1481` - Unused variables
- `typescript:S125` - Commented out code
- `typescript:S1854` - Dead code assignments
- `typescript:S2589` - Redundant boolean conditions
- `typescript:S6268` - Missing return type annotations
- `typescript:S1066` - Collapsible if statements
- `typescript:S2870` - Array methods vs loops

## Output Structure

```
audit-results/
├── sonarqube-analysis.md       # Analysis report
├── sonarqube-fix-workflow.json # Fix workflow plan
├── sonarqube-todos.json        # Action items
├── sonarqube-tracking.json     # Issue tracking state
├── sonarqube-progress.md       # Progress report
└── sonar-fixes/                # Generated fix scripts
    ├── fix-typescript-S1172.ts
    └── run-all-fixes.ts
```

## Best Practices

1. **Run audits regularly**: Integrate into CI/CD pipeline
2. **Review before auto-fixing**: Use `--dry-run` first
3. **Validate thoroughly**: Ensure all tests pass after fixes
4. **Track progress**: Monitor the tracking file for fix status
5. **Close the loop**: Update SonarQube after verification

## Advanced Usage

### Custom Fix Strategies

Add custom fix implementations in the orchestrator:

```typescript
private async fixCustomRule(issue: any): Promise<any> {
  const filePath = issue.component.split(':')[1];
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Your fix logic here
  const fixed = content.replace(/pattern/, 'replacement');
  
  await fs.writeFile(filePath, fixed);
  
  return {
    success: true,
    issueKey: issue.key,
    message: 'Applied custom fix',
    changedFiles: [filePath]
  };
}
```

### Batch Processing

For large codebases, process in batches:

```typescript
const orchestrator = new SonarQubeFixOrchestrator();
await orchestrator.orchestrateFixes({
  maxIssues: 50,  // Process 50 issues at a time
  severityFilter: ['BLOCKER', 'CRITICAL'],  // Priority issues
  autoFixOnly: true  // Skip manual fixes
});
```

## Contributing

When contributing audit rules or fix strategies:

1. Ensure rules are generic and reusable
2. Document the rule's purpose and fix approach
3. Add tests for both detection and fixing
4. Consider false positive scenarios
5. Follow the existing patterns

## License

This audit framework is part of the ALECS MCP Server project and follows the same license terms.