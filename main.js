// Width of a classic scrollbar (0 for overlay scrollbars), used by the CSS
// design scale so layout matches the design at the real page width.
const setScrollbarWidth = () =>
  document.documentElement.style.setProperty("--sbw", `${window.innerWidth - document.documentElement.clientWidth}px`);
setScrollbarWidth();
window.addEventListener("resize", setScrollbarWidth);

// Smooth wheel scrolling (Lenis). Touch keeps native momentum, and Lenis
// switches itself off for prefers-reduced-motion. Horizontal gestures over
// the collection track pass through to its own scroll.
const lenis = window.Lenis ? new window.Lenis({ autoRaf: true, lerp: 0.09 }) : null;
window.aansLenis = lenis; // shared with intro/intro.js

// Safety net for the intro: if it can't run (its module blocked — e.g. Chrome
// opening the page straight from disk via file:// — failed to load, or no
// WebGL), drop it and hand the page over so scrolling is never left locked.
window.aansSkipIntro = () => {
  const root = document.documentElement;
  if (!root.classList.contains("intro-active")) return;
  document.querySelector(".gate")?.remove();
  root.classList.remove("intro-active");
  root.classList.add("intro-done");
  lenis?.start();
  window.dispatchEvent(new Event("intro:done"));
};
if (document.documentElement.classList.contains("intro-active")) {
  if (location.protocol === "file:") window.aansSkipIntro();
  // the intro marks itself ready once its WebGL scene is up
  else
    setTimeout(() => {
      if (!document.documentElement.classList.contains("intro-ready")) window.aansSkipIntro();
    }, 10000);
}

// Jump (no easing) by a pixel delta, keeping Lenis in sync.
function scrollByInstant(dy) {
  const y = window.scrollY + dy;
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

// Key visual: start the load-in once the photo is decoded, then feed scroll
// progress (0 at top → 1 when the KV has scrolled away) into --kv-p.
const kv = document.querySelector(".kv");
if (kv) {
  const photo = kv.querySelector(".kv__media img");
  // Start on the photo's load event (or right away if it's cached), with a
  // time cap so a slow connection never leaves the first screen black.
  let started = false;
  const ready = () => {
    if (started) return;
    started = true;
    kv.offsetWidth; // commit the initial (zoomed, transparent) state first
    kv.classList.add("is-ready");
  };
  if (document.documentElement.classList.contains("intro-active")) {
    // The intro fades straight onto the finished first screen: photo, copy
    // and header are all in place underneath it from the start.
    ready();
  } else if (photo.complete && photo.naturalWidth) ready();
  else {
    photo.addEventListener("load", ready, { once: true });
    photo.addEventListener("error", ready, { once: true });
    setTimeout(ready, 2500);
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let last = -1;
  const update = () => {
    const p = reduced.matches ? 0 : Math.min(Math.max(window.scrollY / kv.offsetHeight, 0), 1);
    if (p !== last) kv.style.setProperty("--kv-p", (last = p).toFixed(4));
  };
  if (lenis) lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

// Footer "Go to top": glide back to the top of the page.
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-to-top]")) return;
  if (lenis) lenis.scrollTo(0, { duration: 1.6, easing: (t) => 1 - (1 - t) ** 4 });
  else window.scrollTo({ top: 0, behavior: "smooth" });
});

// GNB logo: collapse the wordmark into the A+S symbol once the page moves,
// open it again back at the top (the motion itself is CSS, see .logo__*).
const header = document.querySelector(".header");
if (header) {
  const update = () => {
    const y = lenis ? lenis.scroll : window.scrollY;
    header.classList.toggle("is-compact", y > 40);
  };
  if (lenis) lenis.on("scroll", update);
  window.addEventListener("scroll", update, { passive: true });
  update();
}

