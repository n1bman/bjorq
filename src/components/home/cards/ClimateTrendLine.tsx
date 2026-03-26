import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  currentTemp: number;
  targetTemp: number;
  roomName: string;
}

/** 24h trend line for a single room/sensor with direction indicator */
export default function ClimateTrendLine({ currentTemp, targetTemp, roomName }: Props) {
  // Generate simulated 24h data centered around current temp
  const data = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < 24; i++) {
      const base = currentTemp - 1.5 + Math.sin(i * 0.5) * 1.2;
      const noise = Math.sin(i * 1.7 + currentTemp) * 0.3;
      points.push(base + noise);
    }
    // Last few hours trend toward current
    const hour = new Date().getHours();
    for (let i = Math.max(0, hour - 3); i <= hour && i < 24; i++) {
      const t = (i - (hour - 3)) / 3;
      points[i] = points[i] * (1 - t) + currentTemp * t;
    }
    return points;
  }, [currentTemp]);

  const width = 200;
  const height = 40;
  const min = Math.min(...data, targetTemp) - 0.5;
  const max = Math.max(...data, targetTemp) + 0.5;
  const range = max - min || 1;

  const pts = data.map((v, i) => ({
    x: (i / 23) * width,
    y: height - 2 - ((v - min) / range) * (height - 4),
  }));

  const pathD = pts.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  }).join(' ');

  // Target line
  const targetY = height - 2 - ((targetTemp - min) / range) * (height - 4);

  // Trend direction based on last 3 data points
  const recent = data.slice(-4);
  const trend = recent[recent.length - 1] - recent[0];
  const TrendIcon = trend > 0.3 ? TrendingUp : trend < -0.3 ? TrendingDown : Minus;
  const trendLabel = trend > 0.3 ? 'Stiger' : trend < -0.3 ? 'Sjunker' : 'Stabil';
  const trendColor = trend > 0.3 ? 'text-orange-400' : trend < -0.3 ? 'text-blue-400' : 'text-muted-foreground';

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className="rounded-xl bg-surface-elevated/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">{roomName}</span>
        <div className="flex items-center gap-1">
          <TrendIcon size={12} className={trendColor} />
          <span className={`text-[9px] font-medium ${trendColor}`}>{trendLabel}</span>
        </div>
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Target line */}
        <line x1={0} y1={targetY} x2={width} y2={targetY}
          stroke="hsl(var(--section-climate))" strokeWidth="1.5" opacity="0.35" />
        <text x={width - 2} y={targetY - 4} textAnchor="end" fill="hsl(var(--section-climate))" fontSize="7" opacity="0.5">
          Mål {targetTemp}°
        </text>
        </text>
        {/* Trend line — animated */}
        <path d={pathD} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" className="sparkline-line" />
        {/* Current point — pulsing */}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="4" fill="hsl(var(--section-climate))" className="sparkline-pulse" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2" fill="hsl(var(--section-climate))" />
        {/* Hover hit areas for tooltip */}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={p.x - 4}
            y={0}
            width={8}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
        {/* Hover tooltip */}
        {hoverIdx !== null && pts[hoverIdx] && (
          <g>
            <line x1={pts[hoverIdx].x} y1={0} x2={pts[hoverIdx].x} y2={height} stroke="hsl(var(--foreground))" strokeWidth="0.5" opacity="0.3" />
            <circle cx={pts[hoverIdx].x} cy={pts[hoverIdx].y} r="3" fill="hsl(var(--section-climate))" />
            <rect x={pts[hoverIdx].x - 28} y={pts[hoverIdx].y - 22} width="56" height="16" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="0.5" />
            <text x={pts[hoverIdx].x} y={pts[hoverIdx].y - 11} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8" fontWeight="600">
              {data[hoverIdx].toFixed(1)}° {String(hoverIdx).padStart(2, '0')}:00
            </text>
          </g>
        )}
      </svg>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground/50">
        <span>00:00</span>
        <span className="text-[hsl(var(--section-climate))] text-[10px] font-medium">{currentTemp.toFixed(1)}° nu</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
