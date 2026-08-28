/**
 * History is chalk. Amber marks the moment a truth lands, never the fact that
 * it did — colouring every resolved row would spend the board's one colour
 * event on an archive. DESIGN.md §7 rule 4.
 */
function LedgerRow({ entry }) {
  const error = Math.abs(entry.call - entry.truth)
  const isExact = error === 0

  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 border-t border-chalk-faint py-3 first:border-t-0 ${
        isExact ? 'text-chalk' : ''
      }`}
    >
      <div className="text-label font-semibold uppercase text-chalk-dim">{entry.at}</div>
      <div
        className={`col-start-2 row-start-1 whitespace-nowrap text-[15px] font-medium ${
          isExact ? 'text-chalk' : ''
        }`}
      >
        {entry.call}
        <span className="px-[5px] text-chalk-faint">&rarr;</span>
        {entry.truth}
      </div>
      <div className={`col-start-1 text-figure ${isExact ? 'text-chalk' : 'text-chalk-dim'}`}>
        {entry.metric}
      </div>
      <div className="col-start-2 row-start-2 flex items-center justify-end gap-2">
        {isExact ? (
          // An exact call is the most brag-worthy row on the page; a zero-length
          // error bar would make it the least visible. Mark it with weight, not colour.
          <span className="text-label font-semibold uppercase text-chalk">exact</span>
        ) : (
          <>
            <span
              className="h-px min-w-[2px] bg-chalk-dim"
              style={{ width: `${error * 6}px` }}
              aria-hidden="true"
            />
            <span className="min-w-[2ch] text-right text-figure text-chalk-dim">{error}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default function RecordView({ record, ledger }) {
  return (
    <>
      <div className="pt-[26px]">
        <div className="mb-2 text-label font-semibold uppercase text-chalk-dim">Your record</div>
        <div className="flex items-end gap-3.5">
          <div className="font-display text-[76px] font-bold leading-[0.88] tracking-[-0.022em]">
            {record.callsMade}
          </div>
          <div className="pb-3 text-figure font-medium text-chalk-dim">calls made</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-figure text-chalk-dim">
          <span>
            median error <b className="font-medium text-chalk">{record.medianError}</b>
          </span>
          <span>
            best finish <b className="font-medium text-chalk">{record.bestFinish}</b>
          </span>
          <span>
            cycles <b className="font-medium text-chalk">{record.cycles}</b>
          </span>
        </div>
        <p className="mt-3.5 max-w-[40ch] text-figure leading-[1.5] text-chalk-dim text-pretty">
          Every call below was written before its election ran, anchored to a block that already
          existed. Nothing here can be edited or quietly removed — recompute it yourself from the
          published log.
        </p>
      </div>

      <div className="mb-0.5 mt-[22px] text-label font-semibold uppercase text-chalk-dim">
        Ledger · most recent first
      </div>
      <div className="mt-1.5">
        {ledger.map((entry) => (
          <LedgerRow key={`${entry.at}-${entry.metric}`} entry={entry} />
        ))}
      </div>

      <p className="mt-4 max-w-[40ch] text-figure leading-[1.5] text-chalk-dim text-pretty">
        Identity is a per-device key issued by Nimiq Pay. It follows the record, not the wallet.
      </p>
    </>
  )
}
