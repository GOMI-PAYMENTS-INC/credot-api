/*
  Warnings:

  - You are about to alter the column `avgSalesPriceRate` on the `FutureFundApply` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,3)` to `Decimal(10,3)`.

*/
-- AlterTable
ALTER TABLE `FutureFundApply` MODIFY `avgSalesPriceRate` DECIMAL(10, 3) NOT NULL DEFAULT 0.000;
