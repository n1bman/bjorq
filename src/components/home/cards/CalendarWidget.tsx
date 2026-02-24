import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { CalendarDays, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const placeholderEvents = [
  { id: '1', date: new Date(), title: 'Elräkning förfaller', color: 'bg-primary' },
  { id: '2', date: new Date(Date.now() + 2 * 86400000), title: 'Servicebesök värmepump', color: 'bg-accent' },
];

export default function CalendarWidget() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  return (
    <div className="glass-panel rounded-2xl p-4 min-w-[260px]">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={16} className="text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Kalender</h4>
      </div>

      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        className={cn('p-0 pointer-events-auto [&_.rdp-month]:space-y-2')}
        classNames={{
          months: 'flex flex-col',
          month: 'space-y-2',
          caption: 'flex justify-center pt-0 relative items-center',
          caption_label: 'text-xs font-medium',
          nav_button: 'h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100',
          table: 'w-full border-collapse',
          head_row: 'flex',
          head_cell: 'text-muted-foreground rounded-md w-7 font-normal text-[9px]',
          row: 'flex w-full mt-1',
          cell: 'h-7 w-7 text-center text-[10px] p-0 relative',
          day: 'h-7 w-7 p-0 font-normal text-[10px] hover:bg-secondary/50 rounded-md aria-selected:opacity-100',
          day_selected: 'bg-primary text-primary-foreground hover:bg-primary',
          day_today: 'bg-accent text-accent-foreground',
          day_outside: 'text-muted-foreground opacity-40',
        }}
      />

      {/* Events */}
      <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium">Kommande</p>
        {placeholderEvents.map((ev) => (
          <div key={ev.id} className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', ev.color)} />
            <span className="text-[10px] text-foreground truncate">{ev.title}</span>
            <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
              {ev.date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" className="w-full mt-3 h-7 text-[10px] gap-1">
        <Link size={10} />
        Koppla kalender
      </Button>
    </div>
  );
}
