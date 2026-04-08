import { EventInput } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import happyHoursApi from '@/api/happy-hours.api';
import { format, addDays } from 'date-fns';

// Converts an HH:MM time string + a date string (YYYY-MM-DD) to ISO datetime
function toISO(date: string, time: string) {
  return `${date}T${time}:00`;
}

// Returns all dates matching dayOfWeek (0=Sun) within [rangeStart, rangeEnd]
function datesForDayOfWeek(
  dayOfWeek: number,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  const dates: string[] = [];
  let d = new Date(rangeStart);
  while (d <= rangeEnd) {
    if (d.getDay() === dayOfWeek) {
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    d = addDays(d, 1);
  }
  return dates;
}

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
  children: (events: EventInput[]) => React.ReactNode;
}

export function HappyHourOverlay({ rangeStart, rangeEnd, children }: Props) {
  const { data: raw } = useQuery({
    queryKey: ['happyHours'],
    queryFn: () =>
      happyHoursApi.getAll().then((r: any) => r.data?.happyHours ?? r.happyHours ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const events: EventInput[] = [];

  for (const hh of raw ?? []) {
    if (!hh.isActive) continue;

    const color = 'rgba(245,158,11,0.25)'; // amber tint

    if (hh.type === 'ONE_TIME' && hh.date) {
      const dateStr = typeof hh.date === 'string' ? hh.date : format(new Date(hh.date), 'yyyy-MM-dd');
      events.push({
        id: `hh-${hh.id}`,
        start: toISO(dateStr, hh.startTime),
        end: toISO(dateStr, hh.endTime),
        display: 'background',
        color,
        extendedProps: { happyHourId: hh.id },
      });
    } else if (hh.type === 'RECURRING' && hh.dayOfWeek != null) {
      const dates = datesForDayOfWeek(hh.dayOfWeek, rangeStart, rangeEnd);
      for (const date of dates) {
        events.push({
          id: `hh-${hh.id}-${date}`,
          start: toISO(date, hh.startTime),
          end: toISO(date, hh.endTime),
          display: 'background',
          color,
          extendedProps: { happyHourId: hh.id },
        });
      }
    }
  }

  return <>{children(events)}</>;
}
