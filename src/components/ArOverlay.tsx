"use client";

import type { RefObject } from "react";
import { formatScale } from "@/lib/units";
import type { ArState } from "@/xr/ar-session";

interface Props {
  ref: RefObject<HTMLDivElement | null>;
  active: boolean;
  modelName: string;
  state: ArState | null;
  captures: number;
  onCapture(): void;
  onReset(): void;
  onExit(): void;
}

function statusText(state: ArState | null, modelName: string): string {
  switch (state?.phase) {
    case "scanning":
      return "Move your phone slowly so it can find the floor or a table";
    case "aiming":
      return `Tap to place the ${modelName.toLowerCase()}`;
    case "placed":
      return "Drag to move · twist to rotate · pinch to resize";
    default:
      return "Loading the model…";
  }
}

/** The DOM overlay drawn over the camera during a WebXR session. Also the surface that receives gestures. */
export function ArOverlay({ ref, active, modelName, state, captures, onCapture, onReset, onExit }: Props) {
  const placed = state?.phase === "placed";
  return (
    <div
      ref={ref}
      className={active ? "fixed inset-0 z-50 flex touch-none flex-col justify-between p-4 text-white select-none" : "hidden"}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="rounded-full bg-black/55 px-4 py-2 text-sm backdrop-blur" role="status" data-testid="ar-status">
          {statusText(state, modelName)}
        </p>
        <button
          type="button"
          data-ar-controls
          onClick={onExit}
          className="rounded-full bg-black/55 px-4 py-2 text-sm font-medium backdrop-blur"
        >
          Done
        </button>
      </div>

      <div data-ar-controls className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1 text-xs">
          {placed && <span className="rounded-full bg-black/55 px-3 py-1">Size {formatScale(state.scale)}</span>}
          {state?.lightEstimation && <span className="rounded-full bg-black/55 px-3 py-1">Lit by your room</span>}
          {state && !state.cameraAccess && (
            <span className="rounded-full bg-black/55 px-3 py-1">Photos show the object only</span>
          )}
        </div>
        <button
          type="button"
          onClick={onCapture}
          disabled={!placed}
          aria-label="Take a photo"
          className="size-18 rounded-full border-4 border-white bg-white/30 disabled:opacity-40"
        />
        <div className="flex flex-col items-end gap-1 text-xs">
          <button type="button" onClick={onReset} disabled={!placed} className="rounded-full bg-black/55 px-3 py-1 disabled:opacity-40">
            Place again
          </button>
          {captures > 0 && <span className="rounded-full bg-black/55 px-3 py-1">{captures} saved</span>}
        </div>
      </div>
    </div>
  );
}
