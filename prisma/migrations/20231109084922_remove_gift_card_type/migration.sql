/*
  Warnings:

  - The values [GIFT] on the enum `CardClassification_type` will be removed. If these variants are still used in the database, this will fail.
  - The values [GIFT] on the enum `CardClassification_type` will be removed. If these variants are still used in the database, this will fail.
  - The values [GIFT] on the enum `CardClassification_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Bond` MODIFY `cardType` ENUM('CREDIT', 'CHECK') NULL;

-- AlterTable
ALTER TABLE `BondDeposit` MODIFY `cardType` ENUM('CREDIT', 'CHECK') NULL;

-- AlterTable
ALTER TABLE `CardClassification` MODIFY `type` ENUM('CREDIT', 'CHECK') NOT NULL DEFAULT 'CREDIT';
