import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  fractionOf,
  valueAtFraction,
  snapToForm,
  resolveDragTarget,
  moveJaw,
  shiftBand,
} from '../src/lib/scrubber.js'

/** The measured series for topSlots runs 38–66; the track carries a little headroom. */
const track = { min: 34, max: 68 }

/** 340px over a 34-unit track is exactly 10px per unit, so snap distances are readable. */
const WIDTH_PX = 340

describe('fractionOf', () => {
  test('places the track minimum at the left edge', () => {
    assert.equal(fractionOf(34, track), 0)
  })

  test('places the track maximum at the right edge', () => {
    assert.equal(fractionOf(68, track), 1)
  })

  test('places the midpoint halfway along', () => {
    assert.equal(fractionOf(51, track), 0.5)
  })
})

describe('valueAtFraction', () => {
  test('returns the track minimum at the left edge', () => {
    assert.equal(valueAtFraction(0, track), 34)
  })

  test('returns a continuous value between ticks', () => {
    assert.equal(valueAtFraction(0.5, track), 51)
  })

  test('clamps a drag that runs off the left edge', () => {
    assert.equal(valueAtFraction(-0.4, track), 34)
  })

  test('clamps a drag that runs off the right edge', () => {
    assert.equal(valueAtFraction(1.8, track), 68)
  })
})

describe('snapToForm', () => {
  const form = [40, 42, 49]

  test('magnetises to a past result within the snap radius', () => {
    // 0.4 units away = 4px at this width, inside the 6px radius
    const { value, snappedTo } = snapToForm(40.4, { form, track, widthPx: WIDTH_PX })
    assert.equal(value, 40)
    assert.equal(snappedTo, 40)
  })

  test('rounds to the nearest tick when no past result is close enough', () => {
    // 0.8 units away = 8px, outside the radius
    const { value, snappedTo } = snapToForm(40.8, { form, track, widthPx: WIDTH_PX })
    assert.equal(value, 41)
    assert.equal(snappedTo, null)
  })

  test('reports no magnet when the form is empty', () => {
    const { value, snappedTo } = snapToForm(40.4, { form: [], track, widthPx: WIDTH_PX })
    assert.equal(value, 40)
    assert.equal(snappedTo, null)
  })

  test('reaches further in value terms as the track is squeezed', () => {
    // The radius is 6px either way, so a narrower board covers more units per pixel.
    // At 340px (10px/unit) nothing is within reach of 41.1 ...
    assert.equal(snapToForm(41.1, { form, track, widthPx: WIDTH_PX }).snappedTo, null)
    // ... but at 170px (5px/unit) both 40 and 42 are.
    assert.equal(snapToForm(41.1, { form, track, widthPx: 170 }).snappedTo, 42)
  })

  test('magnetises to the closest past result, not the first one listed', () => {
    // 42 is nearer than 40; declaration order must not decide this
    const { value, snappedTo } = snapToForm(41.7, { form: [40, 42], track, widthPx: 170 })
    assert.equal(snappedTo, 42)
    assert.equal(value, 42)
  })
})

describe('resolveDragTarget', () => {
  const range = { lo: 42, hi: 50 }

  test('drags the band when the grab lands well inside the interval', () => {
    assert.equal(resolveDragTarget(46, range), 'band')
  })

  test('drags the near jaw when the grab lands just inside it', () => {
    assert.equal(resolveDragTarget(42.5, range), 'lo')
    assert.equal(resolveDragTarget(49.5, range), 'hi')
  })

  test('drags the nearest jaw when the grab lands outside the interval', () => {
    assert.equal(resolveDragTarget(30, range), 'lo')
    assert.equal(resolveDragTarget(60, range), 'hi')
  })

  test('prefers the low jaw when the grab is equidistant', () => {
    assert.equal(resolveDragTarget(42, { lo: 42, hi: 42.000001 }), 'lo')
  })
})

describe('moveJaw', () => {
  const range = { lo: 42, hi: 50 }

  test('moves the low jaw to the requested value', () => {
    assert.deepEqual(moveJaw(range, 'lo', 38, track), { lo: 38, hi: 50 })
  })

  test('moves the high jaw to the requested value', () => {
    assert.deepEqual(moveJaw(range, 'hi', 55, track), { lo: 42, hi: 55 })
  })

  test('stops the low jaw one unit short of the high jaw rather than crossing it', () => {
    assert.deepEqual(moveJaw(range, 'lo', 60, track), { lo: 49, hi: 50 })
  })

  test('stops the high jaw one unit above the low jaw rather than crossing it', () => {
    assert.deepEqual(moveJaw(range, 'hi', 20, track), { lo: 42, hi: 43 })
  })

  test('clamps the low jaw at the track minimum', () => {
    assert.deepEqual(moveJaw(range, 'lo', 10, track), { lo: 34, hi: 50 })
  })

  test('clamps the high jaw at the track maximum', () => {
    assert.deepEqual(moveJaw(range, 'hi', 99, track), { lo: 42, hi: 68 })
  })

  test('does not mutate the range it is given', () => {
    const original = { lo: 42, hi: 50 }
    moveJaw(original, 'lo', 38, track)
    assert.deepEqual(original, { lo: 42, hi: 50 })
  })
})

describe('shiftBand', () => {
  test('moves both jaws together', () => {
    assert.deepEqual(shiftBand({ lo: 42, hi: 50 }, 3, track), { lo: 45, hi: 53 })
  })

  test('preserves the called width when it runs into the left edge', () => {
    const shifted = shiftBand({ lo: 36, hi: 44 }, -5, track)
    assert.deepEqual(shifted, { lo: 34, hi: 42 })
    assert.equal(shifted.hi - shifted.lo, 8)
  })

  test('preserves the called width when it runs into the right edge', () => {
    const shifted = shiftBand({ lo: 60, hi: 66 }, 5, track)
    assert.deepEqual(shifted, { lo: 62, hi: 68 })
    assert.equal(shifted.hi - shifted.lo, 6)
  })

  test('does not mutate the range it is given', () => {
    const original = { lo: 42, hi: 50 }
    shiftBand(original, 3, track)
    assert.deepEqual(original, { lo: 42, hi: 50 })
  })
})
