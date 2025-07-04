# Claude Hooks Guide for ALECS MCP Server

## Overview

Claude hooks provide automated checks and validations during development, ensuring code quality, security, and compliance with project standards.

## Installation

```bash
# Run the setup script
./hooks-setup.sh

# Or manually copy hooks
cp claude-hooks.json ~/.claude/settings.json
```

## Implemented Hooks

### 1. **SonarQube Integration** (NEW)
- **Trigger**: After `git commit` and `git push` commands
- **Actions**:
  - Pre-commit: Checks for scanner and token availability
  - Post-commit: Runs full SonarQube analysis locally
  - Post-push: Triggers background analysis with branch info
  - Quality gate status reporting
- **Blocks**: No, but warns on quality gate failures
- **Requirements**:
  - `sonar-scanner` installed (`brew install sonar-scanner`)
  - `SONAR_TOKEN` environment variable set
  - `sonar-project.properties` configured

### 2. **API Response Type Safety** (STRICT)
- **Trigger**: Before writing/editing AND after editing TypeScript files
- **Focus**: Specifically targets `any` usage in API response contexts
- **Actions**:
  - Pre-write: Blocks API responses with `any` types
  - Post-edit: Scans for response-specific patterns
  - Shows violations with proper fix examples
  - Provides CODE KAI compliant patterns
- **Blocks**: Yes, for API response type violations
- **Response patterns detected**:
  - `response: any`, `data: any`, `result: any`
  - `body: any`, `payload: any`
  - `Promise<any>` for async operations
  - `await client.request(...): any`
  - Catch blocks with untyped errors

### 3. **TypeScript Compilation Check**
- **Trigger**: After editing any `.ts` file
- **Action**: Runs `tsc --noEmit` to check for compilation errors
- **Blocks**: Yes, on compilation errors

### 2. **Documentation Enforcement**
- **Trigger**: After editing tool files (`*/tools/*.ts`)
- **Action**: Checks for required SNOW LEOPARD ARCHITECTURE and CODE KAI PRINCIPLES headers
- **Blocks**: Yes, if headers are missing

### 3. **Multi-Customer Support Validation**
- **Trigger**: After editing tool files
- **Action**: Warns if `customer?: string` parameter is missing
- **Blocks**: No, warning only

### 4. **API Response Validation**
- **Trigger**: After editing files with API calls
- **Action**: Checks for `validateApiResponse()` and type guards
- **Blocks**: No, warning only

### 5. **Security Checks**
- **Trigger**: Before running bash commands or editing files
- **Actions**:
  - Blocks commands that might expose credentials
  - Prevents hardcoded secrets in code
  - Warns on git push operations
- **Blocks**: Yes, for security violations

### 6. **Tool Registry Reminder**
- **Trigger**: After creating new tool files
- **Action**: Reminds to update `all-tools-registry.ts`
- **Blocks**: No, reminder only

### 7. **Test File Reminder**
- **Trigger**: After creating new tool files
- **Action**: Reminds to create corresponding test files
- **Blocks**: No, reminder only

### 8. **Periodic Audit Check**
- **Trigger**: On Claude notifications
- **Action**: Runs quick audit and reports critical issues
- **Blocks**: No, notification only

### 9. **Cleanup Check**
- **Trigger**: When stopping Claude
- **Action**: 
  - Shows uncommitted changes
  - Lists temporary files to archive
  - Reminds to run tests
- **Blocks**: No, informational only

## Hook Behavior

### Exit Codes
- `0`: Success (continue normally)
- `1`: Warning (show message but continue)
- `2`: Error (block the operation)

### Environment Variables
Hooks have access to:
- `${CLAUDE_FILE_PATH}`: The file being edited
- `${CLAUDE_TOOL_NAME}`: The tool being used
- `${CLAUDE_TOOL_PARAMS_COMMAND}`: Command for Bash tool
- `${CLAUDE_TOOL_PARAMS_CONTENT}`: Content for Write tool

## Customization

### Disable Specific Hooks
Edit `~/.claude/settings.json` and comment out unwanted hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      // {
      //   "matcher": "Edit|Write",
      //   "hooks": [...]
      // }
    ]
  }
}
```

### Add Project-Specific Hooks
Add new hooks to the appropriate event section:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "your-custom-check.sh"
        }]
      }
    ]
  }
}
```

## Troubleshooting

### Hooks Not Running
1. Check if settings file exists: `ls ~/.claude/settings.json`
2. Restart Claude Code
3. Check hook syntax with: `jq . ~/.claude/settings.json`

### Hook Blocking Legitimate Operations
1. Check the hook output for the specific check that failed
2. Temporarily disable by setting exit code to 0 or 1
3. Fix the underlying issue and re-enable

### Performance Issues
1. Hooks run synchronously, so keep them fast
2. Use early exits for non-applicable files
3. Consider using warnings (exit 1) instead of blocks (exit 2)

## Best Practices

1. **Start with Warnings**: Use exit code 1 initially, upgrade to 2 after testing
2. **Clear Messages**: Always explain why an operation was blocked
3. **Fast Checks**: Put expensive checks behind conditional logic
4. **Project Context**: Check CWD to ensure hooks only run in the right project
5. **Escape Properly**: Use proper shell escaping for file paths and variables

## SonarQube Setup

### Prerequisites
1. **Install SonarQube Scanner**:
   ```bash
   # macOS
   brew install sonar-scanner
   
   # Linux/Windows
   # Download from https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/
   ```

2. **Set Environment Variables**:
   ```bash
   # Add to ~/.zshrc or ~/.bash_profile
   export SONAR_TOKEN="your-sonarqube-token"
   export SONAR_HOST_URL="https://sonarcloud.io"  # or your SonarQube server
   ```

3. **Configure Project**:
   The `sonar-project.properties` file is already configured with:
   - Project key: `alecs-mcp-server-akamai`
   - Source directories and exclusions
   - TypeScript configuration
   - Coverage report paths

### Integration Script
Use the combined quality check script:
```bash
./scripts/sonarqube-integration.sh
```

This runs both internal audits and SonarQube analysis, generating a combined report.

## Examples

### Adding a New Check
```bash
# Check for console.log in production code
if [[ "${CLAUDE_FILE_PATH}" == *.ts ]] && grep -q 'console.log' "${CLAUDE_FILE_PATH}"; then
  echo "⚠️  WARNING: console.log found - use logger instead"
  exit 1
fi
```

### Project-Specific Hook
```bash
# Only run in ALECS project
if [[ "$(pwd)" == */alecs-mcp-server-akamai* ]]; then
  # Your check here
fi
```

## Security Considerations

- Hooks run with your full user permissions
- Never put sensitive data in hook commands
- Be careful with file paths containing spaces
- Validate inputs before using in commands