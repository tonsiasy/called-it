import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { medianOf, trackFrom, buildQuestion } from '../src/lib/board.js'
import { BLOCKS_PER_EPOCH } from '../src/lib/constants.js'

describe('medianOf', () => {
  test('takes the middle of an odd-length series', () => {
    assert.equal(medianOf([3, 1, 2]), 2)
  })

  test('averages the middle pair of an even-length series', () => {
    assert.equal(medianOf([1, 2, 3, 4]), 2.5)
  })

  test('does not mutate the series it is given', () => {
    const values = [3, 1, 2]
    medianOf(values)
    assert.deepEqual(values, [3, 1, 2])
  })

  test('refuses an empty series rather than returning NaN', () => {
    assert.throws(() => medianOf([]), RangeError)
  })
})

describe('trackFrom', () => {
  test('brackets the observed range with headroom either side', () => {
    assert.deepEqual(trackFrom([39, 54, 47], { headroom: 4, minSpan: 10 }), { min: 35, max: 58 })
  })

  test('widens a near-flat series so the scrubber still has somewhere to go', () => {
    // eight identical results would otherwise collapse the track to 8 units
    assert.deepEqual(trackFrom([40, 40, 40], { headroom: 4, minSpan: 20 }), { min: 30, max: 50 })
  })

  test('never opens the track below zero', () => {
    const track = trackFrom([1, 2], { headroom: 4, minSpan: 4 })
    assert.equal(track.min, 0)
  })

  test('keeps whole-number bounds so ticks land on integers', () => {
    const track = trackFrom([40, 41, 42], { headroom: 3, minSpan: 21 })
    assert.equal(Number.isInteger(track.min), true)
    assert.equal(Number.isInteger(track.max), true)
    assert.ok(track.max - track.min >= 21)
  })

  test('refuses an empty series', () => {
    assert.throws(() => trackFrom([]), RangeError)
  })
})

describe('buildQuestion', () => {
  const latest = BLOCKS_PER_EPOCH * 1390

  test('asks about the next election, not the one already settled', () => {
    const question = buildQuestion({ latestElectionHeight: latest, metricKey: 'topSlots' })
    assert.equal(question.resolutionHeight, latest + BLOCKS_PER_EPOCH)
  })

  test('anchors to a block that already exists', () => {
    // the anchor is what makes a call unforgeable after the fact: it has to be
    // a block published before the call was made
    const question = buildQuestion({ latestElectionHeight: latest, metricKey: 'topSlots' })
    assert.equal(question.anchorBlock, latest)
    assert.ok(question.anchorBlock < question.resolutionHeight)
  })

  test('numbers the epoch it resolves in', () => {
    const question = buildQuestion({ latestElectionHeight: latest, metricKey: 'topSlots' })
    assert.equal(question.epoch, 1391)
  })

  test('carries the label and unit of the metric being asked about', () => {
    const question = buildQuestion({ latestElectionHeight: latest, metricKey: 'topSlots' })
    assert.equal(question.unit, 'slots')
    assert.match(question.prompt, /largest validator/i)
  })

  test('refuses a metric that is not in the settled question set', () => {
    assert.throws(
      () => buildQuestion({ latestElectionHeight: latest, metricKey: 'minSlots' }),
      /minSlots/,
    )
  })

  test('refuses a height that is not an election', () => {
    assert.throws(() => buildQuestion({ latestElectionHeight: latest + 1, metricKey: 'topSlots' }))
  })
})
