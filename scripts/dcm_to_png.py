import os, sys
import numpy as np

try:
    import pydicom
    from PIL import Image
except Exception as e:
    print("Missing deps. Install with: python3 -m pip install --user pydicom pillow numpy")
    raise

src = sys.argv[1]
dst = sys.argv[2]
os.makedirs(dst, exist_ok=True)

count = 0
for root, _, files in os.walk(src):
    for fn in files:
        if not fn.lower().endswith(".dcm"):
            continue
        in_path = os.path.join(root, fn)
        out_name = os.path.splitext(fn)[0] + ".png"
        out_path = os.path.join(dst, out_name)

        ds = pydicom.dcmread(in_path)
        px = ds.pixel_array.astype(np.float32)

        lo, hi = np.percentile(px, (1, 99))
        px = np.clip((px - lo) / (hi - lo + 1e-6), 0, 1)
        img = (px * 255).astype(np.uint8)

        Image.fromarray(img).save(out_path)
        count += 1

print(f"Converted {count} DICOMs to PNG in: {dst}")
