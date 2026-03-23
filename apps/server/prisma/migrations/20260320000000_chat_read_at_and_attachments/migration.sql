-- Add attachment and readAt columns to ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "attachmentType" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "readAt" TIMESTAMP(3);

-- Migrate existing data: isRead=true → readAt=createdAt, isRead=false → null (already null)
UPDATE "ChatMessage" SET "readAt" = "createdAt" WHERE "isRead" = true;

-- Drop old isRead column
ALTER TABLE "ChatMessage" DROP COLUMN "isRead";
