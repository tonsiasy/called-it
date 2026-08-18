import { useState } from 'react'

const VIEWS = /** @type {const} */ (['board', 'record'])

/**
 * App shell. The two destinations are a chalk rule with two caps labels, not a
 * tab bar — DESIGN.md §7 rule 11.
 *
 * The board and record surfaces are not built yet; ../design/prototype.html is
 * the verified reference for both, including the range scrubber interaction.
 */
export default function App() {
  const [view, setView] = useState('board')

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-board flex-col bg-board px-5 pb-5 pt-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[22px] font-bold uppercase tracking-[-0.012em]">Called It</h1>
        {/* deliberately not amber — the reveal owns the only colour event */}
        <p className="text-label font-semibold uppercase text-chalk-dim">--:--:--</p>
      </header>
      <hr className="mt-3.5 h-px border-0 bg-chalk-faint" />

      <section className="flex flex-1 flex-col" aria-labelledby="view-heading">
        <h2 id="view-heading" className="sr-only">
          {view === 'board' ? 'Board' : 'My record'}
        </h2>
        <p className="mt-8 max-w-[22ch] text-question text-chalk-dim">
          Not built yet — see design/prototype.html for the verified reference.
        </p>
      </section>

      <nav className="mt-6 flex justify-center gap-7 border-t border-chalk-faint pt-4">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-current={view === v ? 'page' : undefined}
            className={`min-h-[44px] px-1 py-2.5 text-label font-semibold uppercase transition-colors duration-150 ease-board ${
              view === v ? 'text-chalk' : 'text-chalk-faint'
            }`}
          >
            {v === 'board' ? 'Board' : 'My record'}
          </button>
        ))}
      </nav>
    </main>
  )
}
