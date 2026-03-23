-- Add missing indexes for quiz models
CREATE INDEX "QuizNode_quizId_idx" ON "QuizNode"("quizId");
CREATE INDEX "QuizEdge_quizId_idx" ON "QuizEdge"("quizId");
CREATE INDEX "QuizEdge_sourceNodeId_idx" ON "QuizEdge"("sourceNodeId");
CREATE INDEX "QuizEdge_targetNodeId_idx" ON "QuizEdge"("targetNodeId");
