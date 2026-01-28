#!/bin/bash
echo "Preflight checks..."
cd "$(dirname "$0")/.."

# Check frontend exists
if [ ! -d "frontend" ]; then
    echo "✗ frontend/ directory missing"
    exit 1
fi
echo "✓ frontend/ exists"

# Check frontend/index.html exists
if [ ! -f "frontend/index.html" ]; then
    echo "✗ frontend/index.html missing"
    exit 1
fi
echo "✓ frontend/index.html exists"

# Check frontend dev script exists
if ! node -e "const pkg=require('./frontend/package.json'); if (!pkg.scripts || !pkg.scripts.dev) { process.exit(1); }"; then
    echo "✗ frontend/package.json missing dev script"
    exit 1
fi
echo "✓ frontend dev script exists"

# Check node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "✗ frontend/node_modules missing - run: npm --prefix frontend install"
    exit 1
fi
echo "✓ frontend/node_modules exists"

# Validate allowed HTML entrypoints
ALLOWED_HTML=(
    "frontend/index.html"
    "frontend/research-demo.html"
    "frontend/index-demo.html"
    "frontend/demo.html"
)

HTML_FILES=$(find frontend -name "*.html" -not -path "*/node_modules/*" -not -path "*/.git/*" | sort)
for file in $HTML_FILES; do
    allowed=false
    for allowed_file in "${ALLOWED_HTML[@]}"; do
        if [ "$file" = "$allowed_file" ]; then
            allowed=true
            break
        fi
    done
    if [ "$allowed" = false ]; then
        echo "✗ Unexpected HTML entrypoint: $file"
        exit 1
    fi
done
echo "✓ HTML entrypoints are expected"

# Ensure INbreast dataset is not tracked
TRACKED_INBREAST=$(git ls-files -z frontend/public/images/inbreast | tr '\0' '\n' | grep -vE 'frontend/public/images/inbreast/(README.md|.gitkeep)$' || true)
if [ -n "$TRACKED_INBREAST" ]; then
    echo "✗ INbreast dataset files are tracked:"
    echo "$TRACKED_INBREAST"
    exit 1
fi
echo "✓ INbreast dataset not tracked"

echo "✓ Preflight passed"
