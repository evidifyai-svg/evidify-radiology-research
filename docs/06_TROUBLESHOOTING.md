# Local Dev + “Won’t Load” Troubleshooting (Beta Bundle)
This reflects the beta bundle’s structure (Vite+React) and typical failure points on macOS M-series.

## 1) Expected dev run path
- Use a local dev server (do not open `index.html` directly):
  - `npm install`
  - `npm run dev`
  - open the printed localhost URL (usually `http://localhost:5173`)

## 2) Common causes of “blank page” / “won’t load”
- Opened `index.html` directly (file://) instead of using Vite dev server.
- Node version mismatch (needs Node 18+).
- `npm install` did not complete cleanly (delete `node_modules` + re-install).
- Browser issue: WebLLM requires WebGPU; some browsers/settings disable it.
- AI runtime mismatch: app references Ollama provider but Ollama isn’t installed/running.

## 3) Ollama-specific checks (if using Ollama provider)
- Ensure Ollama is running:
  - `ollama serve`
- Ensure at least one model is installed:
  - `ollama list`
- Confirm API reachable:
  - `curl http://localhost:11434/api/tags`

## 4) WebLLM-specific checks (if using WebGPU provider)
- Use a WebGPU-capable browser (recent Chrome).
- Provide a visible “AI provider status” panel (WebLLM ready / downloading / unsupported).

## 5) Packaging gap in INSTALL.md
The current INSTALL.md contains ellipses (`...`) in the middle of steps. Provide a complete, copy/pasteable Quick Start that includes:
- Node install
- commands
- expected URL
- provider prerequisites (Ollama vs WebLLM)
- how to run offline after initial install (if applicable)
