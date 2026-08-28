import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createRpcClient, fetchMetricSeries, isElectionHeight, RpcError } from '../src/lib/rpc.js'
import { BLOCKS_PER_EPOCH } from '../src/lib/constants.js'

/** A JSON-RPC envelope shaped exactly as rpc.nimiqwatch.com returns one. */
const ok = (data) => ({
  status: 200,
  ok: true,
  json: async () => ({ jsonrpc: '2.0', result: { data, metadata: null }, id: 1 }),
})

const rpcError = (message) => ({
  status: 200,
  ok: true,
  json: async () => ({ jsonrpc: '2.0', error: { code: -32602, message }, id: 1 }),
})

const httpError = (status) => ({
  status,
  ok: false,
  json: async () => ({}),
})

/**
 * What rpc.nimiqwatch.com actually returns for a method it will not serve:
 * HTTP 400, and `error` as a bare string rather than the `{code, message}`
 * object the JSON-RPC spec describes. Both shapes have to be handled.
 */
const methodNotAllowed = () => ({
  status: 400,
  ok: false,
  json: async () => ({ jsonrpc: '2.0', error: 'Method not allowed', id: 1 }),
})

const electionBlock = (height, slots) => ({
  number: height,
  isElectionBlock: true,
  type: 'macro',
  slots: slots.map(([validator, numSlots]) => ({ validator, numSlots })),
})

/** Queues responses and records every request, so assertions can read both. */
function fakeFetch(responses) {
  const calls = []
  const queue = [...responses]
  const impl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), signal: init.signal })
    const next = queue.shift()
    if (next === undefined) throw new Error('fakeFetch: no response queued')
    if (next instanceof Error) throw next
    return next
  }
  impl.calls = calls
  return impl
}

const clientWith = (fetchImpl, options = {}) =>
  createRpcClient({ fetchImpl, url: 'https://rpc.test', ...options })

describe('isElectionHeight', () => {
  test('accepts an exact multiple of the epoch length', () => {
    assert.equal(isElectionHeight(BLOCKS_PER_EPOCH * 1390), true)
  })

  test('rejects a height inside an epoch', () => {
    assert.equal(isElectionHeight(BLOCKS_PER_EPOCH * 1390 + 1), false)
  })
})

