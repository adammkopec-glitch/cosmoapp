-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'USED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "staffNote" TEXT;

-- AlterTable
ALTER TABLE "EmployeeWeeklySchedule" ALTER COLUMN "timeBlocks" DROP DEFAULT;

-- CreateTable
CREATE TABLE "UserCoupon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "appointmentId" TEXT,

    CONSTRAINT "UserCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceEmployees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCoupon_appointmentId_key" ON "UserCoupon"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "_ServiceEmployees_AB_unique" ON "_ServiceEmployees"("A", "B");

-- CreateIndex
CREATE INDEX "_ServiceEmployees_B_index" ON "_ServiceEmployees"("B");

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceEmployees" ADD CONSTRAINT "_ServiceEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceEmployees" ADD CONSTRAINT "_ServiceEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
