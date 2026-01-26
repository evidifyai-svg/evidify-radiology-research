.PHONY: help setup dev build check verify preflight smoke clean reset pr branch

help:
	@echo "Evidify Radiology Research - Development Commands"
	@echo ""
	@echo "  make setup     - First-time setup (install frontend deps)"
	@echo "  make dev       - Start development server (with preflight)"
	@echo "  make build     - Production build"
	@echo "  make check     - Run all verification gates"
	@echo "  make smoke     - Run smoke tests (requires running server)"
	@echo "  make clean     - Remove build artifacts and cache"
	@echo "  make reset     - Kill dev server, clear cache, restart"
	@echo "  make pr        - Full pre-PR validation"
	@echo "  make branch    - Interactive branch creation helper"

setup:
	@echo "Installing frontend dependencies..."
	npm --prefix frontend install
	@echo "✓ Setup complete. Run 'make dev' to start."

dev: preflight
	npm run dev

build: verify
	npm --prefix frontend run build

check: preflight verify
	@echo "✓ All checks passed"

verify:
	npm run verify:index

preflight:
	@bash scripts/preflight.sh

smoke:
	@bash scripts/smoke-test.sh

clean:
	@echo "Cleaning build artifacts..."
	rm -rf frontend/dist frontend/.vite frontend/node_modules/.vite
	@echo "✓ Clean complete"

reset:
	@echo "Killing any process on port 5173..."
	-lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@echo "Clearing Vite cache..."
	rm -rf frontend/.vite frontend/node_modules/.vite
	@echo "Starting dev server..."
	npm run dev

pr: check build
	@echo ""
	@echo "✓ Ready for PR. Don't forget to:"
	@echo "  1. git add -A"
	@echo "  2. git commit -m 'feat: ...'"
	@echo "  3. git push -u origin <branch>"

branch:
	@echo "Current branch: $$(git rev-parse --abbrev-ref HEAD)"
	@echo ""
	@read -p "Branch type (feat/fix/refactor/docs): " type; \
	read -p "Short name (e.g., add-export): " name; \
	git switch -c $$type/$$name
