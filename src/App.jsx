import { useCallback, useEffect, useState } from 'react'
import BoardView from './components/BoardView.jsx'
import RecordView from './components/RecordView.jsx'
import { useBoardData } from './hooks/useBoardData.js'
import { useCallLog } from './hooks/useCallLog.js'

const VIEWS = /** @type {const} */ (['board', 'record'])

function formatCountdown(totalSeconds) {
  const pad = (n) => String(n).padStart(2, '0')
  return [
    pad(Math.floor(totalSeconds / 3600)),
    pad(Math.floor((totalSeconds % 3600) / 60)),
    pad(totalSeconds % 60),
  ].join(':')
}

function Notice({ title, detail }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-16">
      <p className="max-w-[24ch] text-question font-medium text-chalk-dim">{title}</p>
      {detail ? <p className="mt-3 max-w-[34ch] text-figure text-chalk-faint">{detail}</p> : null}
    </div>
  )
}

/**
 * App shell. The two destinations are a chalk rule with two caps labels, not a
 * tab bar — DESIGN.md §7 rule 11.
 */
export default function App() {
  const board = useBoardData()
  const { log, record, ledger, lockCall, hasCalled } = useCallLog(board.series)

  const [view, setView] = useState('board')
  const [range, setRange] = useState(null)
  const [showResolved, setShowResolved] = useState(false)
  const [snappedTo, setSnappedTo] = useState(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const handleSnapChange = useCallback((value) => setSnappedTo(value), [])
  const handleScrubbingChange = useCallback((value) => setIsScrubbing(value), [])

  // The opening call sits on recent form, so it is not known until the form has
  // been read from chain. Deriving it rather than syncing it into state removes
  // the frame where the board is ready but the call is not yet chosen.
  const effectiveRange = range ?? (board.status === 'ready' ? board.openingRange : null)

  const isReady = board.status === 'ready' && effectiveRange !== null
  const resolved = isReady ? board.resolvedQuestion : null
  const isShowingResolved = isReady && showResolved && resolved !== null

  const question = isShowingResolved ? resolved : isReady ? board.openQuestion : null

  // A call already made is history: the board shows it locked rather than
  // offering a second one on the same election.
  const isLocked = isShowingResolved || (isReady && hasCalled(board.openQuestion.resolutionHeight))

  /**
   * Which interval the board draws. On a settled question that is the call you
   * actually made on it — not the one currently sitting on the open question,
   * which was set on a different metric's track and would read as a wild miss.
   */
  const calledOnSettled =
    isShowingResolved && log.find((c) => c.resolutionHeight === resolved.resolutionHeight)
  const displayRange = isShowingResolved
    ? (calledOnSettled ?? resolved.openingRange)
    : effectiveRange
  const secondsLeft =
    isReady && board.openQuestion.resolvesAtMs
      ? Math.max(0, Math.round((board.openQuestion.resolvesAtMs - now) / 1000))
      : null

  return (
    <main className="board-surface relative mx-auto flex min-h-screen w-full max-w-board flex-col bg-board px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))] sm:min-h-0 sm:rounded-panel sm:outline sm:outline-1 sm:-outline-offset-1 sm:outline-chalk-faint">
      <header className="flex shrink-0 items-baseline justify-between gap-3">
        <div className="font-display text-[22px] font-bold uppercase tracking-[-0.012em]">
          Called It
        </div>
        {/* deliberately not amber — the reveal owns the only colour event */}
        <div className="text-label font-semibold uppercase text-chalk-dim">
          <span className="mr-1.5 inline-block h-[5px] w-[5px] rounded-full bg-chalk-dim align-middle" />
          {secondsLeft === null ? '--:--:--' : formatCountdown(secondsLeft)}
        </div>
      </header>
      <hr className="mt-3.5 h-px shrink-0 border-0 bg-chalk-faint" />

      <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="view-heading">
        <h2 id="view-heading" className="sr-only">
          {view === 'board' ? 'Board' : 'My record'}
        </h2>

        {view === 'record' ? (
          <RecordView record={record} ledger={ledger} />
        ) : board.status === 'loading' ? (
          <Notice title="Reading the last eight elections from chain…" />
        ) : board.status === 'error' ? (
          <Notice title={board.message} detail={board.detail} />
        ) : !isReady ? (
          <Notice title="Reading the last eight elections from chain…" />
        ) : (
          <BoardView
            question={question}
            track={isShowingResolved ? resolved.track : board.track}
            form={isShowingResolved ? resolved.form : board.form}
            range={displayRange}
            onRangeChange={setRange}
            locked={isLocked}
            hasCall={isShowingResolved ? Boolean(calledOnSettled) : true}
            onLock={() =>
              lockCall({
                index: board.openQuestion.index,
                metricKey: board.openQuestion.metricKey,
                resolutionHeight: board.openQuestion.resolutionHeight,
                anchorBlock: board.openQuestion.anchorBlock,
                lo: effectiveRange.lo,
                hi: effectiveRange.hi,
                at: Date.now(),
              })
            }
            revealed={isShowingResolved}
            snappedTo={snappedTo}
            onSnapChange={handleSnapChange}
            onScrubbingChange={handleScrubbingChange}
            isScrubbing={isScrubbing}
            formRows={isShowingResolved ? resolved.formRows : board.formRows}
            formMedian={isShowingResolved ? resolved.formMedian : board.formMedian}
            record={record}
          />
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

      {/*
        Both sides of this are real: the open question resolves at the next
        election and has no truth yet; the previous one settled on chain and this
        shows what it landed on. It sits in the flow rather than floating over
        the board — a fixed control covered the calibration panel.
      */}
      {view === 'board' && resolved ? (
        <div className="mt-3 flex shrink-0 justify-center">
          <button
            type="button"
            onClick={() => setShowResolved((s) => !s)}
            className="min-h-[44px] px-3 py-2 text-label font-semibold uppercase text-chalk-faint transition-colors duration-[140ms] ease-board hover:text-chalk-dim"
          >
            {showResolved ? '← back to the open question' : 'see the last settled question'}
          </button>
        </div>
      ) : null}
    </main>
  )
}
