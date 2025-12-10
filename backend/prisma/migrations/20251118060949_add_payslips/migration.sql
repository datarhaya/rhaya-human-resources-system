/*
  Warnings:

  - You are about to drop the column `allowances` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `basicSalary` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `bonus` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `bpjsEmployment` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `bpjsHealth` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `incomeTax` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `loanDeduction` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `otherDeductions` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `otherEarnings` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `overtimePay` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `paidDate` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `payPeriod` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `pdfFileName` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Payslip` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Payslip` table. All the data in the column will be lost.
  - You are about to alter the column `grossSalary` on the `Payslip` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - You are about to alter the column `netSalary` on the `Payslip` table. The data in that column could be lost. The data in that column will be cast from `Decimal(15,2)` to `DoublePrecision`.
  - A unique constraint covering the columns `[employeeId,year,month]` on the table `Payslip` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeId` to the `Payslip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Payslip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `Payslip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileUrl` to the `Payslip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `Payslip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedById` to the `Payslip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `Payslip` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Payslip" DROP CONSTRAINT "Payslip_userId_fkey";

-- DropIndex
DROP INDEX "Payslip_payPeriod_idx";

-- DropIndex
DROP INDEX "Payslip_status_idx";

-- DropIndex
DROP INDEX "Payslip_userId_idx";

-- DropIndex
DROP INDEX "Payslip_userId_payPeriod_key";

-- AlterTable
ALTER TABLE "Payslip" DROP COLUMN "allowances",
DROP COLUMN "basicSalary",
DROP COLUMN "bonus",
DROP COLUMN "bpjsEmployment",
DROP COLUMN "bpjsHealth",
DROP COLUMN "createdBy",
DROP COLUMN "incomeTax",
DROP COLUMN "loanDeduction",
DROP COLUMN "otherDeductions",
DROP COLUMN "otherEarnings",
DROP COLUMN "overtimePay",
DROP COLUMN "paidDate",
DROP COLUMN "payPeriod",
DROP COLUMN "pdfFileName",
DROP COLUMN "pdfUrl",
DROP COLUMN "status",
DROP COLUMN "userId",
ADD COLUMN     "employeeId" TEXT NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploadedById" TEXT NOT NULL,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewedAt" TIMESTAMP(3),
ADD COLUMN     "year" INTEGER NOT NULL,
ALTER COLUMN "grossSalary" DROP NOT NULL,
ALTER COLUMN "grossSalary" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "netSalary" DROP NOT NULL,
ALTER COLUMN "netSalary" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE INDEX "Payslip_year_month_idx" ON "Payslip"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_year_month_key" ON "Payslip"("employeeId", "year", "month");

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
