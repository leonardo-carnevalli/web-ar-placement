export interface SceneViewerRequest {
  /** Absolute https URL of the GLB; Scene Viewer downloads it itself. */
  fileUrl: string;
  title: string;
  /** Where Android goes back to if Scene Viewer is not installed. */
  fallbackUrl: string;
}

/**
 * The Android intent that opens Google Scene Viewer in AR mode, as documented in
 * https://developers.google.com/ar/develop/scene-viewer
 */
export function sceneViewerIntent({ fileUrl, title, fallbackUrl }: SceneViewerRequest): string {
  const file = new URL(fileUrl);
  if (file.protocol !== "https:") throw new Error("Scene Viewer needs an https model URL");
  const params = new URLSearchParams({ file: file.href, mode: "ar_preferred", title, resizable: "true" });
  return (
    `intent://arvr.google.com/scene-viewer/1.0?${params}` +
    "#Intent;scheme=https;package=com.google.android.googlequicksearchbox;" +
    `action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end;`
  );
}
