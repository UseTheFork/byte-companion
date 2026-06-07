#!/usr/bin/env bash

set -e

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is not installed. Please install it first."
  echo "See: https://cli.github.com/"
  exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: Not in a git repository."
  exit 1
fi

# Generate date-based version string in format YYYY.M.D
VERSION=$(date -u +'%Y.%-m.%-d')

# Create git tag with v prefix
TAG="v${VERSION}"

echo "Creating release for version: $VERSION"
echo "Tag: $TAG"

# Create and push the git tag
echo "Creating git tag..."
git tag "$TAG"

echo "Pushing tag to remote..."
git push origin "$TAG"

# Create GitHub Release with auto-generated notes
echo "Creating GitHub Release..."
gh release create "$TAG" \
  --title "Release $TAG" \
  --generate-notes

echo "Release created successfully!"
