/**
 * The call log — the record that is the product.
 *
 * A call is written before its election runs and anchored to a block that
 * already existed, so the log can be checked afterwards by anyone holding it.
 * Nothing here edits a call once made: resolving one produces a new log with the
 * truth filled in, and a call already made cannot be called again.
 *
 * The log is per device today. Publishing it at resolution, so other players can
 * recompute a standing from it, is the next step — see BACKLOG.
 */
import { METRICS } from './constants.js'
import { medianOf } from './board.js'

/**
 * One call. `truth`, `error` and `isInside` stay null until the election named
 * by `resolutionHeight` has run.
 */
export function createCall({ index, metricKey, resolutionHeight, anchorBlock, lo, hi, at }) {
  if (!(hi > lo)) {
    throw new RangeError(`createCall: ${lo}–${hi} is not an interval`)
  }
  if (!(anchorBlock < resolutionHeight)) {
    throw new RangeError(
      `createCall: anchor ${anchorBlock} must precede resolution ${resolutionHeight}`,
    )
  }

  return Object.freeze({
    index,
    metricKey,
    resolutionHeight,
    anchorBlock,
    lo,
    hi,
    at,
    truth: null,
    error: null,
    isInside: null,
  })
}

/** Append a call. One per question — a second on the same election is refused. */
export function addCall(log, call) {
  if (log.some((existing) => existing.resolutionHeight === call.resolutionHeight)) {
    throw new Error(`addCall: question resolving at ${call.resolutionHeight} was already called`)
  }
  return Object.freeze([...log, call])
}

/** How far a truth landed outside an interval; zero when it landed inside. */
function errorFor({ lo, hi }, truth) {
  if (truth < lo) return lo - truth
  if (truth > hi) return truth - hi
  return 0
}

/**
 * Fill in the truths that have landed, given the metric values read from the
 * elections that resolved them. Calls whose election has not run are untouched.
 */
export function resolveAgainst(log, truthsByHeight) {
  return Object.freeze(
    log.map((call) => {
      const truth = truthsByHeight[call.resolutionHeight]
      if (truth === undefined || truth === null || call.truth !== null) return call

      return Object.freeze({
        ...call,
        truth,
        error: errorFor(call, truth),
        isInside: truth >= call.lo && truth <= call.hi,
      })
    }),
  )
}

/**
 * The record. Error statistics cover resolved calls only — counting an open
 * call as a zero-error one would flatter the player for questions not yet
 * answered.
 */
export function summarise(log) {
  const resolved = log.filter((call) => call.truth !== null)
  const errors = resolved.map((call) => call.error)

  return Object.freeze({
    callsMade: log.length,
    resolved: resolved.length,
    insideCount: resolved.filter((call) => call.isInside).length,
    hitRate:
      resolved.length === 0 ? null : resolved.filter((c) => c.isInside).length / resolved.length,
    medianError: errors.length === 0 ? null : medianOf(errors),
  })
}

/** The ledger, most recent first. */
export function ledgerRows(log) {
  return Object.freeze(
    [...log].reverse().map((call) =>
      Object.freeze({
        ...call,
        metric: METRICS[call.metricKey]?.label ?? call.metricKey,
      }),
    ),
  )
}
