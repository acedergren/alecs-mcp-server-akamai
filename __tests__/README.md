# ALECS Test Strategy - KISS KAIZEN

## Philosophy
**Test what matters, skip the theater.**

We follow a pragmatic testing approach optimized for solo development:
- Fast feedback (< 2 min test runs)
- Low maintenance (no flaky tests)
- Clear failures (what broke?)
- Easy fixes (no mock hell)

## Test Structure

### 🚀 Smoke Tests (`__tests__/smoke/`)
Basic "does it work at all?" tests:
- Can it build?
- Do imports work?
- Can the server start?

**Run:** `npm run test:smoke`

### 🎯 Critical Path Tests (`__tests__/critical/`)
What customers actually use:
- List properties
- Create property
- DNS CRUD operations
- FastPurge requests

**Run:** `npm run test:critical`

### 🏃 CI Tests (Smoke + Critical)
What runs in GitHub Actions:
- All smoke tests
- All critical path tests
- Takes < 2 minutes

**Run:** `npm test` or `npm run test:ci`

### 📚 Full Test Suite
Everything including unit, integration, e2e:
- For major releases only
- Includes experimental tests
- May have failures

**Run:** `npm run test:full`

## Writing New Tests

### When to Write Tests
✅ Write a test when:
- You fix a bug (regression test)
- You're scared to change some code
- It's a critical user path
- The logic is complex

❌ Skip tests for:
- Simple CRUD operations
- Type checking (TypeScript does this)
- Mock behavior
- UI/formatting

### Test Template
```typescript
// __tests__/critical/feature-name.test.ts
describe('Critical: Feature Name', () => {
  it('should do the main thing users need', async () => {
    // Arrange: minimal setup
    const input = { simple: 'data' };
    
    // Act: call the function
    const result = await doThing(input);
    
    // Assert: did it work?
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
```

## Mocking Strategy

Keep mocks simple:
```typescript
// Mock only what you need
jest.mock('../../src/akamai-client', () => ({
  AkamaiClient: jest.fn(() => ({
    request: jest.fn(() => Promise.resolve({ data: 'mocked' }))
  }))
}));
```

## Running Tests

```bash
# For development (fast, focused)
npm test              # CI tests only
npm run test:watch    # Watch mode

# For debugging
npm run test:smoke    # Just smoke tests
npm run test:critical # Just critical paths

# For releases
npm run test:full     # Everything
```

## Maintenance

### Monthly Cleanup
1. Delete tests that haven't been useful
2. Fix or remove skipped tests
3. Update mocks if API changes

### When Tests Fail
1. Is it a real failure? Fix the code
2. Is the test outdated? Update or delete
3. Is it flaky? Delete it

## Coverage

We don't chase coverage numbers. Instead:
- TypeScript catches type errors
- Smoke tests catch build issues
- Critical tests catch user-facing bugs
- That's enough for a solo project

## FAQ

**Q: Why so few tests?**
A: Because you're one person, not Google.

**Q: What about TDD?**
A: Great for complex algorithms, overkill for CRUD.

**Q: Should I add more unit tests?**
A: Only if you've had bugs there before.

**Q: What about E2E tests?**
A: One good E2E > 50 unit tests. We have a few.