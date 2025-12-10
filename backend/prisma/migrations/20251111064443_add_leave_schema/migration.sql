/*
  Warnings:

  - You are about to drop the column `approverComments` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `approverId` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentName` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `attachmentUrl` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContact` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the column `workingDays` on the `LeaveRequest` table. All the data in the column will be lost.
  - You are about to drop the `LeaveQuota` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `employeeId` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalDays` to the `LeaveRequest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_approverId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_userId_fkey";

-- DropIndex
DROP INDEX "LeaveRequest_startDate_idx";

-- DropIndex
DROP INDEX "LeaveRequest_status_idx";

-- DropIndex
DROP INDEX "LeaveRequest_userId_idx";

-- AlterTable
ALTER TABLE "LeaveRequest" DROP COLUMN "approverComments",
DROP COLUMN "approverId",
DROP COLUMN "attachmentName",
DROP COLUMN "attachmentUrl",
DROP COLUMN "emergencyContact",
DROP COLUMN "userId",
DROP COLUMN "workingDays",
ADD COLUMN     "attachment" TEXT,
ADD COLUMN     "currentApproverId" TEXT,
ADD COLUMN     "divisionHeadComment" TEXT,
ADD COLUMN     "divisionHeadDate" TIMESTAMP(3),
ADD COLUMN     "divisionHeadId" TEXT,
ADD COLUMN     "divisionHeadStatus" TEXT,
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supervisorComment" TEXT,
ADD COLUMN     "supervisorDate" TIMESTAMP(3),
ADD COLUMN     "supervisorId" TEXT,
ADD COLUMN     "supervisorStatus" TEXT,
ADD COLUMN     "totalDays" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE "LeaveQuota";

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "annualQuota" INTEGER NOT NULL DEFAULT 0,
    "annualUsed" INTEGER NOT NULL DEFAULT 0,
    "annualRemaining" INTEGER NOT NULL DEFAULT 0,
    "sickLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "menstrualLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveUsed" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_key" ON "LeaveBalance"("employeeId");

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_divisionHeadId_fkey" FOREIGN KEY ("divisionHeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
