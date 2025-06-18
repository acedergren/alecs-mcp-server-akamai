# Hardcoded Paths Fix Plan

## Overview
This plan addresses all hardcoded absolute paths found in the codebase to ensure portability when others clone the repository.

## Issues Identified

### 1. Critical Script Issue
- **File**: `examples/scripts/send-mcp-command.sh`
- **Issue**: Contains hardcoded path `/home/alex/alecs-mcp-server-akamai/dist/servers/property-server.js`
- **Impact**: Script will fail on other machines

### 2. Documentation Issues
Multiple documentation files contain user-specific example paths:
- `/home/alex/` paths in guides
- `/Users/acedergr/` paths in setup documentation
- Specific user home directories in examples

## Fix Strategy

### Phase 1: Script Fixes
1. Update `send-mcp-command.sh` to use relative paths or environment variables
2. Make the script detect its own location and resolve paths relative to project root
3. Add error handling for missing files

### Phase 2: Documentation Updates
1. Replace all user-specific paths with placeholders:
   - `/home/alex/` → `~/` or `<USER_HOME>/`
   - `/Users/acedergr/` → `~/` or `<USER_HOME>/`
   - Project paths → `<PROJECT_ROOT>/` or use relative paths
2. Add setup instructions at the beginning of each guide explaining path substitution
3. Use consistent placeholder conventions across all documentation

### Phase 3: Prevention Measures
1. Add a pre-commit hook to check for hardcoded paths
2. Create documentation guidelines for path examples
3. Add CI/CD check for absolute paths in new files

## Implementation Details

### 1. Script Fix Pattern
```bash
# Instead of:
/home/alex/alecs-mcp-server-akamai/dist/servers/property-server.js

# Use:
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
"$PROJECT_ROOT/dist/servers/property-server.js"
```

### 2. Documentation Fix Pattern
```markdown
# Instead of:
cd /home/alex/alecs-mcp-server-akamai

# Use:
cd ~/alecs-mcp-server-akamai
# or
cd <PROJECT_ROOT>
```

### 3. Path Placeholder Convention
- `<USER_HOME>` - User's home directory
- `<PROJECT_ROOT>` - Repository root directory
- `~/` - Standard home directory notation
- `./` - Relative to current directory

## Verification Plan

### 1. Automated Testing
- Create a test script that clones the repo to a temp directory
- Run all scripts and verify they work
- Check that no absolute paths remain

### 2. Manual Testing
- Clone repository on different OS (Mac, Linux, Windows WSL)
- Follow all documentation guides
- Verify all examples work with path substitution

### 3. CI/CD Integration
- Add GitHub Action to check for hardcoded paths in PRs
- Fail builds if new hardcoded paths are introduced

## Success Criteria
1. Repository can be cloned and used on any machine without path modifications
2. All scripts work with relative or configurable paths
3. Documentation uses only portable path examples
4. CI/CD prevents future hardcoded paths from being merged

## Risk Mitigation
1. Keep backup of original files before modification
2. Test changes on multiple platforms
3. Get review from team members on different systems
4. Document any platform-specific requirements clearly