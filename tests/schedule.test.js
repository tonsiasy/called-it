import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  ROTATION,
  metricForIndex,
  questionIndexFor,
  resolutionHeightFor,
  scheduleFor,
} from '../src/lib/schedule.js'
import { BLOCKS_PER_EPOCH, EXCLUDED_METRICS, METRICS, QUESTIONS_PER_CYCLE } from '../src/lib/constants.js'

const cycleStart = BLOCKS_PER_EPOCH * 1380

describe('ROTATION', () => {
  test('only asks questions from the settled set', () => {
    for (const key of ROTATION) assert.ok(METRICS[key], `${key} is not a settled metric`)
  })

  test('never asks an excluded metric', () => {
    for (const key of EXCLUDED_METRICS) assert.equal(ROTATION.includes(key), false)
  })

  test('asks every settled metric at least once', () => {
    for (const key of Object.keys(METRICS)) {
      assert.ok(ROTATION.includes(key), `${key} is settled but never asked`)
    }
  })

  test('weights primaries above secondaries above the demoted metric', () => {
    // §9.2b: hhiBp and topSlots are the primaries, validatorCount is demoted.
    const count = (key) => ROTATION.filter((k) => k === key).length
    const primary = count('hhiBp') + count('topSlots')
    const secondary = count('gapTop2') + count('turnover')
    const demoted = count('validatorCount')

    assert.ok(primary > secondary, 'primaries should be asked more than secondaries')
    assert.ok(secondary > demoted, 'secondaries should be asked more than the demoted metric')
  })
})

describe('questionIndexFor', () => {
  test('numbers the first question of a cycle 1', () => {
    assert.equal(questionIndexFor({ cycleStart, resolutionHeight: cycleStart + BLOCKS_PER_EPOCH }), 1)
  })

  test('advances one question per election', () => {
    assert.equal(
      questionIndexFor({ cycleStart, resolutionHeight: cycleStart + BLOCKS_PER_EPOCH * 24 }),
      24,
    )
  })

  test('refuses a resolution height that is not an election', () => {
    assert.throws(() => questionIndexFor({ cycleStart, resolutionHeight: cycleStart + 1 }))
  })

  test('refuses a resolution at or before the cycle opened', () => {
    assert.throws(() => questionIndexFor({ cycleStart, resolutionHeight: cycleStart }))
  })
})

describe('resolutionHeightFor', () => {
  test('is the inverse of questionIndexFor', () => {
    const height = resolutionHeightFor({ cycleStart, index: 24 })
    assert.equal(questionIndexFor({ cycleStart, resolutionHeight: height }), 24)
  })

  test('names a height that can be computed before the block exists', () => {
    // this is the whole resolution story: the height is arithmetic, not an oracle
    assert.equal(resolutionHeightFor({ cycleStart, index: 1 }), cycleStart + BLOCKS_PER_EPOCH)
  })
})

describe('metricForIndex', () => {
  test('is stable for a given index', () => {
    assert.equal(metricForIndex(7), metricForIndex(7))
  })

  test('walks the rotation in order', () => {
    assert.equal(metricForIndex(1), ROTATION[0])
    assert.equal(metricForIndex(2), ROTATION[1])
  })

  test('wraps past the end of the rotation', () => {
    assert.equal(metricForIndex(ROTATION.length + 1), ROTATION[0])
  })

  test('rotates rather than repeating one metric back to back', () => {
    // a repeat would let one width answer two consecutive questions
    for (let i = 1; i < QUESTIONS_PER_CYCLE; i += 1) {
      assert.notEqual(metricForIndex(i), metricForIndex(i + 1), `repeat at question ${i}`)
    }
  })
})

describe('scheduleFor', () => {
  test('describes a question fully enough to publish it in advance', () => {
    const question = scheduleFor({ cycleStart, index: 24 })

    assert.equal(question.index, 24)
    assert.equal(question.of, QUESTIONS_PER_CYCLE)
    assert.equal(question.resolutionHeight, cycleStart + BLOCKS_PER_EPOCH * 24)
    assert.ok(METRICS[question.metricKey])
  })

  test('refuses an index outside the cycle', () => {
    assert.throws(() => scheduleFor({ cycleStart, index: 0 }))
    assert.throws(() => scheduleFor({ cycleStart, index: QUESTIONS_PER_CYCLE + 1 }))
  })

  test('covers the whole cycle without a gap', () => {
    const heights = new Set()
    for (let i = 1; i <= QUESTIONS_PER_CYCLE; i += 1) {
      heights.add(scheduleFor({ cycleStart, index: i }).resolutionHeight)
    }
    assert.equal(heights.size, QUESTIONS_PER_CYCLE)
  })
})
