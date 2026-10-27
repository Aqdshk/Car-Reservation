import { useMemo, useState } from 'react';
import { Icon } from '../lib/ui';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => a && b && startOfDay(a).getTime() === startOfDay(b).getTime();

// Availability for one vehicle. Booked days are struck through; tapping a free
// day picks the start, a second tap picks the end.
export default function MiniCalendar({ busy = [], onRangeSelect, selectedStart, selectedEnd }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [pickStart, setPickStart] = useState(null);

  const cells = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const total = Math.ceil((lead + days) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const date = new Date(y, m, i - lead + 1);
      return { date, inMonth: date.getMonth() === m, key: i };
    });
  }, [cursor]);

  const isBooked = (date) => {
    const d = startOfDay(date);
    return busy.some(b => d >= startOfDay(b.startTime) && d <= startOfDay(b.endTime));
  };
  const isPast = (date) => startOfDay(date) < startOfDay(new Date());

  const start = pickStart || selectedStart;
  const end = pickStart ? null : selectedEnd;
  const inRange = (date) => start && end && startOfDay(date) > startOfDay(start) && startOfDay(date) < startOfDay(end);

  const pick = (date) => {
    if (!pickStart || startOfDay(date) < startOfDay(pickStart)) {
      setPickStart(date);
      onRangeSelect?.(date, null);
    } else {
      onRangeSelect?.(pickStart, date);
      setPickStart(null);
    }
  };

  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const canGoBack = cursor > thisMonth;

  return (
    <div>
      <div className="mcal-head">
        <button type="button" className="icon-btn" disabled={!canGoBack} style={{ opacity: canGoBack ? 1 : .4 }}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
          <Icon name="chevL" size={16}/>
        </button>
        <span className="mcal-title">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
        <button type="button" className="icon-btn"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
          <Icon name="chevR" size={16}/>
        </button>
      </div>
      <div className="mcal-grid">
        {DAYS.map(d => <div key={d} className="mcal-h">{d}</div>)}
        {cells.map(c => {
          const booked = isBooked(c.date);
          const past = isPast(c.date);
          const sel = sameDay(c.date, start) || sameDay(c.date, end);
          const cls = ['mcal-cell',
            !c.inMonth && 'out',
            sameDay(c.date, new Date()) && 'today',
            booked && !past && 'booked',
            sel && 'sel',
            !sel && inRange(c.date) && 'mid'].filter(Boolean).join(' ');
          return (
            <button type="button" key={c.key} className={cls} disabled={!c.inMonth || past || booked}
              onClick={() => pick(c.date)} title={booked ? 'Already booked' : undefined}>
              {c.date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mcal-legend">
        <span><i className="sw sw-free"/>Free</span>
        <span><i className="sw sw-booked"/>Booked</span>
        <span><i className="sw sw-sel"/>Your trip</span>
      </div>
      <p className="mcal-hint">
        {pickStart ? 'Now tap the return day.' : 'Tap a day to start, then the return day. You can fine-tune the times in the form.'}
      </p>
    </div>
  );
}
