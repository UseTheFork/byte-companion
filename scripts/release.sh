#!/usr/bin/env bash
set -e

# Check that gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "Error: 'gh' CLI is not installed. Please install GitHub CLI to continue."
  exit 1
fi

# Check that we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Error: Current directory is not a git repository."
  exit 1
fi

# Generate date-based version tag
TAG="v$(date -u +'%Y.%-m.%-d')"
echo "Preparing release with tag: $TAG"

# Delete existing GitHub release if it exists
echo "Checking for existing GitHub release..."
if gh release view "$TAG" > /dev/null 2>&1; then
  echo "Deleting existing GitHub release for $TAG..."
  gh release delete "$TAG" --yes
fi

# Delete existing remote tag if it exists
echo "Checking for existing remote tag..."
if git ls-remote origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "Deleting existing remote tag $TAG..."
  git push origin --delete "$TAG"
fi

# Delete existing local tag if it exists
echo "Checking for existing local tag..."
if git rev-parse "$TAG" > /dev/null 2>&1; then
  echo "Deleting existing local tag $TAG..."
  git tag -d "$TAG"
fi

# Create git tag and push it
echo "Creating and pushing git tag $TAG..."
git tag "$TAG"
git push origin "$TAG"

# Create GitHub release with auto-generated notes
echo "Creating GitHub release with auto-generated notes..."
gh release create "$TAG" --generate-notes

echo "Release $TAG created successfully!"

