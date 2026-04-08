import { EventContentArg } from '@fullcalendar/core';

// Color map matching existing status scheme in the app
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  CONFIRMED: 'bg-indigo-600',
  COMPLETED: 'bg-green-600',
  CANCELLED: 'bg-red-500',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Oczekująca',
  CONFIRMED: 'Potwierdzona',
  COMPLETED: 'Zrealizowana',
  CANCELLED: 'Anulowana',
};

interface AppointmentEventProps {
  clientName: string;
  serviceName: string;
  price: number;
  discountPercent?: number;
  status: string;
  employeeInitials?: string;
  employeeColor?: string;
  hasAllergies: boolean;
  hasNotes: boolean;
  phone?: string;
}

// FullCalendar passes extendedProps on each event — we store our data there.
// Height detection via event.el is unreliable during initial render in FC v6.
// Render all fields; CSS overflow:hidden on the container clips them gracefully.
export function AppointmentCard({ timeText, event }: EventContentArg) {
  const props = event.extendedProps as AppointmentEventProps;

  const priceLabel = props.discountPercent
    ? `${props.price} zł (–${props.discountPercent}%)`
    : `${props.price} zł`;

  const bgColor = STATUS_COLORS[props.status] ?? 'bg-gray-500';

  return (
    <div className={`${bgColor} text-white rounded px-1.5 py-1 text-[11px] leading-snug h-full overflow-hidden`}>
      <div className="font-semibold truncate">{props.clientName}</div>
      <div className="truncate opacity-90">{props.serviceName}</div>
      <div className="opacity-80">{timeText}</div>

      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
        <span className="opacity-80">{priceLabel}</span>
        <span className="bg-white/20 rounded px-1 text-[9px]">
          {STATUS_LABELS[props.status] ?? props.status}
        </span>
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        {props.employeeInitials && (
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
            style={{ background: props.employeeColor ?? '#6366f1' }}
          >
            {props.employeeInitials}
          </span>
        )}
        {props.hasAllergies && <span title="Alergie">⚠️</span>}
        {props.hasNotes && <span title="Notatki">📝</span>}
      </div>

      {props.phone && (
        <div className="opacity-70 truncate">{props.phone}</div>
      )}
    </div>
  );
}
