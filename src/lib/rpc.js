/**
 * The Albatross RPC client.
 *
 * Resolution is the whole trust story: a player who disputes a result fetches
 * the same block and runs the same arithmetic (docs/design-rationale.md §5).
 * That only holds if this file is boring and loud — it reads election blocks at
 * heights anyone can compute, validates every field before handing it on, and
 * raises rather than returning a half-answer.
 *
 * `getValidators` is not permitted on the free public node, so reading the
 * election block is the only route to a validator set without running one.
 */
import { BLOCKS_PER_EPOCH, RPC_URL } from './constants.js'
import { deriveMetrics, electionHeightAfter } from './metrics.js'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 400

/**
 * Every failure out of this module is one of these, so a caller never has to
 * tell a network error from a malformed payload by reading a string.
 *
 * `isRetryable` separates "the wire flaked" from "the node considered the
 * request and said no". Retrying the second only delays the failure and spends
 * a rate limit the whole game shares.
 */
export class RpcError extends Error {
  constructor(message, { cause, method = null, isRetryable = false } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'RpcError'
    this.method = method
    this.isRetryable = isRetryable
  }
}

/**
 * Elections sit at exact multiples of the epoch length, which is why a question
 * can name its resolution height before the block exists.
 */
export function isElectionHeight(height) {
  return Number.isInteger(height) && height >= 0 && height % BLOCKS_PER_EPOCH === 0
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 429 is an explicit ask to come back later and 5xx says nothing about the
 * request, so both are worth another attempt. Every other 4xx means the node
 * read the request and refused it — retrying cannot change the answer, and the
 * rate limit being spent is shared with every other player.
 */
const isRetryableStatus = (status) => status === 429 || status >= 500

/**
 * The public node answers a refused method with `error` as a bare string, not
 * the `{code, message}` object JSON-RPC specifies. Reading only `.message`
 * turns a clear rejection into "undefined".
 */
const describeNodeError = (payload) =>
  typeof payload === 'string' ? payload : (payload?.message ?? 'node reported an error')

export function createRpcClient({
  url = RPC_URL,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new RpcError('createRpcClient: no fetch implementation available')
  }

  async function attempt(method, params) {
    // A node that accepts the connection and then goes quiet would otherwise
    // hang the board indefinitely; the abort turns that into a retryable error.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
        signal: controller.signal,
      })

      // Read the body even on a failure: the node explains the refusal there,
      // and "HTTP 400" alone sends a debugger to the wrong place.
      const envelope = await response.json().catch(() => null)

      if (!response.ok) {
        const detail = envelope?.error ? `: ${describeNodeError(envelope.error)}` : ''
        throw new RpcError(`${method}: node returned HTTP ${response.status}${detail}`, {
          method,
          isRetryable: isRetryableStatus(response.status),
        })
      }

      if (envelope === null) {
        throw new RpcError(`${method}: response was not JSON`, { method, isRetryable: true })
      }
      if (envelope.error) {
        throw new RpcError(`${method}: ${describeNodeError(envelope.error)}`, { method })
      }
      if (envelope.result?.data === undefined) {
        throw new RpcError(`${method}: response carried no result`, { method })
      }

      return envelope.result.data
    } finally {
      clearTimeout(timer)
    }
  }

  async function call(method, params = []) {
    let lastError = null

    for (let n = 1; n <= maxAttempts; n += 1) {
      try {
        return await attempt(method, params)
      } catch (error) {
        if (error instanceof RpcError && !error.isRetryable) throw error
        lastError = error
        if (n < maxAttempts) await sleep(retryDelayMs)
      }
    }

    throw new RpcError(
      `${method}: failed after ${maxAttempts} attempts — ${lastError?.message ?? 'unknown error'}`,
      { method, cause: lastError },
    )
  }

  async function getHeadHeight() {
    const height = await call('getBlockNumber', [])
    if (!Number.isInteger(height) || height < 0) {
      throw new RpcError(`getBlockNumber: expected a height, received ${JSON.stringify(height)}`)
    }
    return height
  }

  /** The election that opened the current epoch — the newest resolvable question. */
  async function getLatestElectionHeight() {
    return electionHeightAfter(await getHeadHeight())
  }

  async function getElectionBlock(height) {
    // Checked before the request: an off-election height is a bug on our side,
    // and spending a call on it would report it as a network problem.
    if (!isElectionHeight(height)) {
      throw new RpcError(`getElectionBlock: ${height} is not an election height`)
    }

    // `true` asks for the body, which is where the slots live.
    const block = await call('getBlockByNumber', [height, true])

    if (!block?.isElectionBlock) {
      throw new RpcError(`getElectionBlock: block ${height} is not an election block`)
    }
    if (!Array.isArray(block.slots) || block.slots.length === 0) {
      throw new RpcError(`getElectionBlock: block ${height} carries an empty validator set`)
    }

    return block
  }

  return Object.freeze({
    call,
    getHeadHeight,
    getLatestElectionHeight,
    getElectionBlock,
  })
}

/**
 * The last `count` elections, oldest first, each with its question values.
 *
 * Fetches one block more than asked for: turnover is a comparison between
 * consecutive validator sets, so the oldest entry needs a predecessor that is
 * never itself returned.
 */
export async function fetchMetricSeries(client, { count, endHeight } = {}) {
  if (!Number.isInteger(count) || count < 1) {
    throw new RpcError(`fetchMetricSeries: count must be a positive integer, received ${count}`)
  }

  const end = endHeight ?? (await client.getLatestElectionHeight())
  if (!isElectionHeight(end)) {
    throw new RpcError(`fetchMetricSeries: ${end} is not an election height`)
  }

  const oldest = end - count * BLOCKS_PER_EPOCH
  if (oldest < 0) {
    throw new RpcError(`fetchMetricSeries: ${count} elections reach back past the genesis block`)
  }

  const heights = Array.from(
    { length: count + 1 },
    (_, i) => oldest + i * BLOCKS_PER_EPOCH,
  )
  const blocks = await Promise.all(heights.map((height) => client.getElectionBlock(height)))

  return Object.freeze(
    blocks.slice(1).map((current, i) =>
      Object.freeze({
        height: heights[i + 1],
        timestamp: current.timestamp ?? null,
        metrics: Object.freeze(deriveMetrics({ current, previous: blocks[i] })),
      }),
    ),
  )
}
