Sources for the link-preview image and the icons (rendered with headless Chrome).

- `og.html` → `og-image.jpg` (1200×630). Needs `kv-02-0644@2x.webp`, `logo.svg`, `noise@2x.webp` from `img/` next to it.
- `icon.html` → `icon-512.png`, then downscaled to `icon-192.png`, `apple-touch-icon.png` (180) and `favicon.ico` (16/32/48).
- `favicon.svg` (site root) is hand-written: the symbol, dark on light tab bars, light on dark ones.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot=og.png "file://$PWD/og.html"
```
