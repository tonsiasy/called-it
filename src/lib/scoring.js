/**
 * Interval scoring. See ../../docs/design-rationale.md §3 for why the game
 * scores a range rather than a point, and §9.2c for what the format is worth.
 *
 * Every function here is pure and returns new values; nothing mutates its input.
 */
import { INTERVAL_ALPHA, POINTS_CAP } from './constants.js'

/**
 * Winkler interval score. Lower is better.
 *
 *   width                          truth inside  [low, high]
 *   width + (2/alpha) * shortfall  truth outside
 *
 * The `2/alpha` term is what makes overconfidence expensive: at alpha = 0.2 a
 * miss costs ten times its distance, so a narrow interval is only worth
 * submitting when the forecaster has earned the right to it.
 */
export function intervalScore({ low, high, truth, alpha = INTERVAL_ALPHA }) {
  for (const [name, value] of [['low', low], ['high', high], ['truth', truth]]) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`intervalScore: ${name} must be finite, received ${value}`)
    }
  }
  if (high < low) {
    throw new RangeError(`intervalScore: inverted interval [${low}, ${high}]`)
  }

  const width = high - low
  if (truth < low) return width + (2 / alpha) * (low - truth)
  if (truth > high) return width + (2 / alpha) * (truth - high)
  return width
}

/**
 * Convert a raw interval score into points, normalised against the field so
 * questions of wildly different magnitude carry equal weight, floored at zero so
 * an absurd entry cannot go negative, and capped so one lucky tight hit cannot
 * outweigh a cycle of steady calibration.
 */
export function pointsFor({ score, fieldMedian, cap = POINTS_CAP }) {
  // A field median of zero means the question separated nobody. Dividing by it
  // would yield Infinity or NaN, so resolve it explicitly instead.
  if (fieldMedian <= 0) return score <= 0 ? cap : 0
  return Math.max(0, Math.min(cap, cap - score / fieldMedian))
}

function medianOf(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Score a whole field for one question. Returns a new array; submissions are
 * never mutated, so callers may pass frozen objects.
 */
export function scoreQuestion({ submissions, truth, alpha = INTERVAL_ALPHA, cap = POINTS_CAP }) {
  if (submissions.length === 0) return []

  const scored = submissions.map((submission) => ({
    ...submission,
    score: intervalScore({ low: submission.low, high: submission.high, truth, alpha }),
  }))

  const fieldMedian = medianOf(scored.map((s) => s.score))

  return scored.map((s) => ({ ...s, points: pointsFor({ score: s.score, fieldMedian, cap }) }))
}
