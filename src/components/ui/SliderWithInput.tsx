import * as React from 'react';
import { Slider } from './slider';
import { cn } from '../../lib/utils';

interface SliderWithInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (v: number) => void;
  /** Called once at drag start / focus for undo */
  onCommitStart?: () => void;
  label?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function SliderWithInput({
  min, max, step, value, onValueChange, onCommitStart,
  label, suffix = '', decimals = 2, className,
}: SliderWithInputProps) {
  const [editing, setEditing] = React.useState(false);
  const [inputVal, setInputVal] = React.useState('');

  const display = typeof value === 'number' ? value.toFixed(decimals) : '0';

  const handleInputBlur = () => {
    setEditing(false);
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onValueChange(clamped);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInputBlur();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className={cn('space-y-0.5', className)}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          {editing ? (
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              autoFocus
              className="w-16 h-5 text-[10px] text-right text-foreground bg-secondary/50 border border-input rounded px-1 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <button
              onClick={() => { setInputVal(display); setEditing(true); }}
              className="text-[10px] text-foreground font-mono hover:bg-secondary/40 px-1 rounded cursor-text"
              title="Klicka för att skriva exakt värde"
            >
              {display}{suffix}
            </button>
          )}
        </div>
      )}
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onValueChange(v)}
        onPointerDown={() => onCommitStart?.()}
      />
    </div>
  );
}
