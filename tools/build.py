import json, os, shutil, html, time

VER = time.strftime("%Y%m%d%H%M%S")  # cache-busting stamp for this build

SITE = "https://www.aa-official.com"  # the live address (aa-official.com redirects here)
OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # the site root (tools/..)

GAP = None  # blank 24px row
HALF_GAP = "__half_gap__"  # a 12px paragraph break

LANGS = {
    "kr": dict(
        lang="ko", dir="kr", label="KR",
        desc="도시를 살아가는 이들을 위한 얼반 테크웨어 브랜드, All About Noirs. CUT 01. URBAN EXOSKELETON",
        intro_w=560, intro_box=540, full_w=538,
        intro=[
            "우리는 몸을 드러내기보다 조용히 감싼다. 겹쳐진 레이어와 여백이 만드는 실루엣은 움직임과 뒷모습에서 완성된다.",
            "이 균형은 동양 건축의 곡선과 여백에서 비롯되었다. AANS의 블랙은 하나의 색이 아니다.",
            "빛에 따라 층위를 달리하는, 겹침에서 표현되는 깊이를 가진다. 절제된 실루엣은 움직임마다 다른 밀도의 그림자를 남긴다.",
            HALF_GAP,
            "도시 속에서, 조용히 나를 감싸는 외골격.",
            "도시를 살아가는 이들을 위한 얼반 테크웨어 브랜드. All About Noirs.",
        ],
        full_top=658,
        full=[
            "시그니처 '안곡(ANGOK)' 케이프 패널은 완만하게 휘어진 지붕의 처마에서 왔다.",
            "처마가 비바람으로부터 집을 지키듯, 이 곡선을 그대로 옷의 뒷면으로 가져와 가장 무방비하게 노출되는 등을 감싼다.",
            HALF_GAP,
            "외골격은 몸 바깥에서 신체를 지지하고 보호하는 구조다. 도시라는 감각의 전장 속에서, 조용히 나를 감싸는 것.",
            "그것이 All About Noirs가 CUT 01에서 말하는 '외골격'이다.",
        ],
        cut=[
            "All About Noirs의 모든 컬렉션은 하나의 장면에서 시작된다. 그 장면은 브랜드 필름의 세계에서 온다.",
            "도시는 감각의 전장이다. 보이는 것이 너무 많고, 들리는 것이 너무 많다.",
            "넘치는 자극 속에서 사람들은 저마다 하나의 감각에 붙들리고, 붙들린 감각은 리듬을 잃는다.",
        ],
        cut_wrap=True, cut_w=472,
        stories=[
            (429, "— 동양적 구조", ["완곡히 휘어진 오래된 지붕의 처마, 하늘과 경계를 나누는 선.", "힘을 뺀 곡선의 여유는 AANS의 선으로 옮겨진다."]),
            (429, "— 도시의 감쌈", ["도시에는 늘 누군가의 시선과 소리가 스친다.", "그 틈 사이에서 차갑지만 안전하게 감싸는, 자기만의 도시."]),
            (429, "— 느와르의 밀도", ["비어 보이는 어둠 속엔, 겹겹이 쌓인 시간의 밀도가 감춰져 있다.", "가까이 들여다볼수록 드러나는 블랙, 그것이 느와르다."]),
        ],
    ),
    "en": dict(
        lang="en", dir="", label="EN",
        desc="An urban techwear brand for those who live within the city. All About Noirs. CUT 01. URBAN EXOSKELETON",
        intro_w=684, intro_box=684, full_w=569,
        intro=[
            "We don’t reveal the body — we quietly enclose it. Layered forms and negative space shape a silhouette",
            "that completes itself in motion, from behind.{m}This balance comes from the curves and emptiness of Eastern architecture.",
            "Our black is not a single color. It is a depth expressed through layering — one that shifts with light.",
            "A restrained silhouette casts a different shadow with every movement.",
            HALF_GAP,
            "An exoskeleton that quietly holds you, within the city.",
            "An urban techwear brand for those who live within the city. All About Noirs.",
        ],
        full_top=610,
        full=[
            "The signature ANGOK cape panel comes from the gently curved eaves of a roof.{m}As the eave{join}",
            "shields a house from wind and rain, the curve is carried onto the back of the garment —",
            "covering the back, the body’s most unguarded surface.",
            HALF_GAP,
            "An exoskeleton is a structure that supports and protects the body from the outside.",
            "In the city, a battlefield of the senses, it is what quietly encloses you.{m}That is what{join}",
            "All About Noirs means by “exoskeleton” in CUT 01.",
        ],
        cut=[
            "Every All About Noirs collection begins with a single scene. That scene comes from the world of the brand film.",
            "The city is a battlefield of the senses.{m}There is too much to see, and too much to hear.",
            "Amid the overflow, each person is seized by one sense — and the seized sense loses its rhythm.",
        ],
        cut_wrap=False, cut_w=None,
        stories=[
            (417, "", ["The eave of an old roof, gently curved,", "drawing a line between itself and the sky.", "That ease in the curve, carried into every line AANS draws."]),
            (426, "", ["The city is never still — always a gaze, always a sound passing through.", "In that gap, a city of one’s own: cold, yet safely held."]),
            (429, "", ["What looks empty is darkness layered, time pressed into density.", "Look closer, and black reveals itself. That is noir."]),
        ],
    ),
    "jp": dict(
        lang="ja", dir="jp", label="JP",
        desc="都市を生きる人のためのアーバンテックウェアブランド、All About Noirs。CUT 01. URBAN EXOSKELETON。",
        intro_w=609, intro_box=540, full_w=538,
        intro=[
            "私たちは、身体を晒すのではなく、静かに纏わせる。重なるレイヤーと余白が生み出すシルエットは",
            "動きと後ろ姿の中で完成する。このバランスは、東洋建築の曲線と余白から生まれた。",
            "AANSのブラックは、ひとつの色ではない。光によって層を変える、重なりの中に表れる深みを持つ。",
            "抑えられたシルエットは、動くたびに異なる濃淡の影を纏う。",
            HALF_GAP,
            "都市の中で、静かに私を纏う外骨格。",
            "都市を生きる人のためのアーバンテックウェアブランド。All About Noirs",
        ],
        full_top=634,
        full=[
            "シグネチャーの「ANGOK（アンゴク）」ケープパネルは、ゆるやかに反り返る屋根の軒から生まれた。",
            "軒が風雨から家を守るように、その曲線をそのまま服の背面へ移し、",
            "最も無防備にさらされる背中を包む。",
            HALF_GAP,
            "外骨格とは、身体の外側から支え、守る構造のこと。感覚の戦場である都市のなかで、",
            "静かに自分を包むもの。それが、All About NoirsがCUT 01で語る「外骨格」である。",
        ],
        cut=[
            "All About Noirsのすべてのコレクションは、ひとつの場面から始まる。その場面は、ブランドフィルムの世界からやってくる。",
            "都市は、感覚の戦場である。見えるものが多すぎ、聞こえるものが多すぎる。",
            "あふれる刺激のなかで、人はそれぞれひとつの感覚に囚われ、囚われた感覚はリズムを失っていく。",
        ],
        cut_wrap=False, cut_w=None,
        stories=[
            (426, "", ["緩やかに反った古い屋根の軒先、天と境界を分ける線。", "力を抜いた曲線のゆとりは、AANSの線へと移される。"]),
            (426, "", ["都市には常に、誰かの視線と音がすれ違う。", "その隙間で、冷たくも安全に包まれる、自分だけの都市。"]),
            (426, "", ["空白に見える闇の中には、幾重にも積まれた時間の密度が隠れている。", "近づくほどに現れるブラック、それがノワールだ。"]),
        ],
    ),
}

