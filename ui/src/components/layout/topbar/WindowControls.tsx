import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.desktopAPI?.isWindowMaximized) {
        const maximized = await window.desktopAPI.isWindowMaximized();
        setIsMaximized(maximized);
      }
    };

    checkMaximized();
  }, []);

  const handleMinimize = () => {
    window.desktopAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    window.desktopAPI?.maximizeWindow();
    const maximized = await window.desktopAPI?.isWindowMaximized();
    setIsMaximized(maximized ?? false);
  };

  const handleClose = () => {
    window.desktopAPI?.closeWindow();
  };

  return (
    <div className="flex items-center h-full">
      <button
        onClick={handleMinimize}
        className="h-full px-4 hover:bg-white/10 transition-colors"
        title="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={handleMaximize}
        className="h-full px-4 hover:bg-white/10 transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
      <button
        onClick={handleClose}
        className="h-full flex items-center justify-center transition-colors"
        style={{
          width: '30px',
          aspectRatio: '1/1',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E81123';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
};
