import * as THREE from "three";
import { signedDistanceField } from "./sdf.js?v=20261007160152";

// Rasterizes the logo's SVG path(s) FILLED onto an offscreen canvas, then
// bakes a real signed distance field from that mask (see sdf.js). The shader
// reproduces the original Codrops demo's technique exactly — a pure
// smoothstep on an analytic distance value — instead of approximating blur
// by sampling the texture many times. Padding leaves margin so the field
// isn't clipped by the canvas edge. High resolution keeps the binary-mask
// threshold's staircase artifacts fine enough to be invisible once smoothed
// by the SDF + linear texture filtering.
export async function loadLogoTexture(url, targetHeight = 2560, padding = 0.22) {
  const svgText = await fetch(url).then((res) => res.text());
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  const [minX, minY, vbW, vbH] = svgEl.getAttribute("viewBox").trim().split(/\s+/).map(Number);
  const aspect = vbW / vbH;

  const width = Math.round(targetHeight * aspect);
  const height = targetHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const drawW = width * (1 - padding * 2);
  const drawH = height * (1 - padding * 2);
  const scale = Math.min(drawW / vbW, drawH / vbH);
  const offsetX = (width - vbW * scale) / 2;
  const offsetY = (height - vbH * scale) / 2;
  ctx.setTransform(scale, 0, 0, scale, offsetX - minX * scale, offsetY - minY * scale);

  ctx.fillStyle = "#fff";
  doc.querySelectorAll("path").forEach((pathEl) => {
    const d = pathEl.getAttribute("d");
    // This logo's path relies on the even-odd rule to cut its holes/counters
    // (SVG's own default). Canvas fill() defaults to nonzero, which merges
    // or drops those subpaths — pass "evenodd" explicitly to match.
    if (d) ctx.fill(new Path2D(d), "evenodd");
  });

  const alpha = ctx.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = alpha[i * 4 + 3] > 127 ? 1 : 0;

  const sdfPixels = signedDistanceField(mask, width, height);

  // An 8-bit texture only gives 256 distinct distance values across the
  // whole shape — the border/blur widths we actually use are so small
  // (fractions of a percent of the canvas) that the antialiasing band ended
  // up spanning just one or two of those steps, which looks like jagged
  // banding no matter how high the source resolution is (that was a
  // precision problem, not a resolution problem). Half-float storage gives
  // thousands of times more precision and is filterable in WebGL2 without
  // needing the OES_texture_float_linear extension that full 32-bit float
  // textures require.
  const sdf = new Uint16Array(sdfPixels.length);
  for (let i = 0; i < sdfPixels.length; i++) {
    sdf[i] = THREE.DataUtils.toHalfFloat(sdfPixels[i] / height);
  }

  const texture = new THREE.DataTexture(sdf, width, height, THREE.RedFormat, THREE.HalfFloatType);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = true;
  texture.needsUpdate = true;

  return { texture, aspect };
}
