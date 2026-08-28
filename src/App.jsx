import { useCallback, useEffect, useState } from 'react'
import BoardView from './components/BoardView.jsx'
import RecordView from './components/RecordView.jsx'
import {
  SAMPLE_FORM,
  SAMPLE_FORM_MEDIAN,
  SAMPLE_FORM_ROWS,
  SAMPLE_LEDGER,
  SAMPLE_QUESTION,
  SAMPLE_RECORD,
  SAMPLE_STANDING,
  SAMPLE_TRACK,
} from './data/sample.js'

const VIEWS = /** @type {const} */ (['board', 'record'])

/** Opening call, sat on the run of recent results rather than centred on the track. */
const OPENING_RANGE = Object.freeze({ lo: 42, hi: 50 })

const SECONDS_TO_RESOLUTION = 4 * 3600 + 12 * 60 + 38

function formatCountdown(totalSeconds) {
  const pad = (n) => String(n).padStart(2, '0')
  return [
    pad(Math.floor(totalSeconds / 3600)),
    pad(Math.floor((totalSeconds % 3600) / 60)),
    pad(totalSeconds % 60),
  ].join(':')
}

/**
 * App shell. The two destinations are a chalk rule with two caps labels, not a
 * tab bar — DESIGN.md §7 rule 11.
 */
export default function App() {
  const [view, setView] = useState('board')
  const [range, setRange] = useState(OPENING_RANGE)
  const [locked, setLocked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [snappedTo, setSnappedTo] = useState(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_TO_RESOLUTION)

  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const handleSnapChange = useCallback((value) => setSnappedTo(value), [])
  const handleScrubbingChange = useCallback((value) => setIsScrubbing(value), [])

  return (
    <main className="board-surface relative mx-auto flex min-h-screen w-full max-w-board flex-col bg-board px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:min-h-0 sm:rounded-panel sm:outline sm:outline-1 sm:-outline-offset-1 sm:outline-chalk-faint">
      <header className="flex shrink-0 items-baseline justify-between gap-3">
        <div className="font-display text-[22px] font-bold uppercase tracking-[-0.012em]">
          Called It
        </div>
        {/* deliberately not amber — the reveal owns the only colour event */}
        <div className="text-label font-semibold uppercase text-chalk-dim">
          <span className="mr-1.5 inline-block h-[5px] w-[5px] rounded-full bg-chalk-dim align-middle" />
          {formatCountdown(secondsLeft)}
        </div>
      </header>
      <hr className="mt-3.5 h-px shrink-0 border-0 bg-chalk-faint" />

      <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="view-heading">
        <h2 id="view-heading" className="sr-only">
          {view === 'board' ? 'Board' : 'My record'}
        </h2>

        {view === 'board' ? (
          <BoardView
            question={SAMPLE_QUESTION}
            track={SAMPLE_TRACK}
            form={SAMPLE_FORM}
            range={range}
            onRangeChange={setRange}
            locked={locked}
            onLock={() => setLocked(true)}
            revealed={revealed}
            snappedTo={snappedTo}
            onSnapChange={handleSnapChange}
            onScrubbingChange={handleScrubbingChange}
            isScrubbing={isScrubbing}
            formRows={SAMPLE_FORM_ROWS}
            formMedian={SAMPLE_FORM_MEDIAN}
            standing={SAMPLE_STANDING}
          />
        ) : (
          <RecordView record={SAMPLE_RECORD} ledger={SAMPLE_LEDGER} />
        )}
      </section>

      <nav className="mt-[22px] flex shrink-0 justify-center gap-[26px] border-t border-chalk-faint pt-4">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setView(v)
              window.scrollTo(0, 0)
            }}
            aria-current={view === v ? 'page' : undefined}
            className={`min-h-[44px] px-1 py-2.5 text-label font-semibold uppercase transition-colors duration-[140ms] ease-board ${
              view === v ? 'text-chalk' : 'text-chalk-faint'
            }`}
          >
            {v === 'board' ? 'Board' : 'My record'}
          </button>
        ))}
      </nav>

      {/* Demo control, not part of the design. Goes when the scheduler lands — see BACKLOG. */}
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="fixed bottom-2.5 right-2.5 z-10 rounded-chip border border-chalk-faint bg-board-raised px-2.5 py-[7px] text-[11px] leading-none text-chalk-dim opacity-75"
      >
        toggle reveal
      </button>
    </main>
  )
}
