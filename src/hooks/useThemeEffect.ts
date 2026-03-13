import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

type ThemePalette = Record<string, string>;

const darkPalette: ThemePalette = {
  '--background': '222 18% 11%',
  '--foreground': '210 25% 95%',
  '--card': '222 16% 14%',
  '--card-foreground': '210 25% 95%',
  '--popover': '222 16% 14%',
  '--popover-foreground': '210 25% 95%',
  '--secondary': '220 14% 19%',
  '--secondary-foreground': '215 18% 86%',
  '--muted': '220 12% 17%',
  '--muted-foreground': '218 10% 52%',
  '--border': '222 12% 21%',
  '--input': '222 12% 21%',
  '--sidebar-background': '222 16% 12%',
  '--sidebar-foreground': '215 18% 86%',
  '--sidebar-accent': '220 12% 17%',
  '--sidebar-accent-foreground': '215 18% 86%',
  '--sidebar-border': '222 12% 21%',
  '--surface': '222 14% 16%',
  '--glass': '222 16% 15% / 0.72',
  '--glass-border': '222 12% 25%',
};

const midnightPalette: ThemePalette = {
  '--background': '230 28% 5%',
  '--foreground': '210 40% 96%',
  '--card': '230 25% 8%',
  '--card-foreground': '210 40% 96%',
  '--popover': '230 25% 8%',
  '--popover-foreground': '210 40% 96%',
  '--secondary': '230 22% 13%',
  '--secondary-foreground': '210 30% 90%',
  '--muted': '230 20% 11%',
  '--muted-foreground': '225 16% 58%',
  '--border': '230 20% 15%',
  '--input': '230 20% 15%',
  '--sidebar-background': '230 25% 6%',
  '--sidebar-foreground': '210 30% 90%',
  '--sidebar-accent': '230 20% 11%',
  '--sidebar-accent-foreground': '210 30% 90%',
  '--sidebar-border': '230 20% 15%',
  '--surface': '230 22% 10%',
  '--glass': '230 25% 8% / 0.85',
  '--glass-border': '230 20% 18%',
};

const lightPalette: ThemePalette = {
  '--background': '210 20% 96%',
  '--foreground': '220 20% 12%',
  '--card': '0 0% 100%',
  '--card-foreground': '220 20% 12%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '220 20% 12%',
  '--secondary': '220 14% 92%',
  '--secondary-foreground': '220 15% 25%',
  '--muted': '220 12% 90%',
  '--muted-foreground': '220 10% 40%',
  '--border': '220 14% 85%',
  '--input': '220 14% 85%',
  '--sidebar-background': '220 14% 94%',
  '--sidebar-foreground': '220 15% 25%',
  '--sidebar-accent': '220 12% 90%',
  '--sidebar-accent-foreground': '220 15% 25%',
  '--sidebar-border': '220 14% 85%',
  '--surface': '220 14% 93%',
  '--glass': '0 0% 100% / 0.8',
  '--glass-border': '220 14% 82%',
};

const palettes: Record<string, ThemePalette> = {
  dark: darkPalette,
  midnight: midnightPalette,
  light: lightPalette,
};

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useThemeEffect() {
  const theme = useAppStore((s) => s.profile.theme);
  const accentColor = useAppStore((s) => s.profile.accentColor);

  useEffect(() => {
    const root = document.documentElement;
    const palette = palettes[theme] || palettes.dark;

    Object.entries(palette).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });
  }, [theme]);

  useEffect(() => {
    if (!accentColor || !accentColor.startsWith('#') || accentColor.length < 7) return;
    const root = document.documentElement;
    const hsl = hexToHsl(accentColor);

    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
    root.style.setProperty('--amber-glow', `${hsl} / 0.15`);
  }, [accentColor]);
}
