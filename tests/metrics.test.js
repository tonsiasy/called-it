import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { deriveMetrics, electionHeightAfter, nextElectionHeight } from '../src/lib/metrics.js'
import { BLOCKS_PER_EPOCH } from '../src/lib/constants.js'

/** Shape mirrors what getBlockByNumber returns for an election macro block. */
const block = (slots) => ({
  isElectionBlock: true,
  slots: slots.map(([validator, numSlots]) => ({ validator, numSlots })),
})

const previous = block([['A', 20], ['B', 12], ['C', 8]])
const current = block([['A', 25], ['B', 10], ['D', 5]])

describe('deriveMetrics', () => {
  test('reads the largest validator slot count', () => {
    assert.equal(deriveMetrics({ current }).topSlots, 25)
  })

  test('counts the elected validators', () => {
    assert.equal(deriveMetrics({ current }).validatorCount, 3)
  })

  test('measures the lead of first over second', () => {
    assert.equal(deriveMetrics({ current }).gapTop2, 15)
  })

  test('computes concentration in basis points', () => {
    // shares 25/40, 10/40, 5/40 -> 0.390625 + 0.0625 + 0.015625 = 0.46875 -> 4688 bp
    assert.equal(deriveMetrics({ current }).hhiBp, 4688)
  })

  test('counts turnover as validators entering plus leaving', () => {
    // C left, D joined
    assert.equal(deriveMetrics({ current, previous }).turnover, 2)
  })

  test('reports turnover as null without a previous election, never zero', () => {
    // zero would be indistinguishable from "no change", which is a different claim
    assert.equal(deriveMetrics({ current }).turnover, null)
  })

  test('does not depend on the order slots arrive in', () => {
    const shuffled = block([['D', 5], ['A', 25], ['B', 10]])
    assert.deepEqual(deriveMetrics({ current: shuffled }), deriveMetrics({ current }))
  })

  test('excludes the metrics that measurement rejected', () => {
    const keys = Object.keys(deriveMetrics({ current, previous }))
    assert.ok(!keys.includes('medianSlots'))
    assert.ok(!keys.includes('minSlots'))
  })

  test('rejects a block that is not an election block', () => {
    assert.throws(() => deriveMetrics({ current: { isElectionBlock: false, slots: [] } }), /election/i)
  })

  test('rejects an election block with no slots', () => {
    assert.throws(() => deriveMetrics({ current: block([]) }), /empty/i)
  })
})

describe('election heights', () => {
  test('election blocks sit on exact multiples of the epoch length', () => {
    assert.equal(electionHeightAfter(0), 0)
    assert.equal(electionHeightAfter(BLOCKS_PER_EPOCH), BLOCKS_PER_EPOCH)
  })

  test('rounds a mid-epoch height down to the election that opened it', () => {
    assert.equal(electionHeightAfter(BLOCKS_PER_EPOCH + 1), BLOCKS_PER_EPOCH)
    assert.equal(electionHeightAfter(BLOCKS_PER_EPOCH * 2 - 1), BLOCKS_PER_EPOCH)
  })

  test('the next election is always strictly ahead of the current height', () => {
    for (const h of [1, BLOCKS_PER_EPOCH, BLOCKS_PER_EPOCH + 5, 58_968_000]) {
      assert.ok(nextElectionHeight(h) > h, `next after ${h}`)
      assert.equal(nextElectionHeight(h) % BLOCKS_PER_EPOCH, 0)
    }
  })

  test('matches a height observed on mainnet', () => {
    // 58,968,000 = 43,200 x 1365, confirmed as an election block via RPC
    assert.equal(58_968_000 % BLOCKS_PER_EPOCH, 0)
    assert.equal(electionHeightAfter(58_968_000), 58_968_000)
  })

  test('rejects a negative height rather than returning a nonsense one', () => {
    assert.throws(() => electionHeightAfter(-1), /negative/i)
  })
})
