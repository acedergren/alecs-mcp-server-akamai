# Branch Cleanup Plan - June 28, 2025

## 🎯 Executive Summary

The repository currently has 25 remote branches, many of which are merged or stale. This cleanup will reduce to ~5 active branches.

## ✅ Phase 1: Delete Merged Branches (Safe)

These branches have been merged and can be safely deleted:

```bash
# Run these commands to clean up merged branches
git push origin --delete feat/dns-tools-code-kai-microfixes
git push origin --delete acedergren-patch-3
git push origin --delete fix/v1.5.1-property-timeout-patch
git push origin --delete feat/cicd-improvements
git push origin --delete feat/websocket-remote-access
git push origin --delete feat/remote-access-security
git push origin --delete acedergren-patch-2
git push origin --delete project-restructure
git push origin --delete feat/tree-view-properties
```

## 📋 Phase 2: PR Priority Actions

1. **PR #47 (Release v1.6.0)**
   - Status: Ready for merge
   - Action: Review and merge ASAP
   - Impact: Completes CODE KAI transformation

2. **PR #44 (Beta 2 Readiness)**
   - Status: May conflict with v1.6.0 approach
   - Action: Review after v1.6.0 merge, possibly close
   - Reason: v1.6.0 achieves many Beta 2 goals

3. **PR #40, #37 (Dependabot)**
   - Status: Minor updates
   - Action: Merge after main work complete

## 🔍 Phase 3: Investigate Stale Branches

### Likely Safe to Delete:
```bash
# Old Docker update branches (automated)
git push origin --delete update-docker-version-1.3.3
git push origin --delete update-docker-version-1.3.5.1
git push origin --delete update-docker-version-1.4.0
git push origin --delete update-docker-version-1.4.3

# Old GitHub Actions branches (automated)
git push origin --delete add-claude-github-actions-1750116298950
git push origin --delete add-claude-github-actions-1750116299082
git push origin --delete add-claude-github-actions-1750230681384

# Old work branches
git push origin --delete pr-33  # From June 20
git push origin --delete acedergren-patch-1  # Check first
```

### Needs Investigation:
- `task-2-typescript-hardening` - Might be superseded by v1.6.0
- `feat/tool-consolidation-v2` - Check if still relevant
- `feat/update-docker-infrastructure` - Check status

## 🎯 Final State Goal

After cleanup, we should have:
- `main` - Production branch
- `release/v1.6.0` - Current release (merge soon)
- `feat/beta2-readiness-planning` - Keep if still relevant
- 2-3 other active feature branches max

## 📊 Impact

- **Before**: 25 branches (cluttered, confusing)
- **After**: ~5 branches (clean, focused)
- **Benefit**: Easier navigation, clearer development focus

## 🚀 Execution Order

1. First: Merge PR #47 (v1.6.0)
2. Then: Run Phase 1 cleanup commands
3. Next: Review and handle other PRs
4. Finally: Clean up remaining stale branches

This will give us a clean, maintainable repository structure!