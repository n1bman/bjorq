import { useAppStore } from '../../../store/useAppStore';
import { cn } from '../../../lib/utils';
import { Monitor, Paintbrush, RotateCcw, Sliders, ChevronDown, ChevronUp, Save, X, Sparkles, Sun, Palette } from 'lucide-react';
import { Slider } from '../../ui/slider';
import { useRef, useCallback, useState } from 'react';
import type { CustomColors, SavedTheme } from '../../../store/types';
import { themeDefaultAccent } from '../../../hooks/useThemeEffect';

/* ── Theme presets with preview colors ── */
const themes = [
  { key: 'dark' as const, label: 'Mörkt', bg: '#1a1c23', fg: '#e0e4ed', accent: '#f59e0b' },
  { key: 'midnight' as const, label: 'Midnatt', bg: '#0d0f18', fg: '#e8eff8', accent: '#f59e0b' },
  { key: 'light' as const, label: 'Ljust', bg: '#f0f2f5', fg: '#1e2530', accent: '#f59e0b' },
  { key: 'nordic' as const, label: 'Nordic Noir', bg: '#07090d', fg: '#f3efe8', accent: '#d7a35d', premium: true },
];

const accents = [
  { color: '#d7a35d', label: 'Amber' },
  { color: '#f59e0b', label: 'Guld' },
  { color: '#3b82f6', label: 'Blå' },
  { color: '#10b981', label: 'Grön' },
  { color: '#ef4444', label: 'Röd' },
  { color: '#8b5cf6', label: 'Lila' },
  { color: '#ec4899', label: 'Rosa' },
  { color: '#14b8a6', label: 'Teal' },
];

const backgrounds = [
  { key: 'scene3d' as const, label: '3D-vy' },
  { key: 'gradient' as const, label: 'Gradient' },
  { key: 'solid' as const, label: 'Enfärgad' },
];

/* ── Default display colors per theme (hex) for UI pickers ── */
const themeDisplayDefaults: Record<string, Record<string, string>> = {
  dark: {
    buttonColor: '#2a2d36', sliderColor: '#f59e0b', bgColor: '#1a1c23',
    menuColor: '#1c1f26', cardColor: '#1f2229', textColor: '#e0e4ed',
    textSecondaryColor: '#7a8094', borderColor: '#2e3140',
  },
  midnight: {
    buttonColor: '#1c2033', sliderColor: '#f59e0b', bgColor: '#0d0f18',
    menuColor: '#0f1120', cardColor: '#141828', textColor: '#e8eff8',
    textSecondaryColor: '#7f8bab', borderColor: '#232841',
  },
  light: {
    buttonColor: '#e4e7ed', sliderColor: '#f59e0b', bgColor: '#f0f2f5',
    menuColor: '#eceef2', cardColor: '#ffffff', textColor: '#1e2530',
    textSecondaryColor: '#5c6370', borderColor: '#cdd2db',
  },
  nordic: {
    buttonColor: '#1c212b', sliderColor: '#d7a35d', bgColor: '#07090d',
    menuColor: '#0b0e14', cardColor: '#171b24', textColor: '#f3efe8',
    textSecondaryColor: '#7f7a73', borderColor: '#222838',
  },
};

/* ── helpers ── */
function addToRecent(recent: string[] | undefined, color: string): string[] {
  const norm = color.toLowerCase();
  const list = (recent || []).filter(c => c.toLowerCase() !== norm);
  list.unshift(norm);
  return list.slice(0, 6);
}

