/*
  Warnings:

  - You are about to drop the column `paidDate` on the `OvertimeRecap` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `OvertimeRecap` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "OvertimeRecap_paymentStatus_idx";

-- AlterTable
ALTER TABLE "OvertimeRecap" DROP COLUMN "paidDate",
DROP COLUMN "paymentStatus";
