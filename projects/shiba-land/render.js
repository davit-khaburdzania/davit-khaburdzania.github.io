// Low-res pipeline: scene -> 160x144 target -> 4-shade dither with ink outlines and LCD ghosting
// -> upscale to the screen canvas with a faint pixel grid.
import * as THREE from "../vendor/three.module.min.js";
import { PALETTE } from "./font.js";

export const GW = 160, GH = 144;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const QUANTIZE = /* glsl */ `
  uniform sampler2D tScene, tDepth, tOverlay, tPrev;
  uniform vec3 pal0, pal1, pal2, pal3;
  uniform float ghost, gain, contrast, cnear, cfar;
  varying vec2 vUv;
  const vec2 RES = vec2(160.0, 144.0);

  float bayer(vec2 p) {
    vec2 q = mod(p, 4.0);
    int i = int(q.x) + int(q.y) * 4;
    float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
    return (m[i] + 0.5) / 16.0;
  }
  float lin(vec2 uv) {
    float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
    return 2.0 * cnear * cfar / (cfar + cnear - z * (cfar - cnear));
  }
  vec3 shade(float i) { return i < 0.5 ? pal0 : (i < 1.5 ? pal1 : (i < 2.5 ? pal2 : pal3)); }

  void main() {
    vec2 px = floor(vUv * RES);
    vec2 uv = (px + 0.5) / RES;
    vec4 ov = texture2D(tOverlay, uv);
    vec3 col;
    if (ov.a > 0.5) {
      col = ov.rgb;
    } else {
      vec3 c = texture2D(tScene, uv).rgb;
      float l = clamp(dot(c, vec3(0.299, 0.587, 0.114)) * gain, 0.0, 1.0) * 2.999;
      float base = floor(l);
      // squeeze the dither band so flat faces stay flat and only in-betweens get a pattern
      float f = clamp((l - base - 0.5) * contrast + 0.5, 0.0, 1.0);
      float idx = min(base + step(bayer(px), f), 3.0);
      // ink outline: a nearer surface right next to this pixel
      vec2 o = 1.0 / RES;
      float d0 = lin(uv);
      float dn = min(min(lin(uv + vec2(o.x, 0.0)), lin(uv - vec2(o.x, 0.0))),
                     min(lin(uv + vec2(0.0, o.y)), lin(uv - vec2(0.0, o.y))));
      if (d0 - dn > max(0.9, dn * dn * 0.0016)) idx = min(idx, dn < 27.0 ? 0.0 : 1.0);
      col = shade(idx);
    }
    vec3 prev = texture2D(tPrev, uv).rgb;
    gl_FragColor = vec4(mix(col, prev, ghost), 1.0);
  }
`;

const DISPLAY = /* glsl */ `
  uniform sampler2D tLcd;
  uniform float scale, gridAmt;
  uniform vec3 gridCol;
  varying vec2 vUv;
  void main() {
    vec2 dev = floor(gl_FragCoord.xy);
    vec2 cell = floor((dev + 0.5) / scale);
    vec2 before = floor((dev - 0.5) / scale);
    vec3 c = texture2D(tLcd, (cell + 0.5) / vec2(160.0, 144.0)).rgb;
    float edge = scale >= 3.0 ? max(float(before.x != cell.x), float(before.y != cell.y)) : 0.0;
    gl_FragColor = vec4(mix(c, gridCol, edge * gridAmt), 1.0);
  }
`;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(1);

  const opts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false };
  const sceneRT = new THREE.WebGLRenderTarget(GW, GH, { ...opts, depthBuffer: true });
  sceneRT.depthTexture = new THREE.DepthTexture(GW, GH);
  const lcd = [new THREE.WebGLRenderTarget(GW, GH, opts), new THREE.WebGLRenderTarget(GW, GH, opts)];
  let cur = 0, frames = 0;

  // 2D overlay for HUD and text, drawn only in palette colours
  const overlay = document.createElement("canvas");
  overlay.width = GW; overlay.height = GH;
  const octx = overlay.getContext("2d");
  octx.imageSmoothingEnabled = false;
  const overlayTex = new THREE.CanvasTexture(overlay);
  overlayTex.minFilter = overlayTex.magFilter = THREE.NearestFilter;
  overlayTex.generateMipmaps = false;

  const pal = PALETTE.map((h) => new THREE.Color(h));
  const qMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: QUANTIZE, depthTest: false, depthWrite: false,
    uniforms: {
      tScene: { value: sceneRT.texture }, tDepth: { value: sceneRT.depthTexture }, tOverlay: { value: overlayTex },
      tPrev: { value: null }, pal0: { value: pal[0] }, pal1: { value: pal[1] }, pal2: { value: pal[2] }, pal3: { value: pal[3] },
      ghost: { value: 0 }, gain: { value: 1.12 }, contrast: { value: 1.7 }, cnear: { value: 1 }, cfar: { value: 200 },
    },
  });
  const dMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: DISPLAY, depthTest: false, depthWrite: false,
    uniforms: { tLcd: { value: null }, scale: { value: 2 }, gridAmt: { value: 0.16 }, gridCol: { value: new THREE.Color("#F4F3FF") } },
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), qMat);
  quad.frustumCulled = false;
  const post = new THREE.Scene();
  post.add(quad);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    octx,
    info: () => ({ ...renderer.info.memory, calls: renderer.info.render.calls }),
    resize(devW, devH) {
      renderer.setSize(devW, devH, false);
      dMat.uniforms.scale.value = devW / GW;
    },
    render(scene, camera, ghost = 0.2) {
      overlayTex.needsUpdate = true;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);

      const u = qMat.uniforms;
      u.tPrev.value = lcd[1 - cur].texture;
      u.ghost.value = frames < 2 ? 0 : ghost;
      u.cnear.value = camera.near; u.cfar.value = camera.far;
      quad.material = qMat;
      renderer.setRenderTarget(lcd[cur]);
      renderer.render(post, ortho);

      dMat.uniforms.tLcd.value = lcd[cur].texture;
      quad.material = dMat;
      renderer.setRenderTarget(null);
      renderer.render(post, ortho);
      cur = 1 - cur;
      frames++;
    },
  };
}
