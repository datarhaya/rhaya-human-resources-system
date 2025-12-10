-- DropIndex
DROP INDEX "Division_name_key";

-- AlterTable
ALTER TABLE "Division" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "OvertimeRequest" ADD COLUMN     "finalApproverId" TEXT;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_finalApproverId_fkey" FOREIGN KEY ("finalApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
