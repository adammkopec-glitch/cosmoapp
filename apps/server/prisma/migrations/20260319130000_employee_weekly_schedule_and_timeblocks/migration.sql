-- Remove old columns from EmployeeWorkDay and add timeBlocks
ALTER TABLE "EmployeeWorkDay" DROP COLUMN IF EXISTS "startTime";
ALTER TABLE "EmployeeWorkDay" DROP COLUMN IF EXISTS "endTime";
ALTER TABLE "EmployeeWorkDay" ADD COLUMN IF NOT EXISTS "timeBlocks" JSONB;

-- Create EmployeeWeeklySchedule table
CREATE TABLE IF NOT EXISTS "EmployeeWeeklySchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "timeBlocks" JSONB NOT NULL DEFAULT '[{"start":"09:00","end":"18:00"}]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeWeeklySchedule_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeWeeklySchedule_employeeId_dayOfWeek_key'
  ) THEN
    ALTER TABLE "EmployeeWeeklySchedule" ADD CONSTRAINT "EmployeeWeeklySchedule_employeeId_dayOfWeek_key"
      UNIQUE ("employeeId", "dayOfWeek");
  END IF;
END$$;

-- Foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeWeeklySchedule_employeeId_fkey'
  ) THEN
    ALTER TABLE "EmployeeWeeklySchedule" ADD CONSTRAINT "EmployeeWeeklySchedule_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
