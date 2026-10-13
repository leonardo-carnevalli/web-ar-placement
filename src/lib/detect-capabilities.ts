import { detectPlatform, type DeviceCapabilities } from "./capabilities";

/** Probes the current browser. Client only; the decision itself is chooseArPath(). */
export async function detectCapabilities(): Promise<DeviceCapabilities> {
  const webxrAr = (await navigator.xr?.isSessionSupported("immersive-ar").catch(() => false)) ?? false;
  return {
    platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    webxrAr,
    quickLook: document.createElement("a").relList.supports("ar"),
    secureContext: window.isSecureContext,
  };
}
