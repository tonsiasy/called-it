import RangeScrubber from './RangeScrubber.jsx'

/**
 * The call as a single figure. Steps down a size once the two numbers plus the
 * dash outgrow the board — a 3-digit range (hhi_bp runs 499–661) exactly fills
 * a 320px board at the base size, so this is measured, not defensive.
 */
function CalledRange({ lo, hi, unit, isScrubbing }) {
  const isWide = String(lo).length + String(hi).length > 4

  return (
    <div className="flex items-end gap-3.5">
      <div
        className={`font-display font-bold transition-transform duration-150 ease-board ${
          isWide ? 'text-range-wide' : 'text-range'
        } ${isScrubbing ? 'scale-[1.02]' : ''}`}
        style={{ transformOrigin: '50% 100%' }}
      >
        {lo}
        <span className="px-[0.06em] text-chalk-faint">–</span>
        {hi}
      </div>
      <div className="pb-3 text-figure font-medium text-chalk-dim">{unit}</div>
    </div>
  )
}

/**
 * Pre- and post-reveal states share one footprint, so the truth landing cannot
 * reflow the page. Before the reveal the space is labelled rather than left
 * empty — it tells a first-time player what is about to happen there.
 */
function Outcome({ revealed, truth, range, resolvesAt }) {
  const isInside = truth >= range.lo && truth <= range.hi
  const label = isInside
    ? `inside your range · width ${range.hi - range.lo}`
    : `outside by ${truth < range.lo ? range.lo - truth : truth - range.hi}`

  return (
    <div className="relative mt-2 min-h-[86px] w-full">
      <div
        className={`absolute inset-0 flex flex-col items-center transition-opacity duration-[240ms] ease-board ${
          revealed ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="my-2.5 h-px w-[min(240px,70%)]"
          style={{
            background:
              'repeating-linear-gradient(to right, var(--chalk-faint) 0 6px, transparent 6px 12px)',
          }}
        />
        <div className="text-label font-semibold uppercase text-chalk-faint">
          truth lands {resolvesAt}
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-0 flex flex-col items-center transition-opacity duration-[240ms] ease-board ${
          revealed ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="mb-0.5 mt-2.5 h-px w-[min(240px,70%)] origin-left bg-amber-dim transition-transform duration-[240ms] delay-[120ms] ease-board"
          style={{ transform: revealed ? 'scaleX(1)' : 'scaleX(0)' }}
        />
        <div
          className={`text-label font-semibold uppercase text-amber-dim transition-opacity duration-200 delay-[320ms] ease-board ${
            revealed ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {label}
        </div>
        <div
          className={`font-display text-truth font-bold text-amber transition-all duration-[320ms] ease-board ${
            revealed ? 'opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-[4px]'
          }`}
        >
          {truth}
        </div>
      </div>
    </div>
  )
}

function FormTable({ rows, median }) {
  return (
    <section className="mt-[22px]">
      <div className="mb-1.5 text-label font-semibold uppercase text-chalk-dim">
        Form · last elections
      </div>
      {rows.map((row) => (
        <div
          key={row.at}
          className="flex items-baseline justify-between border-t border-chalk-faint py-[11px] first-of-type:border-t-0"
        >
          <span className="text-figure text-chalk-dim">{row.at}</span>
          <span className="text-figure font-medium">{row.value}</span>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-chalk py-[11px]">
        <span className="text-figure text-chalk">{median.at}</span>
        <span className="text-figure font-medium text-chalk">{median.value}</span>
      </div>
    </section>
  )
}

export default function BoardView({
  question,
  track,
  form,
  range,
  onRangeChange,
  locked,
  onLock,
  revealed,
  snappedTo,
  onSnapChange,
  onScrubbingChange,
  isScrubbing,
  formRows,
  formMedian,
  standing,
}) {
  const hint = locked
    ? 'locked · published at resolution'
    : snappedTo !== null
      ? `past result · ${snappedTo} ${question.unit}`
      : `width ${range.hi - range.lo} · aim to be right 4 times in 5`

  return (
    <>
      <div className="mt-7">
        <div className="mb-2.5 text-label font-semibold uppercase text-chalk-dim">
          Election {question.epoch} · question {question.index} of {question.of}
        </div>
        <h1 className="max-w-[22ch] text-question font-medium text-balance">{question.prompt}</h1>
      </div>

      <div className="flex min-h-[190px] flex-1 flex-col items-center justify-center gap-0.5 pb-2 pt-7 sm:max-h-[270px]">
        <CalledRange lo={range.lo} hi={range.hi} unit={question.unit} isScrubbing={isScrubbing} />
        <Outcome
          revealed={revealed}
          truth={question.truth}
          range={range}
          resolvesAt={question.resolvesAt}
        />
      </div>

      <RangeScrubber
        range={range}
        onChange={onRangeChange}
        track={track}
        form={form}
        truth={question.truth}
        revealed={revealed}
        locked={locked}
        onSnapChange={onSnapChange}
        onScrubbingChange={onScrubbingChange}
      />
      <div className="-mt-1 text-center">
        <span className="text-label font-semibold uppercase text-chalk-dim" aria-live="polite">
          {locked ? hint : 'drag to set · ticks are past results'}
        </span>
      </div>

      <div className="mt-2 flex min-h-[52px] items-center justify-center">
        {locked ? (
          <div className="text-center leading-[1.35]">
            <div className="font-display text-[26px] font-bold tracking-[-0.012em]">
              {range.lo}–{range.hi} called
            </div>
            <div className="text-figure font-medium text-chalk-dim">
              anchored to block {question.anchorBlock.toLocaleString('en-US')}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLock}
            className="min-h-[44px] rounded-full border border-chalk bg-board-raised px-[30px] py-3.5 text-label font-semibold uppercase text-chalk transition-transform duration-[140ms] ease-board active:scale-[0.96]"
          >
            Lock my call
          </button>
        )}
      </div>

      <FormTable rows={formRows} median={formMedian} />

      <div className="mt-[18px] flex items-baseline justify-between rounded-panel bg-board-raised px-4 py-3.5">
        <div>
          <div className="mb-[5px] text-label font-semibold uppercase text-chalk-dim">Standing</div>
          <div className="font-display text-[26px] font-bold tracking-[-0.012em]">
            {standing.place}
          </div>
        </div>
        <div className="text-figure font-medium text-chalk-dim">
          {standing.points.toLocaleString('en-US')} pts · {standing.percentile}
        </div>
      </div>
    </>
  )
}
