import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { Monitor, Palette, Paintbrush, RotateCcw, Sliders } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { useRef, useCallback } from 'react';
import type { CustomColors } from '../../../store/types';

const themes = [
  { key: 'dark' as const, label: 'Mörkt' },
  { key: 'midnight' as const, label: 'Midnatt' },
  { key: 'light' as const, label: 'Ljust' },
  { key: 'nordic' as const, label: 'Nordic Noir' },
];

const accents = [
  { color: '#f59e0b', label: 'Guld' },
  { color: '#3b82f6', label: 'Blå' },
  { color: '#10b981', label: 'Grön' },
  { color: '#ef4444', label: 'Röd' },
  { color: '#8b5cf6', label: 'Lila' },
];

const backgrounds = [
  { key: 'scene3d' as const, label: '3D-vy' },
  { key: 'gradient' as const, label: 'Gradient' },
  { key: 'solid' as const, label: 'Enfärgad' },
];

interface ColorPickerDotProps {
  label: string;
  value: string | undefined;
  onChange: (hex: string) => void;
}

function ColorPickerDot({ label, value, onChange }: ColorPickerDotProps) {
  const rafRef = useRef<number>(0);

  const debouncedChange = useCallback((hex: string) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => onChange(hex));
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-1">
      <label className="relative cursor-pointer group">
        <div
          className="w-7 h-7 rounded-full border-2 border-border transition-all group-hover:scale-110"
          style={{ backgroundColor: value || 'hsl(var(--secondary))' }}
        />
        <input
          type="color"
          value={value || '#1a1a2e'}
          onChange={(e) => debouncedChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default function ThemeCard() {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const custom = profile.customColors || {};

  const updateCustom = (changes: Partial<CustomColors>) => {
    setProfile({ customColors: { ...custom, ...changes } });
  };

  const resetCustom = () => {
    setProfile({ customColors: undefined });
  };

  const hasCustom = !!(custom.buttonColor || custom.sliderColor || custom.bgColor || custom.menuColor ||
    custom.cardColor || custom.textColor ||
    custom.glassOpacity !== undefined || custom.borderOpacity !== undefined);

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-4">
      {/* ── Färdiga teman ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Tema</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {themes.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={profile.theme === key ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => setProfile({ theme: key })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Accentfärg ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Accentfärg</span>
        </div>
        <div className="flex gap-2 justify-center">
          {accents.map(({ color, label }) => (
            <button
              key={color}
              title={label}
              className={cn(
                'w-7 h-7 rounded-full border-2 transition-transform',
                profile.accentColor === color ? 'border-foreground scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
              onClick={() => setProfile({ accentColor: color })}
            />
          ))}
        </div>
      </div>

      {/* ── Bakgrund ── */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-foreground">Bakgrund</span>
        <div className="flex gap-2">
          {backgrounds.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={profile.dashboardBg === key ? 'default' : 'outline'}
              className="flex-1 h-8 text-xs"
              onClick={() => setProfile({ dashboardBg: key })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Eget tema / Anpassat ── */}
      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paintbrush size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Eget tema</span>
          </div>
          {hasCustom && (
            <button
              onClick={resetCustom}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              title="Återställ alla anpassningar"
            >
              <RotateCcw size={10} />
              Återställ
            </button>
          )}
        </div>

        {/* Color pickers row 1 */}
        <div className="flex justify-between px-2">
          <ColorPickerDot label="Knappar" value={custom.buttonColor} onChange={(c) => updateCustom({ buttonColor: c })} />
          <ColorPickerDot label="Slider" value={custom.sliderColor} onChange={(c) => updateCustom({ sliderColor: c })} />
          <ColorPickerDot label="Bakgrund" value={custom.bgColor} onChange={(c) => updateCustom({ bgColor: c })} />
        </div>

        {/* Color pickers row 2 */}
        <div className="flex justify-between px-2">
          <ColorPickerDot label="Meny" value={custom.menuColor} onChange={(c) => updateCustom({ menuColor: c })} />
          <ColorPickerDot label="Kort" value={custom.cardColor} onChange={(c) => updateCustom({ cardColor: c })} />
          <ColorPickerDot label="Text" value={custom.textColor} onChange={(c) => updateCustom({ textColor: c })} />
        </div>

        {/* Transparency slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders size={11} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Transparens</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {Math.round((custom.glassOpacity ?? 0.72) * 100)}%
            </span>
          </div>
          <Slider
            min={50}
            max={100}
            step={1}
            value={[Math.round((custom.glassOpacity ?? 0.72) * 100)]}
            onValueChange={([v]) => updateCustom({ glassOpacity: v / 100 })}
          />
        </div>

        {/* Border visibility slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Border-synlighet</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {Math.round((custom.borderOpacity ?? 0.15) * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={30}
            step={1}
            value={[Math.round((custom.borderOpacity ?? 0.15) * 100)]}
            onValueChange={([v]) => updateCustom({ borderOpacity: v / 100 })}
          />
        </div>
      </div>
    </div>
  );
}
