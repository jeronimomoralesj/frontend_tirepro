// -----------------------------------------------------------------------------
// Fallback axle layout — used when a vehicle has no `configuracion` set and
// we still need to draw a tire diagram. Rule the user agreed on:
//
//   • First axle is always 2 tires (the steering / dirección axle).
//   • Every subsequent axle holds 4 tires (duals).
//   • The LAST axle gets the leftover (1–4 tires) so we never hide a tire
//     and never invent a position the user didn't fill.
//
// Examples:
//   2  → [[1,2]]
//   4  → [[1,2], [3,4]]
//   6  → [[1,2], [3,4,5,6]]
//   8  → [[1,2], [3,4,5,6], [7,8]]
//   10 → [[1,2], [3,4,5,6], [7,8,9,10]]
//   12 → [[1,2], [3,4,5,6], [7,8,9,10], [11,12]]
//   14 → [[1,2], [3,4,5,6], [7,8,9,10], [11,12,13,14]]
//   18 → [[1,2], [3,4,5,6], [7,8,9,10], [11,12,13,14], [15,16,17,18]]
//
// Replaces the old hand-tuned cascade (`else if (maxPos <= 6) ...`) which
// produced rows like [[1,2],[3,4],[5,6]] for 6 tires — three skinny axles
// instead of "steering + 4-dual rear axle" that matches a real bus 3-eje
// layout.
// -----------------------------------------------------------------------------

export function fallbackAxleLayout(totalTires: number): number[][] {
  if (totalTires <= 0) return [];
  if (totalTires <= 2) {
    const axle: number[] = [];
    for (let i = 1; i <= totalTires; i++) axle.push(i);
    return [axle];
  }

  const axles: number[][] = [[1, 2]]; // steering — always 2 tires
  let pos = 3;
  let remaining = totalTires - 2;

  // Subsequent rear axles in groups of 4 — leave at least 1 tire for the
  // tail axle so the shape stays "[2] + [4]+ + [≤4]" instead of
  // "[2] + [4]+ + [0]" (an empty axle drawn for nothing).
  while (remaining > 4) {
    axles.push([pos, pos + 1, pos + 2, pos + 3]);
    pos += 4;
    remaining -= 4;
  }

  if (remaining > 0) {
    const last: number[] = [];
    for (let i = 0; i < remaining; i++) last.push(pos++);
    axles.push(last);
  }

  return axles;
}
