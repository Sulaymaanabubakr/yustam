import { PaymentMethod, SubscriptionStatus, TransactionStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';
import { ensureVendorProfile } from './vendor.service';

export const listPlans = async () => prisma.plan.findMany({ orderBy: { price: 'asc' } });

export const getUserSubscriptions = async (userId: string) => {
  return prisma.planSubscription.findMany({ where: { userId }, include: { plan: true }, orderBy: { startsAt: 'desc' } });
};

export const subscribeToPlan = async (userId: string, planId: string) => {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    throw new HttpError(404, 'Plan not found');
  }

  await ensureVendorProfile(userId);

  await prisma.planSubscription.updateMany({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    data: { status: SubscriptionStatus.EXPIRED },
  });

  const now = new Date();
  const endsAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const subscription = await prisma.planSubscription.create({
    data: {
      userId,
      planId: plan.id,
      startsAt: now,
      endsAt,
      status: SubscriptionStatus.ACTIVE,
    },
    include: { plan: true },
  });

  await prisma.billingTransaction.create({
    data: {
      userId,
      planId: plan.id,
      subscriptionId: subscription.id,
      amount: plan.price,
      status: TransactionStatus.SUCCESS,
      method: PaymentMethod.CARD,
      reference: `YUSTAM-${Date.now()}`,
      paidAt: now,
    },
  });

  await prisma.vendorProfile.update({ where: { userId }, data: { currentPlanId: plan.id } });

  return subscription;
};