# Default language is EN (site root), then JP, then KR.
LANGS = {k: LANGS[k] for k in ("en", "jp", "kr")}

STORY_EN = ["EASTERN STRUCTURE", "URBAN ENCLOSURE", "NOIR DENSITY"]
STORY_IMG = ["08-2652_A-1", "09-2673_B-1", "08-2608_B-2"]
PRODUCTS = [  # Figma 2597:2337 — photo top / bottom inset, x offset (design px on a 314.2px card)
    ("-0.49%", "2.17%", "-0.11", "SHELTER 3LAYER JACKET"),
    ("0.97%", "-0.02%", "6.17", "SHELTER 3LAYER JUMPER"),
    ("0%", "-1.17%", "-6.61", "SHELTER 3LAYER COAT"),
    ("0%", "0.22%", "-5.78", "EXOSHELL GOOSE DOWN PARKA"),
    ("-5.11%", "0.95%", "-13.5", "FRAME WOVEN S/S TEE"),
    ("-4.38%", "-2.94%", "-1.22", "FRAME WAFFLE L/S TEE"),
    ("-6.81%", "-2.46%", "1.06", "FRAME TWILL HOODIE"),
    ("0%", "1.44%", "-4.67", "SHELTER NYLON TROUSERS"),
    ("0%", "-1.24%", "8.11", "SHELTER CORDUROY TROUSERS"),
]


