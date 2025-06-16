# GitHub Branch Protection Implementation

## Required Branch Protection Rules for `main`

### 1. Pull Request Requirements
- Require pull requests before merging
- Require at least 1 approval from code owners
- Dismiss stale reviews when new commits are pushed
- Require review from code owners

### 2. Status Check Requirements
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Required status checks:
  - `ci` (GitHub Actions CI workflow)
  - `test` (Test suite completion)
  - `build` (Build verification)
  - `lint` (Code quality checks)

### 3. Restrictions
- Restrict pushes that create files over 100MB
- Do not allow force pushes
- Do not allow deletions
- Include administrators in these restrictions

### 4. Additional Rules
- Require signed commits
- Require conversation resolution before merging
- Require linear history

## Implementation Steps

1. Navigate to: https://github.com/[username]/Akamai-MCP/settings/branches
2. Click "Add rule" 
3. Branch name pattern: `main`
4. Enable all protections listed above
5. Save changes

## Code Owners File
Create `.github/CODEOWNERS` to define review requirements.