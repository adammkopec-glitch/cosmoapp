-- AlterTable: make mood optional and add admin fields
ALTER TABLE "SkinJournalEntry" ALTER COLUMN "mood" DROP NOT NULL;
ALTER TABLE "SkinJournalEntry" ADD COLUMN "authorId" TEXT,
ADD COLUMN "isAdminEntry" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SkinJournalComment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkinJournalComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkinJournalComment_entryId_idx" ON "SkinJournalComment"("entryId");

-- CreateIndex
CREATE INDEX "SkinJournalComment_authorId_idx" ON "SkinJournalComment"("authorId");

-- AddForeignKey
ALTER TABLE "SkinJournalEntry" ADD CONSTRAINT "SkinJournalEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinJournalComment" ADD CONSTRAINT "SkinJournalComment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "SkinJournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkinJournalComment" ADD CONSTRAINT "SkinJournalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