// Scroll progress on the right edge (the page's own scrollbar is hidden).
const progress = document.querySelector(".progress");
if (progress) {
  let idle = 0;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const y = lenis ? lenis.scroll : window.scrollY;
    progress.style.setProperty("--thumb-h", Math.min(window.innerHeight / doc.scrollHeight, 1).toFixed(4));
    progress.style.setProperty("--thumb-y", (max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0).toFixed(4));
  };
  const onScroll = () => {
    update();
    progress.classList.add("is-scrolling");
    clearTimeout(idle);
    idle = setTimeout(() => progress.classList.remove("is-scrolling"), 700);
  };
  if (lenis) lenis.on("scroll", onScroll);
  else window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update);
  new ResizeObserver(update).observe(document.body); // page height changes (images, copy swaps)
  update();
}

// Fade sections in as they enter the viewport.
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  },
  { rootMargin: "0px 0px -10% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Collection track: moves card by card with a slow, rhythmic ease.
//   drag (mouse or touch) — the track follows the finger with a little
//     weight, then on release settles onto the nearest card, carrying the
//     flick's momentum at most a couple of cards further
//   trackpad swipe / shift+wheel — one card per gesture; further input is
//     held until the current move has mostly landed, so a long swipe reads
//     as a steady beat instead of a blur
// Each move eases in, travels, and lands softly (≈1.1s, a bit longer when
// crossing several cards).
document.querySelectorAll("[data-drag-scroll]").forEach((track) => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = [...track.children];
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // cubic
  const easeOut = (t) => 1 - (1 - t) ** 4; // quart: for moves that start already in motion

  const maxScroll = () => track.scrollWidth - track.clientWidth;
  const clamp = (v) => Math.min(Math.max(v, 0), maxScroll());
  // Snap stops: each card's left edge, plus the very end of the track.
  const stops = () => {
    const base = items[0].offsetLeft;
    const list = items.map((el) => clamp(el.offsetLeft - base));
    return [...new Set([...list, maxScroll()])].sort((a, b) => a - b);
  };
  const nearestIndex = (x, list = stops()) =>
    list.reduce((best, v, i) => (Math.abs(v - x) < Math.abs(list[best] - x) ? i : best), 0);

  let anim = null; // { from, to, start, duration, ease }
  let raf = 0;
  let index = 0;

  const frame = (now) => {
    raf = 0;
    if (!anim) return;
    const t = Math.min((now - anim.start) / anim.duration, 1);
    track.scrollLeft = anim.from + (anim.to - anim.from) * anim.ease(t);
    if (t < 1) raf = requestAnimationFrame(frame);
    else anim = null;
  };

  const goTo = (i, ease = easeInOut) => {
    const list = stops();
    index = Math.min(Math.max(i, 0), list.length - 1);
    const to = list[index];
    const from = track.scrollLeft;
    if (reduced.matches || Math.abs(to - from) < 1) {
      anim = null;
      track.scrollLeft = to;
      return;
    }
    const cards = Math.abs(to - from) / (items[0].offsetWidth || 300);
    const duration = Math.min(1100 + Math.max(cards - 1, 0) * 180, 1800);
    anim = { from, to, start: performance.now(), duration, ease };
    if (!raf) raf = requestAnimationFrame(frame);
  };

  const progress = () => (anim ? (performance.now() - anim.start) / anim.duration : 1);

  // --- drag (mouse + touch; vertical touch still scrolls the page) ---
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  let dragTarget = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0; // px per ms, pointer direction

  const follow = () => {
    if (!dragging) return;
    track.scrollLeft += (dragTarget - track.scrollLeft) * 0.22; // a little weight behind the pointer
    requestAnimationFrame(follow);
  };

  track.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    anim = null;
    startX = lastX = e.clientX;
    lastT = e.timeStamp;
    startScroll = dragTarget = track.scrollLeft;
    velocity = 0;
    track.classList.add("is-dragging");
    track.setPointerCapture(e.pointerId);
    requestAnimationFrame(follow);
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dt = Math.max(e.timeStamp - lastT, 1);
    velocity = velocity * 0.6 + ((e.clientX - lastX) / dt) * 0.4;
    lastX = e.clientX;
    lastT = e.timeStamp;
    dragTarget = clamp(startScroll - (e.clientX - startX));
  });

  const release = (e) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    // a mouse click without a drag steps one card toward the side clicked
    if (arrow && e.type === "pointerup" && e.pointerType === "mouse" && Math.abs(e.clientX - startX) < 6) {
      track.scrollLeft = startScroll;
      step(sideOf(e.clientX));
      return;
    }
    const list = stops();
    const moving = e.timeStamp - lastT < 80 ? velocity : 0;
    // project where the flick would coast to, then land on a card near it
    const projected = dragTarget - Math.min(Math.max(moving, -2), 2) * 180;
    let i = nearestIndex(projected, list);
    const from = nearestIndex(startScroll, list);
    i = Math.min(Math.max(i, from - 2), from + 2); // at most two cards per flick
    goTo(i, easeOut);
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  // --- trackpad swipe / shift+wheel: one card per beat ---
  let wheelSum = 0;
  let wheelTimer = 0;
  track.addEventListener(
    "wheel",
    (e) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontal && !e.shiftKey) return; // vertical wheel scrolls the page
      e.preventDefault();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => (wheelSum = 0), 180); // gesture ended
      if (progress() < 0.72) return; // let the current move land first
      wheelSum += horizontal ? e.deltaX : e.deltaY;
      if (Math.abs(wheelSum) < 24) return;
      const dir = Math.sign(wheelSum);
      wheelSum = 0;
      if (!anim) index = nearestIndex(track.scrollLeft);
      goTo(index + dir);
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    if (!dragging && !anim) track.scrollLeft = stops()[Math.min(index, stops().length - 1)];
  });

  // --- desktop: an arrow follows the mouse in place of the cursor ---
  // "←" over the left half, "→" over the right half; a click moves two cards that way
  // (see release).
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  var arrow = null;
  const sideOf = (x) => {
    const r = track.getBoundingClientRect();
    return x < r.left + r.width / 2 ? -1 : 1;
  };
  function step(dir) {
    if (!anim) index = nearestIndex(track.scrollLeft);
    goTo(index + dir * 2); // two cards per click
  }
  if (fine.matches) {
    arrow = document.createElement("div");
    arrow.className = "track-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = '<span class="track-arrow__glyph">←</span>';
    document.body.append(arrow);
    track.classList.add("has-arrow");

    let x = 0, y = 0, ax = 0, ay = 0, follow = 0, side = 0;
    const tick = () => {
      ax += (x - ax) * 0.25;
      ay += (y - ay) * 0.25;
      arrow.style.transform = `translate3d(${ax}px, ${ay}px, 0) translate(-50%, -50%)`;
      follow = Math.abs(x - ax) + Math.abs(y - ay) > 0.1 || arrow.classList.contains("is-on")
        ? requestAnimationFrame(tick)
        : 0;
    };
    track.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      ax = x = e.clientX;
      ay = y = e.clientY;
      arrow.classList.add("is-on");
      if (!follow) follow = requestAnimationFrame(tick);
    });
    track.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      arrow.classList.toggle("is-right", (side = sideOf(x)) > 0);
    });
    track.addEventListener("pointerleave", () => arrow.classList.remove("is-on"));
  }
});

