/**
 * Which AR experience a device can actually run. Pure: the browser probing lives in
 * detect-capabilities.ts, so this matrix can be tested without a phone.
 */
export type Platform = "ios" | "android" | "other";

export type ArPath = "webxr" | "quick-look" | "scene-viewer" | "preview";

export interface DeviceCapabilities {
  platform: Platform;
  /** navigator.xr.isSessionSupported("immersive-ar") resolved true. */
  webxrAr: boolean;
  /** <a rel="ar"> is supported, i.e. Safari can hand a USDZ to AR Quick Look. */
  quickLook: boolean;
  /** WebXR only exists on HTTPS (or localhost). */
  secureContext: boolean;
}

/**
 * iPadOS reports itself as a Mac, so a "Macintosh" with a touch screen is treated as iOS.
 * Every browser on iOS is WebKit, so Chrome or Firefox there still get Quick Look.
 */
export function detectPlatform(userAgent: string, maxTouchPoints: number): Platform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return "ios";
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/.test(userAgent)) return "android";
  return "other";
}

export function chooseArPath(caps: DeviceCapabilities): ArPath {
  if (caps.platform === "ios") return caps.quickLook ? "quick-look" : "preview";
  if (caps.webxrAr && caps.secureContext) return "webxr";
  if (caps.platform === "android") return "scene-viewer";
  return "preview";
}

export interface ArPathCopy {
  button: string;
  hint: string;
}

export const AR_PATH_COPY: Record<ArPath, ArPathCopy> = {
  webxr: {
    button: "View in your space",
    hint: "Opens the camera in this page. Point at the floor or a table, tap to place.",
  },
  "quick-look": {
    button: "View in your space",
    hint: "Opens AR Quick Look. Drag to move, twist to rotate, pinch to resize, tap the shutter for a photo.",
  },
  "scene-viewer": {
    button: "View in your space",
    hint: "Opens Google Scene Viewer, because this browser has no WebXR.",
  },
  preview: {
    button: "Open this page on a phone",
    hint: "AR needs a phone camera. On this screen you get the 3D preview: drag to orbit, scroll to zoom.",
  },
};
