import { cn } from '../../lib/utils';

interface OptionButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export default function OptionButton({ active, onClick, label, description, disabled, className }: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 rounded-xl px-3 py-2.5 text-center transition-all border-2',
        active
          ? 'border-primary bg-primary/15 text-primary font-semibold shadow-[0_0_12px_hsl(var(--primary)/0.2)]'
          : 'border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground',
        disabled && 'opacity-40 pointer-events-none',
        className
      )}
    >
      <span className="block text-xs font-medium">{label}</span>
      {description && <span className="block text-[9px] opacity-70 mt-0.5">{description}</span>}
    </button>
  );
}
