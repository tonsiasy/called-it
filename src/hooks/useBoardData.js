import { useEffect, useState } from 'react'
import { createRpcClient, fetchMetricSeries } from '../lib/rpc.js'
import { buildQuestion, medianOf, trackFrom } from '../lib/board.js'
import { BLOCKS_PER_EPOCH } from '../lib/constants.js'

/** The run of past results the scrubber magnetises to, and the form table summarises. */
const FORM_LENGTH = 8

/** Rows shown above the median line. The rest of the run lives on the track as ticks. */
const FORM_ROWS = 4

/** §9.2b ranks this first among the settled question set. The scheduler will rotate it. */
const QUESTION_METRIC = 'topSlots'

/** Half-width of the opening call, placed on the median of recent form. */
const OPENING_HALF_WIDTH = 4

/** Elections are 12h apart, so the board only needs to look again on that scale. */
const REFRESH_MS = 5 * 60 * 1000

function formatElectionTime(timestampMs) {
  if (!timestampMs) return '—'
  const at = new Date(timestampMs)
  const date = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const time = at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  return `${date} · ${time}`
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

/** An opening call sat on recent form rather than centred on the track. */
function openingRange(median, track) {
  const centre = Math.round(median)
  return Object.freeze({
    lo: clamp(centre - OPENING_HALF_WIDTH, track.min, track.max - 1),
    hi: clamp(centre + OPENING_HALF_WIDTH, track.min + 1, track.max),
  })
}

function assemble(series, latestElectionHeight) {
  const values = series.map((entry) => entry.metrics[QUESTION_METRIC])
  const track = trackFrom(values)

  const rows = [...series]
    .reverse()
    .slice(0, FORM_ROWS)
    .map((entry) => ({
      at: formatElectionTime(entry.timestamp),
      value: entry.metrics[QUESTION_METRIC],
    }))

  // The question now open resolves at the next election, so its truth does not
  // exist yet. The previous one has already settled, and its truth is on chain —
  // that is what the reveal shows, rather than a number invented for a demo.
  const settledIndex = series.length - 1
  const settled = series[settledIndex]
  const priorAnchor = series[settledIndex - 1]

  return {
    status: 'ready',
    track,
    form: values,
    formRows: rows,
    formMedian: { at: `Median of ${values.length}`, value: medianOf(values) },
    openingRange: openingRange(medianOf(values), track),
    openQuestion: {
      ...buildQuestion({ latestElectionHeight, metricKey: QUESTION_METRIC }),
      truth: null,
      // Albatross separates blocks by a fixed second, so the next election's
      // wall-clock time is arithmetic on the last one — no oracle needed.
      resolvesAtMs: settled.timestamp ? settled.timestamp + BLOCKS_PER_EPOCH * 1000 : null,
      resolvesAtLabel: settled.timestamp
        ? formatElectionTime(settled.timestamp + BLOCKS_PER_EPOCH * 1000)
        : 'the next election',
    },
    resolvedQuestion: priorAnchor
      ? {
          ...buildQuestion({
            latestElectionHeight: priorAnchor.height,
            metricKey: QUESTION_METRIC,
          }),
          truth: settled.metrics[QUESTION_METRIC],
          resolvedAt: formatElectionTime(settled.timestamp),
          // the truth is withheld from the magnet, or the answer sits on the track
          form: values.slice(0, -1),
        }
      : null,
  }
}

/**
 * Reads the board from chain.
 *
 * Everything a player sees comes from election blocks at heights anyone can
 * compute — no server, no index, no database. A failure is surfaced, never
 * papered over with placeholder numbers: a board showing invented figures would
 * be worse than a board saying it cannot reach the node.
 */
export function useBoardData() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let isCancelled = false
    const client = createRpcClient()

    async function load() {
      try {
        const latestElectionHeight = await client.getLatestElectionHeight()
        const series = await fetchMetricSeries(client, {
          count: FORM_LENGTH,
          endHeight: latestElectionHeight,
        })
        if (isCancelled) return
        setState(assemble(series, latestElectionHeight))
      } catch (error) {
        if (isCancelled) return
        console.error('useBoardData: could not read the board from chain', error)
        setState({
          status: 'error',
          message: 'Could not reach a Nimiq node. The board reads from chain, so it waits.',
          detail: error.message,
        })
      }
    }

    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      isCancelled = true
      clearInterval(timer)
    }
  }, [])

  return state
}
