import { Prisma } from '@prisma/client';
import { OperationType } from '../../common/enums/operation-type.enum';

export const REFERRAL_WITHDRAWAL_RATE = new Prisma.Decimal('0.01');

export function calculateReferralBonus(amount: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(amount.toString()).mul(REFERRAL_WITHDRAWAL_RATE).toDecimalPlaces(2);
}

export async function creditReferralBonusForCompletedRequest(
  tx: Prisma.TransactionClient,
  request: {
    id: bigint;
    userId: bigint;
    amount: Prisma.Decimal;
    code: string;
  },
): Promise<void> {
  const referral = await tx.referredUser.findUnique({
    where: { referredId: request.userId },
  });

  if (!referral || referral.referrerId === request.userId) {
    return;
  }

  const bonus = calculateReferralBonus(request.amount);
  if (bonus.lte(0)) {
    return;
  }

  try {
    await tx.partnerEarning.create({
      data: {
        userId: referral.referrerId,
        referredId: request.userId,
        paymentRequestId: request.id,
        amount: bonus,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return;
    }
    throw error;
  }

  await tx.user.update({
    where: { id: referral.referrerId },
    data: {
      balance: { increment: bonus },
      earnedTotal: { increment: bonus },
    },
  });

  await tx.operation.create({
    data: {
      userId: referral.referrerId,
      type: OperationType.REFERRAL_BONUS,
      amount: bonus,
      amountRub: bonus,
      currency: 'RUB',
      status: 'completed',
      description: `Реферальный бонус 1% за заявку ${request.code}`,
    },
  });
}
