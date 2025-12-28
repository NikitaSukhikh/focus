import React from 'react';

interface RenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

// RenameInput is the focused input used during inline renames for tiles and link cards.
export function RenameInput({ value, onChange, onKeyDown, onBlur, inputRef }: RenameInputProps) {
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="w-full text-sm font-semibold text-slate-800 text-center bg-white border border-blue-400 rounded px-2 py-1 outline-none"
      style={{ pointerEvents: 'auto' } as any}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    />
  );
}
