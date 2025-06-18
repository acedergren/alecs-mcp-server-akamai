# Portability Test Checklist

> **Note**: This guide uses the following path placeholders:
> - `<USER_HOME>` or `~/` - Your home directory
> - `<PROJECT_ROOT>` - The directory where you cloned this repository
> - Replace these with your actual paths when following the guide.

## Overview

This checklist ensures the ALECS MCP Server works correctly on any machine without path modifications.

## Pre-Test Setup

- [ ] Ensure you have a clean test environment
- [ ] Have Node.js 18+ installed
- [ ] Have Git installed
- [ ] Have at least 500MB free disk space

## Platform-Specific Tests

### macOS Testing

1. **Clone and Setup**
   - [ ] Clone repository to a directory with spaces: `~/Test Projects/alecs-test/`
   - [ ] Verify no errors during clone
   - [ ] Run `npm install` - should complete without errors

2. **Build and Test**
   - [ ] Run `npm run build` - should create dist/ directory
   - [ ] Run `npm test` - all tests should pass
   - [ ] Run `./scripts/check-hardcoded-paths.sh` - should find no issues

3. **Script Execution**
   - [ ] Run `./examples/scripts/send-mcp-command.sh` from project root
   - [ ] Run the same script from your home directory
   - [ ] Verify script correctly finds project files

4. **Shell Compatibility**
   - [ ] Test with bash: `/bin/bash scripts/test-portability.sh`
   - [ ] Test with zsh: `/bin/zsh scripts/test-portability.sh`

### Linux Testing

1. **Different User Test**
   - [ ] Create a new user: `sudo useradd -m testuser`
   - [ ] Clone as that user to `/home/testuser/projects/alecs/`
   - [ ] Verify all scripts work without modification

2. **Path Edge Cases**
   - [ ] Clone to root-owned directory (with proper permissions)
   - [ ] Clone to directory with unicode characters
   - [ ] Clone to very deep path (>100 characters)

3. **Permission Tests**
   - [ ] Verify scripts are executable after clone
   - [ ] Test with restrictive umask (077)

### Windows WSL Testing

1. **WSL2 Setup**
   - [ ] Clone to WSL filesystem: `/home/<user>/alecs-test/`
   - [ ] Clone to Windows filesystem: `/mnt/c/Projects/alecs-test/`
   - [ ] Verify both locations work correctly

2. **Line Ending Tests**
   - [ ] Verify scripts work with LF endings
   - [ ] Check git config for autocrlf settings
   - [ ] Ensure no CRLF conversion issues

3. **Path Separator Tests**
   - [ ] Verify all paths use forward slashes
   - [ ] Test scripts when PWD contains spaces

## Functional Tests

### 1. Documentation Walkthrough
- [ ] Follow Quick Start guide with fresh clone
- [ ] All example commands should work as written
- [ ] No need to modify any paths in examples

### 2. Configuration Tests
- [ ] Create `.edgerc` in home directory
- [ ] Verify server finds it automatically
- [ ] Test with `.edgerc` in custom location via env var

### 3. Build Artifacts
- [ ] Delete `dist/` directory
- [ ] Run `npm run build`
- [ ] Verify all servers are created in correct locations

### 4. Integration Tests
- [ ] Start property server: `npm run start:property`
- [ ] Server should start without path errors
- [ ] All MCP tools should be available

## Common Issues to Verify

### Path Resolution
- [ ] Scripts find project root from any working directory
- [ ] No "file not found" errors for project files
- [ ] Relative imports work correctly

### Environment Variables
- [ ] No dependency on USER or HOME being specific values
- [ ] Works with custom NODE_PATH
- [ ] Works with custom npm prefix

### Git Hooks
- [ ] Pre-commit hook prevents hardcoded paths
- [ ] Hook works on all platforms
- [ ] Can be bypassed with --no-verify when needed

## Post-Test Cleanup

- [ ] Remove test clones
- [ ] Remove test users (Linux)
- [ ] Clear npm cache if needed
- [ ] Document any platform-specific issues found

## Sign-off

| Platform | Tester | Date | Pass/Fail | Notes |
|----------|--------|------|-----------|-------|
| macOS    |        |      |           |       |
| Linux    |        |      |           |       |
| Windows  |        |      |           |       |

## Success Criteria

All items should be checked for each platform. Any failures should be documented and fixed before release.