describe('createRpcClient.call', () => {
  test('sends a well-formed JSON-RPC 2.0 request', async () => {
    const fetchImpl = fakeFetch([ok(60_073_671)])
    await clientWith(fetchImpl).call('getBlockNumber', [])

    const [request] = fetchImpl.calls
    assert.equal(request.url, 'https://rpc.test')
    assert.equal(request.body.jsonrpc, '2.0')
    assert.equal(request.body.method, 'getBlockNumber')
    assert.deepEqual(request.body.params, [])
  })

  test('unwraps result.data on success', async () => {
    const client = clientWith(fakeFetch([ok(60_073_671)]))
    assert.equal(await client.call('getBlockNumber', []), 60_073_671)
  })

  test('passes an abort signal so a hung node cannot wedge the board', async () => {
    const fetchImpl = fakeFetch([ok(1)])
    await clientWith(fetchImpl).call('getBlockNumber', [])
    assert.ok(fetchImpl.calls[0].signal instanceof AbortSignal)
  })

  test('raises the node error rather than returning undefined', async () => {
    // getValidators is the real case: the free public node rejects it, which is
    // why the election-block route exists at all
    const client = clientWith(fakeFetch([rpcError('method not allowed')]), { maxAttempts: 1 })
    await assert.rejects(() => client.call('getValidators', []), (error) => {
      assert.ok(error instanceof RpcError)
      assert.match(error.message, /method not allowed/)
      assert.equal(error.method, 'getValidators')
      return true
    })
  })

  test('raises on a non-2xx response', async () => {
    const client = clientWith(fakeFetch([httpError(503)]), { maxAttempts: 1 })
    await assert.rejects(() => client.call('getBlockNumber', []), { name: 'RpcError' })
  })

  test('raises when the envelope carries no result', async () => {
    // never trust external data: a 200 with a shape we did not expect is an error,
    // not an undefined quietly handed to the caller
    const malformed = { status: 200, ok: true, json: async () => ({ jsonrpc: '2.0', id: 1 }) }
    const client = clientWith(fakeFetch([malformed]), { maxAttempts: 1 })
    await assert.rejects(() => client.call('getBlockNumber', []), { name: 'RpcError' })
  })

  test('retries a transient network failure and then succeeds', async () => {
    const fetchImpl = fakeFetch([new Error('socket hang up'), ok(42)])
    const client = clientWith(fetchImpl, { maxAttempts: 3, retryDelayMs: 0 })

    assert.equal(await client.call('getBlockNumber', []), 42)
    assert.equal(fetchImpl.calls.length, 2)
  })

  test('gives up once the attempt budget is spent', async () => {
    const fetchImpl = fakeFetch([
      new Error('socket hang up'),
      new Error('socket hang up'),
      new Error('socket hang up'),
    ])
    const client = clientWith(fetchImpl, { maxAttempts: 3, retryDelayMs: 0 })

    await assert.rejects(() => client.call('getBlockNumber', []), { name: 'RpcError' })
    assert.equal(fetchImpl.calls.length, 3)
  })

  test('does not retry a 4xx, which the node has already considered and refused', async () => {
    // the real getValidators rejection. Retrying it cannot change the answer and
    // spends three slots of a rate limit every player shares.
    const fetchImpl = fakeFetch([methodNotAllowed()])
    const client = clientWith(fetchImpl, { maxAttempts: 3, retryDelayMs: 0 })

    await assert.rejects(() => client.call('getValidators', []), { name: 'RpcError' })
    assert.equal(fetchImpl.calls.length, 1)
  })

  test('surfaces a string error payload rather than swallowing it', async () => {
    const client = clientWith(fakeFetch([methodNotAllowed()]), { maxAttempts: 1 })
    await assert.rejects(() => client.call('getValidators', []), {
      message: /Method not allowed/,
    })
  })

  test('does retry a 429, which is an explicit ask to come back later', async () => {
    const fetchImpl = fakeFetch([httpError(429), ok(42)])
    const client = clientWith(fetchImpl, { maxAttempts: 3, retryDelayMs: 0 })

    assert.equal(await client.call('getBlockNumber', []), 42)
    assert.equal(fetchImpl.calls.length, 2)
  })

  test('does retry a 5xx, which says nothing about the request', async () => {
    const fetchImpl = fakeFetch([httpError(503), ok(42)])
    const client = clientWith(fetchImpl, { maxAttempts: 3, retryDelayMs: 0 })

    assert.equal(await client.call('getBlockNumber', []), 42)
    assert.equal(fetchImpl.calls.length, 2)
  })

  test('names the underlying failure when the attempt budget runs out', async () => {
    const fetchImpl = fakeFetch([new Error('socket hang up'), new Error('socket hang up')])
    const client = clientWith(fetchImpl, { maxAttempts: 2, retryDelayMs: 0 })

    // "failed after 2 attempts" on its own tells a debugger nothing
    await assert.rejects(() => client.call('getBlockNumber', []), {
      message: /socket hang up/,
    })
  })

  test('does not retry an error the node reported deliberately', async () => {
    // a rejected method will be rejected again; spending retries on it only
    // delays the failure and burns a rate limit
    const fetchImpl = fakeFetch([rpcError('method not allowed')])
    const client = clientWith(fetchImpl, { maxAttempts: 3, retryDelayMs: 0 })

    await assert.rejects(() => client.call('getValidators', []), { name: 'RpcError' })
    assert.equal(fetchImpl.calls.length, 1)
  })
})

