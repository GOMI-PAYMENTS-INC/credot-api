/*
  Warnings:

  - The values [EASYSHOP_SALES] on the enum `CrawlingInfo_type` will be removed. If these variants are still used in the database, this will fail.
  - The values [EASYSHOP_SALES] on the enum `CrawlingInfo_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Crawling` MODIFY `type` ENUM('EASYSHOP') NOT NULL DEFAULT 'EASYSHOP';

-- AlterTable
ALTER TABLE `CrawlingInfo` MODIFY `type` ENUM('EASYSHOP') NOT NULL DEFAULT 'EASYSHOP';
