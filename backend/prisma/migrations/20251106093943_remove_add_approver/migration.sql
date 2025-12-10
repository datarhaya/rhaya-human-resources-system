/*
  Warnings:

  - You are about to drop the column `finalApproverId` on the `OvertimeRequest` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "OvertimeRequest" DROP CONSTRAINT "OvertimeRequest_finalApproverId_fkey";

-- AlterTable
ALTER TABLE "OvertimeRequest" DROP COLUMN "finalApproverId";
