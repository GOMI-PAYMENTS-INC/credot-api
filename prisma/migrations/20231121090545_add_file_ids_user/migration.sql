-- AlterTable
ALTER TABLE `User` ADD COLUMN `businessLicenseFileId` INTEGER NULL,
    ADD COLUMN `certificateOfCorporateSealFileId` INTEGER NULL,
    ADD COLUMN `corporateRegisterFileId` INTEGER NULL;
