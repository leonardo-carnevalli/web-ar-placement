import { describe, expect, it } from "vitest";
import {
  clampScale,
  isTap,
  MAX_SCALE,
  MIN_SCALE,
  screenRotationToYaw,
  screenToNdc,
  twoFingerDelta,
  wrapAngle,
  type TouchPair,
} from "./gestures";

const pair = (ax: number, ay: number, bx: number, by: number): TouchPair => [
  { x: ax, y: ay },
  { x: bx, y: by },
];

describe("twoFingerDelta", () => {
  it("reads a pinch apart as a scale ratio with no rotation", () => {
    const delta = twoFingerDelta(pair(100, 100, 200, 100), pair(50, 100, 250, 100));
    expect(delta.scale).toBeCloseTo(2);
    expect(delta.rotation).toBeCloseTo(0);
  });

  it("reads a quarter clockwise twist on screen (y down) as +PI/2", () => {
    const delta = twoFingerDelta(pair(0, 0, 100, 0), pair(0, 0, 0, 100));
    expect(delta.rotation).toBeCloseTo(Math.PI / 2);
    expect(delta.scale).toBeCloseTo(1);
  });

  it("depends on how the fingers moved, not on where they are", () => {
    const here = twoFingerDelta(pair(0, 0, 100, 0), pair(0, 0, 70.71, 70.71));
    const there = twoFingerDelta(pair(500, 300, 600, 300), pair(500, 300, 570.71, 370.71));
    expect(there.rotation).toBeCloseTo(here.rotation);
    expect(there.scale).toBeCloseTo(here.scale);
  });

  it("takes the short way across the 180 degree line", () => {
    const delta = twoFingerDelta(pair(0, 0, -100, -1), pair(0, 0, -100, 1));
    expect(Math.abs(delta.rotation)).toBeLessThan(0.05);
  });

  it("keeps the scale at 1 when two touches land on the same pixel", () => {
    expect(twoFingerDelta(pair(10, 10, 10, 10), pair(10, 10, 50, 10)).scale).toBe(1);
  });
});

describe("wrapAngle", () => {
  it.each([
    [0, 0],
    [Math.PI, Math.PI],
    [-Math.PI, Math.PI],
    [3 * Math.PI, Math.PI],
    [2 * Math.PI + 0.5, 0.5],
    [-2 * Math.PI - 0.5, -0.5],
  ])("%f -> %f", (input, expected) => {
    expect(wrapAngle(input)).toBeCloseTo(expected);
  });
});

describe("screenRotationToYaw", () => {
  it("turns a clockwise twist into a clockwise turn seen from above (negative yaw)", () => {
    expect(screenRotationToYaw(0.3)).toBe(-0.3);
  });
});

describe("clampScale", () => {
  it("keeps the object between a quarter and four times its real size", () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(1.3)).toBe(1.3);
  });
});

describe("isTap", () => {
  it("accepts a short touch that barely moved", () => {
    expect(isTap(120, { x: 10, y: 10 }, { x: 14, y: 13 })).toBe(true);
  });

  it("rejects a long press and a drag", () => {
    expect(isTap(800, { x: 10, y: 10 }, { x: 10, y: 10 })).toBe(false);
    expect(isTap(120, { x: 10, y: 10 }, { x: 60, y: 10 })).toBe(false);
  });
});

describe("screenToNdc", () => {
  it("maps the corners and the centre with y pointing up", () => {
    expect(screenToNdc({ x: 0, y: 0 }, 400, 800)).toEqual({ x: -1, y: 1 });
    expect(screenToNdc({ x: 200, y: 400 }, 400, 800)).toEqual({ x: 0, y: 0 });
    expect(screenToNdc({ x: 400, y: 800 }, 400, 800)).toEqual({ x: 1, y: -1 });
  });
});
