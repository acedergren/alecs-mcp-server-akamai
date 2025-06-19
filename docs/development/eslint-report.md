# ESLint Report

## Summary

The project currently has **8,861 ESLint errors** that need to be addressed. These are non-breaking
issues that don't affect TypeScript compilation or runtime functionality.

## Categories of Errors

Based on the ESLint configuration, the main categories of errors are:

### 1. **TypeScript-ESLint Rules**

- `@typescript-eslint/no-unused-vars` - Unused variables (warnings for `_` prefixed vars)
- `@typescript-eslint/no-explicit-any` - Explicit use of `any` type
- `@typescript-eslint/explicit-function-return-type` - Missing return type annotations
- `@typescript-eslint/no-floating-promises` - Unhandled promises
- `@typescript-eslint/await-thenable` - Awaiting non-promise values

### 2. **Import Order Issues**

- `import/order` - Imports not properly organized by groups
- Missing blank lines between import groups
- Alphabetization issues within groups

### 3. **Console Usage**

- `no-console` - Use of console.log/console.error (warnings)
- Many files use console.error for logging

### 4. **Code Style**

- `prefer-const` - Variables that should be const
- Indentation and formatting (handled by Prettier)

## Files Excluded from ESLint

The following are properly excluded:

- `dist/**` - Build output
- `node_modules/**` - Dependencies
- `coverage/**` - Test coverage reports
- `*.js` - JavaScript files
- `*.d.ts` - Type declaration files
- `examples/**` - Example files

## Files Causing Issues

The main issues come from:

1. **Test files** - The `__tests__` directory is included in `tsconfig.eslint.json` but tests have
   relaxed rules
2. **Example files** - Recently moved to `examples/` which is excluded in `.eslintrc.json`
3. **Main source files** - Many use `console.error` for logging and have `any` types

## Recommendations

### Short-term (Non-breaking)

1. **Update logging** - Replace console.error with proper logger
2. **Fix import order** - Can be auto-fixed with `npm run lint:fix`
3. **Add missing return types** - Improves code documentation

### Long-term (Potentially breaking)

1. **Remove explicit any** - Replace with proper types or `unknown`
2. **Handle all promises** - Add proper error handling
3. **Clean up unused variables** - Remove or prefix with `_`

## Running ESLint

```bash
# Check all errors
npm run lint

# Auto-fix what's possible
npm run lint:fix

# Check specific file
npx eslint src/index.ts

# Check with specific rule disabled
npx eslint src/index.ts --rule '@typescript-eslint/no-explicit-any: off'
```

## Pre-commit Hook

The project uses Husky for pre-commit hooks which run ESLint. Currently bypassed with `--no-verify`
due to the high error count.

## Next Steps

1. Fix auto-fixable issues first (`npm run lint:fix`)
2. Address console usage by implementing proper logging
3. Gradually fix TypeScript-specific issues file by file
4. Consider adding ESLint disable comments for legitimate uses

## Progress Tracking

- [ ] Fix import order issues (auto-fixable)
- [ ] Replace console.error with logger
- [ ] Add return types to exported functions
- [ ] Remove unnecessary `any` types
- [ ] Handle floating promises
- [ ] Remove unused variables

This is a significant technical debt that should be addressed incrementally to improve code quality
and maintainability.
