/*
  Warnings:

  - You are about to alter the column `creditCardRate` on the `CardInfos` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(4,3)`.
  - You are about to alter the column `checkCardRate` on the `CardInfos` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(4,3)`.

*/
-- AlterTable
ALTER TABLE `CardInfos` MODIFY `creditCardRate` DECIMAL(4, 3) NOT NULL DEFAULT 0.000,
    MODIFY `checkCardRate` DECIMAL(4, 3) NOT NULL DEFAULT 0.000;
