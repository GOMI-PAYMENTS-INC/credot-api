/*
  Warnings:

  - A unique constraint covering the columns `[transactionAt,approvalType,approvalNumber,cardNumber,approvalAmount]` on the table `BondDeposit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `BondDeposit_transactionAt_approvalType_approvalNumber_cardNu_key` ON `BondDeposit`(`transactionAt`, `approvalType`, `approvalNumber`, `cardNumber`, `approvalAmount`);
