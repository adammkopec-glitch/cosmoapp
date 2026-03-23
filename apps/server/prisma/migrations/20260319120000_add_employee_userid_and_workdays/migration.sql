-- Add EMPLOYEE value to Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EMPLOYEE';

-- Add userId column to Employee table
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Add unique constraint on Employee.userId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Employee_userId_key'
  ) THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_key" UNIQUE ("userId");
  END IF;
END$$;

-- Add foreign key Employee.userId -> User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Employee_userId_fkey'
  ) THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- Create EmployeeWorkDay table
CREATE TABLE IF NOT EXISTS "EmployeeWorkDay" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeWorkDay_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on (employeeId, date)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeWorkDay_employeeId_date_key'
  ) THEN
    ALTER TABLE "EmployeeWorkDay" ADD CONSTRAINT "EmployeeWorkDay_employeeId_date_key"
      UNIQUE ("employeeId", "date");
  END IF;
END$$;

-- Add foreign key EmployeeWorkDay.employeeId -> Employee.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeWorkDay_employeeId_fkey'
  ) THEN
    ALTER TABLE "EmployeeWorkDay" ADD CONSTRAINT "EmployeeWorkDay_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
