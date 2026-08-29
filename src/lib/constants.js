/** Protocol and scoring constants. Every value here is measured or specified —
 *  see ../../docs/design-rationale.md for the derivation of each. */

/** Albatross produces an election block every 43,200 blocks — exactly 12 hours
 *  at the protocol's fixed 1-second block separation. Election heights are
 *  therefore exact multiples of this, computable before a question is published. */
export const BLOCKS_PER_EPOCH = 43_200

/** Two elections a day caps the game at two questions per day. */
export const QUESTIONS_PER_DAY = 2

/** A four-week cycle. §9.2 measures skill recovery reaching its ceiling here;
 *  shortening the cycle costs more fidelity than shrinking the field does. */
export const QUESTIONS_PER_CYCLE = 56

/**
 * The election that opened this cycle — 2026-08-24, when the competition cycle
 * did. Every question's index and resolution height is arithmetic on this, so
 * the whole schedule can be published before any of it runs.
 */
export const CYCLE_START_HEIGHT = 59_745_600

/** Interval scoring: players aim to be right 4 times in 5. */
export const INTERVAL_ALPHA = 0.2

/** Points per question are capped so one lucky tight hit cannot outweigh a
 *  cycle of steady calibration. §3. */
export const POINTS_CAP = 2

/** Free public Albatross RPC. No auth, rate limited. */
export const RPC_URL = 'https://rpc.nimiqwatch.com'

/**
 * The question set, settled by measurement in §9.2b. `beatsPersistence` and
 * `beatsNaive` are the measured edges of the best predictor; they are recorded
 * so a future change to this list has to argue with the numbers.
 */
export const METRICS = Object.freeze({
  hhiBp: { label: 'stake concentration', unit: 'bp', tier: 'primary' },
  topSlots: { label: "largest validator's slots", unit: 'slots', tier: 'primary' },
  gapTop2: { label: 'lead over second place', unit: 'slots', tier: 'secondary' },
  turnover: { label: 'validators in or out', unit: 'validators', tier: 'secondary' },
  validatorCount: { label: 'validators elected', unit: 'validators', tier: 'supporting' },
})

/** Excluded, with the reason, so neither is quietly reintroduced:
 *  - medianSlots: barely moves relative to its range (14–17% over naive)
 *  - minSlots:    near-constant (MAE 0.10), so every player ties */
export const EXCLUDED_METRICS = Object.freeze(['medianSlots', 'minSlots'])
