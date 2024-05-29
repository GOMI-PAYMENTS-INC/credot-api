import { ApprovalType } from '@prisma/client';

export const generateTransactionId = ({
  transactionAtDate,
  approvalNumber,
  approvalType,
  approvalAmount,
}: {
  transactionAtDate: string;
  approvalType: ApprovalType;
  approvalNumber: string;
  approvalAmount: number;
}): string => {
  if (approvalType === ApprovalType.CANCEL) {
    return [approvalType, approvalNumber, approvalAmount].join('-');
  }

  return [transactionAtDate, approvalType, approvalNumber, approvalAmount].join(
    '-',
  );
};
