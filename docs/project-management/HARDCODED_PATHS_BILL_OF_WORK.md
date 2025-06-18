# Bill of Work: Hardcoded Paths Remediation

## Project: ALECS MCP Server Path Portability
**Date**: June 18, 2025  
**Priority**: High  
**Estimated Total Effort**: 4-6 hours

## Work Items

### 1. Script Path Remediation
**Effort**: 1 hour  
**Priority**: Critical  
**Files**: 1 file

| Task | File | Description | Effort |
|------|------|-------------|--------|
| Fix shell script paths | `examples/scripts/send-mcp-command.sh` | Replace absolute path with relative path detection | 30 min |
| Test script portability | - | Verify script works from any location | 15 min |
| Add error handling | - | Add checks for file existence and helpful errors | 15 min |

### 2. Documentation Path Updates
**Effort**: 2-3 hours  
**Priority**: High  
**Files**: 5+ documentation files

| Task | Files | Description | Effort |
|------|-------|-------------|--------|
| Update MCP Usage Guide | `docs/guides/setup/MCP_USAGE_GUIDE.md` | Replace `/home/alex/` with portable examples | 30 min |
| Update Claude Setup Guides | `CLAUDE_CODE-SETUP.md`, `CLAUDE_DESKTOP_SETUP.md` | Replace `/Users/acedergr/` paths | 45 min |
| Update Architecture Docs | `multi-customer-architecture.md` | Fix user-specific paths | 20 min |
| Update Demo Guide | `mcp-onboarding-demo.md` | Fix `.edgerc` path references | 15 min |
| Review all docs | All `.md` files | Final sweep for missed paths | 30 min |

### 3. Prevention Infrastructure
**Effort**: 1-2 hours  
**Priority**: Medium  
**Deliverables**: Scripts and hooks

| Task | Description | Effort |
|------|-------------|--------|
| Create path checker script | Script to detect hardcoded paths | 30 min |
| Add pre-commit hook | Git hook to prevent new hardcoded paths | 30 min |
| Add CI/CD check | GitHub Action for path validation | 30 min |
| Documentation | Update contributing guide with path guidelines | 15 min |

### 4. Testing & Validation
**Effort**: 30 minutes  
**Priority**: High  

| Task | Description | Effort |
|------|-------------|--------|
| Cross-platform testing | Test on Mac, Linux, Windows WSL | 15 min |
| Documentation walkthrough | Verify all examples work | 15 min |

## Deliverables

1. **Updated Script**
   - `send-mcp-command.sh` with portable path resolution
   
2. **Updated Documentation** (5 files minimum)
   - All user-specific paths replaced with placeholders
   - Consistent placeholder usage across docs
   
3. **Prevention Tools**
   - `scripts/check-hardcoded-paths.sh` - Detection script
   - `.git/hooks/pre-commit` - Git hook
   - `.github/workflows/path-check.yml` - CI/CD check
   
4. **Guidelines Document**
   - `docs/project-management/PATH_GUIDELINES.md`

## Success Metrics

- [ ] Zero hardcoded absolute paths in codebase
- [ ] All scripts work regardless of clone location
- [ ] Documentation uses only portable path examples
- [ ] Automated checks prevent future issues
- [ ] Successfully tested on 3 different environments

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing workflows | High | Test thoroughly, keep backups |
| Missing hidden paths | Medium | Use multiple search methods |
| Platform differences | Low | Test on all major platforms |

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Script fixes | 1 hour | None |
| Documentation updates | 2-3 hours | Script fixes complete |
| Prevention tools | 1-2 hours | None |
| Testing | 30 minutes | All updates complete |

**Total Timeline**: Half day of focused work

## Cost Estimate

Based on standard development rates:
- **Junior Developer**: $50/hour × 5 hours = $250
- **Senior Developer**: $100/hour × 5 hours = $500
- **Recommended**: Mid-level developer can complete in 4-6 hours

## Notes

1. This work should be completed before any major release
2. Consider adding to release checklist
3. May discover additional files during implementation
4. Budget includes 20% buffer for unexpected issues