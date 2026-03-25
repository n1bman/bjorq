import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { GripVertical } from 'lucide-react';

export interface SortableItem {
  id: string;
  colSpan?: 1 | 2;
}

interface SortableWidgetGridProps {
  items: SortableItem[];
  onReorder: (newOrder: SortableItem[]) => void;
  children: React.ReactNode;
  /** Columns for the grid (default 2) */
  columns?: 2 | 3;
  /** External edit mode control */
  editMode?: boolean;
  className?: string;
  /** Density mode for spacing */
  density?: 'calm' | 'balance' | 'dense';
}

/**
 * Touch-friendly sortable grid for dashboard widgets.
 * Edit mode is controlled externally via `editMode` prop.
 */
export default function SortableWidgetGrid({
  items,
  onReorder,
  children,
  columns = 2,
  editMode = false,
  className,
  density = 'balance',
}: SortableWidgetGridProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<SortableItem[]>(items);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRects = useRef<Map<number, DOMRect>>(new Map());

  // Sync external items when they change
  useEffect(() => {
    setLocalOrder(items);
  }, [items]);

  // Commit reorder when exiting edit mode
  useEffect(() => {
    if (!editMode) {
      onReorder(localOrder);
      setDragIndex(null);
      setOverIndex(null);
    }
  }, [editMode]);

  // --- Pointer-based drag ---
  const handleDragStart = useCallback((index: number) => {
    if (!editMode) return;
    setDragIndex(index);
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('[data-sortable-index]');
      cards.forEach((card) => {
        const idx = parseInt(card.getAttribute('data-sortable-index') || '0');
        itemRects.current.set(idx, card.getBoundingClientRect());
      });
    }
  }, [editMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIndex === null) return;
    const x = e.clientX;
    const y = e.clientY;
    for (const [idx, rect] of itemRects.current.entries()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        if (idx !== overIndex) setOverIndex(idx);
        return;
      }
    }
  }, [dragIndex, overIndex]);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const newOrder = [...localOrder];
      const [moved] = newOrder.splice(dragIndex, 1);
      newOrder.splice(overIndex, 0, moved);
      setLocalOrder(newOrder);
    }
    setDragIndex(null);
    setOverIndex(null);
    itemRects.current.clear();
  }, [dragIndex, overIndex, localOrder]);

  const childArray = React.Children.toArray(children);

  return (
    <div
      ref={containerRef}
      className={cn(
        'grid auto-rows-auto',
        density === 'calm' ? 'gap-5' : density === 'dense' ? 'gap-2' : 'gap-3',
        columns === 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2',
        className
      )}
      onPointerMove={handlePointerMove}
      onPointerUp={handleDragEnd}
      onPointerCancel={handleDragEnd}
      onPointerLeave={() => { if (dragIndex !== null) handleDragEnd(); }}
    >
      {localOrder.map((item, index) => {
        const childIndex = items.findIndex((i) => i.id === item.id);
        const child = childArray[childIndex];
        if (!child) return null;

        const isDragging = dragIndex === index;
        const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <div
            key={item.id}
            data-sortable-index={index}
            className={cn(
              'relative transition-all duration-150',
              item.colSpan === 2 && 'lg:col-span-2',
              editMode && 'cursor-grab active:cursor-grabbing',
              editMode && 'ring-1 ring-primary/20 rounded-2xl',
              isDragging && 'opacity-50 scale-95 ring-2 ring-primary/50',
              isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              editMode && !isDragging && !isOver && 'animate-[wobble_1.5s_ease-in-out_infinite]',
            )}
            onPointerDown={(e) => {
              if (editMode) {
                e.preventDefault();
                handleDragStart(index);
              }
            }}
            onPointerUp={() => {
              if (editMode && dragIndex !== null) handleDragEnd();
            }}
          >
            {/* Drag handle overlay in edit mode */}
            {editMode && (
              <div className="absolute top-2 right-2 z-10 bg-primary/20 rounded-lg p-1 pointer-events-none">
                <GripVertical size={14} className="text-primary" />
              </div>
            )}
            {child}
          </div>
        );
      })}
    </div>
  );
}
