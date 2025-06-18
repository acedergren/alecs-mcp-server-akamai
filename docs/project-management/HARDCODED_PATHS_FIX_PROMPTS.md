# World-Class Prompts for Hardcoded Path Fixes

## Overview
These prompts are designed for use with AI assistants (Claude, GPT-4, etc.) to efficiently fix hardcoded paths in the ALECS MCP Server codebase.

---

## Prompt 1: Fix Shell Script Paths

```
I need you to update the shell script at `examples/scripts/send-mcp-command.sh` to use relative paths instead of hardcoded absolute paths.

Current issue: The script contains `/home/alex/alecs-mcp-server-akamai/dist/servers/property-server.js`

Requirements:
1. Make the script work from any directory by detecting its own location
2. Calculate the project root relative to the script location
3. Use the calculated paths for all file references
4. Add error handling to check if required files exist
5. Add helpful error messages if files are not found
6. Ensure the script works on Mac, Linux, and Windows WSL

The script should:
- Detect its own directory using `$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )`
- Calculate project root as two directories up from the script location
- Use variables for all paths instead of hardcoded values
- Include comments explaining the path resolution logic

Please provide the complete updated script with proper error handling and portability.
```

---

## Prompt 2: Update Documentation Paths

```
I need you to update documentation files to replace user-specific paths with portable placeholders.

Files to update:
1. `docs/guides/setup/MCP_USAGE_GUIDE.md`
2. `docs/reference/mcp-onboarding-demo.md`
3. `docs/guides/setup/CLAUDE_CODE-SETUP.md`
4. `docs/guides/setup/CLAUDE_DESKTOP_SETUP.md`
5. `docs/architecture/multi-customer-architecture.md`

Replace these patterns:
- `/home/alex/` → `~/` or `<USER_HOME>/`
- `/Users/acedergr/` → `~/` or `<USER_HOME>/`
- `/home/alex/alecs-mcp-server-akamai/` → `<PROJECT_ROOT>/` or `~/alecs-mcp-server-akamai/`
- Any absolute paths to project files → Use relative paths from project root

Guidelines:
1. Add a note at the beginning of each guide explaining the placeholders:
   ```markdown
   > **Note**: This guide uses the following path placeholders:
   > - `<USER_HOME>` or `~/` - Your home directory
   > - `<PROJECT_ROOT>` - The directory where you cloned this repository
   > - Replace these with your actual paths when following the guide.
   ```

2. Use consistent placeholders throughout each document
3. Prefer `~/` for brevity in command examples
4. Use `<PROJECT_ROOT>` when showing file structures
5. Ensure all code blocks and examples use portable paths

For each file, show me:
- The specific changes made
- Any sections that needed special attention
- Confirmation that all hardcoded paths were replaced
```

---

## Prompt 3: Create Path Validation Script

```
Create a shell script called `scripts/check-hardcoded-paths.sh` that detects hardcoded paths in the codebase.

Requirements:
1. Search for common hardcoded path patterns:
   - Paths starting with `/home/`
   - Paths starting with `/Users/`
   - Paths containing specific usernames
   - Absolute paths to the project (containing "alecs-mcp-server")

2. Exclude these directories from search:
   - node_modules
   - dist
   - .git
   - coverage
   - Any .gitignore'd paths

3. Check these file types:
   - .ts, .js files
   - .md files
   - .sh files
   - .json files (carefully, as some may need absolute paths)

4. Output format:
   - List each file with hardcoded paths
   - Show the line number and the problematic path
   - Return exit code 1 if any hardcoded paths found
   - Return exit code 0 if clean

5. Special cases to ignore:
   - System paths like `/usr/bin`, `/etc/`
   - URLs that look like paths
   - Example paths clearly marked as placeholders

The script should be suitable for use as a pre-commit hook and in CI/CD pipelines.
```

---

## Prompt 4: Create Pre-commit Hook

```
Create a Git pre-commit hook that prevents commits containing hardcoded paths.

Requirements:
1. Use the `check-hardcoded-paths.sh` script created earlier
2. Only check staged files (files being committed)
3. Show clear error messages with file locations
4. Allow override with `--no-verify` flag (standard git behavior)
5. Fast execution (< 1 second for typical commits)

The hook should:
- Run only on staged files to avoid checking the entire codebase
- Provide helpful output showing which files have issues
- Suggest how to fix the issues
- Mention the `--no-verify` escape hatch for emergencies

Provide:
1. The complete pre-commit hook script
2. Installation instructions
3. Instructions for developers on how to handle violations
```

---

## Prompt 5: Create GitHub Action for Path Validation

```
Create a GitHub Action workflow file `.github/workflows/check-paths.yml` that validates no hardcoded paths in pull requests.

Requirements:
1. Trigger on:
   - Pull requests (opened, synchronize, reopened)
   - Push to main/master branch

2. The workflow should:
   - Check out the code
   - Run the path validation script
   - Comment on the PR if issues are found
   - Fail the check if hardcoded paths exist
   - Provide clear instructions for fixing

3. Performance optimizations:
   - Only check changed files in PRs
   - Cache dependencies if needed
   - Complete in under 1 minute

4. Output should include:
   - List of files with issues
   - Specific lines containing hardcoded paths
   - Suggestions for fixing

Make the workflow maintainer-friendly with clear job names and step descriptions.
```

---

## Prompt 6: Comprehensive Testing

```
I need a comprehensive test plan to verify all hardcoded paths have been fixed and the codebase is portable.

Create:
1. A test script `scripts/test-portability.sh` that:
   - Clones the repository to a temporary directory with a random name
   - Runs all scripts and verifies they work
   - Attempts to build the project
   - Runs basic tests
   - Cleans up after itself

2. A manual test checklist covering:
   - Steps to test on Mac, Linux, and Windows WSL
   - Key functionality to verify
   - Documentation walkthrough
   - Common pitfalls to check

3. Platform-specific considerations:
   - Path separator differences (/ vs \)
   - Home directory differences
   - Shell differences (bash vs zsh)

The test should confirm that someone can clone the repo on any machine and immediately start using it without path modifications.
```

---

## Usage Instructions

1. **For Developers**: Copy and paste these prompts into your AI assistant of choice
2. **For Project Managers**: Use these prompts to delegate tasks to developers
3. **For Contributors**: Reference these when making similar fixes in the future

## Success Criteria

After using these prompts, the codebase should:
- ✅ Have zero hardcoded user-specific paths
- ✅ Work on any machine without modification
- ✅ Include automated checks to prevent regression
- ✅ Have clear documentation about path handling

## Notes

- These prompts are designed to be self-contained
- Each prompt builds on the previous ones
- Adjust file paths if your project structure differs
- Test all changes thoroughly before committing