def e(s):
    return html.escape(s, quote=False)


IMG = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "images.json")))
SEP = {"ja": ""}
LAZY = ' loading="lazy"'  # Japanese lines rejoin without a space when they reflow


import re as _re_lines
try:
    import budoux  # Japanese phrase segmentation (pip install budoux)
    _JA = budoux.load_default_japanese_parser()
except ImportError:  # without it Japanese lines still build, just without phrase breaks
    _JA = None

# names that must never break across lines in Korean / Japanese copy
_KEEP = ("All About Noirs", "CUT 01")


def _cjk(text, lang):
    """Escape a line of ko/ja copy: brand names held together, and (ja) a
    <wbr> at each phrase boundary, so with word-break: keep-all lines only
    break between phrases, never inside a word."""
    for k in _KEEP:
        text = text.replace(k, k.replace(" ", "\u00a0"))
    if lang == "ja" and _JA:
        return "<wbr>".join(e(seg) for seg in _JA.parse(text))
    return e(text)


MBR = "{m}"      # phone-only line break (see lines())
MJOIN = "{join}"  # phone-only: run this line on into the next


def lines(items, indent, lang):
    """Design lines -> paragraphs (split on GAP) of .ln spans."""
    pad = " " * indent
    paras, cur = [], []
    gaps = []  # the break kind before each paragraph after the first
    for s in items + [GAP]:
        if s is GAP or s == HALF_GAP:
            if cur:
                paras.append(cur)
                gaps.append(s)
            cur = []
        else:
            cur.append(s)
    sep = SEP.get(lang, " ")
    out = []
    for i, para in enumerate(paras):
        if i:
            half = gaps[i - 1] == HALF_GAP
            out.append(f'{pad}<p class="gap{" gap--half" if half else ""}" aria-hidden="true"></p>')
        # Phone-only line breaks inside the design's lines:
        #   "{m}"    breaks the line here on phones only (a space elsewhere)
        #   "{join}" at a line's end: on phones it runs on into the next line
        # A paragraph that uses them is written out twice — the design's lines
        # (.ln--d, hidden on phones) and the phone lines (.ln--m, phones only)
        # — so each phone line is a block of its own that the browser can
        # balance; display:none keeps the twin out of screen readers.
        esc = (lambda t: _cjk(t, lang)) if lang in ("ja", "ko") else e
        if lang == "ko":
            # Korean design lines run sentences across lines; on phones each
            # sentence is a line of its own instead (then balanced)
            desk = para
            phone = [x for x in _re_lines.split(r"(?<=[.!?])\s+", " ".join(para)) if x]
            spans = sep.join(f'<span class="ln ln--d">{esc(l)}</span>' for l in desk) + sep + \
                sep.join(f'<span class="ln ln--m">{esc(l)}</span>' for l in phone)
        elif any(MBR in l or l.endswith(MJOIN) for l in para):
            desk = [l.removesuffix(MJOIN).replace(MBR, " ") for l in para]
            phone, carry = [], ""
            for l in para:
                parts = l.removesuffix(MJOIN).split(MBR)
                parts[0] = (carry + " " + parts[0]).strip() if carry else parts[0]
                if l.endswith(MJOIN):
                    carry = parts.pop()
                else:
                    carry = ""
                phone += parts
            spans = sep.join(f'<span class="ln ln--d">{esc(l)}</span>' for l in desk) + sep + \
                sep.join(f'<span class="ln ln--m">{esc(l)}</span>' for l in phone)
        else:
            spans = sep.join(f'<span class="ln">{esc(l)}</span>' for l in para)
        out.append(f"{pad}<p>{spans}</p>")
    return "\n".join(out)


