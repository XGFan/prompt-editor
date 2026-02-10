import React, { useEffect, useRef, useId } from 'react';
import { Button } from './Button';
import { cn } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      requestAnimationFrame(() => {
        dialogRef.current?.focus();
      });
    } else {
      previousActiveElement.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative z-50 w-full rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 focus:outline-none",
          {
            'max-w-sm': width === 'sm',
            'max-w-md': width === 'md',
            'max-w-lg': width === 'lg',
          }
        )}
      >
        <div className="mb-4">
          <h3 id={titleId} className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </h3>
          {description && (
            <p id={descriptionId} className="mt-2 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
        
        {children && <div className="mb-6">{children}</div>}

        {footer ? (
          <div className="flex justify-end gap-2">
            {footer}
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>取消</Button>
            <Button onClick={onClose}>确定</Button>
          </div>
        )}
      </div>
    </div>
  );
}
