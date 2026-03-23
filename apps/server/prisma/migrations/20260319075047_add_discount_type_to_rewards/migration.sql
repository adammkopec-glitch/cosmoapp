-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'AMOUNT', 'OTHER');

-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "discountType" "DiscountType" NOT NULL DEFAULT 'AMOUNT',
ADD COLUMN     "discountValue" DECIMAL(10,2);
