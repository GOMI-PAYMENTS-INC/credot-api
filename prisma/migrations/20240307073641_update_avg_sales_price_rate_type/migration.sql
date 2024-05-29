/*
  Warnings:

  - You are about to alter the column `avgSalesPriceRate` on the `FutureFundApply` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(5,3)`.

*/
-- AlterTable
ALTER TABLE `FutureFundApply` MODIFY `avgSalesPriceRate` DECIMAL(5, 3) NOT NULL DEFAULT 0.000;
