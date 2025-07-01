#!/bin/bash

# Script to check and publish missing versions to NPM
# CODE KAI: Ensures all tagged versions are available on NPM registry

set -e

echo "🔍 Checking NPM publish status for all versions..."
echo "================================================"

# Get all git tags
ALL_TAGS=$(git tag --list | sort -V)

# Get published NPM versions
NPM_VERSIONS=$(npm view alecs-mcp-server-akamai versions --json 2>/dev/null || echo "[]")

# Function to check if version is published
is_published() {
    local version=$1
    # Remove 'v' prefix if present
    version=${version#v}
    echo "$NPM_VERSIONS" | grep -q "\"$version\""
}

# Check each tag
MISSING_VERSIONS=()
PUBLISHED_VERSIONS=()

for tag in $ALL_TAGS; do
    # Skip beta/rc versions for now
    if [[ $tag =~ (beta|rc) ]]; then
        echo "⏭️  Skipping pre-release: $tag"
        continue
    fi
    
    # Check if published
    if is_published "$tag"; then
        PUBLISHED_VERSIONS+=("$tag")
        echo "✅ Published: $tag"
    else
        MISSING_VERSIONS+=("$tag")
        echo "❌ Missing: $tag"
    fi
done

echo ""
echo "📊 Summary:"
echo "==========="
echo "Published versions: ${#PUBLISHED_VERSIONS[@]}"
echo "Missing versions: ${#MISSING_VERSIONS[@]}"

if [ ${#MISSING_VERSIONS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Missing versions on NPM:"
    printf '%s\n' "${MISSING_VERSIONS[@]}"
    
    echo ""
    echo "To publish missing versions, you would need to:"
    echo "1. Check out each tag"
    echo "2. Update package.json version if needed"
    echo "3. Build the project"
    echo "4. Run 'npm publish'"
    echo ""
    echo "However, it's generally not recommended to publish old versions retroactively."
    echo "Consider only publishing versions that users specifically request."
fi

# Check if current version matches latest tag
CURRENT_VERSION=$(node -p "require('./package.json').version")
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
LATEST_TAG_VERSION=${LATEST_TAG#v}

echo ""
echo "📦 Current package.json version: $CURRENT_VERSION"
echo "🏷️  Latest git tag: $LATEST_TAG"

if [ "$CURRENT_VERSION" != "$LATEST_TAG_VERSION" ]; then
    echo "⚠️  Version mismatch! Package.json ($CURRENT_VERSION) doesn't match latest tag ($LATEST_TAG_VERSION)"
fi