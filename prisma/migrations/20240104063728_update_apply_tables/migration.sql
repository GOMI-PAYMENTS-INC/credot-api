/*
  Warnings:

  - You are about to drop the column `isPrefund` on the `Apply` table. All the data in the column will be lost.
  - You are about to drop the column `prefund` on the `Apply` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Apply` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Apply` DROP FOREIGN KEY `Apply_userId_fkey`;

-- AlterTable
ALTER TABLE `Apply` DROP COLUMN `isPrefund`,
    DROP COLUMN `prefund`,
    DROP COLUMN `userId`,
    ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `companyType` VARCHAR(191) NULL,
    ADD COLUMN `industryType` VARCHAR(191) NULL,
    ADD COLUMN `interestedService` VARCHAR(191) NULL,
    ADD COLUMN `jobTitle` VARCHAR(191) NULL,
    ADD COLUMN `marketingAgree` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `monthlySales` VARCHAR(191) NULL;
