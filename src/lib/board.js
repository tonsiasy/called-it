/**
 * Turning a series of past elections into the board a player sees: where the
 * scrubber's track starts and ends, what the form table summarises, and which
 * question is currently open.
 *
 * Kept separate from the RPC client so none of it needs a network to be tested,
 * and separate from the components so none of it needs a DOM.
 */
import { BLOCKS_PER_EPOCH, METRICS } from './constants.js'
import { isElectionHeight } from './rpc.js'

/** Headroom either side of the observed range, in metric units. */
const DEFAULT_HEADROOM = 4

/**
 * A track narrower than this is not worth dragging across — a run of identical
 * results would otherwise leave the jaws nowhere to go.
 */
const DEFAULT_MIN_SPAN = 20

/** How the question reads. One line per metric in the settled set. */
const PROMPTS = Object.freeze({
  hhiBp: 'How concentrated will the stake be?',
  topSlots: 'How many slots will the largest validator hold?',
  gapTop2: "How far ahead of second place will the largest validator finish?",
  turnover: 'How many validators will enter or leave?',
  validatorCount: 'How many validators will be elected?',
})

export function medianOf(values) {
  if (values.length === 0) throw new RangeError('medianOf: empty series')

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

/**
 * The scrubber's track: the observed range plus headroom, widened to a usable
 * span and held to whole numbers so every tick lands on an integer.
 */
export function trackFrom(values, { headroom = DEFAULT_HEADROOM, minSpan = DEFAULT_MIN_SPAN } = {}) {
  if (values.length === 0) throw new RangeError('trackFrom: empty series')

  let min = Math.floor(Math.min(...values) - headroom)
  let max = Math.ceil(Math.max(...values) + headroom)

  const shortfall = minSpan - (max - min)
  if (shortfall > 0) {
    min -= Math.floor(shortfall / 2)
    max += Math.ceil(shortfall / 2)
  }

  // A negative slot count is not a thing; shift rather than clip, so the span survives.
  if (min < 0) {
    max -= min
    min = 0
  }

  return Object.freeze({ min, max })
}

/**
 * The open question: the one resolving at the next election.
 *
 * The anchor is the election that has already happened. A call is published
 * against a block that existed before the call was made, which is what stops
 * the record being rewritten afterwards — docs/design-rationale.md §7.
 */
export function buildQuestion({ latestElectionHeight, metricKey, index = null, of = null }) {
  if (!isElectionHeight(latestElectionHeight)) {
    throw new RangeError(`buildQuestion: ${latestElectionHeight} is not an election height`)
  }

  const metric = METRICS[metricKey]
  if (!metric) {
    throw new RangeError(`buildQuestion: ${metricKey} is not in the settled question set`)
  }

  const resolutionHeight = latestElectionHeight + BLOCKS_PER_EPOCH

  return Object.freeze({
    metricKey,
    prompt: PROMPTS[metricKey],
    unit: metric.unit,
    epoch: resolutionHeight / BLOCKS_PER_EPOCH,
    anchorBlock: latestElectionHeight,
    resolutionHeight,
    index,
    of,
  })
}
