import React, { createContext, useContext } from 'react';

/* ───────────────────────── theme system ─────────────────────────
   Hybrid identity: Todoist's dense, efficient layout patterns with
   Punctual's warm palette (cream / terracotta) + serif headings.
   Every surface/text/border color lives here so dark mode works
   everywhere via a single ThemeContext (no more hard-coded hex). */

export const THEMES = {
  light: {
    name: 'Light',
    dark: false,
    bg: '#FAF8F5',
    bgAlt: '#FFFFFF',
    bgElevated: '#FFFFFF',
    border: '#E8E3DC',
    borderAlt: '#E1DCD3',
    text: '#2A2622',
    textMuted: '#6B655D',
    textLight: '#9C9589',
    textLighter: '#B9B3A8',
    accent: '#D6492F',
    accentHover: '#C13D25',
    accentLight: '#FBEAE4',
    accentText: '#FFFFFF',
    hover: '#F4EFE8',
    surface: '#F6F2EC',
    surfaceAlt: '#EFEBE5',
    danger: '#D6492F',
    success: '#3F8F6F',
    shadow: 'rgba(20,16,12,0.12)',
    overlay: 'rgba(20,16,12,0.45)',
  },
  dark: {
    name: 'Dark',
    dark: true,
    bg: '#141210',
    bgAlt: '#1C1A17',
    bgElevated: '#242119',
    border: '#302C27',
    borderAlt: '#3A362F',
    text: '#F0EDE7',
    textMuted: '#A8A29A',
    textLight: '#807A72',
    textLighter: '#615C55',
    accent: '#E85D42',
    accentHover: '#F26B50',
    accentLight: '#3A241E',
    accentText: '#FFFFFF',
    hover: '#26231E',
    surface: '#232019',
    surfaceAlt: '#2B2820',
    danger: '#E85D42',
    success: '#4FA07E',
    shadow: 'rgba(0,0,0,0.5)',
    overlay: 'rgba(0,0,0,0.6)',
  },
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// A soft, perfectly symmetric glow that wraps every side of a floating panel
// equally (box-shadow blur, not a directional gradient) so it reads the same
// whether it comes from the top, bottom, or either side — and is always
// derived from the theme's *current* accent color, so switching themes or
// accent presets visibly changes it.
function buildGlow(isDark, accentHex) {
  const [r, g, b] = hexToRgb(accentHex);
  const rgba = (a) => `rgba(${r},${g},${b},${a})`;
  if (isDark) {
    return { glowShadow: `0 20px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 36px ${rgba(0.35)}, 0 0 90px ${rgba(0.22)}` };
  }
  return { glowShadow: `0 20px 50px rgba(20,16,12,0.16), 0 0 0 1px rgba(255,255,255,0.6), 0 0 30px ${rgba(0.22)}, 0 0 70px ${rgba(0.12)}` };
}

// Accent presets (Todoist-style theme colors) — override accent trio.
export const ACCENT_PRESETS = {
  tomato: { label: 'Tomato', accent: '#D6492F', accentHover: '#C13D25', accentLightL: '#FBEAE4', accentLightD: '#3A241E' },
  amber: { label: 'Amber', accent: '#D98E2B', accentHover: '#C57E22', accentLightL: '#FBF1E0', accentLightD: '#3A2C16' },
  forest: { label: 'Forest', accent: '#3F8F6F', accentHover: '#357A5E', accentLightL: '#E4F1EB', accentLightD: '#18302A' },
  ocean: { label: 'Ocean', accent: '#3E7CB8', accentHover: '#356CA0', accentLightL: '#E5EFF7', accentLightD: '#182B3A' },
  grape: { label: 'Grape', accent: '#8B5FBF', accentHover: '#7A52A8', accentLightL: '#F0E9F7', accentLightD: '#2A1E3A' },
  rose: { label: 'Rose', accent: '#C2487A', accentHover: '#AC3E6C', accentLightL: '#F9E7F0', accentLightD: '#3A1828' },
};

export function buildTheme(mode, isDark, accentKey) {
  const base = isDark ? THEMES.dark : THEMES.light;
  const preset = ACCENT_PRESETS[accentKey];
  const resolved = preset ? { ...base, accent: preset.accent, accentHover: preset.accentHover, accentLight: isDark ? preset.accentLightD : preset.accentLightL } : base;
  return { ...resolved, ...buildGlow(isDark, resolved.accent) };
}

export const ThemeContext = createContext(THEMES.light);
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ theme, children }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
