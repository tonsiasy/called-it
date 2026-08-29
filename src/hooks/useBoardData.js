import { useEffect, useState } from 'react'
import { createRpcClient, fetchMetricSeries } from '../lib/rpc.js'
import { buildQuestion, medianOf, trackFrom } from '../lib/board.js'
import { questionIndexFor, scheduleFor } from '../lib/schedule.js'
import { BLOCKS_PER_EPOCH, CYCLE_START_HEIGHT } from '../lib/constants.js'

/** The run of past results the scrubber magnetises to, and the form table summarises. */
const FORM_LENGTH = 8

/** Rows shown above the median line. The rest of the run lives on the track as ticks. */
const FORM_ROWS = 4

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

/**
 * The board furniture for one metric: the track, the run of past results and
 * the form table.
 *
 * Built per question rather than once, because the rotation guarantees
 * consecutive questions ask about different metrics — `hhiBp` runs in the
 * hundreds where `turnover` runs in single figures, so one shared track would
 * be wrong for at least one of them.
 */
function viewFor(series, metricKey) {
  const values = series.map((entry) => entry.metrics[metricKey])
  const track = trackFrom(values)

  return {
    values,
    track,
    rows: [...series]
      .reverse()
      .slice(0, FORM_ROWS)
      .map((entry) => ({
        at: formatElectionTime(entry.timestamp),
        value: entry.metrics[metricKey],
      })),
    median: { at: `Median of ${values.length}`, value: medianOf(values) },
  }
}

function assemble(series, latestElectionHeight) {
  // Which question is open is a position in the cycle, and the metric follows
  // from that position — both computable without asking anyone.
  const openIndex = questionIndexFor({
    cycleStart: CYCLE_START_HEIGHT,
    resolutionHeight: latestElectionHeight + BLOCKS_PER_EPOCH,
  })
  const open = scheduleFor({ cycleStart: CYCLE_START_HEIGHT, index: openIndex })
  const openView = viewFor(series, open.metricKey)

  const settled = series.at(-1)
  const priorSeries = series.slice(0, -1)

  // The question now open resolves at the next election, so its truth does not
  // exist yet. The previous one has already settled, and its truth is on chain —
  // that is what the reveal shows, rather than a number invented for a demo.
  const settledSchedule =
    openIndex > 1 ? scheduleFor({ cycleStart: CYCLE_START_HEIGHT, index: openIndex - 1 }) : null
  const settledView =
    settledSchedule && priorSeries.length > 0 ? viewFor(priorSeries, settledSchedule.metricKey) : null

  return {
    status: 'ready',
    series,
    track: openView.track,
    form: openView.values,
    formRows: openView.rows,
    formMedian: openView.median,
    openingRange: openingRange(openView.median.value, openView.track),

    openQuestion: {
      ...buildQuestion({
        latestElectionHeight,
        metricKey: open.metricKey,
        index: open.index,
        of: open.of,
      }),
      truth: null,
      // Albatross separates blocks by a fixed second, so the next election's
      // wall-clock time is arithmetic on the last one — no oracle needed.
      resolvesAtMs: settled.timestamp ? settled.timestamp + BLOCKS_PER_EPOCH * 1000 : null,
      resolvesAtLabel: settled.timestamp
        ? formatElectionTime(settled.timestamp + BLOCKS_PER_EPOCH * 1000)
        : 'the next election',
    },

    resolvedQuestion: settledView
      ? {
          ...buildQuestion({
            latestElectionHeight: settled.height - BLOCKS_PER_EPOCH,
            metricKey: settledSchedule.metricKey,
            index: settledSchedule.index,
            of: settledSchedule.of,
          }),
          truth: settled.metrics[settledSchedule.metricKey],
          resolvedAt: formatElectionTime(settled.timestamp),
          // its own track: the settled question asked about a different metric
          track: settledView.track,
          form: settledView.values,
          formRows: settledView.rows,
          formMedian: settledView.median,
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
