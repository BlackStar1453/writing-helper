'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('DialogContent must be used within a Dialog');
  }

  if (!context.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => context.onOpenChange(false)}
      />
      {/* Content */}
      <div
        className={`relative z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  children: ReactNode;
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="mb-4 pb-4 border-b">
      {children}
    </div>
  );
}

interface DialogTitleProps {
  children: ReactNode;
  className?: string;
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  const context = useContext(DialogContext);

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <h2 className="text-lg font-semibold">{children}</h2>
      {context && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => context.onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface DialogDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 mt-2 ${className}`}>
      {children}
    </p>
  );
}

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div className={`mt-6 pt-4 border-t flex items-center justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
}

interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function DialogTrigger({ children, asChild = false }: DialogTriggerProps) {
  const context = useContext(DialogContext);

  if (asChild) {
    // 如果是 asChild，则克隆子元素并添加 onClick
    return React.cloneElement(children as React.ReactElement, {
      onClick: () => context?.onOpenChange(true)
    } as any);
  }

  return (
    <button onClick={() => context?.onOpenChange(true)}>
      {children}
    </button>
  );
}