import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { intervalScore, pointsFor, scoreQuestion } from '../src/lib/scoring.js'

describe('intervalScore (Winkler, alpha = 0.2)', () => {
  test('scores an interval containing the truth as its width alone', () => {
    // Arrange / Act
    const score = intervalScore({ low: 40, high: 48, truth: 43 })
    // Assert
    assert.equal(score, 8)
  })

  test('adds a penalty of 2/alpha per unit when the truth falls below', () => {
    // 4 below the lower bound: width 8 + (2 / 0.2) * 4 = 8 + 40
    assert.equal(intervalScore({ low: 40, high: 48, truth: 36 }), 48)
  })

  test('adds the same penalty when the truth falls above', () => {
    assert.equal(intervalScore({ low: 40, high: 48, truth: 52 }), 48)
  })

  test('treats the bounds as inclusive', () => {
    assert.equal(intervalScore({ low: 40, high: 48, truth: 40 }), 8)
    assert.equal(intervalScore({ low: 40, high: 48, truth: 48 }), 8)
  })

  test('punishes an overconfident narrow miss more than a wide hit', () => {
    const narrowMiss = intervalScore({ low: 42, high: 43, truth: 48 })
    const wideHit = intervalScore({ low: 30, high: 60, truth: 48 })
    assert.ok(narrowMiss > wideHit, `${narrowMiss} should exceed ${wideHit}`)
  })

  test('rejects an inverted interval rather than scoring it silently', () => {
    assert.throws(() => intervalScore({ low: 50, high: 40, truth: 45 }), /inverted/i)
  })

  test('rejects non-finite input rather than propagating NaN', () => {
    assert.throws(() => intervalScore({ low: 40, high: NaN, truth: 43 }), /finite/i)
  })
})

describe('pointsFor', () => {
  test('awards the cap when the score is zero', () => {
    assert.equal(pointsFor({ score: 0, fieldMedian: 10 }), 2)
  })

  test('awards half the cap at exactly the field median', () => {
    assert.equal(pointsFor({ score: 10, fieldMedian: 10 }), 1)
  })

  test('floors at zero rather than going negative', () => {
    assert.equal(pointsFor({ score: 100, fieldMedian: 10 }), 0)
  })

  test('never exceeds the cap', () => {
    assert.ok(pointsFor({ score: 0, fieldMedian: 1e9 }) <= 2)
  })

  test('gives every entry the cap when the field median is zero', () => {
    // A whole field scoring 0 means the question separated nobody; dividing by
    // zero must not produce Infinity or NaN.
    assert.equal(pointsFor({ score: 0, fieldMedian: 0 }), 2)
  })
})

describe('scoreQuestion', () => {
  const submissions = [
    { id: 'a', low: 40, high: 48 }, // width 8, contains 43
    { id: 'b', low: 42, high: 44 }, // width 2, contains 43 — best
    { id: 'c', low: 50, high: 60 }, // misses by 7
  ]

  test('ranks a narrow correct interval above a wide correct one', () => {
    const result = scoreQuestion({ submissions, truth: 43 })
    const byId = Object.fromEntries(result.map((r) => [r.id, r]))
    assert.ok(byId.b.points > byId.a.points)
  })

  test('gives the miss fewer points than either hit', () => {
    const byId = Object.fromEntries(scoreQuestion({ submissions, truth: 43 }).map((r) => [r.id, r]))
    assert.ok(byId.c.points < byId.a.points)
    assert.ok(byId.c.points < byId.b.points)
  })

  test('does not mutate the submissions it is given', () => {
    const frozen = submissions.map((s) => Object.freeze({ ...s }))
    assert.doesNotThrow(() => scoreQuestion({ submissions: frozen, truth: 43 }))
    assert.equal(submissions[0].low, 40)
  })

  test('returns an empty array for an empty field', () => {
    assert.deepEqual(scoreQuestion({ submissions: [], truth: 43 }), [])
  })

  test('caps points so one exact hit cannot outweigh a cycle of calibration', () => {
    const lucky = [{ id: 'x', low: 43, high: 43 }, { id: 'y', low: 20, high: 60 }]
    const byId = Object.fromEntries(scoreQuestion({ submissions: lucky, truth: 43 }).map((r) => [r.id, r]))
    assert.ok(byId.x.points <= 2)
  })
})
