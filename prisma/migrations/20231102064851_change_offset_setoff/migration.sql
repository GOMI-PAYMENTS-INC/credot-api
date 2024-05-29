/*
  Warnings:

  - You are about to drop the column `offset` on the `PrefundByCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `PrefundByCard` DROP COLUMN `offset`,
    ADD COLUMN `setoff` INTEGER NOT NULL DEFAULT 0;
