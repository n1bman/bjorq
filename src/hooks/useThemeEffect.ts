import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

type ThemePalette = Record<string, string>;

const darkPalette: ThemePalette = {
  '--background': '220 20% 10%',
  '--foreground': '210 20% 92%',
  '--card': '220 18% 13%',
  '--card-foreground': '210 20% 92%',
  '--popover': '220 18% 13%',
  '--popover-foreground': '210 20% 92%',
  '--secondary': '220 16% 18%',
  '--secondary-foreground': '210 20% 85%',
  '--muted': '220 14% 16%',
  '--muted-foreground': '215 12% 55%',
  '--border': '220 14% 20%',
  '--input': '220 14% 20%',
  '--sidebar-background': '220 18% 11%',
  '--sidebar-foreground': '210 20% 85%',
  '--sidebar-accent': '220 14% 16%',
  '--sidebar-accent-foreground': '210 20% 85%',
  '--sidebar-border': '220 14% 20%',
  '--surface': '220 16% 15%',
  '--glass': '220 18% 14% / 0.7',
  '--glass-border': '220 14% 24%',
};

const midnightPalette: ThemePalette = {
  '--background': '230 25% 6%',
  '--foreground': '220 20% 90%',
  '--card': '230 22% 9%',
  '--card-foreground': '220 20% 90%',
  '--popover': '230 22% 9%',
  '--popover-foreground': '220 20% 90%',
  '--secondary': '230 20% 14%',
  '--secondary-foreground': '220 18% 80%',
  '--muted': '230 18% 12%',
  '--muted-foreground': '225 14% 48%',
  '--border': '230 18% 16%',
  '--input': '230 18% 16%',
  '--sidebar-background': '230 22% 7%',
  '--sidebar-foreground': '220 18% 80%',
  '--sidebar-accent': '230 18% 12%',
  '--sidebar-accent-foreground': '220 18% 80%',
  '--sidebar-border': '230 18% 16%',
  '--surface': '230 20% 11%',
  '--glass': '230 22% 10% / 0.8',
  '--glass-border': '230 18% 20%',
};

const lightPalette: ThemePalette = {
  '--background': '0 0% 98%',
  '--foreground': '220 15% 15%',
  '--card': '0 0% 100%',
  '--card-foreground': '220 15% 15%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '220 15% 15%',
  '--secondary': '220 10% 94%',
  '--secondary-foreground': '220 12% 30%',
  '--muted': '220 10% 92%',
  '--muted-foreground': '220 8% 45%',
  '--border': '220 10% 88%',
  '--input': '220 10% 88%',
  '--sidebar-background': '220 10% 96%',
  '--sidebar-foreground': '220 12% 30%',
  '--sidebar-accent': '220 10% 92%',
  '--sidebar-accent-foreground': '220 12% 30%',
  '--sidebar-border': '220 10% 88%',
  '--surface': '220 10% 95%',
  '--glass': '0 0% 100% / 0.7',
  '--glass-border': '220 10% 85%',
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
