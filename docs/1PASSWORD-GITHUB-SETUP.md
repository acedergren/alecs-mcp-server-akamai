# 1Password Integration with GitHub Actions

This guide explains how to set up secure credential management using 1Password for authentication
testing in GitHub Actions.

## Overview

The ALECS MCP Server requires Akamai EdgeRC credentials for API authentication. Using 1Password as a
secrets manager provides:

- **Centralized credential management**
- **Automatic credential rotation**
- **Audit logging**
- **Secure access control**
- **Environment-specific credentials**

## Prerequisites

1. **1Password Business or Enterprise account**
2. **GitHub repository with Actions enabled**
3. **Akamai EdgeRC credentials** (staging and production)
4. **Repository admin access** for secrets configuration

## 1Password Setup

### Step 1: Create 1Password Vaults

Create separate vaults for different environments:

```
📁 akamai-credentials-staging
📁 akamai-credentials-production
📁 oauth-credentials-staging
📁 oauth-credentials-production
```

### Step 2: Store Akamai EdgeRC Credentials

For each environment (staging/production), create an item with these fields:

**Item Name**: `akamai-edgerc-{environment}`

**Fields**:

- `client_token` - Your Akamai client token
- `client_secret` - Your Akamai client secret
- `access_token` - Your Akamai access token
- `host` - Your Akamai host (e.g., akab-xxx.luna.akamaiapis.net)
- `account_switch_key` - Your account switch key (if applicable)

**1Password Reference Format**:

```
op://akamai-credentials/staging/client_token
op://akamai-credentials/staging/client_secret
op://akamai-credentials/staging/access_token
op://akamai-credentials/staging/host
op://akamai-credentials/staging/account_switch_key
```

### Step 3: Store OAuth Credentials (Optional)

If using OAuth integration:

**Item Name**: `oauth-config-{environment}`

**Fields**:

- `client_id` - OAuth client ID
- `client_secret` - OAuth client secret
- `introspection_endpoint` - OAuth token introspection endpoint

### Step 4: Create Service Account

1. Go to **1Password Business Console** → **Integrations** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `github-actions-alecs-mcp`
4. Grant access to your credential vaults:
   - `akamai-credentials` (Read access)
   - `oauth-credentials` (Read access)
5. Save the **Service Account Token** securely

## GitHub Repository Setup

### Step 1: Add Repository Secrets

Go to **Settings** → **Secrets and variables** → **Actions**

Add these repository secrets:

#### Required Secrets:

- `OP_SERVICE_ACCOUNT_TOKEN` - Your 1Password service account token

#### Optional Secrets (for enhanced security):

- `ANTHROPIC_API_KEY` - For Claude Code integration

### Step 2: Create Environments

Go to **Settings** → **Environments**

Create environments:

- **staging** - For staging/development testing
- **production** - For production validation (optional)

Configure environment protection rules as needed.

## Workflow Configuration

The authentication workflow (`.github/workflows/auth-integration-test.yml`) will:

1. **Load credentials** from 1Password using the service account
2. **Create .edgerc file** with environment-specific credentials
3. **Run authentication tests** with real Akamai API calls
4. **Test OAuth integration** (if configured)
5. **Clean up credentials** after testing

### Triggering the Workflow

**Automatic triggers**:

- Push to `main` or `develop` branches
- Pull requests to `main`
- Daily scheduled run (2 AM UTC)

**Manual triggers**:

```bash
# Via GitHub CLI
gh workflow run auth-integration-test.yml -f test_environment=staging

# Via GitHub web interface
Actions → Authentication Integration Tests → Run workflow
```

## Security Best Practices

### 1. Principle of Least Privilege

- Service account has **read-only** access to credential vaults
- Separate environments with different access levels
- Regular audit of access logs

### 2. Credential Rotation

- Rotate Akamai credentials regularly (quarterly recommended)
- Update 1Password items, workflow automatically uses new credentials
- Test credential rotation in staging first

### 3. Monitoring and Alerts

- Enable 1Password audit logging
- Monitor GitHub Actions for authentication failures
- Set up alerts for credential access anomalies

### 4. Environment Isolation

- Use different Akamai accounts for staging vs production
- Separate 1Password vaults prevent cross-environment access
- Different service account tokens for different repositories

## Testing the Setup

### Step 1: Validate 1Password Integration

Test credential access locally (requires 1Password CLI):

```bash
# Install 1Password CLI
# macOS: brew install 1password-cli
# Other: https://developer.1password.com/docs/cli/get-started/

# Sign in to your account
op signin

# Test credential retrieval
op read "op://akamai-credentials/staging/client_token"
```

### Step 2: Test GitHub Actions Workflow

1. **Push a test change** to trigger the workflow
2. **Check Actions tab** for workflow execution
3. **Review logs** for authentication success/failure
4. **Verify .edgerc creation** and credential masking in logs

### Step 3: Validate Authentication

The workflow tests multiple authentication scenarios:

✅ **EdgeRC file creation** from 1Password secrets  
✅ **Akamai API authentication** (list properties)  
✅ **OAuth integration** (if configured)  
✅ **Docker build** with authentication  
✅ **Graceful failure** handling (no credentials)

## Troubleshooting

### Common Issues

#### 1. "Service account token invalid"

- **Cause**: Token expired or incorrect
- **Solution**: Regenerate token in 1Password console, update GitHub secret

#### 2. "Item not found in vault"

- **Cause**: Incorrect 1Password reference path
- **Solution**: Verify vault name and item field names match exactly

#### 3. "Authentication failed (401)"

- **Cause**: Invalid Akamai credentials
- **Solution**: Verify credentials in 1Password, test manually with EdgeGrid

#### 4. "Section not found in .edgerc"

- **Cause**: Missing environment section in .edgerc
- **Solution**: Check workflow environment parameter matches your setup

### Debug Steps

1. **Check 1Password access logs** in Admin Console
2. **Review GitHub Actions logs** for credential loading
3. **Verify environment variables** are set correctly
4. **Test credentials manually** using Akamai CLI or curl

### Support Resources

- **1Password Developer Docs**: https://developer.1password.com/docs/
- **Akamai EdgeGrid Docs**: https://techdocs.akamai.com/developer/docs/
- **GitHub Actions Docs**: https://docs.github.com/en/actions

## Maintenance

### Monthly Tasks

- [ ] Review 1Password access logs
- [ ] Check for credential rotation reminders
- [ ] Validate authentication test results

### Quarterly Tasks

- [ ] Rotate Akamai credentials
- [ ] Review service account permissions
- [ ] Audit environment configurations
- [ ] Update workflow if needed

---

**⚠️ Security Note**: Never commit actual credentials to version control. Always use 1Password or
GitHub Secrets for sensitive data.
