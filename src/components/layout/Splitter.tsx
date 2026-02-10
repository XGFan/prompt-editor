import React, { useEffect, useRef, useState } from 'react';

interface SplitterProps {
  id?: string;
  className?: string;
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  onDoubleClick?: () => void;
}

export const Splitter: React.FC<SplitterProps> = ({
  id,
  className = '',
  onResize,
  onResizeEnd,
  onDoubleClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    if (e.movementX !== 0) {
      onResize(e.movementX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (onResizeEnd) {
      onResizeEnd();
    }
  };

  return (
    <div
      ref={splitterRef}
      role="separator"
      aria-orientation="vertical"
      data-testid={id}
      className={`w-1 hover:w-1.5 active:w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-all z-10 flex-none bg-gray-200 select-none touch-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={onDoubleClick}
    />
  );
};
