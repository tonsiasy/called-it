import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { addCall, createCall, ledgerRows, resolveAgainst, summarise } from '../src/lib/calls.js'
import { BLOCKS_PER_EPOCH } from '../src/lib/constants.js'

const height = (n) => BLOCKS_PER_EPOCH * n

const call = (index, lo, hi, metricKey = 'topSlots') =>
  createCall({
    index,
    metricKey,
    resolutionHeight: height(1380 + index),
    anchorBlock: height(1379 + index),
    lo,
    hi,
    at: 1_787_000_000_000 + index * 1000,
  })

describe('createCall', () => {
  test('records the interval and the block it is anchored to', () => {
    const made = call(1, 42, 50)
    assert.equal(made.lo, 42)
    assert.equal(made.hi, 50)
    assert.equal(made.anchorBlock, height(1380))
  })

  test('anchors to a block that already existed when the call was made', () => {
    const made = call(1, 42, 50)
    assert.ok(made.anchorBlock < made.resolutionHeight)
  })

  test('starts unresolved — the truth does not exist yet', () => {
    assert.equal(call(1, 42, 50).truth, null)
  })

  test('refuses an inverted interval rather than storing it', () => {
    assert.throws(() => call(1, 50, 42), RangeError)
  })
})

describe('addCall', () => {
  test('returns a new log rather than mutating the one given', () => {
    const log = [call(1, 42, 50)]
    const next = addCall(log, call(2, 44, 52))

    assert.equal(log.length, 1)
    assert.equal(next.length, 2)
  })

  test('refuses a second call on a question already called', () => {
    // one call per question is what makes the record comparable
    const log = addCall([], call(1, 42, 50))
    assert.throws(() => addCall(log, call(1, 40, 48)), /already/i)
  })
})

describe('resolveAgainst', () => {
  const log = [call(1, 42, 50), call(2, 44, 52)]

  test('fills in a truth that has landed', () => {
    const resolved = resolveAgainst(log, { [height(1381)]: 43 })
    assert.equal(resolved[0].truth, 43)
  })

  test('leaves a question whose election has not run alone', () => {
    const resolved = resolveAgainst(log, { [height(1381)]: 43 })
    assert.equal(resolved[1].truth, null)
  })

  test('measures the miss from the nearer jaw, and zero when inside', () => {
    const resolved = resolveAgainst(log, { [height(1381)]: 38, [height(1382)]: 48 })
    assert.equal(resolved[0].error, 4) // 38 is 4 below the low jaw of 42
    assert.equal(resolved[1].error, 0) // 48 sits inside 44–52
  })

  test('marks whether the truth landed inside the called range', () => {
    const resolved = resolveAgainst(log, { [height(1381)]: 43, [height(1382)]: 60 })
    assert.equal(resolved[0].isInside, true)
    assert.equal(resolved[1].isInside, false)
  })

  test('does not mutate the log it is given', () => {
    resolveAgainst(log, { [height(1381)]: 43 })
    assert.equal(log[0].truth, null)
  })
})

describe('summarise', () => {
  test('reports zeros for an empty log without producing NaN', () => {
    const summary = summarise([])
    assert.equal(summary.callsMade, 0)
    assert.equal(summary.resolved, 0)
    assert.equal(summary.medianError, null)
    assert.equal(summary.hitRate, null)
  })

  test('counts every call made, resolved or not', () => {
    const log = resolveAgainst([call(1, 42, 50), call(2, 44, 52)], { [height(1381)]: 43 })
    assert.equal(summarise(log).callsMade, 2)
    assert.equal(summarise(log).resolved, 1)
  })

  test('measures calibration against the target hit rate', () => {
    // three resolved, two inside -> 2/3
    const log = resolveAgainst([call(1, 42, 50), call(2, 44, 52), call(3, 40, 48)], {
      [height(1381)]: 43,
      [height(1382)]: 48,
      [height(1383)]: 60,
    })
    const summary = summarise(log)

    assert.equal(summary.resolved, 3)
    assert.equal(summary.insideCount, 2)
    assert.ok(Math.abs(summary.hitRate - 2 / 3) < 1e-9)
  })

  test('takes the median error over resolved calls only', () => {
    const log = resolveAgainst([call(1, 42, 50), call(2, 44, 52), call(3, 40, 48)], {
      [height(1381)]: 38, // error 4
      [height(1382)]: 48, // error 0
      [height(1383)]: 50, // error 2
    })
    assert.equal(summarise(log).medianError, 2)
  })

  test('counts a truth landing exactly on a jaw as inside', () => {
    // the boundary is the case a player argues about, so it is pinned rather
    // than left to whichever comparison happened to be written
    const onLowJaw = resolveAgainst([call(1, 42, 50)], { [height(1381)]: 42 })
    const onHighJaw = resolveAgainst([call(2, 44, 52)], { [height(1382)]: 52 })

    assert.equal(summarise(onLowJaw).insideCount, 1)
    assert.equal(summarise(onLowJaw).medianError, 0)
    assert.equal(summarise(onHighJaw).insideCount, 1)
  })
})

describe('ledgerRows', () => {
  test('lists the most recent call first', () => {
    const log = resolveAgainst([call(1, 42, 50), call(2, 44, 52)], {
      [height(1381)]: 43,
      [height(1382)]: 48,
    })
    const rows = ledgerRows(log)
    assert.equal(rows[0].index, 2)
    assert.equal(rows[1].index, 1)
  })

  test('names the metric each call was about', () => {
    const log = [call(1, 42, 50, 'hhiBp')]
    assert.match(ledgerRows(log)[0].metric, /concentration/i)
  })

  test('does not mutate the log it is given', () => {
    const log = [call(1, 42, 50), call(2, 44, 52)]
    ledgerRows(log)
    assert.equal(log[0].index, 1)
  })
})
