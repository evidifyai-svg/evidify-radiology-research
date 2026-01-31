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
