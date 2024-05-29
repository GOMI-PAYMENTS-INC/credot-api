/*
  Warnings:

  - A unique constraint covering the columns `[transactionId]` on the table `Bond` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Bond_approvalType_approvalAmount_key` ON `Bond`;

-- AlterTable
ALTER TABLE `Bond` ADD COLUMN `transactionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Bond_transactionId_key` ON `Bond`(`transactionId`);
