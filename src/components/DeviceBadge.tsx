"use client";

import type { ArPath } from "@/lib/capabilities";
import { useArPath } from "./useArPath";

const LABELS: Record<ArPath, string> = {
  webxr: "WebXR with hit-test, right in this page",
  "quick-look": "AR Quick Look (USDZ made in your browser)",
  "scene-viewer": "Google Scene Viewer",
  preview: "3D preview only. Open on a phone for AR",
};

/** Tells the visitor which AR path their device will get. */
export function DeviceBadge() {
  const path = useArPath();
  return (
    <p className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/10 bg-card px-4 py-2 text-sm" data-testid="device-badge">
      <span className={`size-2 shrink-0 rounded-full ${path && path !== "preview" ? "bg-emerald-600" : "bg-ink/30"}`} aria-hidden />
      <span className="whitespace-nowrap text-ink/60">This device:</span>
      <span className="font-medium">{path ? LABELS[path] : "checking…"}</span>
    </p>
  );
}