def img(name, sizes, lazy=True, extra=""):
    m = IMG[name]
    return (f'<img src="{{R}}img/{name}@2x.webp" '
            f'srcset="{{R}}img/{name}@1x.webp {m["w1"]}w, {{R}}img/{name}@2x.webp {m["w2"]}w" '
            f'sizes="{sizes}" width="{m["w2"]}" height="{m["h2"]}" alt=""'
            f'{LAZY if lazy else ""}{extra} />')


THUMB_SIZES = "(max-width: 767px) 100vw, 50vw"


def thumb(name, cls="crop thumb reveal"):
    return (f'<div class="{cls}" style="--fw:704;--fh:938.667">\n'
            f'        {img(name, THUMB_SIZES)}\n'
            f'      </div>')


CUR = ' aria-current="page"'


# GNB logo, inline so its letters can move. On scroll the middle letters slide
# up out of the logo's box while the S glides over to the A; on the way the A
# and S fold flat into the symbol's spine (x 14.8, its axis of symmetry), like
# a book closing, and the symbol (img/symbol.svg) then opens from that spine as
# two 3D leaves, like a book laid open.
import re as _re
SPINE = 14.8
def _logo_svg():
    src = open(os.path.join(OUT, "img", "logo.svg")).read()
    paths = _re.findall(r'<path d="([^"]+)"', src)
    x0 = lambda d: float(_re.match(r"M([\d.]+)", d).group(1))
    paths.sort(key=x0)
    sym = _re.search(r'<path id="logo" d="([^"]+)"', open(os.path.join(OUT, "img", "symbol.svg")).read()).group(1)
    a, s_parts, mid = paths[0], [d for d in paths if x0(d) > 181], [d for d in paths[1:] if x0(d) <= 181]
    p = lambda d: f'<path d="{d}"/>'
    out = ['      <span class="logo" aria-hidden="true">',
           '        <svg class="logo__word" viewBox="0 0 195 20" fill="currentColor">',
           f'          <g class="logo__a"><g class="logo__fold" style="transform-origin:{SPINE}px 10px">{p(a)}</g></g>']
    n = len(mid)
    for i, d in enumerate(mid):
        out.append(f'          <g class="logo__mid" style="--i:{i};--r:{n - 1 - i}">{p(d)}</g>')
    # the S folds into the point that lands on the spine once it has glided
    out.append(f'          <g class="logo__s"><g class="logo__fold" style="transform-origin:{SPINE + 165.41:.2f}px 10px">{"".join(p(d) for d in s_parts)}</g></g>')
    out.append('        </svg>')
    out.append('        <span class="logo__book">')
    out.append(f'          <svg class="logo__leaf logo__leaf--l" viewBox="0 0 {SPINE} 20" fill="currentColor"><path d="{sym}"/></svg>')
    out.append(f'          <svg class="logo__leaf logo__leaf--r" viewBox="{SPINE} 0 {SPINE} 20" fill="currentColor"><path d="{sym}"/></svg>')
    out.append('        </span>')
    out.append('      </span>')
    return "\n".join(out)
