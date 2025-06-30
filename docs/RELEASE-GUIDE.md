# Release Guide for ALECS MCP Server

This guide covers the release process for publishing new versions of ALECS to npm and Docker registries.

## Prerequisites

1. **Repository Secrets Required**:
   - `NPM_TOKEN` - Authentication token for npm publishing
   - `GITHUB_TOKEN` - Automatically provided by GitHub Actions

2. **Permissions**:
   - Write access to the repository
   - Package publishing permissions on npm (@acedergren scope)

## Release Process

### 1. Pre-Release Checklist

Run the pre-release workflow to ensure everything is ready:

```bash
# From GitHub UI:
# Actions → Pre-Release Checklist → Run workflow
```

This checks:
- ✅ TypeScript compilation
- ✅ Linting passes
- ✅ All tests pass
- ✅ Build succeeds
- ✅ Package files are correct
- ✅ Docker images build
- ✅ NPM credentials configured

### 2. Choose Version Type

Decide on the version bump:
- **patch** (1.6.2 → 1.6.3) - Bug fixes, minor updates
- **minor** (1.6.2 → 1.7.0) - New features, backwards compatible
- **major** (1.6.2 → 2.0.0) - Breaking changes
- **prerelease** (1.6.2 → 1.7.0-rc.1) - Release candidate

### 3. Run Release Workflow

1. Go to GitHub Actions
2. Select "Release & Publish" workflow
3. Click "Run workflow"
4. Select version type
5. For prereleases, specify tag (rc, beta, alpha)
6. Click "Run workflow"

### 4. What Happens

The workflow automatically:

1. **Tests & Build**
   - Runs all tests
   - Builds TypeScript
   - Verifies package integrity

2. **Version Management**
   - Bumps version in package.json
   - Creates git tag
   - Pushes changes to main branch

3. **GitHub Release**
   - Creates release with changelog
   - Marks prereleases appropriately

4. **Docker Publishing**
   - Builds all Docker images:
     - `ghcr.io/acedergren/alecs-mcp-server-akamai:latest`
     - `ghcr.io/acedergren/alecs-mcp-server-akamai:modular-latest`
     - `ghcr.io/acedergren/alecs-mcp-server-akamai:full-latest`
     - Plus version-specific tags
   - Pushes to GitHub Container Registry

5. **NPM Publishing**
   - Publishes to npm registry
   - Uses `next` tag for prereleases
   - Includes provenance attestation

### 5. Post-Release Verification

After release completes:

1. **Check npm**:
   ```bash
   npm view alecs-mcp-server-akamai@latest
   # For prereleases:
   npm view alecs-mcp-server-akamai@next
   ```

2. **Test installation**:
   ```bash
   npm install -g alecs-mcp-server-akamai@latest
   alecs --version
   ```

3. **Verify Docker images**:
   ```bash
   docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:latest
   docker pull ghcr.io/acedergren/alecs-mcp-server-akamai:modular-latest
   ```

4. **Check GitHub Release**:
   - Visit https://github.com/acedergren/alecs-mcp-server-akamai/releases
   - Verify release notes and assets

## Manual Release (If Needed)

If the automated workflow fails, you can release manually:

### 1. Bump Version
```bash
# For regular release
npm version patch/minor/major

# For prerelease
npm version prerelease --preid=rc
```

### 2. Push Changes
```bash
git push origin main
git push --tags
```

### 3. Build and Test
```bash
npm ci
npm test
npm run build
```

### 4. Publish to npm
```bash
# Set npm token
npm config set //registry.npmjs.org/:_authToken $NPM_TOKEN

# Publish
npm publish --access public

# For prereleases
npm publish --tag next --access public
```

### 5. Build and Push Docker Images
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USER --password-stdin

# Build images
make docker-build

# Tag images
VERSION=$(node -p "require('./package.json').version")
docker tag alecs-mcp-server-akamai:latest ghcr.io/acedergren/alecs-mcp-server-akamai:$VERSION
docker tag alecs-mcp-server-akamai:latest ghcr.io/acedergren/alecs-mcp-server-akamai:latest

# Push images
docker push ghcr.io/acedergren/alecs-mcp-server-akamai:$VERSION
docker push ghcr.io/acedergren/alecs-mcp-server-akamai:latest
```

### 6. Create GitHub Release
```bash
gh release create v$VERSION \
  --title "v$VERSION" \
  --notes "Release v$VERSION" \
  --target main
```

## Troubleshooting

### NPM Publishing Fails

1. **401 Unauthorized**:
   - Check NPM_TOKEN is valid
   - Regenerate token at npmjs.com
   - Update GitHub secret

2. **403 Forbidden**:
   - Check package name availability
   - Verify npm account permissions

### Docker Push Fails

1. **Permission denied**:
   - Ensure packages are public in GitHub settings
   - Check GITHUB_TOKEN permissions

2. **Image not found**:
   - Verify build succeeded
   - Check image tags are correct

### Version Already Exists

If version was bumped but publish failed:
```bash
# Revert local changes
git reset --hard HEAD~1
git tag -d v$VERSION

# Push revert
git push --force origin main
git push origin :refs/tags/v$VERSION

# Start release process again
```

## Security Notes

- NPM_TOKEN should have minimal required permissions
- Use npm token with publish-only scope
- Rotate tokens regularly
- Enable 2FA on npm account
- Review package contents before publishing

## Release Schedule

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly or when features ready
- **Major releases**: Planned with migration guides
- **Prereleases**: Before minor/major for testing