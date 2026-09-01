-- DropForeignKey
ALTER TABLE "SurveyQuestion" DROP CONSTRAINT "SurveyQuestion_surveyWaveId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_surveyQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "SurveySend" DROP CONSTRAINT "SurveySend_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyWave" DROP CONSTRAINT "SurveyWave_programId_fkey";

-- DropTable
DROP TABLE "SurveyQuestion";

-- DropTable
DROP TABLE "SurveyResponse";

-- DropTable
DROP TABLE "SurveySend";

-- DropTable
DROP TABLE "SurveyWave";

