'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle2, XCircle } from 'lucide-react';

const SURFACE = '#12161F';
const GRID = '#1E2430';
const AXIS_TEXT = '#5B6474';
const INK = '#E7EAF0';

/**
 * One metric's score across eval runs (oldest -> newest), with that metric's target
 * as a reference line. Single series, so the card title names it and no legend is needed.
 * The run history table on the page is this chart's table view.
 */
export default function ScoreTrendChart({ points, metric, threshold }) {
  const lastIndex = points.length - 1;
  const latest = points[lastIndex];

  return (
    <div
      role="img"
      aria-label={`${metric.label} across ${points.length} runs. Latest ${latest?.score.toFixed(2) ?? 'none'}, target ${threshold?.toFixed(2) ?? 'none'}.`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 16, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="tick"
            stroke={AXIS_TEXT}
            tick={{ fill: AXIS_TEXT, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval="preserveStartEnd"
            minTickGap={24}
            padding={{ left: 16, right: 44 }}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(v) => v.toFixed(2)}
            stroke={AXIS_TEXT}
            tick={{ fill: AXIS_TEXT, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {threshold != null && (
            // Target value is named in the card subtitle, so the line carries no label to collide with points
            <ReferenceLine y={threshold} stroke={AXIS_TEXT} strokeDasharray="4 4" />
          )}
          <Tooltip
            cursor={{ stroke: '#2A3242', strokeWidth: 1 }}
            content={<TrendTooltip metric={metric} threshold={threshold} />}
          />
          <Line
            type="linear"
            dataKey="score"
            stroke={metric.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: metric.color, stroke: SURFACE, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: metric.color, stroke: SURFACE, strokeWidth: 2 }}
            isAnimationActive={false}
            label={<EndLabel lastIndex={lastIndex} />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Direct label on the latest point only, in ink (never the series colour)
function EndLabel({ x, y, index, value, lastIndex }) {
  if (index !== lastIndex || value == null) return null;
  return (
    <text x={x + 10} y={y} dy={4} fill={INK} fontSize={12} fontWeight={600}>
      {value.toFixed(2)}
    </text>
  );
}

function TrendTooltip({ active, payload, metric, threshold }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const meets = threshold == null || point.score >= threshold;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5 shadow-lg text-xs min-w-[180px]">
      <p className="text-lg font-semibold text-ink leading-tight">{point.score.toFixed(2)}</p>
      <p className="flex items-center gap-1.5 text-ink-dim mb-1.5">
        <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: metric.color }} />
        {metric.label}
      </p>
      <p className="text-ink-faint">{point.fullDate}</p>
      <p className="text-ink-faint truncate">{point.collection}</p>
      <p className={`flex items-center gap-1 mt-1.5 ${meets ? 'text-eval-faithfulness' : 'text-danger'}`}>
        {meets ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
        {meets ? 'Meets target' : 'Below target'}
      </p>
    </div>
  );
}
