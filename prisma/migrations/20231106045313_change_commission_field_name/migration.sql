/*
  Warnings:

  - You are about to drop the column `commisionRate` on the `CardInfos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `CardInfos` DROP COLUMN `commisionRate`,
    ADD COLUMN `commissionRate` INTEGER NOT NULL DEFAULT 0;
