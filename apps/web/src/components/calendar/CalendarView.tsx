// apps/web/src/components/calendar/CalendarView.tsx
import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
import { DateClickArg } from '@fullcalendar/interaction';
import { useQuery, useQueries } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { employeesApi, type WeeklyScheduleEntry, type WorkDay, type TimeBlock } from '@/api/employees.api';
import { AppointmentCard } from './AppointmentCard';
import { ClientDrawer } from './ClientDrawer';
import { HappyHourOverlay } from './HappyHourOverlay';
import { AddAppointmentModal } from './AddAppointmentModal';
import { HappyHourPanel } from './HappyHourPanel';

// Deterministic color per employee index
const EMPLOYEE_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
function employeeColor(idx: number) { return EMPLOYEE_COLORS[idx % EMPLOYEE_COLORS.length]; }

// Build green background events for each employee's working hours in the visible range
function buildWorkingHourEvents(
  employees: any[],
  weeklySchedules: Map<string, WeeklyScheduleEntry[]>,
  workDayOverrides: Map<string, WorkDay[]>,
  rangeStart: Date,
  rangeEnd: Date,
): EventInput[] {
  const events: EventInput[] = [];
  let d = new Date(rangeStart);
  while (d < rangeEnd) {
    const dateStr = format(d, 'yyyy-MM-dd');
    const apiDow = (d.getDay() + 6) % 7; // convert JS Sun=0 → Mon=0
    for (const emp of employees) {
      const override = (workDayOverrides.get(emp.id) ?? [])
        .find((w) => w.date.startsWith(dateStr));
      let blocks: TimeBlock[];
      if (override !== undefined) {
        if (!override.isWorking) continue;
        blocks = override.timeBlocks ?? [];
      } else {
        const weekly = (weeklySchedules.get(emp.id) ?? [])
          .find((e) => e.dayOfWeek === apiDow);
        if (!weekly?.isWorking) continue;
        blocks = weekly.timeBlocks ?? [];
      }
      for (const block of blocks) {
        events.push({
          id: `work-${emp.id}-${dateStr}-${block.start}`,
          resourceId: emp.id,
          start: `${dateStr}T${block.start}:00`,
          end: `${dateStr}T${block.end}:00`,
          display: 'background',
          color: 'rgba(34,197,94,0.18)',
          extendedProps: { isWorkingHours: true },
        });
      }
    }
    d = addDays(d, 1);
  }
  return events;
}

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
  const [hhPanelOpen, setHhPanelOpen] = useState(false);
  const [hhPrefill, setHhPrefill] = useState<{ date: Date; hour: number; minute: number } | null>(null);
  const [rangeStart, setRangeStart] = useState(new Date());
  const [rangeEnd, setRangeEnd] = useState(new Date());
  const [showHappyHours, setShowHappyHours] = useState(true);

  useEffect(() => {
    if (!selectedAppt) {
      const timer = setTimeout(() => calRef.current?.getApi().updateSize(), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedAppt]);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll(),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch weekly schedules for all employees
  const weeklyResults = useQueries({
    queries: employees.map((emp: any) => ({
      queryKey: ['employee-weekly-schedule', emp.id],
      queryFn: () => employeesApi.getWeeklySchedule(emp.id),
      staleTime: 10 * 60 * 1000,
    })),
  });

  // Fetch work day overrides for each employee for the visible month(s)
  const rangeStartMonth = format(rangeStart, 'yyyy-MM');
  const rangeEndMonth = format(rangeEnd, 'yyyy-MM');
  const months = rangeStartMonth === rangeEndMonth
    ? [rangeStartMonth]
    : [rangeStartMonth, rangeEndMonth];

  const workDayResults = useQueries({
    queries: employees.flatMap((emp: any) =>
      months.map((month) => ({
        queryKey: ['employee-schedule', emp.id, month],
        queryFn: () => employeesApi.getSchedule(emp.id, month),
        staleTime: 5 * 60 * 1000,
      }))
    ),
  });

  // Build Maps for quick lookup
  const weeklySchedules = useMemo(() => {
    const map = new Map<string, WeeklyScheduleEntry[]>();
    employees.forEach((emp: any, i: number) => {
      map.set(emp.id, (weeklyResults[i]?.data as WeeklyScheduleEntry[]) ?? []);
    });
    return map;
  }, [employees, weeklyResults]);

  const workDayOverrides = useMemo(() => {
    const map = new Map<string, WorkDay[]>();
    employees.forEach((emp: any, empIdx: number) => {
      const days: WorkDay[] = [];
      months.forEach((_, monthIdx) => {
        const result = workDayResults[empIdx * months.length + monthIdx];
        days.push(...((result?.data as WorkDay[]) ?? []));
      });
      map.set(emp.id, days);
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, workDayResults, rangeStartMonth, rangeEndMonth]);

  // Green background events for working hours
  const workingHourEvents = useMemo(
    () => buildWorkingHourEvents(employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd),
    [employees, weeklySchedules, workDayOverrides, rangeStart, rangeEnd],
  );

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

  const handleDateClick = useCallback((info: DateClickArg) => {
    if (!hhPanelOpen) return;
    setHhPrefill({
      date: info.date,
      hour: info.date.getHours(),
      minute: info.date.getMinutes(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hhPanelOpen]);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    if (hhPanelOpen) return;
    const date = arg.startStr.split('T')[0];
    const time = arg.startStr.split('T')[1]?.substring(0, 5);
    const resourceId = (arg as any).resource?.id;
    setAddModal({ date, time, employeeId: resourceId });
  }, [hhPanelOpen]);

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
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
        selectedAppt && hhPanelOpen ? 'mr-[640px]' :
        selectedAppt ? 'md:mr-80' :
        hhPanelOpen ? 'mr-80' : ''
      }`}>
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
            onClick={() => {
              setHhPanelOpen((v) => !v);
              if (hhPanelOpen) setHhPrefill(null);
            }}
            className={`px-3 py-1.5 text-sm rounded ${hhPanelOpen ? 'bg-amber-600 text-white ring-2 ring-amber-300' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
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
        <div className="flex-1 overflow-auto p-2" style={hhPanelOpen ? { cursor: 'crosshair' } : undefined}>
          <HappyHourOverlay rangeStart={rangeStart} rangeEnd={rangeEnd}>
            {(bgEvents) => {
              // FullCalendar v6 has no backgroundEvents prop — merge all events into one array
              const allEvents: EventInput[] = [
                ...workingHourEvents,
                ...appointmentEvents,
                ...(showHappyHours ? bgEvents : []),
              ];

              return (
                <FullCalendar
                  ref={calRef}
                  plugins={[resourceTimeGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  schedulerLicenseKey={import.meta.env.VITE_FULLCALENDAR_LICENSE_KEY ?? 'CC-Attribution-NonCommercial-NoDerivatives'}
                  initialView={view}
                  resources={isResourceView ? resources : undefined}
                  events={allEvents}
                  eventContent={(arg) => {
                    if (arg.event.extendedProps.isWorkingHours) return null;
                    if (arg.event.extendedProps.happyHourId) {
                      const { startTime, endTime, discountType, discountValue } = arg.event.extendedProps;
                      const discountLabel = discountType === 'PERCENTAGE'
                        ? `-${discountValue}%`
                        : `-${discountValue} zł`;
                      return (
                        <div style={{ borderTop: '3px solid #f59e0b', height: '100%', padding: '3px 5px', pointerEvents: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{
                              background: '#f59e0b', color: 'white',
                              borderRadius: '50%', width: '16px', height: '16px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', fontWeight: 700, flexShrink: 0,
                            }}>H</span>
                            <span style={{ fontSize: '9px', color: '#92400e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {startTime}–{endTime} · {discountLabel}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return <AppointmentCard {...arg} />;
                  }}
                  eventClick={(arg) => {
                    if (arg.event.extendedProps.happyHourId) return;
                    handleEventClick(arg);
                  }}
                  dateClick={handleDateClick}
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

      {/* Happy Hour Panel */}
      <HappyHourPanel
        open={hhPanelOpen}
        onClose={() => { setHhPanelOpen(false); setHhPrefill(null); }}
        prefill={hhPrefill}
        employees={employees}
        services={services}
      />
    </div>
  );
}
