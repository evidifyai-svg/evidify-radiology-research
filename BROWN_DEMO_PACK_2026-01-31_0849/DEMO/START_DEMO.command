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
