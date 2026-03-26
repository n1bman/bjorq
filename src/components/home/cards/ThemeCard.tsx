import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../lib/utils';
import { Monitor, Paintbrush, RotateCcw, Sliders, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { useRef, useCallback, useState } from 'react';
import type { CustomColors, SavedTheme } from '../../../store/types';

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

/* ── helpers ── */
function addToRecent(recent: string[] | undefined, color: string): string[] {
  const norm = color.toLowerCase();
  const list = (recent || []).filter(c => c.toLowerCase() !== norm);
  list.unshift(norm);
  return list.slice(0, 6);
}

/* ── ColorPickerDot — commit-based (only saves on blur/close) ── */
interface ColorPickerDotProps {
  label: string;
  value: string | undefined;
  onChange: (hex: string) => void;
}

function ColorPickerDot({ label, value, onChange }: ColorPickerDotProps) {
  const committedRef = useRef(false);

  const handleChange = useCallback((hex: string) => {
    // Live preview via CSS custom property would be ideal but
    // for simplicity we just track the latest value
    committedRef.current = false;
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (!committedRef.current) {
      committedRef.current = true;
      onChange(e.target.value);
    }
  }, [onChange]);

  const handleChangeCommit = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Native color picker fires onChange on every drag — we only commit on blur
    // But we store the latest value in a ref so blur can read it
  }, []);

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
          onChange={handleChangeCommit}
          onBlur={handleBlur}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Smarter ColorPickerDot that commits final value ── */
function CommitColorPicker({ label, value, onCommit }: { label: string; value: string | undefined; onCommit: (hex: string) => void }) {
  const lastRef = useRef(value || '#1a1a2e');

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
          onChange={(e) => { lastRef.current = e.target.value; }}
          onBlur={() => onCommit(lastRef.current)}
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
  const [themeName, setThemeName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const commitCustomColor = (changes: Partial<CustomColors>) => {
    const newColor = Object.values(changes).find(v => typeof v === 'string') as string | undefined;
    const recentColors = newColor ? addToRecent(custom.recentColors, newColor) : custom.recentColors;
    setProfile({ customColors: { ...custom, ...changes, recentColors } });
  };

  const updateCustom = (changes: Partial<CustomColors>) => {
    setProfile({ customColors: { ...custom, ...changes } });
  };

  const setAccentColor = (color: string) => {
    const recentColors = addToRecent(custom.recentColors, color);
    setProfile({ accentColor: color, customColors: { ...custom, recentColors } });
  };

  const resetCustom = () => {
    setProfile({ customColors: undefined, accentColor: '#f59e0b' });
  };

  const saveTheme = () => {
    if (!themeName.trim()) return;
    const newTheme: SavedTheme = {
      id: crypto.randomUUID(),
      name: themeName.trim(),
      accentColor: profile.accentColor,
      customColors: { ...custom, recentColors: undefined },
    };
    const existing = profile.savedThemes || [];
    setProfile({ savedThemes: [...existing, newTheme] });
    setThemeName('');
    setShowSaveInput(false);
  };

  const deleteTheme = (id: string) => {
    setProfile({ savedThemes: (profile.savedThemes || []).filter(t => t.id !== id) });
  };

  const loadTheme = (t: SavedTheme) => {
    setProfile({ accentColor: t.accentColor, customColors: { ...t.customColors, recentColors: custom.recentColors } });
  };

  const recentColors = (custom.recentColors || []).filter(Boolean);

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

        {/* Saved themes */}
        {(profile.savedThemes || []).length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sparade teman</span>
            <div className="flex flex-wrap gap-2">
              {(profile.savedThemes || []).map((t) => (
                <div key={t.id} className="flex items-center gap-1 bg-secondary/50 rounded-lg border border-border/50 px-2 py-1">
                  <button
                    className="text-[11px] text-foreground hover:text-primary transition-colors"
                    onClick={() => loadTheme(t)}
                  >
                    {t.name}
                  </button>
                  <button
                    onClick={() => deleteTheme(t.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Scen-bakgrund (3D) ── */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-foreground">Scen-bakgrund</span>
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
        {profile.dashboardBg === 'solid' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-muted-foreground">Scen-overlay färg</span>
            <CommitColorPicker
              label=""
              value={custom.sceneOverlayColor || '#0a0a14'}
              onCommit={(c) => commitCustomColor({ sceneOverlayColor: c })}
            />
          </div>
        )}
      </div>

      {/* ── Eget tema / Anpassat ── */}
      <div className="space-y-3 border-t border-border pt-3">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors w-full"
        >
          <Paintbrush size={14} className="text-muted-foreground" />
          Anpassa utseende
          {showCustom ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
        </button>

        {showCustom && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Senast använda</span>
                <div className="flex gap-2">
                  {recentColors.map((c) => (
                    <button
                      key={c}
                      className="w-6 h-6 rounded-full border border-border/50 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                      onClick={() => setAccentColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}

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
                    onClick={() => setAccentColor(color)}
                  />
                ))}
                {/* Custom accent picker — commit on blur */}
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
                    onChange={() => {/* preview only, commit on blur */}}
                    onBlur={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Color pickers — commit on blur */}
            <div className="space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Färger</span>
              <div className="flex justify-between px-2">
                <CommitColorPicker label="Knappar" value={custom.buttonColor} onCommit={(c) => commitCustomColor({ buttonColor: c })} />
                <CommitColorPicker label="Slider-spår" value={custom.sliderColor} onCommit={(c) => commitCustomColor({ sliderColor: c })} />
                <CommitColorPicker label="Panel-bg" value={custom.bgColor} onCommit={(c) => commitCustomColor({ bgColor: c })} />
              </div>
              <div className="flex justify-between px-2">
                <CommitColorPicker label="Meny" value={custom.menuColor} onCommit={(c) => commitCustomColor({ menuColor: c })} />
                <CommitColorPicker label="Kort" value={custom.cardColor} onCommit={(c) => commitCustomColor({ cardColor: c })} />
                <CommitColorPicker label="Text" value={custom.textColor} onCommit={(c) => commitCustomColor({ textColor: c })} />
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

            {/* Save as theme */}
            <div className="border-t border-border/50 pt-3 space-y-2">
              {showSaveInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveTheme()}
                    placeholder="Temanamn..."
                    className="flex-1 h-8 rounded-lg bg-secondary/50 border border-border/50 px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <button
                    onClick={saveTheme}
                    disabled={!themeName.trim()}
                    className="h-8 px-3 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-40"
                  >
                    Spara
                  </button>
                  <button
                    onClick={() => { setShowSaveInput(false); setThemeName(''); }}
                    className="h-8 px-2 rounded-lg text-muted-foreground hover:text-foreground text-xs transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Save size={12} />
                  Spara som eget tema
                </button>
              )}
            </div>

            {/* Reset button — always visible, prominent */}
            <button
              onClick={resetCustom}
              className="flex items-center justify-center gap-2 w-full h-9 rounded-lg border border-destructive/30 text-destructive/80 hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 text-xs font-medium transition-all"
            >
              <RotateCcw size={12} />
              Återställ alla anpassningar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
