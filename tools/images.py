"""Export every design image as @2x / @1x WebP.

Photos are cropped to exactly what their Figma frame shows (the frame's
image-fill box, object-fit: cover), then sized to 2x the frame's design size.
If the source doesn't have enough pixels for a true 2x, the crop is kept at
its native resolution instead of being upscaled.
"""
import json, os
from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ORIG = os.path.join(HERE, "orig")
OUT = os.path.join(os.path.dirname(HERE), "img")

TW, TH = 704, 938.667  # lookbook thumbnail frame
# name: (frame w, frame h, box x, box y, box w, box h)
CROPS = {
    "04-1633_B-1": (1440, 816, -5, -358, 1474, 1965),
    "02-0533_A-1": (TW, TH, -12, -5, 728, 944),
    "02-0786_A-1": (TW, TH, -251, 0, 1190, 1587),
    "03-0896_A-1": (TW, TH, 0, 0, 704, 939),
    "01-0074_A-1": (TW, TH, -5, 0, 727, 943),
    "07-2338_B-3": (TW, TH, -19, -26, 742, 990),
    "07-2308_B-2": (TW, TH, -46, 0, 750, 1000),
    "08-2652_A-1": (TW, TH, -68, 0, 839, 1088),
    "09-2673_B-1": (TW, TH, -21, -19, 725, 967),
    "08-2608_B-2": (TW, TH, -7, 0, 731, 975),
}
# Whole images: name -> design display size (w, h) of the image box.
WHOLE = {"footer-graphic": (1768, 1768), "kv-02-0644": (3390, 2746)}
WHOLE.update({f"product-{i}": (290, 387) for i in range(1, 10)})


def save(img, name, alpha):
    w2, h2 = img.size
    img.save(os.path.join(OUT, f"{name}@2x.webp"), "WEBP", quality=84, method=6)
    small = img.resize((round(w2 / 2), round(h2 / 2)), Image.LANCZOS)
    small.save(os.path.join(OUT, f"{name}@1x.webp"), "WEBP", quality=84, method=6)
    return {"w2": w2, "h2": h2, "w1": small.size[0], "h1": small.size[1]}


os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if not f.endswith(".svg") and not f.startswith("noise"):
        os.remove(os.path.join(OUT, f))

report = {}
for name, (fw, fh, bx, by, bw, bh) in CROPS.items():
    src = ImageOps.exif_transpose(Image.open(os.path.join(ORIG, name))).convert("RGB")
    sw, sh = src.size
    k = max(bw / sw, bh / sh)  # cover scale: source px -> box px
    ox, oy = (bw - sw * k) / 2, (bh - sh * k) / 2
    box = ((-bx - ox) / k, (-by - oy) / k, (-bx - ox + fw) / k, (-by - oy + fh) / k)
    crop = src.crop(tuple(round(v) for v in box))
    target = (round(fw * 2), round(fh * 2))
    if crop.size[0] >= target[0]:
        crop = crop.resize(target, Image.LANCZOS)
    report[name] = save(crop, name, False)
    report[name]["scale"] = round(crop.size[0] / fw, 2)

for name, (dw, dh) in WHOLE.items():
    src = Image.open(os.path.join(ORIG, name))
    src = src.convert("RGBA") if src.mode in ("RGBA", "LA", "P") else src.convert("RGB")
    sw, sh = src.size
    k = min(1, max(dw * 2 / sw, dh * 2 / sh))
    img = src.resize((round(sw * k), round(sh * k)), Image.LANCZOS) if k < 1 else src
    report[name] = save(img, name, True)
    report[name]["scale"] = round(img.size[0] / dw, 2)

with open(os.path.join(HERE, "images.json"), "w") as fp:
    json.dump(report, fp, indent=1)
for n, r in report.items():
    print(f"{n:16} {r['w2']}x{r['h2']}  ({r['scale']}x of design)")
