/*
  Warnings:

  - You are about to drop the column `commissionRate` on the `CardInfos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `CardInfos` DROP COLUMN `commissionRate`,
    ADD COLUMN `settlementCycle` INTEGER NOT NULL DEFAULT 0;
