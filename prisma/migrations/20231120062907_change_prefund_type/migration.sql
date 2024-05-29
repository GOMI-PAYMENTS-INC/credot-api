/*
  Warnings:

  - Made the column `prefund` on table `Apply` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Apply` MODIFY `prefund` INTEGER NOT NULL DEFAULT 0;
