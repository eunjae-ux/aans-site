// Footer stencil graphic ("그래픽 최종"), set in motion in WebGL.
//
// The artwork itself is the picture — the page's own <img> of it is the
// texture, so it looks exactly like the original when still and costs no
// extra download. The motion is all code, and deliberately uneven:
//   - the drips run and the overspray drifts, on a clock whose speed keeps
//     wandering (slow, then a little quicker, then nearly still)
//   - now and then a gust passes through and stirs it more strongly
//   - the grain "boils" like hand-drawn animation: it re-jitters on an
//     irregular beat, and individual particles flicker
//   - the stencil band (ALL ABOUT NOIRS) moves far less, so it stays legible
//   - around the pointer the paint builds up as if sprayed on
// Until the first frame is drawn — or without WebGL — the <img> shows as is.

const box = document.querySelector(".outro__graphic");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform sampler2D u_art;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_mouse; // uv (top-left origin), strength

// 3D simplex noise — Ashima Arts / Stefan Gustavson (MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  float t = u_time;
  vec2 px = 1.0 / u_res;

  // uneven clock and occasional gusts (0 most of the time, up to 1)
  float tt = t + 4.0 * snoise(vec3(t * 0.045, 1.7, 0.0));
  float gust = smoothstep(0.1, 0.9, snoise(vec3(t * 0.09, 5.3, 0.0)));
  // the stencil band barely moves
  float calm = mix(0.18, 1.0, smoothstep(0.03, 0.09, abs(uv.y - 0.495)));

  vec2 disp;
  // overspray drifting sideways
  disp.x = 0.0035 * snoise(vec3(uv * 3.0, tt * 0.06));
  // drips: a downward pull per column, each column at its own pace
  float pace = 0.10 + 0.09 * snoise(vec3(uv.x * 13.0, 0.0, tt * 0.05));
  disp.y = -0.009 * (0.5 + 0.5 * snoise(vec3(uv.x * 10.0, uv.y * 1.3 - tt * pace, tt * 0.07)));
  // a gust: larger, quicker swirl
  disp += gust * vec2(
    0.006 * snoise(vec3(uv * 5.0, t * 0.5)),
    0.011 * snoise(vec3(uv * 4.0 + 9.0, t * 0.45))
  );
  disp *= calm;

  // boil: the grain re-jitters on an uneven beat (roughly 5–10 a second)
  float beat = floor(t * 7.0 + 2.5 * snoise(vec3(t * 0.6, 2.2, 0.0)));
  vec2 boil = vec2(
    snoise(vec3(uv * 70.0, beat * 1.37)),
    snoise(vec3(uv * 70.0 + 4.0, beat * 1.37))
  ) * 1.4 * px * mix(0.4, 1.0, calm);

  float c = texture2D(u_art, uv + disp + boil).r;

  // individual particles flicker on the same beat
  float flick = snoise(vec3(uv * 420.0, beat * 0.77));
  c *= 1.0 + 0.16 * flick * smoothstep(0.04, 0.3, c);

  // pointer: a fine dust of paint builds up around it
  float m = u_mouse.z * exp(-dot(uv - u_mouse.xy, uv - u_mouse.xy) / 0.005);
  float dust = 1.0 / (1.0 + exp(-9.0 * snoise(vec3(uv * 520.0, beat * 0.5 + t * 0.2))));
  c = max(c, 0.55 * m * (1.0 - smoothstep(m * 0.6 - 0.02, m * 0.6 + 0.02, dust)));

  gl_FragColor = vec4(vec3(c), 1.0);
}
`;

function start() {
  const canvas = document.createElement("canvas");
  canvas.className = "outro__canvas";
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  // one triangle covering the screen
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (n) => gl.getUniformLocation(prog, n);
  const uRes = u("u_res");
  const uTime = u("u_time");
  const uMouse = u("u_mouse");

  // the artwork: the fallback <img> already on the page (whichever size its
  // srcset picked), scaled down only if the GPU can't take it
  const img = box.querySelector("img");
  const upload = () => {
    let source = img;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (img.naturalWidth > max) {
      source = document.createElement("canvas");
      source.width = source.height = max;
      source.getContext("2d").drawImage(img, 0, 0, max, max);
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    box.prepend(canvas);
    run();
  };
  if (!img) return;
  if (img.complete && img.naturalWidth) upload();
  else img.addEventListener("load", upload, { once: true });

  // pointer, eased; the graphic sits behind the copy, so listen on the window
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, amt: 0, target: 0 };
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = (e.clientY - r.top) / r.height;
    mouse.target = mouse.tx > 0 && mouse.tx < 1 && mouse.ty > 0 && mouse.ty < 1 ? 1 : 0;
  }, { passive: true });
  document.addEventListener("pointerleave", () => (mouse.target = 0));

  // keep the drawing buffer modest: the box is ~1.2× the screen width (and
  // half of it hangs below the page), and the grain is finer than that anyway
  const resize = () => {
    const r = box.getBoundingClientRect();
    const scale = Math.min(window.devicePixelRatio || 1, 1.25, 1600 / Math.max(r.width, 1));
    const w = Math.round(r.width * scale);
    const h = Math.round(r.height * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  let visible = false;
  let raf = 0;
  let last = performance.now();
  let time = 7.0; // start mid-motion, not from a uniform state

  const draw = () => {
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time);
    gl.uniform3f(uMouse, mouse.x, mouse.y, mouse.amt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  // the motion is slow, so 30 frames a second is plenty
  const frame = (now) => {
    raf = 0;
    if (now - last < 1000 / 31) {
      if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.1);
    last = now;
    time += dt;
    const k = 1 - Math.exp(-dt * 6);
    mouse.x += (mouse.tx - mouse.x) * k;
    mouse.y += (mouse.ty - mouse.y) * k;
    mouse.amt += (mouse.target - mouse.amt) * (1 - Math.exp(-dt * 2.5));
    draw();
    if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
  };

  function run() {
    draw();
    box.classList.add("is-live");
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf && !reduced.matches) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }, { rootMargin: "200px 0px" }).observe(box);
    window.addEventListener("resize", () => reduced.matches && draw());
  }
}

if (box) {
  try {
    start();
  } catch (err) {
    console.warn("footer graphic: falling back to the image", err);
  }
}
