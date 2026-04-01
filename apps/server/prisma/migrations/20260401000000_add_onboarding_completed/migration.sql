-- AlterTable: add onboardingCompleted to User
ALTER TABLE "User" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey: fix BlogPostLike FKs (ON UPDATE NO ACTION → CASCADE)
ALTER TABLE "BlogPostLike" DROP CONSTRAINT "BlogPostLike_postId_fkey";
ALTER TABLE "BlogPostLike" DROP CONSTRAINT "BlogPostLike_userId_fkey";

-- AddForeignKey: BlogPostLike with correct ON UPDATE CASCADE
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlogPostLike" ADD CONSTRAINT "BlogPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey: fix BlogComment.parent (ON DELETE NO ACTION → CASCADE)
ALTER TABLE "BlogComment" DROP CONSTRAINT "BlogComment_parentId_fkey";

-- AddForeignKey: BlogComment.parent with ON DELETE CASCADE
ALTER TABLE "BlogComment" ADD CONSTRAINT "BlogComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