LOGO_SVG = _logo_svg()

def page(key):
    L = LANGS[key]
    R = "../" if L["dir"] else ""
    label = lambda k: f"[&nbsp;&nbsp;{LANGS[k]['label']}&nbsp;&nbsp;]"

    # absolute addresses, as link previews and search engines need them
    url = lambda k: f'{SITE}/{LANGS[k]["dir"] + "/" if LANGS[k]["dir"] else ""}'
    alternates = "\n".join(
        [f'  <link rel="alternate" hreflang="{LANGS[k]["lang"]}" href="{url(k)}" />' for k in LANGS]
        + [f'  <link rel="alternate" hreflang="x-default" href="{url("en")}" />'])
    locale = {"en": "en_US", "jp": "ja_JP", "kr": "ko_KR"}
    share = "\n".join([
        f'  <link rel="canonical" href="{url(key)}" />',
        '  <meta property="og:type" content="website" />',
        '  <meta property="og:site_name" content="All About Noirs" />',
        f'  <meta property="og:url" content="{url(key)}" />',
        '  <meta property="og:title" content="All About Noirs — CUT 01. URBAN EXOSKELETON" />',
        f'  <meta property="og:description" content="{e(L["desc"])}" />',
        f'  <meta property="og:image" content="{SITE}/og-image.jpg" />',
        '  <meta property="og:image:width" content="1200" />',
        '  <meta property="og:image:height" content="630" />',
        '  <meta property="og:image:alt" content="All About Noirs — CUT 01. URBAN EXOSKELETON" />',
        f'  <meta property="og:locale" content="{locale[key]}" />',
    ] + [f'  <meta property="og:locale:alternate" content="{locale[k]}" />' for k in LANGS if k != key] + [
        '  <meta name="twitter:card" content="summary_large_image" />',
        '  <meta name="twitter:title" content="All About Noirs — CUT 01. URBAN EXOSKELETON" />',
        f'  <meta name="twitter:description" content="{e(L["desc"])}" />',
        f'  <meta name="twitter:image" content="{SITE}/og-image.jpg" />',
    ])
    # The list holds only the other languages, without brackets.
    menu = "\n".join(
        f'          <li><a href="{R}{LANGS[k]["dir"] + "/" if LANGS[k]["dir"] else ""}index.html" hreflang="{LANGS[k]["lang"]}"'
        f' lang="{LANGS[k]["lang"]}">{LANGS[k]["label"]}</a></li>'
        for k in LANGS if k != key)
    en_font = ('\n  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap" />'
               if key == "en" else "")
    jp_font = ('\n  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400&display=swap" />'
               if key == "jp" else "")

    stories = []
    for n, ((st, kr_suffix, body), en, img_name) in enumerate(zip(L["stories"], STORY_EN, STORY_IMG), 1):
        title = f'<span class="en">{en}</span>' + (f" {e(kr_suffix)}" if kr_suffix else "")
        stories.append(f'''    <section class="story">
      {thumb(img_name)}
      <div class="story__text reveal" data-t="story-{n}" style="--st:{st}">
        <h3 class="story__title">{title}</h3>
        <div class="body">
{lines(body, 10, L["lang"])}
        </div>
      </div>
    </section>''')

    products = "\n".join(f'''          <li class="product" style="--pt:{t};--pb:{b};--px:{x}">
            <div class="product__media">{img(f"product-{i}", "(max-width: 767px) 40vw, 290px")}</div>
            <p class="product__name">{n}</p>
          </li>''' for i, (t, b, x, n) in enumerate(PRODUCTS, 1))

    cut_cls = "body cut__body"
    cut_style = " cut--fixed" if L["cut_w"] else ""

    doc = f'''<!doctype html>
<html lang="{L["lang"]}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- status bar / browser chrome tint: the page's black-noise background on average -->
  <meta name="theme-color" content="#101010" />
  <title>All About Noirs — CUT 01. URBAN EXOSKELETON</title>
  <meta name="description" content="{e(L["desc"])}" />
  <link rel="icon" href="{R}favicon.ico" sizes="48x48" />
  <link rel="icon" href="{R}favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="{R}apple-touch-icon.png" />
  <link rel="manifest" href="{R}site.webmanifest" />
{share}
{alternates}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500&display=swap" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />{jp_font}{en_font}
  <link rel="stylesheet" href="{{R}}style.css?v={VER}" />
  <script type="importmap">{{ "imports": {{ "three": "https://unpkg.com/three@0.160.0/build/three.module.min.js" }} }}</script>
  <script>
    // The intro plays once, on the first arrival in this browsing session —
    // not on a reload, Back/Forward, or a language change.
    (function () {{
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      if (nav && nav.type !== "navigate") return;
      try {{
        if (sessionStorage.getItem("aans:intro-seen")) return;
        sessionStorage.setItem("aans:intro-seen", "1");
      }} catch (e) {{}}
      document.documentElement.classList.add("intro-active");
    }})();
  </script>
</head>
<body>
  <!-- Intro (A_Intro): full-screen layer over the top of the page; see intro/intro.js -->
  <div class="gate" aria-label="All About Noirs — Urban Exoskeleton">
    <canvas class="gate__canvas" aria-hidden="true"></canvas>
    <span class="gate__cursor" aria-hidden="true">Scroll</span>
    <!-- copy builds up one piece at a time (intro/intro.js adds .s1–.s5 to .gate) -->
    <div class="gate__copy">
      <p class="gate__title">
        <span class="gate__word gate__word--first"><span>All About Noirs</span></span>
        <span class="gate__slot gate__slot--rule" aria-hidden="true"><span><span class="gate__rule"></span></span></span>
        <span class="gate__slot gate__slot--word"><span class="gate__word"><span>Urban Exoskeleton</span></span></span>
      </p>
      <div class="gate__subslot">
        <div>
          <p class="gate__sub">
            <span class="gate__line"><span>We Designed Urban Exoskeleton</span></span>
            <span class="gate__line"><span>Enclosed, Not Exposed</span></span>
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Header: logo + language, blended over whatever scrolls beneath it -->
  <header class="header">
    <a class="header__logo" data-t="logo" href="{{R}}{L["dir"] + "/" if L["dir"] else ""}index.html" aria-label="All About Noirs">
{LOGO_SVG}
    </a>
    <nav class="lang" data-t="lang" aria-label="Language">
      <button class="lang__current" type="button" aria-expanded="false" aria-controls="lang-menu">{label(key)}</button>
      <ul class="lang__menu" id="lang-menu">
{menu}
      </ul>
    </nav>
  </header>

  <!-- scroll position (the page's own scrollbar is hidden) -->
  <div class="progress" aria-hidden="true"><span class="progress__thumb"></span></div>

  <main>
    <!-- 00_Key Visual: full viewport, the design's crop kept centered -->
    <section class="kv">
      <div class="kv__media">
        {img("kv-02-0644", "(max-aspect-ratio: 1440/990) 342vh, 235vw", lazy=False, extra=' fetchpriority="high"')}
      </div>
      <div class="kv__text">
        <p class="kv__line" style="--b:444;--i:0">CUT 01. URBAN EXOSKELETON</p>
        <p class="kv__line" style="--b:414;--i:1">Eastern Structure</p>
        <p class="kv__line" style="--b:301;--i:2">All About Noirs</p>
        <p class="kv__line" style="--b:50;--i:3">Enclosed, Not Exposed</p>
      </div>
    </section>

    <!-- 02_Collection Info -->
    <section class="intro reveal">
      <h2 class="title">WE DESIGNED URBAN EXOSKELETON</h2>
      <div class="body intro__body" data-t="intro" style="--w:{L["intro_w"]};--box:{L["intro_box"]}">
{lines(L["intro"], 8, L["lang"])}
      </div>
    </section>

    <!-- 01_AANS Info: full-bleed image with overlaid copy -->
    <section class="full">
      <div class="crop full__media" style="--fw:1440;--fh:816">
        {img("04-1633_B-1", "100vw")}
      </div>
      <div class="body full__text" data-t="full" style="--tw:{L["full_w"]}">
{lines(L["full"], 8, L["lang"])}
      </div>
    </section>

    <!-- Lookbook grid -->
    <section class="pair">
      {thumb("02-0533_A-1")}
      {thumb("02-0786_A-1")}
    </section>
    <section class="pair">
      {thumb("03-0896_A-1")}
      {thumb("01-0074_A-1")}
    </section>

    <section class="cut reveal{cut_style}" data-t="cut">
      <h2 class="title">CUT 01. URBAN EXOSKELETON</h2>
      <div class="{cut_cls}">
{lines(L["cut"], 8, L["lang"])}
      </div>
    </section>

    <section class="pair">
      {thumb("07-2338_B-3")}
      {thumb("07-2308_B-2")}
    </section>

    <!-- Story rows: image left, copy right -->
{chr(10).join(stories)}

    <!-- Closing: collection carousel + launch info over the stencil graphic -->
    <section class="outro">
      <div class="outro__graphic" aria-hidden="true">
        {img("footer-graphic", "(max-width: 767px) 180vw, 123vw")}
      </div>

      <div class="collection">
        <h2 class="title collection__title">URBAN EXOSKELETON Collection <small class="collection__sub">Pop-up Exclusive Preview</small></h2>
        <ul class="collection__track" data-drag-scroll data-lenis-prevent-horizontal>
{products}
        </ul>
      </div>

      <div class="launch reveal">
        <div class="launch__lines">
          <p>LAUNCH POP-UP</p>
          <p>CUT 01. URBAN EXOSKELETON</p>
          <p>2026. 10.24 SAT - 11.01 SUN</p>
        </div>
        <p class="launch__place">RAND OMOTESANDO TOKYO</p>
      </div>

      <footer class="footer">
        <p class="footer__copy">© 2026 All About Noirs</p>
        <button class="footer__top" type="button" data-to-top>
          Go to top
          <svg width="8" height="9" viewBox="0 0 7 8" fill="none" aria-hidden="true"><path d="M3.5 7.5V1M1 3.5 3.5 1 6 3.5" stroke="currentColor" stroke-width="0.8"/></svg>
        </button>
      </footer>
    </section>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"></script>
  <script src="{{R}}main.js?v={VER}"></script>
  <script type="module" src="{{R}}intro/intro.js?v={VER}" onerror="window.aansSkipIntro && window.aansSkipIntro()"></script>
</body>
</html>
'''
    return doc.replace("{R}", R)


os.makedirs(OUT, exist_ok=True)

# the intro module's own imports carry the same version
import re
_intro = os.path.join(OUT, "intro", "intro.js")
_src = open(_intro).read()
_src = re.sub(r'from "\./(shaders|logoTexture)\.js(\?v=\w+)?"', lambda m: f'from "./{m.group(1)}.js?v={VER}"', _src)
open(_intro, "w").write(_src)
_lt = os.path.join(OUT, "intro", "logoTexture.js")
_src = open(_lt).read()
_src = re.sub(r'from "\./sdf\.js(\?v=\w+)?"', f'from "./sdf.js?v={VER}"', _src)
open(_lt, "w").write(_src)
for key, L in LANGS.items():
    d = os.path.join(OUT, L["dir"]) if L["dir"] else OUT
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w") as f:
        f.write(page(key))
print("built", OUT)