// Language switcher: toggle the locale list, close on outside click / Escape.
// Delegated from document so it keeps working after the nav is swapped.
const setLangOpen = (open) => {
  const lang = document.querySelector(".lang");
  if (!lang) return;
  lang.classList.toggle("is-open", open);
  lang.querySelector(".lang__current")?.setAttribute("aria-expanded", String(open));
};

document.addEventListener("click", (e) => {
  if (e.target.closest(".lang__current")) {
    setLangOpen(!document.querySelector(".lang").classList.contains("is-open"));
  } else if (!e.target.closest(".lang")) {
    setLangOpen(false);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setLangOpen(false);
});

// Changing language keeps the reader where they are: the other language's
// page is fetched and only its copy ([data-t] blocks) is swapped in. The
// section at the top of the viewport is pinned to the same screen position,
// since translated copy can be a few lines longer or shorter.
// (Pages opened straight from disk can't fetch, so there it falls back to a
// normal page load that restores the same position afterwards.)
const ANCHOR_KEY = "aans:lang-anchor";
// We place the reader ourselves on language changes (incl. Back/Forward).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function readAnchor() {
  const sections = [...document.querySelectorAll("main > section")];
  const index = sections.findIndex((el) => el.getBoundingClientRect().bottom > 0);
  const el = sections[Math.max(index, 0)];
  return { index: Math.max(index, 0), top: el.getBoundingClientRect().top };
}

