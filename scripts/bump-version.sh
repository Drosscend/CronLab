#!/bin/bash
# Usage: ./scripts/bump-version.sh [patch|minor|major]
# Example: ./scripts/bump-version.sh patch  (0.1.0 → 0.1.1)
#          ./scripts/bump-version.sh minor  (0.1.0 → 0.2.0)
#          ./scripts/bump-version.sh major  (0.1.0 → 1.0.0)

set -e

BUMP_TYPE=${1:-patch}
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Read current version from tauri.conf.json
CURRENT=$(grep -oP '"version":\s*"\K[^"]+' "$ROOT_DIR/src-tauri/tauri.conf.json" | head -1)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case $BUMP_TYPE in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
  *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "Bumping version: $CURRENT → $NEW_VERSION"

# Update all 3 files
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT_DIR/package.json"
sed -i "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT_DIR/src-tauri/tauri.conf.json"
sed -i "s/^version = \"$CURRENT\"/version = \"$NEW_VERSION\"/" "$ROOT_DIR/src-tauri/Cargo.toml"

echo "Updated:"
echo "  - package.json"
echo "  - src-tauri/tauri.conf.json"
echo "  - src-tauri/Cargo.toml"
echo ""
echo "Version is now $NEW_VERSION"
echo "Run: git add -A && git commit -m 'chore: bump version to $NEW_VERSION' && git push"
