You're fixing ALECS (Akamai MCP Server) to production-grade standards. No new features. Pure technical debt elimination with world-class testing and validation.
MISSION: Transform existing ALECS code into bulletproof TypeScript with comprehensive testing
SERIALIZED TASK EXECUTION:
TASK 1: CODE AUDIT & DOCUMENTATION CORRELATION (2 hours)

Inventory all existing TypeScript files and their current technical debt
Map each code issue to relevant Akamai API documentation violations
Create prioritized fix list with specific documentation references
Document current functionality to ensure zero regression during fixes

TASK 2: TYPESCRIPT HARDENING 

Enable strict TypeScript mode, eliminate all any types
Add comprehensive type definitions for all Akamai API responses
Fix all TypeScript errors and warnings with proper typing
Implement proper generic types and interfaces throughout

TASK 3: INPUT VALIDATION & SECURITY 

Replace all manual validation with Zod schema validation
Sanitize all inputs before processing or API calls
Add proper error boundaries that don't leak sensitive information
Secure credential handling using environment variables only

TASK 4: ASYNC/AWAIT CLEANUP 

Convert all callback patterns to modern async/await
Add proper error handling for every async operation
Implement timeout configurations for all external calls
Fix Promise handling and eliminate callback hell

TASK 5: API INTEGRATION OPTIMIZATION (3 hours)

Fix HTTP client implementation with proper connection pooling
Add intelligent retry logic with exponential backoff
Implement proper rate limit handling per Akamai documentation
Clean up API error handling and status code mapping

TASK 6: MEMORY & PERFORMANCE FIXES 

Eliminate memory leaks in event listeners and timers
Fix inefficient data structures and algorithms
Add proper cleanup for all resources
Optimize critical path performance bottlenecks

TASK 7: MCP PROTOCOL COMPLIANCE 

Validate against MCP June 2025 specification exactly
Fix all protocol implementation deviations
Add proper message handling for all MCP types
Ensure backward compatibility with existing clients

TASK 8: COMPREHENSIVE TEST SUITE (4 hours)

Create unit tests covering every function and edge case
Add integration tests for complete Akamai API workflows
Mock all external dependencies properly
Achieve 95%+ meaningful code coverage

TASK 9: ERROR HANDLING & LOGGING

Implement structured logging with correlation IDs
Add proper error categorization and messaging
Create health check endpoints with detailed status
Fix all error propagation patterns

TASK 10: CONFIGURATION & DEPLOYMENT 

Externalize all configuration to environment variables
Add configuration validation at startup
Create Docker containerization with multi-stage builds
Document deployment procedures and requirements

TASK 11: DOCUMENTATION & CODE QUALITY

Generate comprehensive API documentation from code
Add inline documentation for complex logic
Create troubleshooting guide for common issues
Ensure ESLint/Prettier compliance with zero warnings

TASK 12: FINAL VALIDATION & BENCHMARKING

Execute complete test suite with performance validation
Run security vulnerability scans
Validate MCP protocol compliance with official tools
Document performance baselines and operational metrics

QUALITY GATES (Pass/Fail for Each Task):
Code Quality Standards:

Zero TypeScript errors or warnings
Zero ESLint violations
95%+ test coverage with meaningful assertions
All functions properly typed and documented

Performance Requirements:

Sub-200ms response time for API operations
Memory usage stable under continuous load
Zero memory leaks during extended operation
Proper resource cleanup in all code paths

Security Validation:

All inputs validated through schemas
No hardcoded credentials or sensitive data
Proper error handling without information leakage
Secure communication patterns throughout

Akamai Integration Compliance:

API calls follow documented patterns exactly
Authentication implements EdgeGrid specification
Rate limiting respects documented thresholds
Error responses match documented status codes

EXECUTION RULES:

Complete each task fully before moving to next
Validate task completion against quality gates
Document any deviations from existing functionality
Maintain 100% backward compatibility throughout

SUCCESS VALIDATION:

ALECS operates flawlessly under production load
All existing functionality preserved and enhanced
Code quality meets enterprise development standards
Testing provides confidence for production deployment

Each task builds on the previous one. No shortcuts. No "good enough." ALECS becomes the reference implementation for Akamai MCP servers through systematic technical debt elimination.

Start with Task 1. Document findings. Execute systematically. Validate ruthlessly.