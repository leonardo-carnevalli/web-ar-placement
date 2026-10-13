/**
 * Safari opens AR Quick Look for an <a rel="ar"> whose first child is an image.
 * Kept free of three.js so the click handler can call it synchronously, inside the tap.
 */
export function openQuickLook(usdzUrl: string): void {
  const link = document.createElement("a");
  link.rel = "ar";
  link.href = usdzUrl;
  link.download = "model.usdz";
  link.appendChild(document.createElement("img"));
  link.click();
}
