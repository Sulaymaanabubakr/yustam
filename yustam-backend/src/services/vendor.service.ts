import { Prisma, ProductStatus, Role, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../db/client';
import { HttpError } from '../middleware/error-handler';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const ensureSlug = async (base: string) => {
  const initial = base || `vendor-${Math.random().toString(36).slice(2, 8)}`;
  let candidate = initial;
  let i = 1;
  while (await prisma.vendorProfile.findUnique({ where: { storefrontSlug: candidate } })) {
    candidate = `${initial}-${i++}`;
  }
  return candidate;
};

export const ensureVendorProfile = async (userId: string, defaults?: { businessName?: string }) => {
  const existing = await prisma.vendorProfile.findUnique({ where: { userId }, include: { currentPlan: true } });
  if (existing) {
    return existing;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  const businessName = defaults?.businessName ?? user.displayName ?? 'Yustam Vendor';
  const profile = await prisma.vendorProfile.create({
    data: {
      userId,
      businessName,
      storefrontSlug: await ensureSlug(slugify(businessName)),
    },
    include: { currentPlan: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { role: Role.VENDOR },
  });

  return profile;
};

export const getVendorProfile = async (userId: string) => {
  return prisma.vendorProfile.findUnique({ where: { userId }, include: { currentPlan: true, user: true } });
};

export const updateVendorProfile = async (userId: string, data: Record<string, unknown>) => {
  const profile = await ensureVendorProfile(userId);
  return prisma.vendorProfile.update({ where: { id: profile.id }, data, include: { currentPlan: true } });
};

export const getVendorDashboard = async (userId: string) => {
  const [profile, listings, draftListings, pendingListings, archivedListings, planSubscription] = await Promise.all([
    ensureVendorProfile(userId),
    prisma.product.count({ where: { ownerId: userId } }),
    prisma.product.count({ where: { ownerId: userId, status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { ownerId: userId, status: ProductStatus.ACTIVE } }),
    prisma.product.count({ where: { ownerId: userId, status: ProductStatus.ARCHIVED } }),
    prisma.planSubscription.findFirst({ where: { userId, status: SubscriptionStatus.ACTIVE }, include: { plan: true }, orderBy: { startsAt: 'desc' } }),
  ]);

  return {
    profile,
    listings: {
      total: listings,
      drafts: draftListings,
      active: pendingListings,
      archived: archivedListings,
    },
    plan: planSubscription,
    verificationStatus: profile.verificationStatus,
  };
};

export const getVendorAnalytics = async (userId: string) => {
  const listings = await prisma.product.findMany({ where: { ownerId: userId }, include: { media: true } });
  const activeListings = listings.filter((listing) => listing.status === ProductStatus.ACTIVE).length;
  const draftListings = listings.filter((listing) => listing.status === ProductStatus.DRAFT).length;
  const featuredListings = listings.filter((listing) => listing.isFeatured).length;

  return {
    listings,
    totals: {
      totalListings: listings.length,
      activeListings,
      draftListings,
      featuredListings,
    },
  };
};

const buildStorefrontWhere = (identifier: string): Prisma.VendorProfileWhereInput => ({
  OR: [
    { storefrontSlug: identifier },
    { id: identifier },
    { userId: identifier },
    { user: { firebaseUid: identifier } },
  ],
});

export const getStorefrontByIdentifier = async (identifier: string) => {
  const vendor = await prisma.vendorProfile.findFirst({
    where: buildStorefrontWhere(identifier),
    include: {
      user: { select: { displayName: true, photoUrl: true, firebaseUid: true, email: true, id: true } },
      currentPlan: true,
    },
  });
  if (!vendor) {
    throw new HttpError(404, 'Storefront not found');
  }
  const products = await prisma.product.findMany({
    where: { ownerId: vendor.userId, status: ProductStatus.ACTIVE },
    include: { media: true, category: true },
  });
  return { vendor, products };
};
