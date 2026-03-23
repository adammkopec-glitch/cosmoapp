-- AlterTable
ALTER TABLE "LoyaltyReward" ADD COLUMN     "isForAllServices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiredTier" "LoyaltyTier";

-- CreateTable
CREATE TABLE "_RewardServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RewardServices_AB_unique" ON "_RewardServices"("A", "B");

-- CreateIndex
CREATE INDEX "_RewardServices_B_index" ON "_RewardServices"("B");

-- AddForeignKey
ALTER TABLE "_RewardServices" ADD CONSTRAINT "_RewardServices_A_fkey" FOREIGN KEY ("A") REFERENCES "LoyaltyReward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RewardServices" ADD CONSTRAINT "_RewardServices_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