/* ── CommitColorPicker — saves on blur only ── */
function CommitColorPicker({ label, value, onCommit }: { label: string; value: string | undefined; onCommit: (hex: string) => void }) {
  const lastRef = useRef(value || '#1a1a2e');

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label className="relative cursor-pointer group">
        <div
          className="w-8 h-8 rounded-full border-2 border-border/50 transition-all group-hover:scale-110 shadow-sm"
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
      <span className="text-[9px] text-muted-foreground leading-tight text-center">{label}</span>
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1">
      <Icon size={13} className="text-primary/70" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">{label}</span>
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

  const defaults = themeDisplayDefaults[profile.theme] || themeDisplayDefaults.dark;
  const effective = (field: keyof typeof defaults) => (custom as any)[field] || defaults[field];

  const resetCustom = () => {
    const defaultAccent = themeDefaultAccent[profile.theme] || '#f59e0b';
    setProfile({ customColors: undefined, accentColor: defaultAccent });
  };

  const saveTheme = () => {
    if (!themeName.trim()) return;
    const newTheme: SavedTheme = {
      id: crypto.randomUUID(),
      name: themeName.trim(),
      theme: profile.theme,
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
    setProfile({
      theme: (t.theme || profile.theme) as any,
      accentColor: t.accentColor,
      customColors: { ...t.customColors, recentColors: custom.recentColors },
    });
  };

  const recentColors = (custom.recentColors || []).filter(Boolean);
  const hasCustomizations = !!(custom.buttonColor || custom.sliderColor || custom.bgColor || custom.menuColor || custom.cardColor || custom.textColor || custom.textSecondaryColor || custom.borderColor || custom.glassOpacity !== undefined || custom.borderOpacity !== undefined || custom.glowIntensity !== undefined);

  return (
    <div className="glass-panel rounded-2xl p-[var(--space-panel)] space-y-5">

      {/* ═══ SECTION A: Bas-tema ═══ */}
      <div className="space-y-3">
        <SectionHeader icon={Monitor} label="Tema" />
        <div className="grid grid-cols-2 gap-2">
          {themes.map(({ key, label, bg, fg, accent, premium }) => (
            <button
              key={key}
              className={cn(
                'relative h-14 rounded-xl text-xs font-medium transition-all border overflow-hidden group',
                profile.theme === key
                  ? 'border-primary/50 ring-1 ring-primary/30 shadow-md'
                  : 'border-border/40 hover:border-border/70'
              )}
              onClick={() => {
                const defaultAcc = themeDefaultAccent[key] || '#f59e0b';
                setProfile({ theme: key, accentColor: defaultAcc });
              }}
            >
              {/* Color preview strip */}
              <div className="absolute inset-0 flex">
                <div className="flex-1" style={{ backgroundColor: bg }} />
                <div className="w-1" style={{ backgroundColor: accent }} />
                <div className="w-8 flex items-center justify-center" style={{ backgroundColor: bg }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accent }} />
                </div>
              </div>
              <div className="relative z-10 flex items-center justify-between px-3 h-full">
                <span style={{ color: fg }} className="font-medium">{label}</span>
                {premium && (
                  <Sparkles size={11} style={{ color: accent }} />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Saved themes */}
        {(profile.savedThemes || []).length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sparade teman</span>
            <div className="flex flex-wrap gap-2">
              {(profile.savedThemes || []).map((t) => (
                <div key={t.id} className="flex items-center gap-1.5 bg-secondary/40 rounded-xl border border-border/40 px-2.5 py-1.5">
                  <button
                    className="text-[11px] text-foreground hover:text-primary transition-colors"
                    onClick={() => loadTheme(t)}
                  >
                    {t.name}
                  </button>
                  <button
                    onClick={() => deleteTheme(t.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ SECTION B: Scen-bakgrund ═══ */}
      <div className="space-y-2 border-t border-border/30 pt-4">
        <SectionHeader icon={Sun} label="Scen-bakgrund" />
        <div className="flex gap-2">
          {backgrounds.map(({ key, label }) => (
            <button
              key={key}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all border',
                profile.dashboardBg === key
                  ? 'bg-secondary text-foreground border-primary/30 shadow-sm'
                  : 'bg-transparent text-muted-foreground border-border/40 hover:bg-secondary/40'
              )}
              onClick={() => setProfile({ dashboardBg: key })}
            >
              {label}
            </button>
          ))}
        </div>
        {profile.dashboardBg === 'solid' && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] text-muted-foreground">Overlay-färg</span>
            <CommitColorPicker
              label=""
              value={custom.sceneOverlayColor || '#0a0a14'}
              onCommit={(c) => commitCustomColor({ sceneOverlayColor: c })}
            />
          </div>
        )}
      </div>

      {/* ═══ SECTION C: Anpassa ═══ */}
      <div className="space-y-3 border-t border-border/30 pt-4">
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors w-full"
        >
          <Paintbrush size={14} className="text-primary/60" />
          <span className="flex-1 text-left">Anpassa utseende</span>
          {hasCustomizations && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
          {showCustom ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
        </button>

        {showCustom && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">

            {/* ── Accent color ── */}
            <div className="space-y-2">
              <SectionHeader icon={Palette} label="Accentfärg" />
              <p className="text-[10px] text-muted-foreground -mt-1">Ikoner, aktiva element, fokusringar</p>
              <div className="flex gap-2 flex-wrap">
                {accents.map(({ color, label }) => (
                  <button
                    key={color}
                    title={label}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform',
                      profile.accentColor === color ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setAccentColor(color)}
                  />
                ))}
                {/* Custom accent picker */}
                <CommitColorPicker
                  label="Egen"
                  value={!accents.some(a => a.color === profile.accentColor) ? profile.accentColor : undefined}
                  onCommit={(c) => setAccentColor(c)}
                />
              </div>
            </div>

            {/* ── Recent colors ── */}
            {recentColors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Senast använda</span>
                <div className="flex gap-2">
                  {recentColors.map((c) => (
                    <button
                      key={c}
                      className="w-6 h-6 rounded-full border border-border/40 hover:scale-110 transition-transform shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                      onClick={() => setAccentColor(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Surface colors ── */}
            <div className="space-y-3">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Färger & ytor</span>
              <div className="grid grid-cols-4 gap-4 px-1">
                <CommitColorPicker label="Knappar" value={custom.buttonColor} onCommit={(c) => commitCustomColor({ buttonColor: c })} />
                <CommitColorPicker label="Slider" value={custom.sliderColor} onCommit={(c) => commitCustomColor({ sliderColor: c })} />
                <CommitColorPicker label="Panel" value={custom.bgColor} onCommit={(c) => commitCustomColor({ bgColor: c })} />
                <CommitColorPicker label="Meny" value={custom.menuColor} onCommit={(c) => commitCustomColor({ menuColor: c })} />
                <CommitColorPicker label="Kort" value={custom.cardColor} onCommit={(c) => commitCustomColor({ cardColor: c })} />
                <CommitColorPicker label="Text" value={custom.textColor} onCommit={(c) => commitCustomColor({ textColor: c })} />
                <CommitColorPicker label="Text sek." value={custom.textSecondaryColor} onCommit={(c) => commitCustomColor({ textSecondaryColor: c })} />
                <CommitColorPicker label="Border" value={custom.borderColor} onCommit={(c) => commitCustomColor({ borderColor: c })} />
              </div>
            </div>

            {/* ── Material & feel ── */}
            <div className="space-y-3 border-t border-border/20 pt-4">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Material & känsla</span>

              {/* Transparency */}
              <div className="space-y-1.5">
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

              {/* Border visibility */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Border-synlighet</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {Math.round((custom.borderOpacity ?? 0.10) * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={50}
                  step={1}
                  value={[Math.round((custom.borderOpacity ?? 0.10) * 100)]}
                  onValueChange={([v]) => updateCustom({ borderOpacity: v / 100 })}
                />
              </div>

              {/* Glow intensity */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={11} className="text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Glow-intensitet</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {Math.round((custom.glowIntensity ?? 0.5) * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[Math.round((custom.glowIntensity ?? 0.5) * 100)]}
                  onValueChange={([v]) => updateCustom({ glowIntensity: v / 100 })}
                />
              </div>
            </div>

            {/* ── Save theme ── */}
            <div className="border-t border-border/30 pt-3 space-y-2">
              {showSaveInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveTheme()}
                    placeholder="Temanamn..."
                    className="flex-1 h-8 rounded-lg bg-secondary/40 border border-border/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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

            {/* ── Reset ── */}
            <button
              onClick={resetCustom}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-destructive/30 text-destructive/80 hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 text-xs font-medium transition-all"
            >
              <RotateCcw size={13} />
              Återställ alla anpassningar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
