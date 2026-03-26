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
  '--glow-intensity': '0.5',
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
  '--glow-intensity': '0.4',
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
  '--glow-intensity': '0.3',
};

/* ── Nordic Noir — premium warm palette ── */
const nordicPalette: ThemePalette = {
  // Backgrounds: deep charcoal/graphite
  '--background': '220 30% 4%',        // #07090d
  '--surface': '220 28% 6%',           // #0b0e14
  '--card': '222 20% 11%',             // #171b24
  '--card-foreground': '38 25% 93%',   // #f3efe8
  '--popover': '222 20% 11%',
  '--popover-foreground': '38 25% 93%',
  // Buttons/secondary: dark warm panels
  '--secondary': '220 18% 14%',        // #1c212b
  '--secondary-foreground': '32 12% 68%', // #b9b1a5
  // Muted
  '--muted': '220 16% 12%',
  '--muted-foreground': '30 5% 47%',   // #7f7a73
  // Text
  '--foreground': '38 25% 93%',        // #f3efe8 warm off-white
  // Borders: alpha-based for subtlety
  '--border': '0 0% 100% / 0.10',
  '--input': '220 16% 12%',
  // Sidebar
  '--sidebar-background': '220 28% 6%',
  '--sidebar-foreground': '32 12% 68%',
  '--sidebar-accent': '220 16% 12%',
  '--sidebar-accent-foreground': '32 12% 68%',
  '--sidebar-border': '0 0% 100% / 0.06',
  // Glass
  '--glass': '220 28% 6% / 0.88',
  '--glass-border': '0 0% 100% / 0.06',
  // Glow — subtle for Nordic Noir
  '--glow-intensity': '0.35',
  // Nordic Noir semantic accent colors
  '--nn-fjord': '207 22% 55%',         // #6f8fa8
  '--nn-ice': '207 20% 72%',           // #a8bcc9
  '--nn-moss': '108 11% 49%',          // #748b6f
  '--nn-lavender': '268 17% 57%',      // #8c7aa8
  '--nn-linen': '34 28% 75%',          // #d8c7a8
  '--nn-amber-soft': '36 55% 60% / 0.18', // amber soft glow
};

const palettes: Record<string, ThemePalette> = {
  dark: darkPalette,
  midnight: midnightPalette,
  light: lightPalette,
  nordic: nordicPalette,
};

// Default accent per theme
const themeDefaultAccent: Record<string, string> = {
  dark: '#f59e0b',
  midnight: '#f59e0b',
  light: '#f59e0b',
  nordic: '#d7a35d', // warm amber
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

export { themeDefaultAccent };

export function useThemeEffect() {
  const { theme, accentColor, customColors } = useAppStore((s) => ({
    theme: s.profile.theme,
    accentColor: s.profile.accentColor,
    customColors: s.profile.customColors,
  }));

  useEffect(() => {
    const root = document.documentElement;
    const palette = palettes[theme] || palettes.dark;

    // Apply full palette
    Object.entries(palette).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });

    // Apply custom color overrides
    if (customColors) {
      if (customColors.bgColor?.startsWith('#') && customColors.bgColor.length >= 7) {
        root.style.setProperty('--background', hexToHsl(customColors.bgColor));
      }
      if (customColors.buttonColor?.startsWith('#') && customColors.buttonColor.length >= 7) {
        root.style.setProperty('--secondary', hexToHsl(customColors.buttonColor));
      }
      if (customColors.menuColor?.startsWith('#') && customColors.menuColor.length >= 7) {
        const menuHsl = hexToHsl(customColors.menuColor);
        root.style.setProperty('--sidebar-background', menuHsl);
      }
      if (customColors.cardColor?.startsWith('#') && customColors.cardColor.length >= 7) {
        const cardHsl = hexToHsl(customColors.cardColor);
        root.style.setProperty('--card', cardHsl);
        root.style.setProperty('--popover', cardHsl);
      }
      if (customColors.textColor?.startsWith('#') && customColors.textColor.length >= 7) {
        const textHsl = hexToHsl(customColors.textColor);
        root.style.setProperty('--foreground', textHsl);
        root.style.setProperty('--card-foreground', textHsl);
        root.style.setProperty('--popover-foreground', textHsl);
      }
      // Glass opacity
      if (customColors.glassOpacity !== undefined) {
        const basePalette = palette['--glass'] || '222 16% 15% / 0.72';
        const hslPart = basePalette.split('/')[0].trim();
        root.style.setProperty('--glass', `${hslPart} / ${customColors.glassOpacity}`);
      }
      // Border opacity — alpha-based approach
      if (customColors.borderOpacity !== undefined) {
        const alpha = customColors.borderOpacity;
        root.style.setProperty('--border', `0 0% 100% / ${alpha.toFixed(2)}`);
        root.style.setProperty('--glass-border', `0 0% 100% / ${Math.max(alpha - 0.04, 0).toFixed(2)}`);
      }
      // Glow intensity
      if (customColors.glowIntensity !== undefined) {
        root.style.setProperty('--glow-intensity', String(customColors.glowIntensity));
      }
    }
  }, [theme, customColors]);

  useEffect(() => {
    if (!accentColor || !accentColor.startsWith('#') || accentColor.length < 7) return;
    const root = document.documentElement;
    const hsl = hexToHsl(accentColor);
    const customSlider = customColors?.sliderColor;
    const glowIntensity = customColors?.glowIntensity ?? parseFloat(root.style.getPropertyValue('--glow-intensity') || '0.5');

    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
    root.style.setProperty('--amber-glow', `${hsl} / ${(0.15 * glowIntensity * 2).toFixed(3)}`);
    root.style.setProperty('--warm-glow', `${hsl} / ${(0.04 * glowIntensity * 2).toFixed(3)}`);

    // Slider color override
    if (customSlider && customSlider.startsWith('#') && customSlider.length >= 7) {
      root.style.setProperty('--slider-accent', hexToHsl(customSlider));
    } else {
      root.style.setProperty('--slider-accent', hsl);
    }
  }, [accentColor, customColors?.sliderColor, customColors?.glowIntensity]);
}
