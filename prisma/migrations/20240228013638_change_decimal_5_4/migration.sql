/*
  Warnings:

  - You are about to alter the column `creditCardRate` on the `CardInfos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(4,3)` to `Decimal(5,4)`.
  - You are about to alter the column `checkCardRate` on the `CardInfos` table. The data in that column could be lost. The data in that column will be cast from `Decimal(4,3)` to `Decimal(5,4)`.

*/
-- AlterTable
ALTER TABLE `CardInfos` MODIFY `creditCardRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    MODIFY `checkCardRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0000;
