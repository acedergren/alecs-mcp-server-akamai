# GitHub Repository Rulesets

This directory contains GitHub repository ruleset configurations for branch protection and repository governance.

## Main Branch Protection Ruleset

**File**: `main-branch-protection.json`

### Protection Features

✅ **Pull Request Requirements**
- Minimum 1 approval required
- Code owner review required (see `.github/CODEOWNERS`)
- Dismiss stale reviews on new commits
- Require conversation resolution

✅ **Status Check Requirements**
- `test` - Full test suite execution
- `lint` - Code quality and TypeScript validation
- `security` - Security audit and secret scanning  
- `docker-build` - Docker image build verification
- Strict policy: branches must be up-to-date

✅ **Push Restrictions**
- No force pushes (non-fast-forward protection)
- No branch deletion
- No direct updates to main
- Linear history required

### Usage

#### Option 1: Automated Setup
```bash
# Requires GitHub token with "repo" and "administration:write" scopes
export GITHUB_TOKEN="your_token_here"
node scripts/create-github-ruleset.js
```

#### Option 2: Manual Setup
1. Go to: https://github.com/acedergren/alecs-mcp-server-akamai/settings/rules
2. Click "New repository rule"
3. Upload or copy the JSON configuration from `main-branch-protection.json`
4. Activate the ruleset

### Verification

After setup, test the protection:

```bash
# This should be BLOCKED:
echo "test" > test.txt
git add test.txt
git commit -m "test direct push"
git push origin main  # Protection should prevent this
```

### Ruleset vs Branch Protection Rules

**Rulesets** (Recommended - Modern Approach):
- More flexible and powerful
- Can apply to multiple branches with patterns
- Better inheritance and override capabilities
- Support for more rule types
- Organization-level policies

**Branch Protection Rules** (Legacy):
- Simpler but less flexible
- Per-branch configuration
- Limited rule types
- Being phased out in favor of rulesets

### Troubleshooting

**Common Issues:**
- **403 Forbidden**: Token needs "administration:write" scope
- **422 Validation**: Status checks may not exist yet
- **Ruleset Not Active**: Check enforcement is set to "active"

**Status Check Dependencies:**
The ruleset requires these GitHub Actions workflows:
- `.github/workflows/ci.yml` (provides: test, lint, security, docker-build)

If status checks don't exist, create the corresponding workflows or remove them from the ruleset configuration.

### Customization

To modify the ruleset:
1. Edit `main-branch-protection.json`
2. Run the setup script to apply changes
3. Or manually update via GitHub UI

### Security Notes

- Rulesets apply to all users, including administrators
- No bypass actors configured for maximum security
- Code owners defined in `.github/CODEOWNERS`
- All changes require proper review workflow