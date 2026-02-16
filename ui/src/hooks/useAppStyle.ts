import { useState, useEffect } from 'react';
import { AppStyleType } from '@/constants/styleTypes';
import { switchAppStyle, getCurrentStyle } from '@/helpers/switchAppStyle';

export function useAppStyle() {
  const [currentStyle, setCurrentStyle] = useState<AppStyleType>(getCurrentStyle());

  const changeStyle = (styleType: AppStyleType) => {
    switchAppStyle(styleType);
    setCurrentStyle(styleType);
  };

  useEffect(() => {
    setCurrentStyle(getCurrentStyle());
  }, []);

  return {
    currentStyle,
    changeStyle,
  };
}
