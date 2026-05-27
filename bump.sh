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

# Update index.html (CSS/JS query strings and version display)
sed -i '' "s/?v=${OLD_VERSION}/?v=${NEW_VERSION}/g" index.html
sed -i '' "s/v${OLD_VERSION}/v${NEW_VERSION}/g" index.html

echo "Done. Updated to $NEW_VERSION"
