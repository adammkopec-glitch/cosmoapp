// apps/web/src/components/calendar/CalendarView.tsx
import { useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees.api';
import { AppointmentCard } from './AppointmentCard';
import { ClientDrawer } from './ClientDrawer';
import { HappyHourOverlay } from './HappyHourOverlay';
import { AddAppointmentModal } from './AddAppointmentModal';
import { HappyHourModal } from './HappyHourModal';

// Deterministic color per employee index
const EMPLOYEE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
function employeeColor(idx: number) { return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]; }

type CalView = 'resourceTimeGridDay' | 'timeGridWeek' | 'listWeek';

interface Props {
  appointments: any[];
  services: any[];
  onRefetch: () => void;
}

export function CalendarView({ appointments, services, onRefetch }: Props) {
  const calRef = useRef<FullCalendar>(null);
  const [view, setView] = useState<CalView>('resourceTimeGridDay');
  const [zoomedEmployeeId, setZoomedEmployeeId] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [addModal, setAddModal] = useState<{ date?: string; time?: string; employeeId?: string } | null>(null);
  const [happyHourModal, setHappyHourModal] = useState<boolean>(false);
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [showHappyHours, setShowHappyHours] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  // Compute resources (columns) for day view
  const resources = employees.map((emp: any, idx: number) => ({
    id: emp.id,
    title: emp.name,
    color: employeeColor(idx),
  }));

  // Convert appointments to FullCalendar EventInput[]
  const appointmentEvents: EventInput[] = appointments.flatMap((appt: any) => {
    // Filter by zoomed employee when in single-employee day view
    if (zoomedEmployeeId && appt.employeeId !== zoomedEmployeeId) return [];

    const empIdx = employees.findIndex((e: any) => e.id === appt.employeeId);
    const color = empIdx >= 0 ? employeeColor(empIdx) : '#6366f1';

    const durationMs = (appt.service?.durationMinutes ?? 60) * 60 * 1000;
    const start = new Date(appt.date);
    const end = new Date(start.getTime() + durationMs);

    return [{
      id: appt.id,
      resourceId: appt.employeeId ?? undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        clientName: appt.user?.name ?? appt.clientName ?? '—',
        serviceName: appt.service?.name ?? '—',
        price: appt.service?.price ?? 0,
        status: appt.status,
        employeeInitials: appt.employee?.name?.substring(0, 1).toUpperCase() ?? '?',
        employeeColor: color,
        hasAllergies: false,
        hasNotes: !!appt.notes || !!appt.staffNote,
        phone: appt.user?.phone ?? undefined,
        _raw: appt,
      },
    }];
  });

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setSelectedAppt(arg.event.extendedProps._raw);
  }, []);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    const date = arg.startStr.split('T')[0];
    const time = arg.startStr.split('T')[1]?.substring(0, 5);
    const resourceId = (arg as any).resource?.id;
    setAddModal({ date, time, employeeId: resourceId });
  }, []);

  const switchView = (v: CalView) => {
    setView(v);
    setZoomedEmployeeId(null);
    calRef.current?.getApi().changeView(v);
  };

  const zoomToEmployee = (empId: string) => {
    setZoomedEmployeeId(empId);
    setView('timeGridWeek');
    calRef.current?.getApi().changeView('timeGridDay');
  };

  const isResourceView = view === 'resourceTimeGridDay' && !zoomedEmployeeId;

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Main calendar area */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selectedAppt ? 'md:mr-80' : ''}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b bg-white flex-wrap">
          <button onClick={() => calRef.current?.getApi().prev()} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">←</button>
          <button onClick={() => calRef.current?.getApi().today()} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">Dziś</button>
          <button onClick={() => calRef.current?.getApi().next()} className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">→</button>

          <div className="ml-auto flex gap-1 flex-wrap">
            {zoomedEmployeeId && (
              <button
                onClick={() => { setZoomedEmployeeId(null); switchView('resourceTimeGridDay'); }}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
              >
                ← Wszyscy
              </button>
            )}
            <button
              onClick={() => switchView('resourceTimeGridDay')}
              className={`px-3 py-1.5 text-sm rounded ${view === 'resourceTimeGridDay' && !zoomedEmployeeId ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              Dzień
            </button>
            <button
              onClick={() => switchView('timeGridWeek')}
              className={`px-3 py-1.5 text-sm rounded ${view === 'timeGridWeek' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              Tydzień
            </button>
            <button
              onClick={() => switchView('listWeek')}
              className={`px-3 py-1.5 text-sm rounded ${view === 'listWeek' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
            >
              Lista
            </button>
          </div>

          <button
            onClick={() => setAddModal({})}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Wizyta
          </button>
          <button
            onClick={() => setHappyHourModal(true)}
            className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600"
          >
            ⭐ Happy Hour
          </button>
          <button
            onClick={() => setShowHappyHours(v => !v)}
            className={`px-3 py-1.5 text-sm rounded ${showHappyHours ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-100'}`}
          >
            {showHappyHours ? 'Ukryj HH' : 'Pokaż HH'}
          </button>
        </div>

        {/* FullCalendar */}
        <div className="flex-1 overflow-auto p-2">
          <HappyHourOverlay rangeStart={rangeStart} rangeEnd={rangeEnd}>
            {(bgEvents) => {
              // FullCalendar v6 has no backgroundEvents prop — merge bg events into main events array
              const allEvents: EventInput[] = showHappyHours
                ? [...appointmentEvents, ...bgEvents]
                : appointmentEvents;

              return (
                <FullCalendar
                  ref={calRef}
                  plugins={[resourceTimeGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  schedulerLicenseKey={import.meta.env.VITE_FULLCALENDAR_LICENSE_KEY ?? 'CC-Attribution-NonCommercial-NoDerivatives'}
                  initialView={view}
                  resources={isResourceView ? resources : undefined}
                  events={allEvents}
                  eventContent={(arg) => <AppointmentCard {...arg} />}
                  eventClick={handleEventClick}
                  selectable
                  select={handleDateSelect}
                  slotMinTime="07:00:00"
                  slotMaxTime="21:00:00"
                  allDaySlot={false}
                  headerToolbar={false}
                  locale="pl"
                  height="auto"
                  datesSet={(info) => {
                    setRangeStart(info.start);
                    setRangeEnd(info.end);
                  }}
                  resourceLabelContent={(arg) => (
                    <div
                      className="flex flex-col items-center cursor-pointer hover:text-indigo-600 py-1"
                      onClick={() => zoomToEmployee(arg.resource.id)}
                    >
                      <div
                        className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center mb-0.5"
                        style={{ background: arg.resource.extendedProps?.color ?? '#6366f1' }}
                      >
                        {arg.resource.title.substring(0, 1)}
                      </div>
                      <div className="text-xs font-medium">{arg.resource.title}</div>
                    </div>
                  )}
                />
              );
            }}
          </HappyHourOverlay>
        </div>
      </div>

      {/* Client Drawer */}
      {selectedAppt && (
        <ClientDrawer
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
        />
      )}

      {/* Add Appointment Modal */}
      {addModal !== null && (
        <AddAppointmentModal
          open
          onClose={() => { setAddModal(null); onRefetch(); }}
          prefillDate={addModal.date}
          prefillTime={addModal.time}
          prefillEmployeeId={addModal.employeeId}
          employees={employees}
          services={services}
        />
      )}

      {/* Happy Hour Modal */}
      <HappyHourModal
        open={happyHourModal}
        onClose={() => setHappyHourModal(false)}
        employees={employees}
        services={services}
      />
    </div>
  );
}
