/*
  Warnings:

  - A unique constraint covering the columns `[cardNumber]` on the table `CardClassification` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `CardClassification_cardNumber_type_key` ON `CardClassification`;

-- AlterTable
ALTER TABLE `CardClassification` MODIFY `type` ENUM('CREDIT', 'CHECK') NULL;

-- CreateIndex
CREATE UNIQUE INDEX `CardClassification_cardNumber_key` ON `CardClassification`(`cardNumber`);
