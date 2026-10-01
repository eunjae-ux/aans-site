# All About Noirs — CUT 01. URBAN EXOSKELETON

Static site (no build step on deploy). EN is the root (`index.html`), with `jp/` and `kr/`.

## Edit & rebuild

The HTML pages are generated — edit the copy/markup in `tools/build.py`, not the HTML:

```bash
python3 -m venv venv && ./venv/bin/pip install -r tools/requirements.txt
./venv/bin/python tools/build.py      # writes index.html, jp/, kr/
./venv/bin/python tools/images.py     # only when source images change (needs tools/orig/, kept locally)
```

`style.css`, `main.js` and `intro/` are edited directly.

## Preview

```bash
python3 serve.py    # http://localhost:5173 (no caching)
```
