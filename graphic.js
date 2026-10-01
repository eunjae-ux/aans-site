// Footer stencil graphic ("그래픽 최종"), drawn live in WebGL instead of a
// flat image.
//
// The composition — where the spray lands, the drips, the ALL ABOUT NOIRS
// stencil — comes from the artwork as a soft 1024px brightness map
// (img/footer-density.webp, grain removed). Everything you actually see is
// generated here: the paint coverage is the map thresholded against noise,
// which breaks its edges into the artwork's reticulated spray, with dark
// worm-like flecks inside the paint and sparse light specks in the black.
//
// Motion: the flecks stream slowly downward along the drips, the spray edges
// keep shifting, the drips sway a little (the stencil band stays put), and
// the paint thickens around the pointer as if sprayed on.
//
// The <img> stays in the markup as the fallback; it's hidden once the first
// frame is drawn (.is-live).

const box = document.querySelector(".outro__graphic");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform sampler2D u_den;
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

  // drips sway: a slow vertical smear, kept off the stencil band (y ≈ .46–.53)
  float band = smoothstep(0.03, 0.09, abs(uv.y - 0.495));
  vec2 sway = vec2(
    0.0015 * snoise(vec3(uv * 3.0, t * 0.05)),
    0.004 * snoise(vec3(uv.x * 9.0, uv.y * 1.2, t * 0.07))
  ) * band;
  float d = texture2D(u_den, uv + sway).r;

  // pointer: paint builds up around it
  float m = u_mouse.z * exp(-dot(uv - u_mouse.xy, uv - u_mouse.xy) / 0.006);
  d = clamp(d + m * (0.35 + 0.15 * snoise(vec3(uv * 40.0, t * 0.6))), 0.0, 1.0);

  // grain space, in units of the artwork (~1/260 of its width per fleck);
  // each column streams down at its own slow pace
  float fall = t * (0.010 + 0.012 * (0.5 + 0.5 * snoise(vec3(uv.x * 6.0, 0.0, 3.1))));
  vec2 p = (uv + vec2(0.0, -fall)) * 260.0;

  // Where the paint is thick, the base is the map itself (the artwork's own
  // gradations) at the paint's tone (~175/255), with dark flecks cut in.
  // Where it thins out, it turns into what the artwork shows there: a dust
  // of fine light particles, as many as the paint is dense. Grain size
  // follows the artwork (~1/400–1/800 of its width).
  // The stencil letters get a little more contrast so their edges read.
  d = mix(d, smoothstep(0.12, 0.8, d), 1.0 - band);

  vec2 warp = vec2(snoise(vec3(p * 0.06, t * 0.04)), snoise(vec3(p * 0.06 + 17.0, t * 0.04)));
  float u1 = 1.0 / (1.0 + exp(-5.0 * snoise(vec3(p * 1.6 + warp * 0.8, t * 0.06))));        // flecks
  float u2 = 1.0 / (1.0 + exp(-5.0 * snoise(vec3(p * 0.45 + warp * 0.5, t * 0.04 + 9.0)))); // coarse breakup
  float u3 = 1.0 / (1.0 + exp(-9.0 * snoise(vec3(p * 2.3 + 31.0, t * 0.07))));             // dust

  float solid = smoothstep(0.08, 0.45, d);                  // 0 = dust, 1 = paint
  float dustP = clamp(d * 1.8, 0.0, 1.0);
  float dust = (1.0 - smoothstep(dustP - 0.02, dustP + 0.02, u3)) * smoothstep(0.01, 0.05, d); // none on bare black
  float cover = mix(dust, 1.0, solid);
  float shade = mix(0.5 + 0.5 * d, d, solid);

  float edge = 4.0 * d * (1.0 - d);
  float fleckP = (0.05 + 0.06 * edge) * smoothstep(0.3, 0.6, d);
  float fleck = 1.0 - smoothstep(fleckP - 0.03, fleckP + 0.03, u1);
  float breakP = 0.08 * edge * (1.0 - d);
  float brk = 1.0 - smoothstep(breakP - 0.04, breakP + 0.04, u2);

  float tone = 0.76 + 0.04 * snoise(vec3(uv * 7.0, t * 0.02));
  float c = tone * shade * cover * (1.0 - 0.92 * fleck) * (1.0 - 0.85 * brk);

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

  const img = new Image();
  img.src = new URL("img/footer-density.webp", import.meta.url).href; // graphic.js sits at the site root
  img.decode().then(() => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    box.prepend(canvas);
    run();
  });

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
