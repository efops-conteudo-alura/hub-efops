-- CreateTable
CREATE TABLE "SubmissionCoordinator" (
    "submissionId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionCoordinator_pkey" PRIMARY KEY ("submissionId","coordinatorId")
);

-- AddForeignKey
ALTER TABLE "SubmissionCoordinator" ADD CONSTRAINT "SubmissionCoordinator_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionCoordinator" ADD CONSTRAINT "SubmissionCoordinator_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
