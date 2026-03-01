import { useState } from 'react';
import { Calendar } from '../../ui/calendar';
import { CalendarDays, Plus, Trash2, Link } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';
import { useAppStore } from '../../../store/useAppStore';

const eventColors = ['bg-primary', 'bg-accent', 'bg-destructive', 'bg-green-500', 'bg-blue-500'];

interface Props {
  expanded?: boolean;
}

export default function CalendarWidget({ expanded }: Props = {}) {
  const events = useAppStore((s) => s.calendar.events);
  const sources = useAppStore((s) => s.calendar.sources);
  const addCalendarEvent = useAppStore((s) => s.addCalendarEvent);
  const removeCalendarEvent = useAppStore((s) => s.removeCalendarEvent);
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('bg-primary');

  const handleAdd = () => {
    if (!newTitle.trim() || !selected) return;
    addCalendarEvent({
      id: Math.random().toString(36).slice(2, 10),
      sourceId: 'manual',
      title: newTitle.trim(),
      date: selected.toISOString(),
      color: newColor,
    });
    setNewTitle('');
    setShowAdd(false);
  };

  // Show events for selected date
  const selectedDateStr = selected?.toDateString();
  const dayEvents = events.filter((e) => new Date(e.date).toDateString() === selectedDateStr);
  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Dates with events (for future dot indicators)

  return (
    <div className={cn('glass-panel rounded-2xl p-4', expanded ? 'w-full' : 'min-w-[260px]')}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Kalender</h4>
        </div>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} />
        </Button>
      </div>

      {/* Add event form */}
      {showAdd && (
        <div className="mb-3 p-3 rounded-lg bg-secondary/30 space-y-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Händelsetitel..."
            className="h-7 text-xs"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex items-center gap-1">
            {eventColors.map((c) => (
              <button
                key={c}
                className={cn('w-4 h-4 rounded-full', c, newColor === c && 'ring-2 ring-foreground ring-offset-1 ring-offset-background')}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <Button size="sm" className="w-full h-7 text-[10px]" onClick={handleAdd} disabled={!newTitle.trim()}>
            Lägg till
          </Button>
        </div>
      )}

      <div className={cn(expanded ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : '')}>
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

        <div className="space-y-3">
          {/* Events for selected day */}
          {dayEvents.length > 0 && (
            <div className={cn(expanded ? '' : 'mt-3 pt-3 border-t border-border/30', 'space-y-1.5')}>
              <p className="text-[10px] text-muted-foreground font-medium">
                {selected?.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {dayEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 group">
                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', ev.color)} />
                  <span className="text-[10px] text-foreground truncate flex-1">{ev.title}</span>
                  <button
                    onClick={() => removeCalendarEvent(ev.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming */}
          <div className={cn(expanded ? '' : 'mt-3 pt-3 border-t border-border/30', 'space-y-1.5')}>
            <p className="text-[10px] text-muted-foreground font-medium">Kommande</p>
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-2">
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', ev.color)} />
                <span className="text-[10px] text-foreground truncate">{ev.title}</span>
                <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                  {new Date(ev.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            )) : (
              <p className="text-[10px] text-muted-foreground/60">Inga kommande händelser</p>
            )}
          </div>
        </div>
      </div>

      {!expanded && (
        <Button size="sm" variant="outline" className="w-full mt-3 h-7 text-[10px] gap-1">
          <Link size={10} />
          Koppla kalender
        </Button>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground font-medium mb-2">Kalenderkällor</p>
          <div className="space-y-1.5">
            {sources.map((src) => (
              <div key={src.id} className="flex items-center justify-between">
                <span className="text-[10px] text-foreground">{src.name}</span>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', src.connected ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground')}>
                  {src.connected ? 'Ansluten' : 'Ej ansluten'}
                </span>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full h-7 text-[10px] gap-1 mt-2">
              <Link size={10} />
              Anslut Google / Outlook
            </Button>
            <p className="text-[9px] text-muted-foreground/60 text-center">OAuth-integration kräver värdläge</p>
          </div>
        </div>
      )}
    </div>
  );
}
