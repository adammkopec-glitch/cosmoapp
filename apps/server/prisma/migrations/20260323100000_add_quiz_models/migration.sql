-- CreateEnum
CREATE TYPE "BodyPart" AS ENUM ('STOPY', 'TWARZ', 'DLONIE', 'DEKOLT');

-- CreateEnum
CREATE TYPE "QuizNodeType" AS ENUM ('START', 'QUESTION', 'RESULT');

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bodyPart" "BodyPart" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizNode" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" "QuizNodeType" NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizEdge" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourceHandle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResult" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "mainServiceId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResultSuggestion" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizResultSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuizResult_nodeId_key" ON "QuizResult"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizResultSuggestion_resultId_order_key" ON "QuizResultSuggestion"("resultId", "order");

-- AddForeignKey
ALTER TABLE "QuizNode" ADD CONSTRAINT "QuizNode_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizEdge" ADD CONSTRAINT "QuizEdge_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizEdge" ADD CONSTRAINT "QuizEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "QuizNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizEdge" ADD CONSTRAINT "QuizEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "QuizNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "QuizNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_mainServiceId_fkey" FOREIGN KEY ("mainServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResultSuggestion" ADD CONSTRAINT "QuizResultSuggestion_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "QuizResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResultSuggestion" ADD CONSTRAINT "QuizResultSuggestion_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
