// Keep startup branding aligned with Electron splash while backend initialization runs.
import React from 'react';
import focusLogo from '@/assets/focus.png';
import '@/styles/appLoadingScreen.css';

interface Props {
  visible: boolean;
}

export function AppLoadingScreen({ visible }: Props) {
  return (
    <div className={`app-loading-screen ${visible ? 'app-loading-screen--visible' : ''}`} aria-hidden={!visible}>
      <div className="app-loading-screen__container">
        <div className="app-loading-screen__logo">
          <img src={focusLogo} alt="Focus" className="app-loading-screen__logo-icon" />
        </div>
        <span className="app-loading-screen__title">
          Focus
        </span>
      </div>
    </div>
  );
}
