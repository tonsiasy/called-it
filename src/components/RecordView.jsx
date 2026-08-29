const formatCallTime = (ms) => {
  if (!ms) return '—'
  const at = new Date(ms)
  const date = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const time = at.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })
  return `${date} · ${time}`
}

/**
 * History is chalk. Amber marks the moment a truth lands, never the fact that
 * it did — colouring every resolved row would spend the board's one colour
 * event on an archive. DESIGN.md §7 rule 4.
 */
function LedgerRow({ entry }) {
  const isOpen = entry.truth === null
  const isHit = entry.isInside === true

  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 border-t border-chalk-faint py-3 first:border-t-0 ${
        isHit ? 'text-chalk' : ''
      }`}
    >
      <div className="text-label font-semibold uppercase text-chalk-dim">
        {formatCallTime(entry.at)}
      </div>
      <div
        className={`col-start-2 row-start-1 whitespace-nowrap text-[15px] font-medium ${
          isHit ? 'text-chalk' : ''
        }`}
      >
        {entry.lo}–{entry.hi}
        <span className="px-[5px] text-chalk-faint">&rarr;</span>
        {isOpen ? <span className="text-chalk-faint">?</span> : entry.truth}
      </div>
      <div className={`col-start-1 text-figure ${isHit ? 'text-chalk' : 'text-chalk-dim'}`}>
        {entry.metric}
      </div>
      <div className="col-start-2 row-start-2 flex items-center justify-end gap-2">
        {isOpen ? (
          <span className="text-label font-semibold uppercase text-chalk-faint">open</span>
        ) : isHit ? (
          // A hit is the brag-worthy row; a zero-length error bar would make it
          // the least visible. Mark it with weight, not colour.
          <span className="text-label font-semibold uppercase text-chalk">inside</span>
        ) : (
          <>
            <span
              className="h-px min-w-[2px] bg-chalk-dim"
              style={{ width: `${Math.min(entry.error * 6, 90)}px` }}
              aria-hidden="true"
            />
            <span className="min-w-[2ch] text-right text-figure text-chalk-dim">{entry.error}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function RecordView({ record, ledger }) {
  const hasCalls = record.callsMade > 0

  return (
    <>
      <div className="pt-[26px]">
        <div className="mb-2 text-label font-semibold uppercase text-chalk-dim">Your record</div>
        <div className="flex items-end gap-3.5">
          <div className="font-display text-[76px] font-bold leading-[0.88] tracking-[-0.022em]">
            {record.callsMade}
          </div>
          <div className="pb-3 text-figure font-medium text-chalk-dim">
            {record.callsMade === 1 ? 'call made' : 'calls made'}
          </div>
        </div>

        {record.resolved > 0 ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-figure text-chalk-dim">
            <span>
              inside{' '}
              <b className="font-medium text-chalk">
                {record.insideCount} of {record.resolved}
              </b>
            </span>
            <span>
              median error <b className="font-medium text-chalk">{record.medianError}</b>
            </span>
            <span>
              open <b className="font-medium text-chalk">{record.callsMade - record.resolved}</b>
            </span>
          </div>
        ) : null}

        <p className="mt-3.5 max-w-[40ch] text-figure leading-[1.5] text-chalk-dim text-pretty">
          {hasCalls
            ? `Every call below was written before its election ran, anchored to a block that
               already existed. Nothing here can be edited or quietly removed — recompute it
               yourself from the published log.`
            : `No calls yet. Lock one on the board and it appears here, anchored to a block that
               already exists, so it can be checked after the election runs.`}
        </p>
      </div>

      {hasCalls ? (
        <>
          <div className="mb-0.5 mt-[22px] text-label font-semibold uppercase text-chalk-dim">
            Ledger · most recent first
          </div>
          <div className="mt-1.5">
            {ledger.map((entry) => (
              <LedgerRow key={entry.resolutionHeight} entry={entry} />
            ))}
          </div>
        </>
      ) : null}

      <p className="mt-4 max-w-[40ch] text-figure leading-[1.5] text-chalk-dim text-pretty">
        This record is kept on your device. Inside Nimiq Pay it is filed under the per-device
        identifier the host issues, so it follows the record, not the wallet.
      </p>
    </>
  )
}
