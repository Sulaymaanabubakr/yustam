import { ProductStatus, VerificationStatus } from '@prisma/client';
import { prisma } from '../db/client';

export const getHomeFeed = async () => {
  const now = new Date();

  const [categories, featuredProducts, flashSales, stats] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' }, take: 12 }),
    prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE, isFeatured: true },
      include: { media: true, category: true, owner: { select: { id: true, displayName: true, vendorProfile: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        isFlashSale: true,
        flashSaleEndsAt: { gte: now },
      },
      include: { media: true },
      orderBy: { flashSaleEndsAt: 'asc' },
      take: 10,
    }),
    Promise.all([
      prisma.vendorProfile.count(),
      prisma.vendorProfile.count({ where: { verificationStatus: VerificationStatus.APPROVED } }),
      prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
    ]),
  ]);

  return {
    hero: {
      title: 'Everything you need — all in one trusted marketplace',
      subtitle: 'Shop Nigerian vendors, discover curated products, and grow your business with Yustam.',
      callToAction: 'Shop now',
    },
    categories,
    featuredProducts,
    flashSales,
    stats: {
      totalVendors: stats[0],
      verifiedVendors: stats[1],
      activeListings: stats[2],
    },
  };
};
