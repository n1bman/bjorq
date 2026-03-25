import type { WidgetSize } from '../../../store/types';
import { cn } from '../../../lib/utils';

interface Props {
  size?: WidgetSize;
  children: React.ReactNode;
  className?: string;
}

const sizeStyles: Record<WidgetSize, string> = {
  S: 'min-h-[80px]',
  M: 'min-h-[180px]',
  L: 'min-h-[280px] lg:col-span-2',
  Hero: 'min-h-[360px] col-span-full',
};

/** Nordic Noir widget wrapper with size-based styling */
export default function WidgetCard({ size = 'M', children, className }: Props) {
  return (
    <div className={cn(
      'nn-widget nn-widget-hover p-4 transition-all',
      sizeStyles[size],
      className
    )}>
      {children}
    </div>
  );
}
