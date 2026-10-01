// 1D squared-distance transform (Felzenszwalb & Huttenlocher).
// Reads samples via `at(i)`, writes squared distances via `set(i, value)`.
function transform1D(n, at, set) {
  const INF = 1e20;
  const v = new Int32Array(n);
  const z = new Float32Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;

  for (let q = 1; q < n; q++) {
    let s;
    for (;;) {
      s = (at(q) + q * q - (at(v[k]) + v[k] * v[k])) / (2 * q - 2 * v[k]);
      if (s > z[k]) break;
      k--;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dx = q - v[k];
    set(q, dx * dx + at(v[k]));
  }
}

// Squared Euclidean distance from every pixel to the nearest `mask` pixel
// (mask[i] truthy = feature). Two 1D passes (columns then rows) give the
// exact 2D transform in O(width*height).
function squaredDistanceField(mask, width, height) {
  const INF = 1e20;
  const f = new Float32Array(width * height);
  for (let i = 0; i < f.length; i++) f[i] = mask[i] ? 0 : INF;

  const temp = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    transform1D(
      height,
      (y) => f[y * width + x],
      (y, val) => (temp[y * width + x] = val)
    );
  }

  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    transform1D(
      width,
      (x) => temp[row + x],
      (x, val) => (out[row + x] = val)
    );
  }

  return out;
}

// Signed distance field from a binary mask: negative inside the shape,
// positive outside, magnitude = distance (in pixels) to the boundary.
export function signedDistanceField(mask, width, height) {
  const inverse = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) inverse[i] = mask[i] ? 0 : 1;

  const distOutside = squaredDistanceField(mask, width, height);
  const distInside = squaredDistanceField(inverse, width, height);

  const sdf = new Float32Array(width * height);
  for (let i = 0; i < sdf.length; i++) {
    sdf[i] = mask[i] ? -Math.sqrt(distInside[i]) : Math.sqrt(distOutside[i]);
  }
  return sdf;
}
