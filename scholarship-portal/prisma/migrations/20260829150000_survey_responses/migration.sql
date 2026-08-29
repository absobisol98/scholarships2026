ALTER TABLE "SurveySend" ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "surveyQuestionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurveyResponse_applicationId_surveyQuestionId_key" ON "SurveyResponse"("applicationId", "surveyQuestionId");

ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_surveyQuestionId_fkey" FOREIGN KEY ("surveyQuestionId") REFERENCES "SurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
