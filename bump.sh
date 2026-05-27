#!/bin/bash
# Bump version across all files that reference it
# Usage: ./bump.sh 0.2.0

if [ -z "$1" ]; then
    echo "Usage: ./bump.sh <new-version>"
    echo "Current version: $(cat version.txt)"
    exit 1
fi

NEW_VERSION="$1"
OLD_VERSION=$(cat version.txt | tr -d '\n')

echo "Bumping from $OLD_VERSION to $NEW_VERSION"

# Update version.txt
echo "$NEW_VERSION" > version.txt

# Update all HTML files (CSS/JS query strings, OG image URLs, version display)
find . -name "*.html" -not -path "./node_modules/*" | while read f; do
    sed -i '' "s/?v=${OLD_VERSION}/?v=${NEW_VERSION}/g" "$f"
    sed -i '' "s/v${OLD_VERSION}/v${NEW_VERSION}/g" "$f"
done

echo "Done. Updated to $NEW_VERSION"
