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

# Interactive numbered menu to select release modifier
while true; do
  echo "Select release modifier:"
  echo "  1) none (default)"
  echo "  2) alpha"
  echo "  3) beta"
  echo "  4) rc"
  echo "  5) dev"
  read -p "Enter choice [1-5] (default: 1): " CHOICE
  
  # Default to 1 if empty
  CHOICE="${CHOICE:-1}"
  
  case "$CHOICE" in
    1)
      MODIFIER=""
      break
      ;;
    2)
      MODIFIER="alpha"
      break
      ;;
    3)
      MODIFIER="beta"
      break
      ;;
    4)
      MODIFIER="rc"
      break
      ;;
    5)
      MODIFIER="dev"
      break
      ;;
    *)
      echo "Invalid choice. Please enter a number between 1 and 5."
      ;;
  esac
done

# Generate date-based version tag
TAG="v$(date -u +'%Y.%-m.%-d')"

# Append modifier if provided
if [ -n "$MODIFIER" ]; then
  TAG="${TAG}-${MODIFIER}"
fi

echo "Preparing release with tag: $TAG"

# Extract version without leading 'v' and update package.json
VERSION="${TAG#v}"
echo "Updating package.json version to $VERSION..."
npm version "$VERSION" --no-git-tag-version --allow-same-version

git add package.json package-lock.json 2>/dev/null || git add package.json
git commit -m "chore: bump version to $VERSION"

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

