import * as THREE from "three";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "./shaders.js?v=20261002093325";
import { loadLogoTexture } from "./logoTexture.js?v=20261002093325";

// Intro (Figma A_Intro, 2597:1545), layered over the top of the home page.
//
// The sdf-lens-blur logo masks the home key-visual photo. The intro holds the
// screen as one full page while scrolling scrubs through it: the logo grows
// from the screen centre, accelerating, its edges kept crisp so the mask
// reads as opening up; over the last stretch the whole layer fades out and
// uncovers the home page's first screen underneath. Nothing plays on its own — it moves only as far as the
// visitor scrolls; once scrolled all the way through the page carries on.
// It plays once per visit: after the hand-over the layer is removed and
// scrolling back up simply scrolls the page.
//
// Design geometry (1440×990 frame):
//   glyph box   x 335.5–1104, y 229.6–749.9 (520 tall, centred, 5px above middle)
//   photo       the home KV: 3390px box at (-501, -284), i.e. sized by
//               max(235vw, 342vh) with (36.02%, 28.37%) at the screen centre
//   zoom        around the glyph's own centre, which stays at the screen centre
const DESIGN = { w: 1440, h: 990 };
const GLYPH = { h: 520, cy: 489.8, aspect: 68 / 46 };
const PHOTO = { box: 3390, aspect: 3390 / 2746, fx: 0.3602, fy: 0.2837 };
const PAD = 0.22; // logoTexture's padding on each side
const ZOOM_MAX = 5; // logo scale at the end of the zoom
const TOUCH = window.matchMedia("(hover: none)").matches;
const FADE_FROM = 0.55; // the layer starts fading onto home here (0–1 of the scroll)
const FILL_BLUR = 0.22; // gaussian defocus once the logo fills the screen (screen-height units)
const SURFACE = 2600; // ms for the symbol to come into focus after s5
const SCRUB = 0.75; // viewport heights of scrolling to go through the whole intro
const COMMIT = 0.6; // past this, letting go glides the rest of the way
const asset = (path) => new URL(path, import.meta.url).href;

const root = document.documentElement;
const overlay = document.querySelector(".gate");
const canvas = overlay?.querySelector(".gate__canvas");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
const lenis = window.aansLenis ?? null;

const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

// Hand the page back: overlay off, scrolling on, KV copy + header in.
function finish() {
  root.classList.remove("intro-active");
  root.classList.add("intro-done");
  lenis?.start();
  window.dispatchEvent(new Event("intro:done"));
}

// ---------- staged opening ----------
// s1 "All About Noirs" → s2 rule → s3 "Urban Exoskeleton" → s4 subline →
// s5 the masked symbol surfaces behind. Scrolling does nothing until all of
// it — every piece of copy and the symbol settling into focus — has played.
// 0.65s between the title pieces, then longer pauses: 1.2s before the
// subline and 1.5s before the symbol
const STEPS = [
  ["s1", 400],
  ["s2", 1050],
  ["s3", 1700],
  ["s4", 2900],
  ["s5", 4400],
];
let symbolAt = null; // time the symbol starts surfacing (performance.now())
let openingDone = false;
const stepTimers = [];

function setStep(name) {
  overlay.classList.add(name);
  if (name === "s5" && symbolAt === null) {
    symbolAt = performance.now();
    openingDone = true;
  }
}

function completeOpening() {
  stepTimers.forEach(clearTimeout);
  STEPS.forEach(([name]) => setStep(name));
}

// Split each word / line into letters so they can rise one after another.
// The readable text stays on the parent (aria-label); letters are hidden
// from assistive tech.
function splitLetters() {
  overlay.querySelectorAll(".gate__word > span, .gate__line > span").forEach((el) => {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const c = document.createElement("span");
      c.className = "gate__char";
      c.setAttribute("aria-hidden", "true");
      c.style.setProperty("--i", i);
      c.textContent = ch === " " ? "\u00a0" : ch;
      el.append(c);
    });
  });
  overlay.classList.add("is-split");
}

