"use client";

import { useEffect, useRef, useState } from "react";
import { AR_PATH_COPY } from "@/lib/capabilities";
import { sceneViewerIntent } from "@/lib/scene-viewer";
import { openQuickLook } from "@/lib/quick-look-link";
import type { ArSessionHandle, ArState } from "@/xr/ar-session";
import { AR_SESSION_INIT } from "@/xr/session-init";
import { ArOverlay } from "./ArOverlay";
import { useArPath } from "./useArPath";

interface Props {
  name: string;
  src: string;
}

interface Capture {
  url: string;
  file: string;
}

export function ArLauncher({ name, src }: Props) {
  const path = useArPath();
  const overlayRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ArSessionHandle | null>(null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [arState, setArState] = useState<ArState | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [error, setError] = useState<string | null>(null);

  // iOS only opens Quick Look from inside the tap, so the USDZ is ready before the button is.
  useEffect(() => {
    if (path !== "quick-look") return;
    let url: string | null = null;
    import("@/xr/quick-look")
      .then(({ prepareUsdz }) => prepareUsdz(src))
      .then((ready) => setUsdzUrl((url = ready)))
      .catch(() => setError("Could not convert the model for AR Quick Look."));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, src]);

  async function startWebXr() {
    const overlay = overlayRef.current;
    if (!navigator.xr || !overlay) return;
    setError(null);
    setActive(true);
    try {
      const session = await navigator.xr.requestSession("immersive-ar", { ...AR_SESSION_INIT, domOverlay: { root: overlay } });
      const { runArSession } = await import("@/xr/ar-session");
      sessionRef.current = await runArSession({
        session,
        modelUrl: src,
        overlay,
        onState: setArState,
        onEnd: () => {
          sessionRef.current = null;
          setActive(false);
          setArState(null);
        },
      });
    } catch {
      setActive(false);
      setError("The AR session could not start. Check that camera access is allowed for this site.");
    }
  }

  // Synchronous on purpose: Quick Look and the WebXR request must start inside the tap.
  function launch() {
    if (path === "webxr") void startWebXr();
    if (path === "quick-look" && usdzUrl) openQuickLook(usdzUrl);
    if (path === "scene-viewer") {
      try {
        window.location.href = sceneViewerIntent({
          fileUrl: new URL(src, window.location.href).href,
          title: name,
          fallbackUrl: window.location.href,
        });
      } catch {
        setError("Scene Viewer needs this page served over HTTPS. See the README for a tunnel.");
      }
    }
  }

  async function capture() {
    const blob = await sessionRef.current?.capture().catch(() => null);
    if (!blob) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    setCaptures((list) => [{ url: URL.createObjectURL(blob), file: `${name}-${stamp}.png` }, ...list]);
  }

  const copy = path ? AR_PATH_COPY[path] : null;
  const waitingForUsdz = path === "quick-look" && !usdzUrl && !error;
  const disabled = !path || path === "preview" || waitingForUsdz;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={launch}
        disabled={disabled}
        data-testid="ar-button"
        data-ar-path={path ?? "detecting"}
        className="rounded-full bg-accent px-6 py-4 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink/60"
      >
        {waitingForUsdz ? "Preparing AR…" : (copy?.button ?? "Checking your device…")}
      </button>
      {copy && <p className="text-sm text-ink/65">{copy.hint}</p>}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      {captures.length > 0 && (
        <section aria-label="Your photos" className="mt-2 grid grid-cols-3 gap-2">
          {captures.map((shot) => (
            <a key={shot.url} href={shot.url} download={shot.file} className="overflow-hidden rounded-lg border border-ink/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob URL, nothing to optimise */}
              <img src={shot.url} alt={`AR photo of the ${name}`} className="aspect-[3/4] w-full object-cover" />
            </a>
          ))}
        </section>
      )}

      <ArOverlay
        ref={overlayRef}
        active={active}
        modelName={name}
        state={arState}
        captures={captures.length}
        onCapture={capture}
        onReset={() => sessionRef.current?.reset()}
        onExit={() => sessionRef.current?.end()}
      />
    </div>
  );
}
