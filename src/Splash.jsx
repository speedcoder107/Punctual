import React from 'react';

/* The same visual as the pre-React splash in public/index.html, reused for the
   auth check and the initial state-load so there's no flash of a differently
   styled loading screen between them. Resolves colors synchronously from the
   persisted theme (falling back to the OS preference) since this renders before
   any ThemeProvider exists. */
export function splashColors() {
  let dark;
  try {
    const t = localStorage.getItem('punctual-splash-theme');
    if (t === 'dark') dark = true;
    else if (t === 'light') dark = false;
  } catch { /* */ }
  if (dark === undefined) {
    dark = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  }
  return dark
    ? { bg: '#141210', fg: '#F0EDE7', sub: '#807A72' }
    : { bg: '#FAF8F5', fg: '#2A2622', sub: '#9C9589' };
}

export function LogoMark({ size = 76 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true"
      style={{ borderRadius: size * 0.26, boxShadow: '0 12px 30px rgba(0,0,0,0.14)' }}>
      <rect width="512" height="512" rx="120" fill="#D6492F" />
      <circle cx="256" cy="256" r="150" fill="none" stroke="#ffffff" strokeWidth="30" opacity="0.32" />
      <path d="M182 260 l52 52 l108 -132" fill="none" stroke="#ffffff" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Splash({ label }) {
  const c = splashColors();
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, background: c.bg, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <LogoMark />
      <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, fontSize: 28, color: c.fg, letterSpacing: '-0.01em' }}>Punctual</div>
      {label
        ? <div style={{ fontSize: 13, color: c.sub }}>{label}</div>
        : (
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c.sub, opacity: 0.35, animation: `splashPulse 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        )}
      <style>{'@keyframes splashPulse{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:.9;transform:scale(1)}}'}</style>
    </div>
  );
}
