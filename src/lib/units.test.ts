import { describe, expect, it } from "vitest";
import { formatDimensions, formatLength, formatScale, metresToCentimetres, metresToInches } from "./units";

describe("conversions", () => {
  it("converts metres to centimetres and inches", () => {
    expect(metresToCentimetres(0.458)).toBeCloseTo(45.8);
    expect(metresToInches(0.0254)).toBeCloseTo(1);
    expect(metresToInches(0.3048)).toBeCloseTo(12);
  });
});

describe("formatLength", () => {
  it.each([
    [0.458, "metric", "45.8 cm"],
    [0.55, "metric", "55 cm"],
    [1.25, "metric", "1.3 m"],
    [0.0254, "imperial", "1 in"],
    [0.113, "imperial", "4.4 in"],
    [0.3048, "imperial", "1 ft"],
    [0.55, "imperial", "1 ft 10 in"],
  ] as const)("%f m in %s -> %s", (metres, system, expected) => {
    expect(formatLength(metres, system)).toBe(expected);
  });
});

describe("formatDimensions", () => {
  const plant = { width: 0.458, height: 0.55, depth: 0.43 };

  it("prints width × height × depth with one unit", () => {
    expect(formatDimensions(plant, "metric")).toBe("45.8 × 55 × 43 cm");
    expect(formatDimensions(plant, "imperial")).toBe("18 × 21.7 × 16.9 in");
  });

  it("switches every axis to metres when one passes a metre", () => {
    expect(formatDimensions({ width: 1.2, height: 0.8, depth: 0.5 }, "metric")).toBe("1.2 × 0.8 × 0.5 m");
  });
});

describe("formatScale", () => {
  it("shows the size relative to real size", () => {
    expect(formatScale(1)).toBe("100%");
    expect(formatScale(1.234)).toBe("123%");
  });
});
