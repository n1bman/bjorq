import { useRef, useEffect, useCallback } from 'react';

/**
 * HSV Color Wheel — canvas-based color picker for lights.
 * Renders a hue wheel with saturation gradient and lets user click/drag to pick color.
 * Returns RGB values via onChange.
 */

interface ColorWheelProps {
  rgb: [number, number, number];
  onChange: (rgb: [number, number, number]) => void;
  size?: number;
  disabled?: boolean;
}

// ── Color conversion helpers ──

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

export default function ColorWheel({ rgb, onChange, size = 160, disabled }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);
  const [h, s] = rgbToHsv(rgb[0], rgb[1], rgb[2]);

  // Draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    // Draw HSV wheel pixel by pixel using imageData for performance
    const imageData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
          const sat = dist / radius;
          const [r, g, b] = hsvToRgb(angle, sat, 1);
          const idx = (y * size + x) * 4;
          imageData.data[idx] = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = b;
          imageData.data[idx + 3] = disabled ? 100 : 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw selection indicator
    const selAngle = h * Math.PI / 180;
    const selDist = s * radius;
    const sx = cx + Math.cos(selAngle) * selDist;
    const sy = cy + Math.sin(selAngle) * selDist;

    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [rgb, size, disabled, h, s]);

  const pickColor = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;
    const dx = x - cx;
    const dy = y - cy;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) dist = radius;
    const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const sat = dist / radius;
    const newRgb = hsvToRgb(angle, sat, 1);
    onChange(newRgb);
  }, [disabled, size, onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pickColor(e.clientX, e.clientY);
  }, [disabled, pickColor]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    pickColor(e.clientX, e.clientY);
  }, [pickColor]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="cursor-crosshair rounded-full touch-none"
        style={{ width: size, height: size, opacity: disabled ? 0.4 : 1 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full border border-border"
          style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
        />
        <span className="text-[10px] text-muted-foreground font-mono">
          {rgb[0]}, {rgb[1]}, {rgb[2]}
        </span>
      </div>
    </div>
  );
}
