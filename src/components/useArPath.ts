"use client";

import { useEffect, useState } from "react";
import { chooseArPath, type ArPath } from "@/lib/capabilities";
import { detectCapabilities } from "@/lib/detect-capabilities";

/** The AR path for this device, or null while it is being probed (and during server rendering). */
export function useArPath(): ArPath | null {
  const [path, setPath] = useState<ArPath | null>(null);
  useEffect(() => {
    let alive = true;
    detectCapabilities().then((caps) => alive && setPath(chooseArPath(caps)));
    return () => {
      alive = false;
    };
  }, []);
  return path;
}
