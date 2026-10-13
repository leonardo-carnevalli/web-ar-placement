/** The WebXR Raw Camera Access module (Chrome on Android), not yet in @types/webxr. */
interface XRCamera {
  readonly width: number;
  readonly height: number;
}

interface XRView {
  readonly camera?: XRCamera;
}
