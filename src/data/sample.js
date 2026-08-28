/**
 * What is still placeholder.
 *
 * The board itself no longer lives here — question, track, form and the settled
 * result are read from election blocks by src/hooks/useBoardData.js. What
 * remains is everything that needs a player identity and a submission log to be
 * real: a standing, a record, a ledger. Those arrive with the Nimiq Pay device
 * key and the published call log — see BACKLOG.
 *
 * The numbers mirror the measured series in docs/research so the screens read
 * truthfully, but nothing below is live.
 */

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
