/**
 * Deriving question values from Albatross election blocks.
 *
 * The whole resolution story rests on this file being boring: an election block
 * sits at a height anyone can compute in advance, and these are pure functions
 * of its contents. A player who disputes a result fetches the same block and
 * runs the same arithmetic. See ../../docs/design-rationale.md §5, §7.
 */
import { BLOCKS_PER_EPOCH } from './constants.js'

const BASIS_POINTS = 10_000

/** The election that opened the epoch containing `height`. */
export function electionHeightAfter(height) {
  if (height < 0) throw new RangeError(`electionHeightAfter: negative height ${height}`)
  return Math.floor(height / BLOCKS_PER_EPOCH) * BLOCKS_PER_EPOCH
}

/** The next election strictly ahead of `height` — the deadline a live question resolves at. */
export function nextElectionHeight(height) {
  return electionHeightAfter(height) + BLOCKS_PER_EPOCH
}

function slotCountsDescending(block, role) {
  if (!block?.isElectionBlock) {
    throw new TypeError(`deriveMetrics: ${role} is not an election block`)
  }
  const slots = block.slots ?? []
  if (slots.length === 0) {
    throw new RangeError(`deriveMetrics: ${role} has an empty validator set`)
  }
  return [...slots].sort((a, b) => b.numSlots - a.numSlots)
}

/**
 * Derive every question value from one election block, plus turnover if the
 * preceding election is supplied.
 *
 * The metric set is settled by measurement (§9.2b). `medianSlots` and
 * `minSlots` are deliberately absent: the first barely moves relative to its
 * range, the second is near-constant and would tie the entire field.
 */
export function deriveMetrics({ current, previous = null }) {
  const sorted = slotCountsDescending(current, 'current')
  const total = sorted.reduce((sum, s) => sum + s.numSlots, 0)

  const topSlots = sorted[0].numSlots
  const secondSlots = sorted[1]?.numSlots ?? 0
  const hhi = sorted.reduce((sum, s) => sum + (s.numSlots / total) ** 2, 0)

  return {
    validatorCount: sorted.length,
    topSlots,
    gapTop2: topSlots - secondSlots,
    hhiBp: Math.round(hhi * BASIS_POINTS),
    turnover: previous ? turnoverBetween(previous, current) : null,
  }
}

/** Validators that entered plus validators that left. */
function turnoverBetween(previous, current) {
  const before = new Set(slotCountsDescending(previous, 'previous').map((s) => s.validator))
  const after = new Set(slotCountsDescending(current, 'current').map((s) => s.validator))

  const entered = [...after].filter((v) => !before.has(v)).length
  const left = [...before].filter((v) => !after.has(v)).length
  return entered + left
}
