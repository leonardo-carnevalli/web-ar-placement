"use client";

import { useEffect } from "react";

interface Props {
  src: string;
  alt: string;
}

/** The desktop (and pre-AR) 3D preview. model-viewer registers itself on import, so it loads in the browser only. */
export function ModelPreview({ src, alt }: Props) {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <model-viewer
      src={src}
      alt={alt}
      camera-controls
      auto-rotate
      touch-action="pan-y"
      shadow-intensity="1"
      environment-image="neutral"
      exposure="1.05"
      camera-orbit="30deg 70deg auto"
      interaction-prompt="none"
      className="block h-full w-full"
      data-testid="model-preview"
    />
  );
}
