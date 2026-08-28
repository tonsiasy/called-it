/**
 * Placeholder board state.
 *
 * Every number here mirrors the real measured series in docs/research so the
 * screen reads truthfully, but it is static. It is replaced wholesale by the
 * RPC client and the question scheduler — see BACKLOG. Nothing outside this
 * file should hard-code a validator number.
 */

/** The measured range of topSlots is 38–66; the track carries a little headroom either side. */
export const SAMPLE_TRACK = Object.freeze({ min: 34, max: 68 })

/** The last eight results, which the scrubber magnetises to. */
export const SAMPLE_FORM = Object.freeze([40, 42, 49, 41, 46, 44, 38, 43])

export const SAMPLE_QUESTION = Object.freeze({
  epoch: 1287,
  index: 24,
  of: 56,
  prompt: 'How many slots will the largest validator hold?',
  unit: 'slots',
  resolvesAt: '17:00 UTC',
  anchorBlock: 59_053_200,
  truth: 43,
})

export const SAMPLE_FORM_ROWS = Object.freeze([
  { at: 'Aug 17 · 05:00', value: 40 },
  { at: 'Aug 16 · 17:00', value: 42 },
  { at: 'Aug 16 · 05:00', value: 49 },
  { at: 'Aug 15 · 17:00', value: 41 },
])

export const SAMPLE_FORM_MEDIAN = Object.freeze({ at: 'Median of 8', value: 43 })

export const SAMPLE_STANDING = Object.freeze({
  place: '12th',
  points: 1840,
  percentile: 'top 25%',
})

export const SAMPLE_RECORD = Object.freeze({
  callsMade: 118,
  medianError: 4.2,
  bestFinish: '6th',
  cycles: 3,
})

export const SAMPLE_LEDGER = Object.freeze([
  { at: 'Aug 17 · 05:00', metric: 'top validator slots', call: 44, truth: 40 },
  { at: 'Aug 16 · 17:00', metric: 'validators elected', call: 30, truth: 31 },
  { at: 'Aug 16 · 05:00', metric: 'top validator slots', call: 45, truth: 49 },
  { at: 'Aug 15 · 17:00', metric: 'top validator slots', call: 43, truth: 41 },
  { at: 'Aug 15 · 05:00', metric: 'validators elected', call: 29, truth: 29 },
  { at: 'Aug 14 · 17:00', metric: 'top validator slots', call: 44, truth: 46 },
  { at: 'Aug 14 · 05:00', metric: 'top validator slots', call: 41, truth: 38 },
  { at: 'Aug 13 · 17:00', metric: 'validators elected', call: 31, truth: 33 },
])
