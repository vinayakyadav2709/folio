import { ONGOING, span, startOf, when } from '../lib/timeline'
import type { Entry } from '../lib/timeline'

// Time-proportional vertical timeline, newest at top. Work + education are thin
// lanes branching off one spine; projects are dots on the spine at their start
// (same-month projects merge into one dot). Awards stay off the graph.
// Lines are SVG in a 1000-unit tall viewBox stretched to the column; dots and
// labels are HTML so they don't distort.

const SPINE = 44 // portfolio-view positions the graph at 50vw - SPINE
const LANE = 12
const H = 1000

type Props = {
  entries: Entry[]
  active: string[]
  onHover: (keys: string[]) => void
  onPick: (key: string) => void
}

export function TimelineGraph({ entries, active, onHover, onPick }: Props) {
  const d = new Date()
  const now = d.getFullYear() * 12 + d.getMonth()
  const shown = entries.filter((r) => r.group !== 'Awards' && startOf(r) !== null)
  if (shown.length === 0) return null
  const end = (r: Entry) => {
    const t = when(r.to)
    return t === null || t === Number.POSITIVE_INFINITY ? now : t
  }
  const bottom = Math.min(...shown.map((r) => startOf(r) as number)) - 3
  const top = Math.max(now, ...shown.map(end)) + 2
  const Y = (t: number) => ((top - t) / (top - bottom)) * H
  const pct = (y: number) => `${y / 10}%`

  // Greedy lane packing: oldest range first, lowest lane that's free again.
  const laneEnds: number[] = []
  const lanes = shown
    .filter((r) => r.group !== 'Projects' && r.from)
    .sort((a, b) => (startOf(a) as number) - (startOf(b) as number))
    .map((r) => {
      const s = startOf(r) as number
      let i = laneEnds.findIndex((e) => e < s)
      if (i < 0) i = laneEnds.length
      laneEnds[i] = end(r)
      const live = ONGOING.test(r.to ?? '')
      return { keys: [r.key], x: SPINE + LANE * (i + 1), y0: Y(s), y1: Y(end(r)), live }
    })
  const W = SPINE + LANE * (laneEnds.length + 1)

  // Projects: one dot per month.
  const byMonth = new Map<number, string[]>()
  for (const r of shown.filter((r) => r.group === 'Projects')) {
    const t = startOf(r) as number
    byMonth.set(t, [...(byMonth.get(t) ?? []), r.key])
  }
  const dots = [...byMonth].map(([t, keys]) => ({ keys, y: Y(t) }))

  const years = Array.from(
    { length: Math.floor(top / 12) - Math.ceil(bottom / 12) + 1 },
    (_, i) => Math.ceil(bottom / 12) + i,
  )
  const isOn = (keys: string[]) => keys.some((k) => active.includes(k))
  const on = (keys: string[]) => (isOn(keys) ? { 'data-on': '' } : {})
  const hit = (keys: string[]) => ({
    onMouseEnter: () => onHover(keys),
    onClick: () => onPick(keys[0]),
  })

  // Readout next to the graph for whatever is highlighted.
  const lane = lanes.find((l) => isOn(l.keys))
  const dot = dots.find((p) => isOn(p.keys))
  const ry = lane ? (lane.y0 + lane.y1) / 2 : dot?.y
  const first = entries.find((r) => r.key === active[0])

  return (
    <div
      className="pf-graph"
      data-active={active.length ? '' : undefined}
      onMouseLeave={() => onHover([])}
      aria-hidden
    >
      {years.map((y) => (
        <span key={y} className="pf-tick" style={{ top: pct(Y(y * 12)), width: SPINE - 12 }}>
          {y}
        </span>
      ))}
      <span className="pf-tick pf-now" style={{ top: pct(Y(now)), width: SPINE - 12 }}>
        Now
      </span>

      <svg width={W} height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path className="pf-draw pf-spine" pathLength={1} d={`M${SPINE} ${H} V0`} />
        {lanes.map(({ keys, x, y0, y1, live }, i) => {
          const k = Math.min(14, (y0 - y1) / 3)
          const d = `M${SPINE} ${y0} Q${x} ${y0} ${x} ${y0 - k} V${y1 + (live ? 0 : k)}${
            live ? '' : ` Q${x} ${y1} ${SPINE} ${y1}`
          }`
          return (
            <g key={keys[0]} className="pf-g" {...on(keys)} {...hit(keys)}>
              <path
                className="pf-draw"
                pathLength={1}
                data-live={live || undefined}
                d={d}
                style={{ animationDelay: `${250 + i * 120}ms` }}
              />
              <path className="pf-hit" d={d} />
            </g>
          )
        })}
      </svg>

      {lanes
        .filter((l) => l.live)
        .map((l) => (
          <span key={l.keys[0]} className="pf-head" style={{ top: pct(l.y1), left: l.x }} />
        ))}

      {dots.map(({ keys, y }, i) => (
        <button
          key={keys[0]}
          type="button"
          tabIndex={-1}
          className="pf-g pf-dot"
          {...on(keys)}
          {...hit(keys)}
          style={{ top: pct(y), left: SPINE, animationDelay: `${450 + i * 40}ms` }}
        />
      ))}

      {ry !== undefined && first && (
        <span className="pf-readout" style={{ top: pct(ry), left: W + 8 }}>
          {first.name}
          {active.length > 1 ? ` +${active.length - 1}` : ''}
          <span>{span(first)}</span>
        </span>
      )}
    </div>
  )
}
