import { useCallback, useEffect, useMemo, useState } from 'react'
import { addCall, createCall, ledgerRows, resolveAgainst, summarise } from '../lib/calls.js'
import { resolveDeviceId } from '../lib/identity.js'

const LOG_KEY_PREFIX = 'called-it:log:'

const storage = () => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readLog(key) {
  try {
    const raw = storage()?.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    // Never trust what came out of storage: another tab, an older build or a
    // hand-edited value all land here.
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.resolutionHeight === 'number') : []
  } catch (error) {
    console.error('useCallLog: stored log was unreadable, starting empty', error)
    return []
  }
}

function writeLog(key, log) {
  try {
    storage()?.setItem(key, JSON.stringify(log))
  } catch (error) {
    // Out of quota or private mode. The call still stands for this session.
    console.error('useCallLog: could not persist the log', error)
  }
}

/**
 * The player's own calls, kept on the device and resolved against chain.
 *
 * A call is written before its election runs. When that election appears in the
 * series the board already fetched, its truth is filled in here — the same
 * arithmetic anyone else could run over the same blocks.
 */
export function useCallLog(series) {
  const [deviceId] = useState(() => resolveDeviceId({ storage: storage() }))
  const logKey = `${LOG_KEY_PREFIX}${deviceId}`

  const [log, setLog] = useState(() => readLog(logKey))

  useEffect(() => {
    writeLog(logKey, log)
  }, [logKey, log])

  /**
   * Truths for calls whose election has run. The metric differs per call, so
   * each one is read against the metric it actually asked about.
   */
  const resolved = useMemo(() => {
    if (!series?.length) return log

    const byHeight = new Map(series.map((entry) => [entry.height, entry.metrics]))
    const truths = {}
    for (const call of log) {
      const metrics = byHeight.get(call.resolutionHeight)
      const truth = metrics?.[call.metricKey]
      if (truth !== undefined && truth !== null) truths[call.resolutionHeight] = truth
    }

    return resolveAgainst(log, truths)
  }, [log, series])

  const record = useMemo(() => summarise(resolved), [resolved])
  const ledger = useMemo(() => ledgerRows(resolved), [resolved])

  const hasCalled = useCallback(
    (resolutionHeight) => resolved.some((call) => call.resolutionHeight === resolutionHeight),
    [resolved],
  )

  const lockCall = useCallback((details) => {
    setLog((current) => {
      try {
        return addCall(current, createCall(details))
      } catch (error) {
        console.error('useCallLog: refused a call', error)
        return current
      }
    })
  }, [])

  return { deviceId, log: resolved, record, ledger, lockCall, hasCalled }
}
