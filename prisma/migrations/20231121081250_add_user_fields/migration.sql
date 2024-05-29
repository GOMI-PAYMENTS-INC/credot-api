-- AlterTable
ALTER TABLE `User` ADD COLUMN `businessNumber` VARCHAR(191) NULL,
    ADD COLUMN `businessType` VARCHAR(191) NULL,
    ADD COLUMN `companyAddress` VARCHAR(191) NULL,
    ADD COLUMN `corporateRegistrationNumber` VARCHAR(191) NULL,
    ADD COLUMN `industryType` VARCHAR(191) NULL,
    ADD COLUMN `managerName` VARCHAR(191) NULL,
    ADD COLUMN `managerPosition` VARCHAR(191) NULL,
    ADD COLUMN `userType` ENUM('CORPORATE', 'INDIVIDUAL') NOT NULL DEFAULT 'CORPORATE';