describe('createRpcClient.getElectionBlock', () => {
  const height = BLOCKS_PER_EPOCH * 1390

  test('returns the block at an election height', async () => {
    const block = electionBlock(height, [['A', 12], ['B', 8]])
    const client = clientWith(fakeFetch([ok(block)]))
    assert.equal((await client.getElectionBlock(height)).number, height)
  })

  test('asks for the body, which is where the slots live', async () => {
    const fetchImpl = fakeFetch([ok(electionBlock(height, [['A', 12]]))])
    await clientWith(fetchImpl).getElectionBlock(height)
    assert.deepEqual(fetchImpl.calls[0].body.params, [height, true])
  })

  test('refuses a height that is not an election, without spending a request', async () => {
    const fetchImpl = fakeFetch([])
    const client = clientWith(fetchImpl)

    await assert.rejects(() => client.getElectionBlock(height + 1), { name: 'RpcError' })
    assert.equal(fetchImpl.calls.length, 0)
  })

  test('raises when the node returns something that is not an election block', async () => {
    const notElection = { number: height, isElectionBlock: false, type: 'micro' }
    const client = clientWith(fakeFetch([ok(notElection)]), { maxAttempts: 1 })
    await assert.rejects(() => client.getElectionBlock(height), { name: 'RpcError' })
  })

  test('raises when the validator set is empty', async () => {
    const client = clientWith(fakeFetch([ok(electionBlock(height, []))]), { maxAttempts: 1 })
    await assert.rejects(() => client.getElectionBlock(height), { name: 'RpcError' })
  })
})

describe('getHeadHeight and latestElectionHeight', () => {
  test('reads the head height', async () => {
    const client = clientWith(fakeFetch([ok(60_073_671)]))
    assert.equal(await client.getHeadHeight(), 60_073_671)
  })

  test('rounds the head down to the election that opened its epoch', async () => {
    const client = clientWith(fakeFetch([ok(60_073_671)]))
    assert.equal(await client.getLatestElectionHeight(), 60_048_000)
  })
})

describe('fetchMetricSeries', () => {
  const end = BLOCKS_PER_EPOCH * 1390

  /** Three consecutive elections, newest last, with a validator leaving at the end. */
  const blocks = {
    [end - BLOCKS_PER_EPOCH * 2]: electionBlock(end - BLOCKS_PER_EPOCH * 2, [['A', 10], ['B', 6], ['C', 4]]),
    [end - BLOCKS_PER_EPOCH]: electionBlock(end - BLOCKS_PER_EPOCH, [['A', 12], ['B', 5], ['C', 3]]),
    [end]: electionBlock(end, [['A', 14], ['B', 6]]),
  }

  const clientForBlocks = () => {
    const fetchImpl = async (_url, init) => {
      const [height] = JSON.parse(init.body).params
      return ok(blocks[height])
    }
    return clientWith(fetchImpl)
  }

  test('returns one entry per requested election, oldest first', async () => {
    const series = await fetchMetricSeries(clientForBlocks(), { count: 2, endHeight: end })

    assert.equal(series.length, 2)
    assert.deepEqual(
      series.map((entry) => entry.height),
      [end - BLOCKS_PER_EPOCH, end],
    )
  })

  test('derives the question values from each block', async () => {
    const series = await fetchMetricSeries(clientForBlocks(), { count: 2, endHeight: end })
    const newest = series.at(-1)

    assert.equal(newest.metrics.topSlots, 14)
    assert.equal(newest.metrics.validatorCount, 2)
    assert.equal(newest.metrics.gapTop2, 8)
  })

  test('pairs each election with its predecessor so turnover is real', async () => {
    const series = await fetchMetricSeries(clientForBlocks(), { count: 2, endHeight: end })

    // C left between the two newest elections, nobody joined
    assert.equal(series.at(-1).metrics.turnover, 1)
    assert.equal(series[0].metrics.turnover, 0)
  })

  test('rejects a count that would ask for nothing', async () => {
    await assert.rejects(() => fetchMetricSeries(clientForBlocks(), { count: 0, endHeight: end }), {
      name: 'RpcError',
    })
  })
})
