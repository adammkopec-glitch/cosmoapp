-- CreateTable
CREATE TABLE "SkinTypeAdvice" (
    "id" TEXT NOT NULL,
    "skinType" "SkinType" NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkinTypeAdvice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkinTypeAdvice_skinType_key" ON "SkinTypeAdvice"("skinType");
