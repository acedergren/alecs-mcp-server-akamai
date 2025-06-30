# Elicitation Tools Release Decision

## Recommendation: REMOVE FROM RELEASE

### Why Remove Rather Than Fix:

1. **Time Constraint**: Release is today - insufficient time for proper fixes
2. **Fundamental Design Issues**: These aren't bugs, they're architectural problems requiring redesign
3. **Risk to Users**: 
   - Incomplete security implementation could be dangerous
   - LLMs might trigger unintended destructive operations
   - Error handling could cause confusing failures
4. **Brand Protection**: Better to ship fewer, solid tools than broken ones

### Critical Issues That Can't Be Fixed Today:

1. **Stateful Design**: Requires complete architectural change
2. **8 `any` types**: Proper typing needs careful API analysis
3. **Stub Implementations**: Security config is fake - this is dangerous
4. **No Error Handling**: Integration with centralized system takes time
5. **LLM Incompatibility**: Interactive prompting won't work with Claude Desktop

### Quick Removal Steps:

```bash
# 1. Remove from tool registry
# Remove entries from src/tools/all-tools-registry.ts

# 2. Remove tool files
rm -rf src/tools/elicitation/

# 3. Remove from exports
# Update src/tools/index.ts to remove elicitation exports

# 4. Update tests if any reference these tools
```

### Alternative Approach:

Instead of elicitation tools, users can use the existing discrete tools:
- `dns.record.create` / `dns.record.update` / `dns.record.delete`
- `property.create` + `property.hostname.add` + `property.activate`

These existing tools are stateless and LLM-compatible.

### Future Sprint Plan:

1. Redesign as stateless, single-operation tools
2. Implement proper type safety
3. Complete all implementations (no stubs)
4. Add comprehensive error handling
5. Test with Claude Desktop before release

## Decision Impact:

**If Released As-Is:**
- High risk of user frustration
- Support burden from confused LLM behavior  
- Potential for accidental destructive operations
- Reputational damage from shipping incomplete features

**If Removed:**
- Clean, working release
- No broken features
- Can properly design and implement in future sprint
- Maintains quality standards

## Recommendation: DELETE NOW, REDESIGN LATER