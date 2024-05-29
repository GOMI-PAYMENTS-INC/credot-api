/*
  Warnings:

  - You are about to drop the column `downloadUrl` on the `Crawling` table. All the data in the column will be lost.
  - You are about to drop the column `recordUrl` on the `Crawling` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Crawling` DROP COLUMN `downloadUrl`,
    DROP COLUMN `recordUrl`;
