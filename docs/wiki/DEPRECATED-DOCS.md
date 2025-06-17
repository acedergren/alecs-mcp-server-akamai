# Deprecated Documentation

This file tracks documentation that should be deprecated or consolidated into the new wiki structure.

## Files to Deprecate

### Redundant/Outdated Files

1. **IMPLEMENTATION_SUMMARY.md** - Outdated implementation details
   - Content moved to: wiki/Home.md and Architecture Overview

2. **IMPLEMENTATION-STATUS.md** - Old task tracking
   - No longer needed, project is complete

3. **MCP_TEST_SUITE_SUMMARY.md** - Test implementation details
   - Content moved to: wiki/contributor-guide/Testing-Guide.md

4. **Test-Execution-Plan.md** - Old test planning
   - Superseded by Testing Guide

5. **cleanup-agent.md** - Internal development notes
   - Not relevant for users

6. **akamai-api-activation-research.md** - Research notes
   - Internal only, move to development notes

7. **property-activation-assessment.md** - Planning document
   - Implementation complete, no longer needed

8. **dns-zone-activation-assessment.md** - Planning document
   - Implementation complete, no longer needed

9. **secure-property-onboarding-analysis.md** - Analysis document
   - Content integrated into guides

10. **papi-coverage-analysis.md** - API analysis
    - Internal reference only

11. **papi-endpoints-inventory.md** - API inventory
    - Internal reference only

### Files to Consolidate

1. **Property Manager Guides** (merge into wiki/modules/Property-Manager.md):
   - Property-Manager-Operations-Guide.md
   - Property-Manager-Advanced-Guide.md
   - Advanced-Property-Activation-Guide.md
   - Edge-Hostname-Management-Guide.md

2. **DNS Guides** (merge into wiki/modules/Edge-DNS.md):
   - DNS-Operations-Guide.md
   - dns-migration-guide.md
   - edgedns-changelist-handling.md

3. **Certificate Guides** (merge into wiki/modules/CPS-Certificates.md):
   - certificates-dns-apis.md
   - Part of cdn-provisioning-guide.md

4. **FastPurge Guides** (merge into wiki/modules/Fast-Purge.md):
   - FastPurge-Operations-Guide.md
   - FastPurge-Service-Guide.md

5. **Setup Guides** (merge into wiki/user-guide/):
   - MVP-Setup.md → Quick-Start-Tutorial.md
   - Configuration-Guide.md → Configuration-Guide.md
   - docker-guide.md → Installation-Guide.md

## Files to Keep (Renamed/Moved)

1. **features-overview.md** → wiki/Home.md (integrated)
2. **complete-function-reference.md** → wiki/api-reference/
3. **multi-customer-architecture.md** → wiki/technical-reference/Multi-Customer-Architecture.md
4. **llm-compatibility-guide.md** → wiki/technical-reference/LLM-Compatibility.md
5. **comprehensive-testing-strategy.md** → wiki/contributor-guide/Testing-Guide.md
6. **observability-guide.md** → wiki/technical-reference/Observability.md

## Migration Plan

### Phase 1: Create New Structure ✅
- Created wiki/ directory
- Created category folders
- Created initial documents

### Phase 2: Content Migration
1. Copy relevant content from old docs to new structure
2. Update internal links
3. Improve formatting and organization
4. Add missing sections

### Phase 3: Deprecation
1. Move deprecated files to docs/archive/
2. Update README to point to wiki/
3. Update any external references

### Phase 4: Cleanup
1. Remove archived files after 30 days
2. Update CI/CD to use new docs
3. Final review and polish

## Content Mapping

| Old File | New Location | Status |
|----------|--------------|--------|
| IMPLEMENTATION_SUMMARY.md | wiki/Home.md | Pending |
| Property-Manager-*.md | wiki/modules/Property-Manager.md | Pending |
| DNS-Operations-Guide.md | wiki/modules/Edge-DNS.md | Pending |
| FastPurge-*.md | wiki/modules/Fast-Purge.md | Pending |
| certificates-dns-apis.md | wiki/modules/CPS-Certificates.md | Pending |
| Configuration-Guide.md | wiki/user-guide/Configuration-Guide.md | Complete |
| docker-guide.md | wiki/user-guide/Installation-Guide.md | Pending |
| multi-customer-architecture.md | wiki/technical-reference/Multi-Customer.md | Pending |

## Notes

- Keep research and analysis docs in a separate archive for historical reference
- Ensure all code examples are tested and up-to-date
- Add more visual diagrams to new documentation
- Include troubleshooting sections in each guide
- Add version compatibility information

---

*This document will be removed once migration is complete.*

*Last Updated: January 2025*