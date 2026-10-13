export type UnitSystem = "metric" | "imperial";

export interface Dimensions {
  width: number;
  height: number;
  depth: number;
}

const METRES_PER_INCH = 0.0254;

export function metresToCentimetres(metres: number): number {
  return metres * 100;
}

export function metresToInches(metres: number): number {
  return metres / METRES_PER_INCH;
}

/** Rounds to one decimal and drops a trailing ".0", so 45.0 reads "45". */
function tidy(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** A length in the unit people expect at that size: cm below a metre, feet and inches above a foot. */
export function formatLength(metres: number, system: UnitSystem): string {
  if (system === "metric") {
    return metres >= 1 ? `${tidy(metres)} m` : `${tidy(metresToCentimetres(metres))} cm`;
  }
  const inches = metresToInches(metres);
  if (inches < 12) return `${tidy(inches)} in`;
  const wholeInches = Math.round(inches);
  const feet = Math.floor(wholeInches / 12);
  const rest = wholeInches % 12;
  return rest === 0 ? `${feet} ft` : `${feet} ft ${rest} in`;
}

/** "45.8 × 55 × 43 cm" (width × height × depth); imperial always uses inches so the three line up. */
export function formatDimensions(d: Dimensions, system: UnitSystem): string {
  const values = [d.width, d.height, d.depth];
  if (system === "metric") {
    const useMetres = values.some((v) => v >= 1);
    const parts = values.map((v) => tidy(useMetres ? v : metresToCentimetres(v)));
    return `${parts.join(" × ")} ${useMetres ? "m" : "cm"}`;
  }
  return `${values.map((v) => tidy(metresToInches(v))).join(" × ")} in`;
}

/** The size of a placed object relative to its real size, e.g. 1.2 -> "120%". */
export function formatScale(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
