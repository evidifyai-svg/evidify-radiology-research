#!/usr/bin/env bash
set -euo pipefail
OUT="support-pack-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

git status -sb > "$OUT/git_status.txt" || true
git rev-parse --short HEAD > "$OUT/git_head.txt" || true
git log --oneline --decorate --graph --max-count=40 > "$OUT/git_log.txt" || true
git diff > "$OUT/git_diff_worktree.patch" || true
git diff --cached > "$OUT/git_diff_index.patch" || true

cp -f frontend/package.json "$OUT/" 2>/dev/null || true
cp -f frontend/vite.config.ts "$OUT/" 2>/dev/null || true
cp -f frontend/index.html "$OUT/" 2>/dev/null || true
cp -f frontend/research-demo.html "$OUT/" 2>/dev/null || true

mkdir -p "$OUT/research_legal"
cp -f frontend/src/components/research/legal/ExpertWitnessExport.tsx "$OUT/research_legal/" 2>/dev/null || true
cp -f frontend/src/components/research/legal/DownshiftGuardrail.tsx "$OUT/research_legal/" 2>/dev/null || true
cp -f frontend/src/components/research/legal/LiabilityOptimizedModules.tsx "$OUT/research_legal/" 2>/dev/null || true

zip -r "${OUT}.zip" "$OUT" >/dev/null
echo "Created ${OUT}.zip"
