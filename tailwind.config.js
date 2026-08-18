/**
 * Token mapping for the design system in design/DESIGN.md.
 *
 * Colours are declared as CSS custom properties in src/styles/tokens.css and
 * referenced here, so a token has exactly one definition. Tailwind v3 is pinned
 * deliberately: DESIGN.md specifies `extend.colors` over v4's `@theme`, because
 * `@theme` generates utilities JIT and silently purges any class name that is
 * built from a variable rather than written literally in source.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          deep: 'var(--board-deep)',
          DEFAULT: 'var(--board)',
          raised: 'var(--board-raised)',
        },
        chalk: {
          DEFAULT: 'var(--chalk)',
          dim: 'var(--chalk-dim)',
          faint: 'var(--chalk-faint)',
        },
        tick: 'var(--tick)',
        amber: {
          DEFAULT: 'var(--amber)',
          dim: 'var(--amber-dim)',
        },
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', 'Haettenschweiler', '"Arial Narrow"', 'sans-serif'],
        ui: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // the call range steps down by digit count — see DESIGN.md §3
        range: ['clamp(72px, 24vw, 104px)', { lineHeight: '0.88', letterSpacing: '-0.022em' }],
        'range-wide': ['clamp(54px, 17.5vw, 80px)', { lineHeight: '0.88', letterSpacing: '-0.022em' }],
        truth: ['52px', { lineHeight: '0.92', letterSpacing: '-0.022em' }],
        question: ['22px', { lineHeight: '1.2', letterSpacing: '-0.012em' }],
        label: ['12px', { lineHeight: '1', letterSpacing: '0.18em' }],
        figure: ['13px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        // the committed scale — nothing outside this set
        chip: '3px',
        panel: '8px',
      },
      transitionTimingFunction: {
        board: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      maxWidth: {
        board: '430px',
      },
    },
  },
  plugins: [],
}
