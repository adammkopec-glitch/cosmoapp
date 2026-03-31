-- CreateEnum
CREATE TYPE "TreatmentSeriesStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TreatmentSeriesNotificationKind" AS ENUM ('BEFORE_DUE', 'DUE', 'OVERDUE');

-- AlterTable
ALTER TABLE "Service"
ADD COLUMN "isMultiVisit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "seriesIntervalsDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Appointment"
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "treatmentSeriesId" TEXT,
ADD COLUMN "treatmentSeriesStep" INTEGER;

-- Backfill
UPDATE "Appointment"
SET "completedAt" = "date"
WHERE "status" = 'COMPLETED'
  AND "completedAt" IS NULL;

-- CreateTable
CREATE TABLE "TreatmentSeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "intervalsDays" INTEGER[] NOT NULL,
    "totalVisits" INTEGER NOT NULL,
    "completedVisits" INTEGER NOT NULL DEFAULT 0,
    "nextStep" INTEGER,
    "nextDueDate" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "status" "TreatmentSeriesStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedFromAppointmentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentSeriesNotification" (
    "id" TEXT NOT NULL,
    "treatmentSeriesId" TEXT NOT NULL,
    "kind" "TreatmentSeriesNotificationKind" NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentSeriesNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_treatmentSeriesId_idx" ON "Appointment"("treatmentSeriesId");

-- CreateIndex
CREATE INDEX "TreatmentSeries_userId_status_idx" ON "TreatmentSeries"("userId", "status");

-- CreateIndex
CREATE INDEX "TreatmentSeries_serviceId_status_idx" ON "TreatmentSeries"("serviceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentSeriesNotification_treatmentSeriesId_kind_bucketKey_key" ON "TreatmentSeriesNotification"("treatmentSeriesId", "kind", "bucketKey");

-- CreateIndex
CREATE INDEX "TreatmentSeriesNotification_scheduledFor_idx" ON "TreatmentSeriesNotification"("scheduledFor");

-- AddForeignKey
ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_treatmentSeriesId_fkey"
FOREIGN KEY ("treatmentSeriesId") REFERENCES "TreatmentSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSeries"
ADD CONSTRAINT "TreatmentSeries_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSeries"
ADD CONSTRAINT "TreatmentSeries_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSeriesNotification"
ADD CONSTRAINT "TreatmentSeriesNotification_treatmentSeriesId_fkey"
FOREIGN KEY ("treatmentSeriesId") REFERENCES "TreatmentSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
