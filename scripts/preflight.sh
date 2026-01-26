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

# Check node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo "✗ frontend/node_modules missing - run: npm --prefix frontend install"
    exit 1
fi
echo "✓ frontend/node_modules exists"

# Count index.html files
COUNT=$(find . -name "index.html" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l | tr -d ' ')
if [ "$COUNT" -ne 1 ]; then
    echo "✗ Found $COUNT index.html files (should be 1)"
    exit 1
fi
echo "✓ Single index.html entry point"

echo "✓ Preflight passed"

