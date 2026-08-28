import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fractionOf,
  valueAtFraction,
  snapToForm,
  resolveDragTarget,
  moveJaw,
  shiftBand,
} from '../lib/scrubber.js'

/** Tick lengths, in px. Past results are the longest — they are the reference the call is made against. */
const FORM_TICK = 28
const MAJOR_TICK = 18
const MINOR_TICK = 10
const MAJOR_EVERY = 5

const JAW_HALF = 20
const TRUTH_HALF = 26

/** Ticks within this many units of the pointer brighten, so the drag has a local halo. */
const HIGHLIGHT_UNITS = 2.2

/**
 * Canvas 2D will not accept `oklch()` in every engine, and a rejected
 * strokeStyle assignment silently keeps the previous value — black on a dark
 * board, i.e. invisible. Resolving each token through a probe element yields
 * `rgb()`, which every engine does accept. Cached: this is read per tick.
 */
function createColorReader() {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  document.body.appendChild(probe)

  const cache = new Map()
  return {
    read(token) {
      if (!cache.has(token)) {
        probe.style.color = `var(${token})`
        cache.set(token, getComputedStyle(probe).color)
      }
      return cache.get(token)
    },
    dispose() {
      probe.remove()
    },
  }
}

/**
 * The range scrubber: two jaws and a draggable band over a tick track.
 *
 * Canvas rather than DOM — the track draws one hairline per unit and brightens
 * them under the pointer, which is 35 elements restyled per pointermove if the
 * ticks are nodes. All arithmetic lives in lib/scrubber.js; this component owns
 * only pixels and pointers.
 */
export default function RangeScrubber({
  range,
  onChange,
  track,
  form,
  truth = null,
  revealed = false,
  locked = false,
  onSnapChange,
  onScrubbingChange,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const colorsRef = useRef(null)
  const dragRef = useRef(null)

  // The pointer handlers are bound to window and read the newest range, so it
  // is mirrored into a ref rather than captured in a stale closure.
  const rangeRef = useRef(range)
  rangeRef.current = range

  const [pointerValue, setPointerValue] = useState(null)

  useEffect(() => {
    colorsRef.current = createColorReader()
    return () => colorsRef.current?.dispose()
  }, [])

  const draw = useCallback(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const colors = colorsRef.current
    if (!host || !canvas || !colors) return

    const width = host.clientWidth
    const height = host.clientHeight
    if (!width || !height) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const mid = height / 2
    const xOf = (value) => fractionOf(value, track) * width
    const { lo, hi } = rangeRef.current

    for (let value = track.min; value <= track.max; value += 1) {
      const isForm = form.includes(value)
      const length = isForm ? FORM_TICK : value % MAJOR_EVERY === 0 ? MAJOR_TICK : MINOR_TICK

      const isNearPointer =
        pointerValue !== null && Math.abs(value - pointerValue) < HIGHLIGHT_UNITS
      ctx.strokeStyle = colors.read(isForm || isNearPointer ? '--chalk-dim' : '--tick')

      const x = xOf(value)
      ctx.lineWidth = 1
      ctx.beginPath()
      // the +0.5 puts a 1px stroke on the pixel rather than straddling two
      ctx.moveTo(x + 0.5, mid - length / 2)
      ctx.lineTo(x + 0.5, mid + length / 2)
      ctx.stroke()
    }

    // the interval, drawn as a chalk bracket — the thing being submitted
    const xLo = xOf(lo)
    const xHi = xOf(hi)
    ctx.strokeStyle = colors.read('--chalk')
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(xLo, mid - JAW_HALF)
    ctx.lineTo(xLo, mid + JAW_HALF)
    ctx.moveTo(xHi, mid - JAW_HALF)
    ctx.lineTo(xHi, mid + JAW_HALF)
    ctx.moveTo(xLo, mid)
    ctx.lineTo(xHi, mid)
    ctx.stroke()

    // at reveal the truth lands on the same track, so "inside or outside" is visual
    if (revealed && truth !== null) {
      const xTruth = xOf(truth)
      const isInside = truth >= lo && truth <= hi
      if (!isInside) {
        ctx.strokeStyle = colors.read('--amber-dim')
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(truth < lo ? xLo : xHi, mid)
        ctx.lineTo(xTruth, mid)
        ctx.stroke()
      }
      ctx.strokeStyle = colors.read('--amber')
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(xTruth, mid - TRUTH_HALF)
      ctx.lineTo(xTruth, mid + TRUTH_HALF)
      ctx.stroke()
    }
  }, [track, form, truth, revealed, pointerValue])

  useEffect(() => {
    draw()
  }, [draw, range])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(() => draw())
    observer.observe(host)
    return () => observer.disconnect()
  }, [draw])

  // Webfonts do not affect the canvas, but they do settle the layout the canvas
  // is measured against — redraw once they land.
  useEffect(() => {
    document.fonts?.ready.then(() => draw())
  }, [draw])

  const valueFromClientX = useCallback(
    (clientX) => {
      const rect = hostRef.current.getBoundingClientRect()
      return {
        value: valueAtFraction((clientX - rect.left) / rect.width, track),
        widthPx: rect.width,
      }
    },
    [track],
  )

  const applyDrag = useCallback(
    (clientX) => {
      const drag = dragRef.current
      if (!drag) return

      const { value, widthPx } = valueFromClientX(clientX)
      setPointerValue(value)

      if (drag.target === 'band') {
        onChange(shiftBand(drag.origin, Math.round(value - drag.grabValue), track))
        onSnapChange?.(null)
        return
      }

      const { value: snapped, snappedTo } = snapToForm(value, { form, track, widthPx })
      onChange(moveJaw(rangeRef.current, drag.target, snapped, track))
      onSnapChange?.(snappedTo)
    },
    [form, track, onChange, onSnapChange, valueFromClientX],
  )

  const handlePointerDown = (event) => {
    if (locked) return
    const { value } = valueFromClientX(event.clientX)
    dragRef.current = {
      target: resolveDragTarget(value, rangeRef.current),
      grabValue: value,
      origin: rangeRef.current,
    }
    onScrubbingChange?.(true)
    applyDrag(event.clientX)
    event.preventDefault()
  }

  useEffect(() => {
    const onMove = (event) => applyDrag(event.clientX)
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      setPointerValue(null)
      onSnapChange?.(null)
      onScrubbingChange?.(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [applyDrag, onSnapChange, onScrubbingChange])

  /**
   * A canvas control is unreachable without this. Arrows slide the call;
   * shift+arrow moves the high jaw, which is how width is set from a keyboard.
   */
  const handleKeyDown = (event) => {
    if (locked) return
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (step === 0) return

    onChange(
      event.shiftKey
        ? moveJaw(range, 'hi', range.hi + step, track)
        : shiftBand(range, step, track),
    )
    event.preventDefault()
  }

  return (
    <div
      ref={hostRef}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={locked ? -1 : 0}
      aria-label="Your called range"
      aria-valuemin={track.min}
      aria-valuemax={track.max}
      aria-valuenow={range.lo}
      aria-valuetext={`${range.lo} to ${range.hi}`}
      aria-disabled={locked || undefined}
      className={`relative mt-1 h-16 touch-pan-x select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk ${
        locked ? 'pointer-events-none opacity-40' : 'cursor-ew-resize'
      }`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
