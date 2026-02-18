import React from 'react';
import focusLogo from '@/assets/focus.png';

interface Props {
  visible: boolean;
}

export function AppLoadingScreen({ visible }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--background-dark) 88%, transparent)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <img
          src={focusLogo}
          alt="Focus"
          style={{ width: 96, height: 96 }}
        />
        <span
          style={{
            fontFamily: "'Orbitron', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
            fontSize: '96px',
            fontWeight: 700,
            color: '#4A90E2',
            letterSpacing: '0.1em',
          }}
        >
          Focus
        </span>
      </div>
    </div>
  );
}
