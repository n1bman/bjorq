import { useState } from 'react';
import type { WidgetSize } from '../../../store/types';
import { cn } from '../../../lib/utils';

interface Props {
  size?: WidgetSize;
  children: React.ReactNode;
  className?: string;
  /** Show size selector overlay (edit mode) */
  editMode?: boolean;
  /** Callback when size is changed in edit mode */
  onSizeChange?: (size: WidgetSize) => void;
  /** Widget label for badge */
  label?: string;
}

const sizeStyles: Record<WidgetSize, string> = {
  S: 'min-h-[80px]',
  M: 'min-h-[180px]',
  L: 'min-h-[280px] lg:col-span-2',
  Hero: 'min-h-[360px] col-span-full',
};

const SIZES: WidgetSize[] = ['S', 'M', 'L', 'Hero'];

/** Nordic Noir widget wrapper with size-based styling and edit-mode controls */
export default function WidgetCard({ size = 'M', children, className, editMode, onSizeChange, label }: Props) {
  return (
    <div className={cn(
      'nn-widget nn-widget-hover p-4 transition-all relative group',
      sizeStyles[size],
      editMode && 'ring-1 ring-primary/20',
      className
    )}>
      {/* Size badge — always visible */}
      {editMode && (
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
          <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
            {size}
          </span>
          {label && (
            <span className="text-[8px] text-muted-foreground/60 truncate max-w-[80px]">{label}</span>
          )}
        </div>
      )}

      {/* Size selector bar — visible in edit mode */}
      {editMode && onSizeChange && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 bg-card/95 backdrop-blur-sm border border-border/40 rounded-full px-1 py-0.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onSizeChange(s); }}
              className={cn(
                'px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all',
                size === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
