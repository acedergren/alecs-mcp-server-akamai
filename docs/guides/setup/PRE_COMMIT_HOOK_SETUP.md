# Pre-commit Hook Setup Guide

> **Note**: This guide uses the following path placeholders:
> - `<PROJECT_ROOT>` - The directory where you cloned this repository
> - Replace these with your actual paths when following the guide.

## Overview

This guide explains how to set up and use the pre-commit hook that prevents hardcoded paths from being committed.

## Installation

### Automatic Installation (Recommended)

From the project root, run:

```bash
cd <PROJECT_ROOT>
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit 2>/dev/null || true
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# This hook is already installed in the repository
# It checks for hardcoded paths before allowing commits
EOF
```

The hook is already included in the repository at `.git/hooks/pre-commit`.

### Manual Installation

If the hook is missing, you can install it manually:

1. Navigate to your project directory:
   ```bash
   cd <PROJECT_ROOT>
   ```

2. Create the hooks directory if it doesn't exist:
   ```bash
   mkdir -p .git/hooks
   ```

3. Copy the pre-commit hook:
   ```bash
   cp scripts/pre-commit-hook .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

## How It Works

The pre-commit hook:

1. **Runs automatically** before each commit
2. **Checks only staged files** for hardcoded paths
3. **Blocks commits** if problematic paths are found
4. **Provides helpful feedback** on how to fix issues

## Common Scenarios

### When the Hook Blocks Your Commit

If you see this message:
```
❌ Commit blocked: Found hardcoded paths in staged files!
```

Follow these steps:

1. **Review the reported issues**
   - Note which files have problems
   - Look at the specific paths flagged

2. **Fix the hardcoded paths**
   ```bash
   # Example: Replace /home/username/ with ~/
   # Example: Replace /Users/john/project/ with <PROJECT_ROOT>/
   ```

3. **Stage your fixes**
   ```bash
   git add <fixed-files>
   ```

4. **Try committing again**
   ```bash
   git commit -m "Your message"
   ```

### Emergency Bypass

In rare cases where you need to bypass the hook:

```bash
git commit --no-verify -m "Your message"
```

**⚠️ Warning**: Only use this when absolutely necessary, and ensure you fix the paths in a follow-up commit.

## Troubleshooting

### Hook Not Running

1. Check if the hook is executable:
   ```bash
   ls -la .git/hooks/pre-commit
   # Should show: -rwxr-xr-x
   ```

2. Make it executable if needed:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

### False Positives

The hook ignores:
- System paths (`/usr/bin`, `/etc/`)
- URLs that look like paths
- Paths in comments
- Example placeholders like `<USER_HOME>`

If you encounter a false positive, you can:
1. Add an exception to the script
2. Use `--no-verify` for that specific commit
3. Report the issue for script improvement

### Hook Missing

If `.git/hooks/pre-commit` doesn't exist:

```bash
# Install from the provided script
cp scripts/check-hardcoded-paths.sh .git/hooks/
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
exec scripts/check-hardcoded-paths.sh
EOF
chmod +x .git/hooks/pre-commit
```

## Best Practices

1. **Never commit hardcoded paths**
   - Use `~/` for home directory
   - Use relative paths when possible
   - Use environment variables for configurable paths

2. **Document path placeholders**
   - Add notes explaining any placeholders used
   - Be consistent across documentation

3. **Test before committing**
   - Run `./scripts/check-hardcoded-paths.sh` manually
   - Verify your changes work on different machines

## For CI/CD Integration

The same validation runs in CI/CD:
- Pull requests are checked automatically
- Failed checks block merging
- Clear feedback is provided in PR comments

See `.github/workflows/check-paths.yml` for the CI configuration.