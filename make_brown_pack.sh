#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$ROOT/BROWN_DEMO_PACK_$STAMP"

echo "Building frontend…"
npm -C "$ROOT/frontend" run build

echo "Sanity-checking verifier fixture…"
node "$ROOT/tools/radiology-verifier/verify-radiology.cjs" "$ROOT/tools/radiology-verifier/fixtures/pack-valid-mini"

echo "Assembling pack at: $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"/{DEMO,VERIFY,EXPORTS}

# DEMO
cp -R "$ROOT/frontend/dist/"* "$OUT/DEMO/"

cat > "$OUT/DEMO/START_DEMO.command" <<'CMD'
#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
PORT="${PORT:-5173}"

python3 -m http.server "$PORT" >/dev/null 2>&1 &
PID=$!

sleep 1
open "http://localhost:$PORT/research-demo.html"

echo ""
echo "Evidify Research Demo running:"
echo "  http://localhost:$PORT/research-demo.html"
echo ""
echo "Leave this window open while demo is running."
echo "Close this window to stop the server."
trap "kill $PID 2>/dev/null || true" EXIT
wait
CMD
chmod +x "$OUT/DEMO/START_DEMO.command"

# VERIFY
mkdir -p "$OUT/VERIFY/tools/radiology-verifier"
cp "$ROOT/tools/radiology-verifier/verify-radiology.cjs" "$OUT/VERIFY/tools/radiology-verifier/"
cp -R "$ROOT/tools/radiology-verifier/fixtures" "$OUT/VERIFY/tools/radiology-verifier/"

cat > "$OUT/VERIFY/VERIFY_PACK.command" <<'CMD'
#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "Evidify Radiology/Research Verifier"
echo "----------------------------------"
echo "Usage:"
echo "  ./VERIFY_PACK.command fixtures"
echo "  ./VERIFY_PACK.command ../EXPORTS/<unpacked-pack-folder>"
echo ""

TARGET="${1:-fixtures}"
if [[ "$TARGET" == "fixtures" ]]; then
  TARGET="tools/radiology-verifier/fixtures/pack-valid-mini"
fi

node "tools/radiology-verifier/verify-radiology.cjs" "$TARGET"
echo ""
echo "DONE."
CMD
chmod +x "$OUT/VERIFY/VERIFY_PACK.command"

cat > "$OUT/README_FIRST.md" <<'MD'
# Evidify Radiology Research Demo Pack (Brown)

## What this contains
- **DEMO/**: The interactive research demo (static build)
- **VERIFY/**: A verifier + a known-good fixture, and a script to verify any export pack
- **EXPORTS/**: Empty folder where you can drop exported packs to verify

---

## 1) Run the demo (Mac)
1. Open **DEMO/**
2. Double-click **START_DEMO.command**
3. Browser opens to:
   - http://localhost:5173/research-demo.html

> Note: Opening `research-demo.html` directly via Finder uses `file://` and can trigger browser CORS protections for module scripts.

---

## 2) Verify the included known-good fixture (Mac)
1. Open **VERIFY/**
2. Double-click **VERIFY_PACK.command**
   - OR Terminal:
     - `./VERIFY_PACK.command fixtures`

You should see **VERIFICATION: PASS**.

---

## 3) Verify an exported pack ZIP you received
1. Put the ZIP in **EXPORTS/**
2. Unzip into a folder:
   - `unzip EXPORTS/<pack>.zip -d EXPORTS/pack_to_check`
3. Run:
   - `cd VERIFY`
   - `./VERIFY_PACK.command ../EXPORTS/pack_to_check`

---

## Requirements
- Node.js 18+ (20+ recommended)
- Python 3
MD

ZIP="$ROOT/Evidify_Brown_DemoPack_$STAMP.zip"
rm -f "$ZIP"
( cd "$OUT/.." && /usr/bin/zip -r "$ZIP" "$(basename "$OUT")" >/dev/null )

echo ""
echo "✅ Built Brown demo pack:"
echo "  $ZIP"
echo ""
echo "To test locally:"
echo "  open \"$OUT/DEMO/START_DEMO.command\""
echo "  (cd \"$OUT/VERIFY\" && ./VERIFY_PACK.command fixtures)"
echo ""
