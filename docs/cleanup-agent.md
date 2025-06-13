# ALECS Cleanup Agent

The Cleanup Agent helps maintain a clean and organized project directory by identifying and categorizing files for archival or deletion.

## Features

- **Smart File Categorization**: Automatically identifies essential files, deprecated files, temporary artifacts, and files needing review
- **Progress Tracking**: Real-time progress bars showing analysis and cleanup operations
- **Dry Run Mode**: Preview what would be cleaned without making changes
- **Interactive Mode**: Get prompted before executing cleanup operations
- **Undo Capability**: Restore moved files from backup
- **Detailed Reporting**: See exactly what was cleaned and how much space was saved

## Usage

### Basic Commands

```bash
# Dry run - see what would be cleaned
npm run cleanup:dry

# Interactive mode - get prompted before cleanup
npm run cleanup:interactive

# Direct execution (use with caution)
npm run cleanup

# Using the script directly
tsx src/agents/cleanup-agent.ts [options]
```

### Command Line Options

- `--dry-run` or `-d`: Preview cleanup without making changes
- `--interactive` or `-i`: Prompt for confirmation before cleanup
- `--undo=<backup-file>`: Restore files from a previous cleanup

### Examples

```bash
# Preview what would be cleaned
npm run cleanup:dry

# Run cleanup with confirmation
npm run cleanup:interactive

# Undo a previous cleanup
tsx src/agents/cleanup-agent.ts --undo=.cleanup-backup-1234567890.json
```

## File Categories

### Essential Files (Always Kept)
- Source code (`src/**`)
- Package files (`package.json`, `package-lock.json`)
- TypeScript config (`tsconfig.json`)
- Git files (`.gitignore`)
- Environment files (`.env`, `.edgerc`)
- Main documentation (`README.md`, `CLAUDE.md`)
- MCP configuration (`.mcp.json`)

### Archive Files (Moved to .old)
- Files with `.old`, `.bak`, `.backup` extensions
- Files starting with `old-` or `deprecated-`
- Test documentation (`test-*.md`, `TESTING*.md`)
- Example files (`example-*.md`, `*-example.md`)
- Old infrastructure docs
- Wishlist files

### Delete Files (Removed)
- Coverage reports (`coverage/**`)
- Test output (`.nyc_output/**`)
- Log files (`*.log`)
- Temporary files (`*.tmp`, `*.temp`)
- OS files (`.DS_Store`)
- NPM/Yarn debug logs
- Editor backup files (`*~`, `#*#`)

### Review Files (Need Manual Decision)
- Build output (`dist/**`)
- Jest snapshots (`*.test.ts.snap`)
- Git merge artifacts (`*.orig`)
- Uncategorized files
- Old documentation (>30 days)

## How It Works

1. **Analysis Phase**
   - Recursively scans the project directory
   - Categorizes each file based on patterns
   - Calculates total size and cleanup potential

2. **Planning Phase**
   - Groups files by category
   - Shows detailed cleanup plan
   - Displays space savings

3. **Execution Phase** (if not dry-run)
   - Moves archive files to `.old` directory
   - Deletes temporary/build artifacts
   - Tracks progress with visual indicators
   - Creates backup for undo capability

4. **Reporting Phase**
   - Shows number of files moved/deleted
   - Reports any errors encountered
   - Displays total space saved
   - Saves backup file location

## Safety Features

- **Dry Run by Default**: Use `--dry-run` to preview changes
- **Interactive Confirmation**: Use `--interactive` for prompts
- **Automatic Backups**: Creates backup file for undo operations
- **Collision Prevention**: Renames files if they already exist in `.old`
- **Error Handling**: Continues on errors and reports them at the end

## Best Practices

1. Always run `cleanup:dry` first to preview changes
2. Use interactive mode for important cleanups
3. Keep backup files until you're sure the cleanup was correct
4. Review the "Files Needing Review" section carefully
5. Add important patterns to the essential list if needed

## Customization

To customize file patterns, edit the `patterns` object in `src/agents/cleanup-agent.ts`:

```typescript
private readonly patterns = {
  essential: [
    // Add patterns for files to always keep
  ],
  archive: [
    // Add patterns for files to move to .old
  ],
  delete: [
    // Add patterns for files to delete
  ],
  review: [
    // Add patterns for files needing review
  ]
};
```

## Integration with CI/CD

The cleanup agent can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Cleanup Project
  run: |
    npm run cleanup:dry
    # Or for actual cleanup (be careful!)
    # npm run cleanup
```

## Troubleshooting

### Files Not Being Categorized Correctly
- Check the patterns in the agent code
- Files in `src/` are always considered essential
- Use review category for uncertain files

### Cleanup Fails
- Check file permissions
- Ensure `.old` directory can be created
- Review error messages in the output

### Need to Restore Files
- Use the backup file created during cleanup
- Run with `--undo=<backup-file>` option
- Note: Deleted files cannot be restored