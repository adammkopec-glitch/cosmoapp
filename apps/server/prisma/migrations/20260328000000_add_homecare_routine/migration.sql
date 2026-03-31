-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "routineFirst48h" TEXT,
ADD COLUMN     "routineFollowingDays" TEXT,
ADD COLUMN     "routineProducts" TEXT;

-- CreateTable
CREATE TABLE "HomecareRoutine" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "first48h" TEXT NOT NULL,
    "followingDays" TEXT NOT NULL,
    "products" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomecareRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomecareRoutine_appointmentId_key" ON "HomecareRoutine"("appointmentId");

-- AddForeignKey
ALTER TABLE "HomecareRoutine" ADD CONSTRAINT "HomecareRoutine_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
