import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * Draws one AR frame into an offscreen target and returns it as a PNG.
 *
 * The phone composites the camera feed outside WebGL, so a plain readPixels only sees the
 * virtual object. When the session granted "camera-access", the camera image is drawn first
 * and the scene on top of it; otherwise the PNG holds the object on a transparent background.
 */
export async function captureFrame(
  renderer: WebGLRenderer,
  scene: Scene,
  view: Camera,
  width: number,
  height: number,
  cameraImage: Texture | null,
): Promise<Blob> {
  const target = new WebGLRenderTarget(width, height);
  target.texture.colorSpace = SRGBColorSpace;
  const pixels = new Uint8Array(width * height * 4);

  const xrEnabled = renderer.xr.enabled;
  const autoClear = renderer.autoClear;
  const previousTarget = renderer.getRenderTarget();
  const background = cameraImage ? createBackground(cameraImage) : null;
  try {
    // Render with the frame's own view matrices, outside the XR framebuffer.
    renderer.xr.enabled = false;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.autoClear = false;
    if (background) renderer.render(background.scene, background.camera);
    renderer.render(scene, view);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(previousTarget);
    renderer.xr.enabled = xrEnabled;
    background?.dispose();
    target.dispose();
  }
  return toPng(pixels, width, height);
}

/** A full-screen quad that copies the camera image as is, with no colour conversion. */
function createBackground(image: Texture) {
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms: { image: { value: image } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D image; varying vec2 vUv; void main() { gl_FragColor = texture2D(image, vUv); }",
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  return {
    scene,
    camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** WebGL rows start at the bottom; canvas rows start at the top. */
async function toPng(pixels: Uint8Array, width: number, height: number): Promise<Blob> {
  const flipped = new Uint8ClampedArray(pixels.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    flipped.set(pixels.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
  }
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is not available");
  context.putImageData(new ImageData(flipped, width, height), 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}
