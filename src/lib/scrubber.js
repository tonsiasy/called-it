/**
 * The range scrubber's arithmetic, kept apart from the canvas that draws it.
 *
 * The scrubber is the only place a player states a belief, so its behaviour is
 * the product: jaws that magnetise to past results, a band that slides at a
 * fixed width, and jaws that cannot cross. Those rules are pure functions of a
 * value and a range, which is why they live here and not inside a pointer
 * handler — see design/DESIGN.md §5 and docs/design-rationale.md §9.2c.
 *
 * Every function returns a new range. Nothing here mutates its input.
 */

/**
 * A grab landing at least this far inside the interval takes the whole band;
 * anything nearer belongs to the jaw it is nearest. Measured in track units,
 * so a wide call does not become impossible to grab by the edge.
 */
const BAND_GRAB_MARGIN = 1.5

/**
 * How close a drag must come to a past result to magnetise onto it. In pixels,
 * not units: the radius has to feel the same on a phone and a desktop, and a
 * board squeezed narrow covers more units per pixel.
 */
const SNAP_RADIUS_PX = 6

/** Jaws may not cross, nor meet — the narrowest callable interval is one unit. */
const MIN_CALL_WIDTH = 1

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

/** Where `value` sits along the track, as 0–1 from the left edge. */
export function fractionOf(value, { min, max }) {
  return (value - min) / (max - min)
}

/**
 * The value under a pointer at `fraction` along the track, clamped to the
 * track. Continuous on purpose — rounding is the snap step's job, and doing it
 * here would cost the magnet its sub-unit precision.
 */
export function valueAtFraction(fraction, { min, max }) {
  return min + clamp(fraction, 0, 1) * (max - min)
}

/**
 * Round `value` to a tick, magnetising onto the nearest past result within the
 * snap radius. Returns the value to use plus the result it caught, if any, so
 * the caller can say which past result the player is sitting on.
 *
 * Nearest, not first-found: the form list arrives in date order, and letting
 * declaration order decide which of two equally reachable results wins would
 * make the magnet feel arbitrary.
 */
export function snapToForm(value, { form, track, widthPx, radiusPx = SNAP_RADIUS_PX }) {
  const pxPerUnit = widthPx / (track.max - track.min)

  let snappedTo = null
  let closestPx = radiusPx
  for (const result of form) {
    const distancePx = Math.abs(value - result) * pxPerUnit
    if (distancePx < closestPx) {
      closestPx = distancePx
      snappedTo = result
    }
  }

  return snappedTo === null
    ? { value: Math.round(value), snappedTo: null }
    : { value: snappedTo, snappedTo }
}

/**
 * Which part of the interval a grab at `value` picks up: a jaw, or the band.
 *
 * A grab outside the interval always takes the nearer jaw, so a player who
 * misses the bracket entirely still moves the thing they were aiming at
 * instead of dragging the whole call away from where they pointed.
 */
export function resolveDragTarget(value, { lo, hi }) {
  const toLo = Math.abs(value - lo)
  const toHi = Math.abs(value - hi)

  const isInsideBand = value > lo && value < hi
  if (isInsideBand && Math.min(toLo, toHi) > BAND_GRAB_MARGIN) return 'band'

  return toLo <= toHi ? 'lo' : 'hi'
}

/**
 * Move one jaw to `value`, held inside the track and stopped a unit short of
 * the other jaw. The stop is a clamp rather than a rejection: a drag that runs
 * past the far jaw pins the interval at its narrowest instead of freezing.
 */
export function moveJaw({ lo, hi }, target, value, track) {
  if (target === 'lo') {
    return { lo: clamp(value, track.min, hi - MIN_CALL_WIDTH), hi }
  }
  return { lo, hi: clamp(value, lo + MIN_CALL_WIDTH, track.max) }
}

/**
 * Slide both jaws by `shift` units at a fixed width.
 *
 * Width survives the track edges. Letting the leading jaw stop while the
 * trailing one kept coming would silently narrow the call — that is a change
 * of belief, and only a jaw drag is allowed to make one.
 */
export function shiftBand({ lo, hi }, shift, track) {
  const width = hi - lo

  let nextLo = lo + shift
  if (nextLo < track.min) nextLo = track.min
  if (nextLo + width > track.max) nextLo = track.max - width

  return { lo: nextLo, hi: nextLo + width }
}
