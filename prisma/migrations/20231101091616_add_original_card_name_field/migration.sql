-- AlterTable
ALTER TABLE `Bond` ADD COLUMN `originalCardCompanyName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `BondDeposit` ADD COLUMN `originalCardCompanyName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Prefund` ADD COLUMN `originalCardCompanyName` VARCHAR(191) NULL;
