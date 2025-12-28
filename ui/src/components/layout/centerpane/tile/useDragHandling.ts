import { useEffect, useRef, useState } from 'react';

const copyComputedStyle = (source: Element, target: HTMLElement) => {
  const computed = window.getComputedStyle(source);
  for (const prop of Array.from(computed)) {
    target.style.setProperty(prop, computed.getPropertyValue(prop), computed.getPropertyPriority(prop));
  }
};

// Clone the element tree and inline computed styles so the drag image renders as a single flattened PNG.
const cloneNodeWithStyles = (node: HTMLElement): HTMLElement => {
  const clone = node.cloneNode(true) as HTMLElement;
  copyComputedStyle(node, clone);

  const sourceWalker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
  const cloneWalker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT, null);

  while (sourceWalker.nextNode()) {
    const sourceEl = sourceWalker.currentNode as HTMLElement;
    const cloneEl = cloneWalker.nextNode() as HTMLElement | null;
    if (!cloneEl) break;
    copyComputedStyle(sourceEl, cloneEl);
  }

  return clone;
};

const generateDragPreview = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const cloned = cloneNodeWithStyles(element);
  cloned.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  cloned.style.margin = '0';
  cloned.style.pointerEvents = 'none';

  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(cloned);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export function useDragHandling(id: string, x: number, y: number) {
  const [isDragging, setIsDragging] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const dragPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);

  // Pre-render the tile into a single PNG so the drag image is a unified snapshot.
  useEffect(() => {
    let cancelled = false;
    const el = buttonRef.current;
    if (!el) return;

    generateDragPreview(el)
      .then((canvas) => {
        if (!cancelled) {
          dragPreviewRef.current = canvas;
        }
      })
      .catch(() => {
        dragPreviewRef.current = null; // fall back to DOM clone if snapshot fails
      });

    return () => {
      cancelled = true;
    };
  }, [id, x, y]);

  // Adds drag handles and ghost image support so tiles can be repositioned within the canvas.
  const handleDragStart = (e: React.DragEvent) => {
    const startCursorX = e.clientX;
    const startCursorY = e.clientY;
    const scrollContainer = (e.currentTarget as HTMLElement).closest('[data-center-pane-scroll]') as HTMLElement | null;
    const startScrollTop = scrollContainer?.scrollTop ?? 0;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-icon-id', id);
    e.dataTransfer.setData('application/x-drag-start', JSON.stringify({
      startCursorX,
      startCursorY,
      iconX: x,
      iconY: y,
      startScrollTop,
    }));

    const buttonElement = e.currentTarget as HTMLElement;
    const rect = buttonElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const cachedPreview = dragPreviewRef.current;
    if (cachedPreview) {
      e.dataTransfer.setDragImage(cachedPreview, offsetX, offsetY);
    } else {
      const dragImage = buttonElement.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.5';
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
      requestAnimationFrame(() => {
        document.body.removeChild(dragImage);
      });
    }

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
    dragRef: buttonRef,
  };
}
