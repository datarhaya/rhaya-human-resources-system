-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT DEFAULT 'Male',
ADD COLUMN     "plottingCompany" TEXT DEFAULT 'PT Rhayakan Film indonesia',
ALTER COLUMN "employeeStatus" SET DEFAULT 'PKWT';
