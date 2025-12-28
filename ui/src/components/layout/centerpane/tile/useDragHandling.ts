import { useState } from 'react';

export function useDragHandling(id: string, x: number, y: number) {
  const [isDragging, setIsDragging] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);

  // Adds drag handles and ghost image support so tiles can be repositioned within the canvas.
  const handleDragStart = (e: React.DragEvent) => {
    const startCursorX = e.clientX;
    const startCursorY = e.clientY;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-icon-id', id);
    e.dataTransfer.setData('application/x-drag-start', JSON.stringify({
      startCursorX,
      startCursorY,
      iconX: x,
      iconY: y
    }));

    const buttonElement = e.currentTarget as HTMLElement;
    const rect = buttonElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const dragImage = buttonElement.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

    requestAnimationFrame(() => {
      document.body.removeChild(dragImage);
    });

    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setSkipTransition(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsDragging(false);
        setTimeout(() => {
          setSkipTransition(false);
        }, 50);
      });
    });

    (e.target as HTMLElement).blur();
  };

  return {
    isDragging,
    skipTransition,
    handleDragStart,
    handleDragEnd,
  };
}