function restoreAnchor({ index, top }) {
  const el = document.querySelectorAll("main > section")[index];
  if (el) scrollByInstant(el.getBoundingClientRect().top - top);
}

// Relative URLs are pinned to absolute ones first (links in the swapped-in
// copy come from another page's folder)
// (e.g. responsive images picking another srcset candidate), so pin them.
// Stylesheet <link>s are left alone: rewriting their href makes the browser
// fetch them again, and for that moment the page is unstyled (images at full
// size), which threw the scroll position off on the first switch. Their
// address as first loaded is kept in data-abs for comparisons instead.
document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => (l.dataset.abs = l.href));
function absolutizeUrls() {
  document.querySelectorAll("[src]").forEach((el) => el.setAttribute("src", el.src));
  document.querySelectorAll('link[href]:not([rel="stylesheet"]), a[href]').forEach((el) => el.setAttribute("href", el.href));
  document.querySelectorAll("[srcset]").forEach((el) => {
    const set = el.getAttribute("srcset").split(",").map((part) => {
      const [url, size] = part.trim().split(/\s+/);
      return `${new URL(url, document.baseURI).href} ${size ?? ""}`.trim();
    });
    el.setAttribute("srcset", set.join(", "));
  });
}

function copyBlock(from, to) {
  const wasVisible = to.classList.contains("is-visible");
  for (const { name } of [...to.attributes]) to.removeAttribute(name);
  for (const { name, value } of from.attributes) to.setAttribute(name, value);
  if (wasVisible) to.classList.add("is-visible");
  to.innerHTML = from.innerHTML;
}

async function switchLanguage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const next = new DOMParser().parseFromString(await res.text(), "text/html");
  // Resolve the fetched page's relative URLs against its own address.
  const base = next.createElement("base");
  base.href = url;
  next.head.prepend(base);
  next.querySelectorAll("a[href]").forEach((a) => a.setAttribute("href", a.href));

  const anchor = readAnchor();
  absolutizeUrls();
  // Point the address at the new language (replacing, not adding, a history
  // entry) so a reload stays on it.
  history.replaceState(history.state, "", url);

  document.documentElement.lang = next.documentElement.lang;
  document.title = next.title;
  const desc = next.querySelector('meta[name="description"]');
  document.querySelector('meta[name="description"]')?.setAttribute("content", desc?.content ?? "");
  // Pull in any stylesheet the other language needs (Noto Sans JP for JP).
  next.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = new URL(link.getAttribute("href"), url).href;
    if (![...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => (l.dataset.abs || l.href) === href)) {
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      el.dataset.abs = href;
      document.head.append(el);
    }
  });

  next.querySelectorAll("[data-t]").forEach((from) => {
    const to = document.querySelector(`[data-t="${from.dataset.t}"]`);
    if (to) copyBlock(from, to);
  });
  restoreAnchor(anchor);
}

document.addEventListener("click", (e) => {
  const link = e.target.closest(".lang__menu a");
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  setLangOpen(false);
  switchLanguage(link.href).catch(() => {
    try {
      sessionStorage.setItem(ANCHOR_KEY, JSON.stringify(readAnchor()));
    } catch {}
    location.href = link.href;
  });
});


try {
  const saved = sessionStorage.getItem(ANCHOR_KEY);
  if (saved) {
    sessionStorage.removeItem(ANCHOR_KEY);
    restoreAnchor(JSON.parse(saved));
  }
} catch {}
