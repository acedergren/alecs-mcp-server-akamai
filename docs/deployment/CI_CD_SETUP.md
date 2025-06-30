# ALECS CI/CD Pipeline

**KISS principle applied** - Simple, focused automation that works.

## Workflows

### 1. CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
**Triggers:** Push to main/develop, PRs to main

**Jobs:**
- **Test & Build** - Tests, build, validation
- **Deploy Docs** - Auto-updates documentation (main branch only)

**What happens:**
1. Run tests
2. Build project
3. Validate ALECS tools
4. Update docs with latest stats
5. Commit doc changes (if any)

### 2. Release Pipeline (`.github/workflows/release.yml`)
**Triggers:** GitHub release published

**What happens:**
1. Run deployment hooks
2. Build for production  
3. Create release artifact
4. Upload to GitHub release

## Local Commands

```bash
# Update docs manually
npm run docs:update

# Run deployment hooks
npm run deploy:hooks

# Build (includes doc update)
npm run build
```

## What Gets Auto-Updated

### Documentation Files
- `docs/README.md` - Tool counts, version info
- `docs/architecture/README.md` - Architecture diagrams with current stats
- `docs/api/README.md` - API reference with tool counts

### Content Updated
- Version from package.json
- Tool counts per server (69 total across 5 servers)
- Last updated timestamp
- Architecture diagrams with current numbers

## Output Example

```
🚀 ALECS Deploy
📚 Updating docs...
  docs/README.md
  docs/architecture/README.md
  docs/api/README.md
✅ Docs updated
🔍 Validating ALECS tools...
✅ alecs-property (20 tools)
✅ alecs-dns (15 tools)
✅ alecs-security (15 tools)
✅ alecs-certs (15 tools)
✅ alecs-reporting (4 tools)
📊 69 tools across 5 servers ✅
✅ Deploy complete!
```

## Benefits

- **Always Current** - Docs never get stale
- **Zero Overhead** - Runs automatically
- **Fast** - Completes in seconds
- **Safe** - Only updates what needs updating
- **Simple** - Easy to understand and maintain

## Implementation

- Uses existing npm scripts
- Minimal GitHub Actions setup
- No external dependencies
- Error handling with `set -e`
- Clean, focused output