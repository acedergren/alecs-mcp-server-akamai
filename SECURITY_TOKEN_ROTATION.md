# SECURITY NOTICE: SonarQube Token Rotation Required

## Security Issue Identified
A SonarQube API token was found hardcoded in multiple files within the repository. This token has been exposed in the git history and must be considered compromised.

## Affected Token
- Token prefix: `e9fdedf9151f453ea2f4922c49466dd6b7a9387b` (now removed)
- Service: SonarCloud
- Organization: acedergren

## Immediate Actions Required

1. **Revoke the exposed token immediately**:
   - Go to https://sonarcloud.io/account/security
   - Find the compromised token and revoke it
   - Generate a new token

2. **Update environment variables**:
   ```bash
   export SONARQUBE_TOKEN="your-new-token-here"
   ```

3. **Update .env file** (if using one):
   ```
   SONARCLOUD_TOKEN=your-new-token-here
   ```

## Files Fixed
The following files have been updated to remove the hardcoded token:
- `.mcp.json`
- `scripts/sonarcloud-mcp-config.json`
- `scripts/test-sonarqube-docker.sh`
- `scripts/sonarqube-api-test.ts`
- `scripts/sonarqube-mcp-wrapper.js`
- `scripts/test-sonarqube-connection.ts`
- `scripts/SONARCLOUD_SETUP_COMPLETE.md`

## Prevention Measures
1. Always use environment variables for sensitive data
2. Never commit tokens, keys, or passwords to version control
3. Use `.env` files and ensure they are in `.gitignore`
4. Regularly audit code for exposed secrets
5. Consider using tools like `git-secrets` or `truffleHog` for automated scanning

## Verification
After rotating the token, verify the new token works:
```bash
# Test the new token
export SONARQUBE_TOKEN="your-new-token-here"
npm run sonarcloud:validate
```