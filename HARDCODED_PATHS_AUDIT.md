# Hardcoded Paths Audit

This document lists all hardcoded absolute paths found in the codebase that could break when the repository is cloned by other users.

## Files Containing `/home/alex` Paths

### 1. **examples/scripts/send-mcp-command.sh**
- Line 32: `node /home/alex/alecs-mcp-server-akamai/dist/servers/property-server.js`
- **Issue**: Hardcoded path to the project directory
- **Fix**: Use relative path or environment variable

### 2. **docs/guides/setup/MCP_USAGE_GUIDE.md**
- Line 17: `"/home/alex/alecs-mcp-server-akamai/dist/servers/property-server.js"`
- Line 20: `"AKAMAI_EDGERC": "/home/alex/.edgerc"`
- **Issue**: Example configuration contains user-specific paths
- **Fix**: Use placeholder paths like `"<PROJECT_ROOT>"` or `"~/.edgerc"`

### 3. **docs/reference/mcp-onboarding-demo.md**
- Contains: `"AKAMAI_EDGERC": "/home/alex/.edgerc"`
- **Issue**: Example configuration with user-specific path
- **Fix**: Use generic example path

## Files Containing `/Users/` Paths (macOS specific)

### 1. **docs/guides/setup/CLAUDE_CODE-SETUP.md**
Multiple occurrences of `/Users/acedergr/` paths:
- `/Users/acedergr/alecs-mcp-server-akamai/dist/index.js`
- `/Users/acedergr/alecs-mcp-server-akamai/src/index.ts`
- **Issue**: macOS user-specific paths in documentation
- **Fix**: Use generic placeholders like `<USER_HOME>` or `~/`

### 2. **docs/guides/setup/CLAUDE_DESKTOP_SETUP.md**
Multiple occurrences of `/Users/acedergr/Projects/` paths:
- `/Users/acedergr/Projects/alecs-mcp-server-akamai/dist/index.js`
- `/Users/acedergr/.edgerc`
- `/Users/acedergr/.akamai/.edgerc`
- `/Users/acedergr/bin/alecs-mcp`
- **Issue**: macOS user-specific paths in documentation
- **Fix**: Use generic examples or environment variables

### 3. **docs/architecture/multi-customer-architecture.md**
- `"edgercPath": "/Users/user/.edgerc"`
- **Issue**: Example contains macOS-specific path
- **Fix**: Use cross-platform example like `"~/.edgerc"`

### 4. **docs/guides/configuration/docker-guide.md**
- Contains `/Users/` paths in examples
- **Issue**: Platform-specific examples
- **Fix**: Use generic paths

## Other Absolute Paths

### 1. **build/docker/Dockerfile**
- Contains `/usr/local/` paths
- **Note**: These are acceptable as they are standard Linux system paths within the container

## Summary

### Critical Issues (Code/Scripts)
1. `examples/scripts/send-mcp-command.sh` - Contains hardcoded project path

### Documentation Issues
1. Multiple documentation files contain user-specific paths in examples
2. Documentation uses platform-specific paths (macOS `/Users/` vs Linux `/home/`)

## Recommendations

1. **For Scripts**: 
   - Use `dirname "$0"` or similar to get relative paths
   - Use environment variables for configurable paths

2. **For Documentation**:
   - Replace `/home/alex/` with `~/` or `<USER_HOME>/`
   - Replace `/Users/acedergr/` with `~/` or `<USER_HOME>/`
   - Replace project paths with `<PROJECT_ROOT>/` or relative paths
   - Use cross-platform examples

3. **For Configuration Examples**:
   - Use placeholder values like `<YOUR_EDGERC_PATH>`
   - Provide both Linux and macOS examples where needed
   - Add comments explaining path substitution

4. **Best Practices**:
   - Never hardcode absolute paths in source code
   - Use path.join() or path.resolve() for path construction
   - Document that users need to update paths for their environment
   - Consider adding a setup script that detects and configures paths