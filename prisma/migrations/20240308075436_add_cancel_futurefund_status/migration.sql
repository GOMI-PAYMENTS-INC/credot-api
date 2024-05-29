-- AlterTable
ALTER TABLE `FutureFundApply` MODIFY `status` ENUM('READY', 'DONE', 'REJECT', 'CANCEL') NOT NULL;
