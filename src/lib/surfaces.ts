/** Hit-test poses put the surface normal on their local y axis. */
const MIN_UP = Math.cos((25 * Math.PI) / 180);

/**
 * True when a hit-test pose (column-major 4x4 matrix) lies on a floor or a table top,
 * i.e. its normal is within 25 degrees of straight up. Walls and shelf fronts are skipped,
 * so an object is never stood upright against a vertical surface.
 */
export function isHorizontalSurface(matrix: ArrayLike<number>): boolean {
  const [x, y, z] = [matrix[4], matrix[5], matrix[6]];
  const length = Math.hypot(x, y, z);
  return length > 0 && y / length >= MIN_UP;
}
