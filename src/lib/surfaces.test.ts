import { Matrix4 } from "three";
import { describe, expect, it } from "vitest";
import { isHorizontalSurface } from "./surfaces";

const tilted = (degrees: number) => new Matrix4().makeRotationX((degrees * Math.PI) / 180).elements;

describe("isHorizontalSurface", () => {
  it("accepts a floor and a slightly uneven table", () => {
    expect(isHorizontalSurface(new Matrix4().elements)).toBe(true);
    expect(isHorizontalSurface(tilted(10))).toBe(true);
  });

  it("rejects a wall and a steep slope", () => {
    expect(isHorizontalSurface(tilted(90))).toBe(false);
    expect(isHorizontalSurface(tilted(40))).toBe(false);
  });

  it("rejects a ceiling", () => {
    expect(isHorizontalSurface(tilted(180))).toBe(false);
  });

  it("ignores the translation and the scale of the pose", () => {
    const pose = new Matrix4().makeScale(3, 3, 3).setPosition(2, 0.7, -1).elements;
    expect(isHorizontalSurface(pose)).toBe(true);
  });
});
