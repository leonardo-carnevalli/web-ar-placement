import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";

/**
 * Converts the GLB to USDZ in the browser, so the repository ships one format only.
 * Called ahead of time: the conversion is async, and iOS only opens Quick Look from a click
 * inside the user's tap (see lib/quick-look-link.ts).
 */
export async function prepareUsdz(glbUrl: string): Promise<string> {
  const gltf = await new GLTFLoader().loadAsync(glbUrl);
  const usdz = await new USDZExporter().parseAsync(gltf.scene, {
    quickLookCompatible: true,
    maxTextureSize: 2048,
  });
  return URL.createObjectURL(new Blob([usdz], { type: "model/vnd.usdz+zip" }));
}
