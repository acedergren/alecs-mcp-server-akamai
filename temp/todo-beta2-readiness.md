# ALECS MCP Server Beta 2 Readiness Todo List

## Priority 1: Critical MCP Protocol Fixes (Must Have for Beta 2)

### 1.1 Fix MCP Protocol Compliance
- [x] Replace simplified `zodSchemaToJsonSchema` with proper `zod-to-json-schema` library
- [ ] Fix 4 failing MCP test suites compilation issues
- [ ] Ensure JSON Schema Draft 7 compliance
- [ ] Add proper MCP error code handling
- [ ] Validate all tool schemas against MCP spec

### 1.2 Fix Critical MCP-Akamai Integration Issues (NEW - HIGH PRIORITY)
- [x] Fix response format double-encoding (remove JSON.stringify wrapper)
- [x] Ensure tools return content array directly without extra wrapping
- [x] Map Akamai error codes to proper MCP error codes
- [x] Add progress token support for long-running operations (activations)
- [x] Fix tool discovery by removing dynamic imports early in flow

### 1.3 Fix Performance Issues
- [x] Remove dynamic imports in tool handlers (move AkamaiClient to constructor)
- [x] Add connection pooling for API requests
- [x] Implement proper async/await patterns (remove blocking operations)
- [x] Add message queue bounds to prevent memory leaks
- [x] Optimize tool response serialization

### 1.4 Fix Type Safety
- [x] Replace all `any` types with proper interfaces
- [x] Remove unsafe type casting (`as T`)
- [x] Fix WebSocket client metadata (use WeakMap instead of `_lastRequestId`)
- [x] Add strict TypeScript checks to build process
- [x] Create proper type definitions for all API responses

### 1.5 Security & Stability
- [x] Add rate limiting to all transports (100 req/min default)
- [x] Replace wildcard CORS with configurable allowed origins
- [x] Add message size validation (max 10MB)
- [x] Implement graceful shutdown (replace process.exit)
- [x] Add request timeout handling (30s default)

## Priority 2: Production Readiness

### 2.1 Clean Up Output
- [x] Remove all emoji from production code
- [x] Fix underscore variable naming convention
- [x] Standardize error message format
- [x] Add proper logging levels (debug/info/warn/error)
- [x] Create consistent response formatting
- [ ] Annotate and comment to code so its understandable for a mid-level sofware engineer that needs to dig in to my mess.
- [ ] Create an architectural overview and detailed description of each part of the project and its purpose and workings

### 2.2 Error Handling
- [ ] Implement proper error recovery strategies
- [ ] Add circuit breaker for API calls
- [ ] Create error categorization system
- [ ] Add retry logic with exponential backoff
- [ ] Improve error messages with actionable solutions

### 2.3 Testing Infrastructure
- [x] Fix MCP protocol compliance tests
- [x] Create MCP test client mimicking Claude Desktop
- [ ] Add user journey integration tests
- [ ] Implement load testing suite
- [ ] Add performance benchmarks

## Priority 3: Weight Reduction (Code Cleanup)

### 3.1 Caching Improvements (COMPLETED)
- [x] Refactored to SmartCache as default implementation
- [x] Removed all Valkey/Redis references, made generic "external cache"
- [x] Moved ioredis to optional dependencies
- [x] Enhanced SmartCache with compression, request coalescing, adaptive TTL
- [x] Added cache persistence option
- [x] Implemented negative caching
- [x] Created cache factory with auto-detection

### 3.2 Simplify Architecture
- [ ] Consolidate to 2 entry points: index.ts (minimal) and index-full.ts
- [ ] Remove module aliases (_moduleAliases)
- [ ] Reduce npm scripts from 112 to ~20 essential ones
- [ ] Simplify build process (single tsconfig)
- [ ] Remove unused dependencies

### 3.3 Create Demo Version
- [ ] Create index-demo.ts with just 3 tools
- [ ] Include only: list-properties, get-property, activate-property
- [ ] Minimal dependencies for quick setup
- [ ] Simple configuration (no multi-customer)
- [ ] Clear documentation for demo flow

## Priority 4: Testing & Validation

### 4.1 MCP Client Testing
- [x] Build test client using MCP SDK
- [x] Test tool discovery (list_tools)
- [x] Test parameter validation
- [x] Test error handling
- [x] Test concurrent requests

### 4.2 User Workflow Tests
- [ ] Property deployment end-to-end test
- [ ] DNS configuration workflow test
- [ ] Certificate enrollment workflow test
- [ ] Multi-tool orchestration test
- [ ] Error recovery workflow test

### 4.3 Performance Testing
- [ ] Concurrent client load testing (10+ clients)
- [ ] Memory leak detection tests
- [ ] Response time benchmarks
- [ ] WebSocket stability tests (24hr)
- [ ] Rate limiting validation

### 4.4 Integration Testing
- [x] Claude Desktop compatibility test using mcp-eval
- [x] Remote MCP via WebSocket and via SSE test
- [ ] Multi-customer context switching test
- [x] Authentication flow testing with mcp-eval
- [x] mcp-eval testing for edge cases


## Success Criteria

- [x] All MCP protocol tests passing
- [x] Zero TypeScript errors with strict mode
- [ ] 100%+ test coverage on critical paths
- [ ] Response time <100ms for all tools
- [ ] Memory usage stable over 24hr test
- [x] Successfully tested with Claude Desktop
- [ ] Demo completes in <5 minutes
- [ ] Bundle size reduced by 15%+

## Notes

- Focus on MCP compliance first - it's the blocker
- Keep changes to smaller batches and test and verify in a loop to avoid introducing new bugs, work in systematical and thoughful way. Use manual methods if needed to keep work safe. Dont to stupid stuff, keep a defensive mindset to not introduce new bugs.
- Test with actual Claude Desktop frequently
- Document all breaking changes for migration guide