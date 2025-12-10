/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,year]` on the table `LeaveBalance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "BalanceAdjustmentLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "previousBalance" DOUBLE PRECISION NOT NULL,
    "newBalance" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceAdjustmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_employeeId_year_key" ON "LeaveBalance"("employeeId", "year");

-- AddForeignKey
ALTER TABLE "BalanceAdjustmentLog" ADD CONSTRAINT "BalanceAdjustmentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceAdjustmentLog" ADD CONSTRAINT "BalanceAdjustmentLog_adjustedBy_fkey" FOREIGN KEY ("adjustedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
