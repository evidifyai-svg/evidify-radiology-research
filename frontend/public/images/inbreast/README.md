# INbreast demo images (local-only)

This folder is a symlink target in local dev. Do not commit datasets.

Setup:
1) Place `inbreast.zip` at `/Users/OldMaroon/Downloads/inbreast.zip` (or pass a path).
2) Run:
   bash scripts/setup-inbreast.sh

This will:
- unzip the archive,
- convert DICOMs to PNGs into `/Users/OldMaroon/Downloads/inbreast_png`,
- symlink `frontend/public/images/inbreast` -> that folder.
