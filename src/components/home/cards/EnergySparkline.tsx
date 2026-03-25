import { useMemo } from 'react';

interface Props {
  /** Width of SVG */
  width?: number;
  /** Height of SVG */
  height?: number;
  /** Current total watts for generating simulated data */
  totalWatts: number;
  /** Daily goal kWh for peak marking */
  dailyGoalKwh?: number;
  /** Show peak dots */
  showPeaks?: boolean;
}

/** Generate 24h simulated hourly data based on current watts */
function generateHourlyData(totalWatts: number): number[] {
  const hour = new Date().getHours();
  const baseWatts = totalWatts * 0.4;
  const data: number[] = [];
  for (let i = 0; i < 24; i++) {
    // Simulate usage pattern: peak at 8, 12, 18-20
    const hourOffset = (i - hour + 24) % 24;
    let mult = 0.5;
    if (i >= 7 && i <= 9) mult = 0.9;
    if (i >= 11 && i <= 13) mult = 0.75;
    if (i >= 17 && i <= 21) mult = 1.0;
    if (i >= 23 || i <= 5) mult = 0.3;
    // Add some variation
    const noise = 0.85 + Math.sin(i * 2.3 + totalWatts * 0.01) * 0.15;
    data.push(baseWatts + totalWatts * mult * noise * 0.6);
  }
  return data;
}

export default function EnergySparkline({ width = 280, height = 60, totalWatts, dailyGoalKwh, showPeaks = true }: Props) {
  const data = useMemo(() => generateHourlyData(totalWatts), [totalWatts]);
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / 23) * width;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return { x, y, value: v };
  });

  const pathD = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }).join(' ');

  // Fill path
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  // Find peaks (local max above 80th percentile)
  const threshold = min + range * 0.8;
  const peaks = showPeaks ? points.filter((p, i) => {
    if (p.value < threshold) return false;
    const prev = i > 0 ? points[i - 1].value : 0;
    const next = i < points.length - 1 ? points[i + 1].value : 0;
    return p.value >= prev && p.value >= next;
  }) : [];

  const hour = new Date().getHours();
  const currentX = (hour / 23) * width;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <path d={fillD} fill="url(#sparkline-grad)" />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        className="animate-[sparkline-draw_1.5s_ease-out_forwards]"
        style={{
          strokeDasharray: width * 2,
          strokeDashoffset: 0,
        }}
      />
      {/* Current time indicator */}
      <line
        x1={currentX} y1={0} x2={currentX} y2={height}
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        strokeDasharray="2 2"
        opacity="0.4"
      />
      {/* Peak markers */}
      {peaks.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" opacity="0.8" />
          <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.3" />
        </g>
      ))}
    </svg>
  );
}
