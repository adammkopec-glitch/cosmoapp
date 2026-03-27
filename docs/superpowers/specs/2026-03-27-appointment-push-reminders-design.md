# Appointment Push Reminders — Design Spec

**Date:** 2026-03-27
**Branch:** feat/quiz-admin
**Status:** Approved

---

## Overview

Send push notifications to clients reminding them of upcoming confirmed appointments:
- **24 hours before** the appointment
- **2 hours before** the appointment

Uses the existing Web Push infrastructure (`push.service.ts`, `sendPushToUser`) and the same hourly-interval scheduler pattern as `treatment-series`.

---

## Database

### New enum

```prisma
enum AppointmentReminderType {
  DAY_BEFORE
  TWO_HOURS_BEFORE
}
```

### New model

```prisma
model AppointmentReminder {
  id            String                  @id @default(cuid())
  appointmentId String
  appointment   Appointment             @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  type          AppointmentReminderType
  sentAt        DateTime                @default(now())

  @@unique([appointmentId, type])
}
```

- `@@unique([appointmentId, type])` — DB-level deduplication; each reminder type is sent at most once per appointment.
- `onDelete: Cascade` — reminder records are removed if the appointment is deleted.

### Appointment model update

Add relation field:

```prisma
model Appointment {
  // ...existing fields...
  reminders  AppointmentReminder[]
}
```

---

## Scheduler Logic

### File

`apps/server/src/modules/appointments/appointment-reminders.service.ts` (new file, keeps concerns separate from `appointments.service.ts`)

### Timing windows

The scheduler runs hourly. Windows are set to ±1h around the target to guarantee each appointment is caught in exactly one run:

| Type | Window |
|------|--------|
| `DAY_BEFORE` | `appointment.date` between `now + 23h` and `now + 25h` |
| `TWO_HOURS_BEFORE` | `appointment.date` between `now + 1h 30min` and `now + 2h 30min` |

### Query pattern

```ts
const appointments = await prisma.appointment.findMany({
  where: {
    status: 'CONFIRMED',
    date: { gte: windowStart, lte: windowEnd },
    reminders: { none: { type: reminderType } },
  },
  include: { service: true, employee: true, user: true },
});
```

The `reminders: { none: { type } }` filter means only appointments that have **not** yet received this reminder type are returned — no separate existence check needed.

### Send and record

For each appointment:
1. Call `sendPushToUser(userId, payload)`
2. Create `AppointmentReminder` record: `{ appointmentId, type }`

Both steps per appointment; errors on individual push delivery are caught and logged, they do not abort the loop.

### Edge cases

| Scenario | Behaviour |
|----------|-----------|
| Appointment is `CANCELLED`, `PENDING`, or `COMPLETED` | Excluded by `status: 'CONFIRMED'` filter |
| Appointment created/confirmed less than 2h before its time | Falls outside both windows; no reminder sent |
| Push endpoint stale (410 Gone) | `sendPushToUser` already handles this (deletes stale subscription) |
| Scheduler run fails mid-loop | Already-sent reminders are recorded; re-run will skip them via unique constraint |

---

## Push Notification Payload

### DAY_BEFORE

```ts
{
  title: 'Twoja wizyta jest jutro 💅',
  body: `${service.name} z ${employee.firstName} — jutro o ${format(date, 'HH:mm')}. Pamiętaj, żeby przyjść na czas!`,
  data: { url: '/user/wizyty' }
}
```

### TWO_HOURS_BEFORE

```ts
{
  title: 'Za 2 godziny wizyta! ⏳',
  body: `${service.name} o ${format(date, 'HH:mm')} u ${employee.firstName}. Czas się zbierać!`,
  data: { url: '/user/wizyty' }
}
```

`data.url` is used by the service worker's `notificationclick` handler to navigate the user to `/user/wizyty`.

---

## Initialization

`apps/server/src/index.ts` — add call after existing scheduler:

```ts
initializeTreatmentSeriesMaintenance();
initializeAppointmentReminderScheduler(); // new
```

Pattern inside:

```ts
export function initializeAppointmentReminderScheduler() {
  processAppointmentReminders();
  const interval = setInterval(processAppointmentReminders, 60 * 60 * 1000);
  interval.unref?.();
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `apps/server/prisma/schema.prisma` | Add `AppointmentReminderType` enum, `AppointmentReminder` model, relation on `Appointment` |
| `apps/server/prisma/migrations/…` | New migration for the above |
| `apps/server/src/modules/appointments/appointment-reminders.service.ts` | New file — scheduler + send logic |
| `apps/server/src/index.ts` | Call `initializeAppointmentReminderScheduler()` on startup |

No frontend changes required.
