-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "toilBalance" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "toilExpired" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "toilUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "isToil" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OvertimeRequest" ADD COLUMN     "recapId" TEXT;

-- CreateTable
CREATE TABLE "OvertimeRecap" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "paidHours" DOUBLE PRECISION NOT NULL,
    "excessHours" DOUBLE PRECISION NOT NULL,
    "carryoverHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalToilHours" DOUBLE PRECISION NOT NULL,
    "toilDaysCreated" INTEGER NOT NULL DEFAULT 0,
    "remainingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recappedById" TEXT NOT NULL,
    "recappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OvertimeRecap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeOffInLieu" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "hoursSource" DOUBLE PRECISION NOT NULL,
    "earnedMonth" INTEGER NOT NULL,
    "earnedYear" INTEGER NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "usedDate" TIMESTAMP(3),
    "expiredDate" TIMESTAMP(3),
    "recapId" TEXT,
    "leaveRequestId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOffInLieu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OvertimeRecap_employeeId_idx" ON "OvertimeRecap"("employeeId");

-- CreateIndex
CREATE INDEX "OvertimeRecap_year_month_idx" ON "OvertimeRecap"("year", "month");

-- CreateIndex
CREATE INDEX "OvertimeRecap_paymentStatus_idx" ON "OvertimeRecap"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeRecap_employeeId_year_month_key" ON "OvertimeRecap"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "TimeOffInLieu_leaveRequestId_key" ON "TimeOffInLieu"("leaveRequestId");

-- CreateIndex
CREATE INDEX "TimeOffInLieu_employeeId_idx" ON "TimeOffInLieu"("employeeId");

-- CreateIndex
CREATE INDEX "TimeOffInLieu_status_idx" ON "TimeOffInLieu"("status");

-- CreateIndex
CREATE INDEX "TimeOffInLieu_earnedYear_earnedMonth_idx" ON "TimeOffInLieu"("earnedYear", "earnedMonth");

-- CreateIndex
CREATE INDEX "TimeOffInLieu_expiryYear_expiryMonth_idx" ON "TimeOffInLieu"("expiryYear", "expiryMonth");

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "OvertimeRecap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRecap" ADD CONSTRAINT "OvertimeRecap_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRecap" ADD CONSTRAINT "OvertimeRecap_recappedById_fkey" FOREIGN KEY ("recappedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffInLieu" ADD CONSTRAINT "TimeOffInLieu_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffInLieu" ADD CONSTRAINT "TimeOffInLieu_recapId_fkey" FOREIGN KEY ("recapId") REFERENCES "OvertimeRecap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeOffInLieu" ADD CONSTRAINT "TimeOffInLieu_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
