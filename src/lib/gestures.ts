/** Touch gesture maths for the WebXR session, in screen pixels (y grows downwards). */
export interface Point {
  x: number;
  y: number;
}

export type TouchPair = readonly [Point, Point];

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;

const TAP_MAX_MS = 300;
const TAP_MAX_PX = 12;

/** Wraps an angle into (-PI, PI], so crossing the +-180 degree line is a small step, not a full turn. */
export function wrapAngle(radians: number): number {
  const turn = 2 * Math.PI;
  const wrapped = radians - turn * Math.floor((radians + Math.PI) / turn);
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

function angleOf([a, b]: TouchPair): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function distanceOf([a, b]: TouchPair): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export interface TwoFingerDelta {
  /** Clockwise on screen is positive. */
  rotation: number;
  /** Ratio of the new finger distance to the old one. */
  scale: number;
}

/** How two fingers moved between two frames: the twist angle and the pinch ratio. */
export function twoFingerDelta(previous: TouchPair, next: TouchPair): TwoFingerDelta {
  const before = distanceOf(previous);
  const after = distanceOf(next);
  return {
    rotation: wrapAngle(angleOf(next) - angleOf(previous)),
    scale: before > 0 && after > 0 ? after / before : 1,
  };
}

/**
 * Screen rotation to a yaw around the world up axis. Seen from above, a clockwise twist
 * should turn the object clockwise, which is a negative yaw in a right-handed y-up world.
 */
export function screenRotationToYaw(rotation: number): number {
  return -rotation;
}

export function clampScale(scale: number, min = MIN_SCALE, max = MAX_SCALE): number {
  return Math.min(max, Math.max(min, scale));
}

/** A touch that ended quickly and close to where it started is a tap, not a drag. */
export function isTap(durationMs: number, start: Point, end: Point): boolean {
  return durationMs <= TAP_MAX_MS && Math.hypot(end.x - start.x, end.y - start.y) <= TAP_MAX_PX;
}

/** A screen point to normalised device coordinates (-1..1, y up), for raycasting. */
export function screenToNdc(point: Point, width: number, height: number): Point {
  return { x: (point.x / width) * 2 - 1, y: 1 - (point.y / height) * 2 };
}