function runOpening() {
  splitLetters();
  if (reduced.matches) {
    // no motion: everything is simply there, and scrolling works right away
    completeOpening();
    symbolAt = performance.now() - SURFACE;
    return;
  }
  // start once the fonts are in, so widths don't jump mid-animation
  const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1200))]);
  fonts.then(() => {
    const t0 = performance.now();
    STEPS.forEach(([name, at]) => stepTimers.push(setTimeout(() => setStep(name), Math.max(at - (performance.now() - t0), 0))));
  });
}

if (overlay && root.classList.contains("intro-active")) {
  runOpening();
  start().catch(() => {
    // WebGL / assets unavailable: skip straight to the page
    overlay.remove();
    finish();
  });
}

async function start() {
  lenis?.stop();
  window.scrollTo(0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: true, antialias: false });
  const loader = new THREE.TextureLoader();
  const loadTex = (url) =>
    new Promise((resolve, reject) =>
      loader.load(
        url,
        (t) => {
          t.minFilter = THREE.LinearFilter;
          t.generateMipmaps = false;
          resolve(t);
        },
        undefined,
        reject
      )
    );

  // (the sharp photo isn't needed: inside the symbol the real home KV shows)
  const [{ texture: logoSdf, aspect: logoAspect }, photoBlur, grain, bgNoise] = await Promise.all([
    loadLogoTexture(asset("img/logo-mark.svg")),
    loadTex(asset("img/kv-blur.webp")),
    loadTex(asset("img/grain.webp")),
    loadTex(asset("../img/noise@2x.webp")), // the page background tile
  ]);
  bgNoise.wrapS = bgNoise.wrapT = THREE.RepeatWrapping;
  bgNoise.needsUpdate = true;
  // grain is read texel-for-pixel: no filtering, tiled
  grain.magFilter = grain.minFilter = THREE.NearestFilter;
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.needsUpdate = true;

  const mouseTarget = new THREE.Vector2();
  const mouse = new THREE.Vector2();
  const res = new THREE.Vector2();
  const anchorLogo = new THREE.Vector2(0.5, 0.5); // the glyph's centre (it's centred in the SDF texture)
  const anchorScreen = new THREE.Vector2();
  const photoRect = new THREE.Vector4();

  const uniforms = {
    u_mouse: { value: mouse },
    u_resolution: { value: res },
    u_pixelRatio: { value: 1 },
    u_logoSdf: { value: logoSdf },
    u_logoAspect: { value: logoAspect },
    u_logoScale: { value: 0.46 },
    u_anchorLogo: { value: anchorLogo },
    u_anchorScreen: { value: anchorScreen },
    u_maxBlur: { value: 0.11 },
    u_aperture: { value: 1.4 },
    u_glowIntensity: { value: 0.35 },
    u_lensScale: { value: 1 },
    u_bg: { value: bgNoise },
    u_bgTile: { value: 128 },
    u_photoBlur: { value: photoBlur },
    u_clear: { value: 0 },
    u_photoRect: { value: photoRect },
    u_zoomBlur: { value: 0 },
    u_grain: { value: 0.11 }, // ≈ the previous strength (tile sd 0.33 after scaling to -1..1)
    u_grainTex: { value: grain },
  };

  const scene = new THREE.Scene();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  scene.add(new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, uniforms })));
  const camera = new THREE.Camera();

  let vw = 0;
  let vh = 0;
  let dpr = 1;
  let mouseMoved = false;
  const designScale = () => Math.max(vw / DESIGN.w, vh / DESIGN.h);
  // glyph height on screen: design size, but never wider than 86% of a narrow screen
  const glyphHeight = () => Math.min(GLYPH.h * designScale(), (0.86 * vw) / GLYPH.aspect);
  // until the mouse moves, the lens rests where the design's capture had it
  const restMouse = () => {
    const g = glyphHeight() / GLYPH.h;
    mouseTarget.set(vw / 2 + 150 * g, vh / 2 + 190 * g);
  };

  // ---------- state ----------
  // "intro"  overlay up; scrolling scrubs p between 0 and 1
  // "home"   handed over; the overlay is gone and the page scrolls normally
  let state = "intro";
  let target = 0; // where the scroll input has taken the intro
  let p = 0; // eased toward target every frame
  let raf = 0;
  let last = performance.now() * 0.001;

  const render = () => {
    const glyphH = glyphHeight();
    // the lens keeps its size relative to the logo (design: glyph = 52.5% of the height)
    uniforms.u_lensScale.value = glyphH / vh / (GLYPH.h / DESIGN.h);
    const baseScale = glyphH / vh / (1 - 2 * PAD) / 2; // half texture height, viewport-height units
    // zoom on a log scale: it responds from the very first scroll and still
    // feels like it's speeding up as the logo gets bigger
    const zoomT = Math.min(p, 1);
    // surfacing (s5): comes into focus and settles to size over ~2.6s
    const surf = symbolAt === null ? 0 : Math.min((performance.now() - symbolAt) / SURFACE, 1);
    const settle = 1 - (1 - surf) ** 3; // ease-out
    uniforms.u_logoScale.value = baseScale * (0.92 + 0.08 * settle) * Math.exp(Math.log(ZOOM_MAX) * zoomT);
    // edges stay crisp while it grows, then defocus as it fills the screen
    // (from 45%, easing in) so it passes like a lens rather than a wall
    uniforms.u_zoomBlur.value = 0.14 * (1 - settle) ** 2 + FILL_BLUR * smooth(0.45, 1, p) ** 1.5;
    // the photo inside clears over 15–50% of the scroll, before the fade
    // begins; squared so it stays soft at first and sharpens toward the end
    uniforms.u_clear.value = smooth(0.15, 0.5, p) ** 2;

    // the glyph's centre sits 5px (design) above the screen centre at rest and
    // eases onto it, so the logo grows evenly in every direction
    const restY = -((GLYPH.cy - DESIGN.h / 2) * designScale()) / vh; // uv y is up
    anchorScreen.set(0, restY * (1 - zoomT));

    // photo: fixed at the home KV placement throughout
    // (mobile: zoomed out onto the face — same numbers as style.css)
    const mobile = vw <= 767;
    const fx = mobile ? 0.38 : PHOTO.fx;
    const fy = mobile ? 0.3 : PHOTO.fy;
    const pw = mobile
      ? Math.max((0.5 / 0.38) * vw, 1.8 * PHOTO.aspect * vh)
      : Math.max((PHOTO.box / DESIGN.w) * vw, (PHOTO.box / DESIGN.h) * vh);
    const ph = pw / PHOTO.aspect;
    photoRect.set((vw / 2 - fx * pw) * dpr, (vh / 2 - fy * ph) * dpr, pw * dpr, ph * dpr);

    // the layer fades over the last stretch, uncovering the home page
    overlay.style.setProperty("--p", p.toFixed(4));
    overlay.style.opacity = (1 - smooth(FADE_FROM, 1, p)).toFixed(4);
    renderer.render(scene, camera);
  };

  const resize = () => {
    vw = window.innerWidth;
    vh = overlay.clientHeight || window.innerHeight; // the overlay's own height (100lvh), as the KV's
    // phones have dense screens: a full-screen blur at 2–3× drops frames
    dpr = Math.min(window.devicePixelRatio, TOUCH ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(vw, vh, false);
    res.set(vw * dpr, vh * dpr);
    uniforms.u_pixelRatio.value = dpr;
    uniforms.u_bgTile.value = 128 * dpr;
    if (!mouseMoved) {
      restMouse();
      mouse.copy(mouseTarget);
    }
    if (state !== "home") render();
  };
  resize();
  window.addEventListener("resize", resize);
  // "SCROLL" label that stands in for the pointer once the intro is open
  const cursorEl = overlay.querySelector(".gate__cursor");
  const cursorPos = new THREE.Vector2();
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (!mouseMoved) cursorPos.set(e.clientX, e.clientY); // no fly-in from the corner
    mouseMoved = true;
    mouseTarget.set(e.clientX, e.clientY);
    overlay.classList.add("has-pointer");
  });
  document.documentElement.addEventListener("mouseleave", () => overlay.classList.remove("has-pointer"));

  // Touch screens have no pointer to follow, so there the lens follows the
  // finger while it's down, and stays where the finger left it.
  const touchOnly = window.matchMedia("(hover: none)").matches;
  if (touchOnly) {
    const follow = (e) => {
      const tp = e.touches[0];
      if (!tp) return;
      mouseMoved = true; // keep this spot on resize, like a mouse position
      mouseTarget.set(tp.clientX, tp.clientY);
    };
    window.addEventListener("touchstart", follow, { passive: true });
    window.addEventListener("touchmove", follow, { passive: true });
  }

  const frame = (now) => {
    raf = 0;
    if (state === "home") return;
    const t = now * 0.001;
    // rAF's timestamp can be a little earlier than the performance.now() taken
    // when the loop was (re)started, so never let dt go negative: a negative
    // step makes the damping jump *away* from the target (a visible twitch)
    const dt = Math.min(Math.max(t - last, 0), 0.1);
    last = Math.max(t, last);
    mouse.x = THREE.MathUtils.damp(mouse.x, mouseTarget.x, touchOnly ? 4 : 8, dt);
    mouse.y = THREE.MathUtils.damp(mouse.y, mouseTarget.y, 8, dt);
    // the label trails the pointer a little, softer than the pointer itself
    cursorPos.x = THREE.MathUtils.damp(cursorPos.x, mouseTarget.x, 16, dt);
    cursorPos.y = THREE.MathUtils.damp(cursorPos.y, mouseTarget.y, 16, dt);
    if (cursorEl) cursorEl.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`;

    // follow the scroll input with the same soft easing as the page scroll
    if (!overlay.classList.contains("is-open") && opened()) overlay.classList.add("is-open");
    p = reduced.matches ? target : THREE.MathUtils.clamp(THREE.MathUtils.damp(p, target, 10, dt), 0, 1);
    // settle exactly on the target (the damp only approaches it asymptotically;
    // the ends need an exact 0 / 1 so the hand-over can't hang at 99.x%)
    if (Math.abs(target - p) < 0.004) p = target;
    render();

    if (p >= 1 && target >= 1) {
      // scrolled all the way through: hand over to the page for good
      state = "home";
      finish();
      renderer.dispose();
      overlay.remove();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  const loop = () => {
    last = performance.now() * 0.001;
    if (!raf) raf = requestAnimationFrame(frame);
  };

  // move the intro by a scroll distance in px (positive = down)
  let idle = 0;
  // scrolling only works once the opening has fully played
  const opened = () => openingDone && performance.now() - symbolAt >= SURFACE;
  const scrub = (dy) => {
    if (!opened()) return;
    target = Math.min(Math.max(target + dy / (SCRUB * vh), 0), 1);
    loop();
    // once the input pauses: past COMMIT going down, finish the move for them
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (state === "intro" && dy > 0 && target >= COMMIT) {
        target = 1;
        loop();
      }
    }, 160);
  };

  // ---------- input ----------
  const wheelPx = (e) => e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? vh : 1);

  window.addEventListener(
    "wheel",
    (e) => {
      const dy = wheelPx(e);
      if (state !== "intro" || !overlay.isConnected) return;
      e.preventDefault();
      scrub(dy);
    },
    { passive: false, capture: true }
  );

  let touchY = null;
  window.addEventListener("touchstart", (e) => (touchY = e.touches[0].clientY), { passive: true });
  window.addEventListener("touchend", () => (touchY = null), { passive: true });
  window.addEventListener(
    "touchmove",
    (e) => {
      if (touchY === null) return;
      const y = e.touches[0].clientY;
      const dy = (touchY - y) * 1.6; // finger up = scroll down; a little extra travel per swipe
      if (state !== "intro" || !overlay.isConnected) return;
      e.preventDefault();
      touchY = y;
      scrub(dy);
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    const step = { ArrowDown: 0.12, PageDown: 0.35, " ": 0.35, ArrowUp: -0.12, PageUp: -0.35, Home: -1 }[e.key];
    if (step === undefined || state !== "intro" || !overlay.isConnected) return;
    e.preventDefault();
    scrub(step * SCRUB * vh);
  });

  root.classList.add("intro-ready");
  loop();
}
