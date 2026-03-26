import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { Monitor, Paintbrush, RotateCcw, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { useRef, useCallback, useState } from 'react';
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
  { color: '#ec4899', label: 'Rosa' },
  { color: '#14b8a6', label: 'Teal' },
  { color: '#f97316', label: 'Orange' },
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
  const [showCustom, setShowCustom] = useState(false);

  const updateCustom = (changes: Partial<CustomColors>) => {
    setProfile({ customColors: { ...custom, ...changes } });
  };

  const resetCustom = () => {
    setProfile({ customColors: undefined, accentColor: '#f59e0b' });
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
            <button
              key={key}
              className={cn(
                'h-9 rounded-lg text-xs font-medium transition-all border',
                profile.theme === key
                  ? 'bg-secondary text-foreground border-border shadow-sm ring-1 ring-border'
                  : 'bg-transparent text-muted-foreground border-border/50 hover:bg-secondary/50'
              )}
              onClick={() => setProfile({ theme: key })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bakgrund ── */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-foreground">Bakgrund</span>
        <div className="flex gap-2">
          {backgrounds.map(({ key, label }) => (
            <button
              key={key}
              className={cn(
                'flex-1 h-8 rounded-lg text-xs font-medium transition-all border',
                profile.dashboardBg === key
                  ? 'bg-secondary text-foreground border-border shadow-sm'
                  : 'bg-transparent text-muted-foreground border-border/50 hover:bg-secondary/50'
              )}
              onClick={() => setProfile({ dashboardBg: key })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Eget tema / Anpassat ── */}
      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors"
          >
            <Paintbrush size={14} className="text-muted-foreground" />
            Anpassa utseende
            {showCustom ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {(hasCustom || profile.accentColor !== '#f59e0b') && (
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

        {showCustom && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Accent color */}
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Accentfärg (ikoner & aktiva element)</span>
              <div className="flex gap-2 flex-wrap">
                {accents.map(({ color, label }) => (
                  <button
                    key={color}
                    title={label}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 transition-transform',
                      profile.accentColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setProfile({ accentColor: color })}
                  />
                ))}
                {/* Custom accent picker */}
                <label className="relative cursor-pointer group">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center transition-all group-hover:scale-110',
                      !accents.some(a => a.color === profile.accentColor) && 'border-foreground scale-110'
                    )}
                    style={!accents.some(a => a.color === profile.accentColor) ? { backgroundColor: profile.accentColor } : undefined}
                  >
                    {accents.some(a => a.color === profile.accentColor) && (
                      <span className="text-[8px] text-muted-foreground">+</span>
                    )}
                  </div>
                  <input
                    type="color"
                    value={profile.accentColor}
                    onChange={(e) => {
                      cancelAnimationFrame((window as any).__accentRaf || 0);
                      (window as any).__accentRaf = requestAnimationFrame(() => setProfile({ accentColor: e.target.value }));
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Color pickers */}
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Färger</span>
              <div className="flex justify-between px-2">
                <ColorPickerDot label="Knappar" value={custom.buttonColor} onChange={(c) => updateCustom({ buttonColor: c })} />
                <ColorPickerDot label="Slider-spår" value={custom.sliderColor} onChange={(c) => updateCustom({ sliderColor: c })} />
                <ColorPickerDot label="Bakgrund" value={custom.bgColor} onChange={(c) => updateCustom({ bgColor: c })} />
              </div>
              <div className="flex justify-between px-2">
                <ColorPickerDot label="Meny" value={custom.menuColor} onChange={(c) => updateCustom({ menuColor: c })} />
                <ColorPickerDot label="Kort" value={custom.cardColor} onChange={(c) => updateCustom({ cardColor: c })} />
                <ColorPickerDot label="Text" value={custom.textColor} onChange={(c) => updateCustom({ textColor: c })} />
              </div>
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
                min={20}
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
                max={50}
                step={1}
                value={[Math.round((custom.borderOpacity ?? 0.15) * 100)]}
                onValueChange={([v]) => updateCustom({ borderOpacity: v / 100 })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
