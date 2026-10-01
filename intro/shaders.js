// Full-screen triangle: positions are already clip-space coordinates.
export const VERTEX_SHADER = /* glsl */ `
void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// The sdf-lens-blur logo (real signed distance field, lens-blurred around the
// cursor, with glow) used as a MASK over the photo instead of being drawn as a
// flat shape. The mask is a single channel — no chromatic-aberration fringes —
// so the black-and-white photo stays strictly monochrome.
//
// Photo treatment follows Figma (A_Intro): the home key-visual photo at the
// same placement as the home KV, layer blur 34 (≈17px gaussian) and a #191919
// fill at 50%, with a grain layer on top. While the intro scrolls the logo
// grows from the centre and defocuses as a whole (u_zoomBlur); the layer
// itself fades out in intro.js, uncovering the home page underneath.
export const FRAGMENT_SHADER = /* glsl */ `
uniform vec2 u_mouse;          // css px, top-down
uniform vec2 u_resolution;     // device px
uniform float u_pixelRatio;
uniform sampler2D u_logoSdf;
uniform float u_logoAspect;
uniform float u_logoScale;     // half the SDF texture's height, in viewport-height units
uniform vec2 u_anchorLogo;     // a point in logo UV ...
uniform vec2 u_anchorScreen;   // ... pinned here on screen (centered uv units)
uniform float u_maxBlur;
uniform float u_aperture;
uniform float u_glowIntensity;
uniform float u_lensScale;     // lens size relative to the design (logo 52.5% of the height)

uniform sampler2D u_photoBlur; // the home KV photo pre-blurred (Figma layer blur 34)
uniform float u_clear;         // 0 = design treatment (blurred, veiled) → 1 = the KV itself
uniform sampler2D u_bg;        // the page's noise tile (img/noise@2x.webp, 256px)
uniform float u_bgTile;        // its size on screen, device px (128 css px)
uniform vec4 u_photoRect;      // device px: left, top, width, height
uniform float u_zoomBlur;      // extra defocus over the whole logo as it grows
uniform float u_grain;         // strength of the grain layer over the symbol
uniform sampler2D u_grainTex;  // 512px tile of gaussian noise (mean 0.5), nearest + repeat

float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}

// Gaussian edge: the coverage a gaussian blur of width sigma gives at signed
// distance d from the shape's edge (normal CDF, logistic approximation).
float gaussFill(float d, float sigma) {
    float x = d / max(sigma, 1e-5);
    return 1.0 / (1.0 + exp(1.5976 * x + 0.07056 * x * x * x));
}

void main() {
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = gl_FragCoord.xy / u_resolution.xy - 0.5;
    uv.x *= aspect;

    vec2 mouseUv = (u_mouse * u_pixelRatio) / u_resolution.xy - 0.5;
    mouseUv.x *= aspect;
    mouseUv.y *= -1.0;

    float sdfCircle = fill(length(uv - mouseUv) * 2.0 / u_lensScale, 0.3, 0.5);
    sdfCircle = pow(clamp(sdfCircle, 0.0, 1.0), u_aperture);

    // logo UV, with u_anchorLogo pinned at u_anchorScreen (lets the logo zoom
    // into one of its own strokes)
    vec2 logoHalfSize = vec2(u_logoScale * u_logoAspect, u_logoScale);
    vec2 logoUv = (uv - u_anchorScreen) / (logoHalfSize * 2.0) + u_anchorLogo;

    vec2 clampedLogoUv = clamp(logoUv, 0.0, 1.0);
    vec2 outside = max(max(logoUv - 1.0, -logoUv), 0.0);
    float outsideDist = length(outside * vec2(u_logoAspect, 1.0));

    float distCenter = texture2D(u_logoSdf, clampedLogoUv).r + outsideDist;
    float aa = fwidth(distCenter);
    float edge = aa + (sdfCircle * u_maxBlur + u_zoomBlur) / u_logoScale;

    // gaussian-soft edge (sigma chosen to keep the lens blur's old reach)
    float mask = gaussFill(distCenter, edge * 0.8);
    float glowEdge = min(edge * 4.0, 0.3);
    mask += fill(distCenter, 0.0, glowEdge) * sdfCircle * u_glowIntensity;
    mask = clamp(mask, 0.0, 1.0);

    // Inside the symbol the overlay is a window onto the page beneath: the
    // home key visual itself (so the hand-over to it can't jump or double).
    // At first the window is filled with the design's treatment — the photo
    // blurred (layer blur 34), under a #373737 40% veil, with grain — which
    // lifts as the intro scrolls (u_clear), leaving the real KV.
    vec2 fragTop = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
    vec2 pUv = (fragTop - u_photoRect.xy) / u_photoRect.zw;
    pUv = vec2(pUv.x, 1.0 - pUv.y);
    vec3 cover = texture2D(u_photoBlur, pUv).rgb;
    cover = mix(cover, vec3(55.0 / 255.0), 0.4);
    // grain: monochrome, zero-mean, one grain per device pixel, from a
    // pre-generated random tile (an arithmetic hash shows a faint lattice)
    float n = (texture2D(u_grainTex, gl_FragCoord.xy / 512.0).r - 0.5) * 2.0;
    cover = clamp(cover + n * u_grain, 0.0, 1.0);
    float coverA = 1.0 - u_clear;

    // Outside the symbol: the page's black + noise background, tiled from the
    // top-left exactly like the CSS background it takes over from.
    vec2 bgUv = fragTop / u_bgTile;
    vec3 bg = texture2D(u_bg, vec2(bgUv.x, 1.0 - bgUv.y)).rgb;

    // premultiplied: opaque background outside, a clear window inside
    float bgA = 1.0 - mask;
    gl_FragColor = vec4(bg * bgA + cover * coverA * mask, bgA + coverA * mask);
}
`;
