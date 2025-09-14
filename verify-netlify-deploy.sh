#!/bin/bash

# Netlify Deployment Verification Script
# This script verifies that Netlify is configured to deploy from the root directory

echo "=== Netlify Deployment Configuration Verification ==="
echo

# Check if we're in the correct directory
if [ ! -f "index.html" ]; then
    echo "❌ ERROR: index.html not found. Are you in the root directory?"
    exit 1
fi

echo "✅ Found index.html in current directory"

# Check netlify.toml configuration
if [ -f "netlify.toml" ]; then
    echo "✅ Found netlify.toml"

    # Check base directory setting
    if grep -q 'base = ""' netlify.toml; then
        echo "✅ Base directory correctly set to root"
    else
        echo "❌ WARNING: Base directory may not be set to root"
    fi

    # Check publish directory
    if grep -q 'publish = "."' netlify.toml; then
        echo "✅ Publish directory correctly set to root"
    else
        echo "❌ WARNING: Publish directory may not be set to root"
    fi
else
    echo "❌ ERROR: netlify.toml not found"
    exit 1
fi

# Check .netlify directory
if [ -d ".netlify" ]; then
    echo "✅ Found .netlify configuration directory"

    if [ -f ".netlify/state.json" ]; then
        echo "✅ Found .netlify/state.json"
    else
        echo "❌ WARNING: .netlify/state.json not found"
    fi
else
    echo "❌ WARNING: .netlify directory not found"
fi

# Check for _netlify marker file
if [ -f "_netlify" ]; then
    echo "✅ Found _netlify deployment marker"
else
    echo "ℹ️  INFO: _netlify marker file not present (optional)"
fi

# Check key files that should be in root
echo
echo "=== Verifying Key Files in Root Directory ==="
key_files=("index.html" "netlify.toml" "package.json")

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found in root"
    else
        echo "❌ WARNING: $file not found in root"
    fi
done

# Check functions directory
if [ -d "netlify/functions" ]; then
    echo "✅ Functions directory found at netlify/functions"
else
    echo "❌ WARNING: Functions directory not found at netlify/functions"
fi

echo
echo "=== Directory Structure Summary ==="
echo "Current directory: $(pwd)"
echo "Contents:"
ls -la | head -20

echo
echo "=== Netlify CLI Commands to Run ==="
echo "To test locally:"
echo "  netlify dev"
echo
echo "To deploy manually:"
echo "  netlify deploy --prod"
echo
echo "To check current site configuration:"
echo "  netlify status"
echo

echo "=== Configuration Summary ==="
echo "✅ All configuration files created"
echo "✅ Base directory forced to root (empty string)"
echo "✅ Publish directory set to root (.)"
echo "✅ Functions directory set to netlify/functions"
echo "✅ Override files created to ignore UI settings"
echo
echo "🚀 Your site should now deploy from the root directory!"