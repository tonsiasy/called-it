/**
 * The question schedule.
 *
 * Every question in a cycle can be named before it opens: its resolution height
 * is arithmetic on the cycle's start, and its metric is a position in a fixed
 * rotation. Nothing here needs a network or a stored table, which is what lets
 * the whole schedule be published in advance and checked afterwards.
 */
import { BLOCKS_PER_EPOCH, METRICS, QUESTIONS_PER_CYCLE } from './constants.js'
import { isElectionHeight } from './rpc.js'

/**
 * The rotation, weighted by the tiers §9.2b settled: `hhiBp` and `topSlots` are
 * the primaries, `gapTop2` and `turnover` the secondaries, `validatorCount`
 * demoted but kept so the set is not two questions wide.
 *
 * Rotation earns its place only because the design moved to intervals: the
 * correct width is metric-specific and does not transfer between series
 * (§9.2c), so changing the metric changes what a player has to know. Under
 * point estimates the same trailing median won everywhere and rotating changed
 * nothing (§9.2b) — the rotation is downstream of that finding, not decoration.
 *
 * No metric appears twice in a row, so one remembered width never answers two
 * consecutive questions.
 */
export const ROTATION = Object.freeze([
  'topSlots',
  'hhiBp',
  'gapTop2',
  'topSlots',
  'hhiBp',
  'turnover',
  'topSlots',
  'hhiBp',
  'validatorCount',
])

/** Which question of the cycle resolves at `resolutionHeight`, counting from 1. */
export function questionIndexFor({ cycleStart, resolutionHeight }) {
  if (!isElectionHeight(cycleStart)) {
    throw new RangeError(`questionIndexFor: cycle start ${cycleStart} is not an election height`)
  }
  if (!isElectionHeight(resolutionHeight)) {
    throw new RangeError(`questionIndexFor: ${resolutionHeight} is not an election height`)
  }

  const index = (resolutionHeight - cycleStart) / BLOCKS_PER_EPOCH
  if (index < 1) {
    throw new RangeError(`questionIndexFor: ${resolutionHeight} is not after the cycle opened`)
  }

  return index
}

/** The election a given question resolves at — computable before that block exists. */
export function resolutionHeightFor({ cycleStart, index }) {
  return cycleStart + index * BLOCKS_PER_EPOCH
}

/** The metric asked at a given question index, counting from 1. */
export function metricForIndex(index) {
  return ROTATION[(index - 1) % ROTATION.length]
}

/**
 * Everything needed to publish one question ahead of time: which number is
 * being asked about, and the exact block that will answer it.
 */
export function scheduleFor({ cycleStart, index }) {
  if (!Number.isInteger(index) || index < 1 || index > QUESTIONS_PER_CYCLE) {
    throw new RangeError(
      `scheduleFor: question ${index} is outside a ${QUESTIONS_PER_CYCLE}-question cycle`,
    )
  }

  const metricKey = metricForIndex(index)

  return Object.freeze({
    index,
    of: QUESTIONS_PER_CYCLE,
    metricKey,
    metric: METRICS[metricKey],
    resolutionHeight: resolutionHeightFor({ cycleStart, index }),
  })
}
