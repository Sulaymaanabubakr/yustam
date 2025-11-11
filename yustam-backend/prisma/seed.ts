import {
  NotificationType,
  PaymentMethod,
  PrismaClient,
  ProductCondition,
  ProductStatus,
  Role,
  SubscriptionStatus,
  TicketPriority,
  TransactionStatus,
  VerificationStatus,
} from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@yustam.com';

  await prisma.$transaction([
    prisma.supportMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.billingTransaction.deleteMany(),
    prisma.planSubscription.deleteMany(),
    prisma.vendorProfile.deleteMany(),
    prisma.verificationDocument.deleteMany(),
    prisma.verificationRequest.deleteMany(),
    prisma.savedItem.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.plan.deleteMany(),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
    create: {
      email: adminEmail,
      firebaseUid: `seed-${Date.now()}`,
      displayName: process.env.DEFAULT_ADMIN_DISPLAY_NAME ?? 'Yustam Admin',
      role: Role.ADMIN,
    },
  });

  const shopper = await prisma.user.upsert({
    where: { email: 'user@yustam.com' },
    update: {},
    create: {
      email: 'user@yustam.com',
      firebaseUid: `seed-user-${Date.now()}`,
      displayName: 'Demo Shopper',
      role: Role.BUYER,
    },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@yustam.com' },
    update: { role: Role.VENDOR },
    create: {
      email: 'vendor@yustam.com',
      firebaseUid: `seed-vendor-${Date.now()}`,
      displayName: 'Lagos Fashion Collective',
      role: Role.VENDOR,
    },
  });

  const categorySeeds = [
    'Phones & Tablets',
    'Electronics',
    'Fashion',
    'Property',
    'Food & Groceries',
    'Beauty',
    'Vehicles',
    'Home & Kitchen',
    'Power Solutions',
    'Computing',
    'Services',
    'Others',
  ].map((name) => ({
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    icon: 'grid',
  }));

  await prisma.category.createMany({ data: categorySeeds });
  const categories = await prisma.category.findMany();
  const categoryMap = Object.fromEntries(categories.map((cat) => [cat.name, cat.id]));

  const plans = [
    {
      name: 'Starter',
      price: 0,
      durationDays: 30,
      listingLimit: 5,
      supportLevel: 'Email support',
      features: ['5 listings', 'Email support', 'Basic analytics'],
    },
    {
      name: 'Growth',
      price: 8500,
      durationDays: 30,
      listingLimit: 50,
      supportLevel: 'Priority chat',
      features: ['50 listings', 'Priority support', 'Verification fast-track'],
      isPopular: true,
    },
    {
      name: 'Scale',
      price: 19500,
      durationDays: 30,
      listingLimit: 200,
      supportLevel: 'Dedicated manager',
      features: ['200 listings', 'Dedicated manager', 'Advanced analytics'],
    },
  ];

  const planRecords = await Promise.all(plans.map((plan) => prisma.plan.create({ data: plan })));
  const growthPlan = planRecords.find((plan) => plan.name === 'Growth');
  if (!growthPlan) {
    throw new Error('Failed to create Growth plan');
  }

  const vendorProfile = await prisma.vendorProfile.create({
    data: {
      userId: vendorUser.id,
      businessName: 'Lagos Fashion Collective',
      storefrontSlug: 'lagos-fashion-collective',
      category: 'Fashion',
      tagline: 'Authentic Nigerian fashion brands',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      verificationStatus: VerificationStatus.APPROVED,
      verificationReviewedAt: new Date(),
      verificationSubmittedAt: new Date(),
      listingsPublished: 2,
      listingsSold: 1,
      currentPlanId: growthPlan.id,
    },
  });

  const subscription = await prisma.planSubscription.create({
    data: {
      userId: vendorUser.id,
      planId: growthPlan.id,
      status: SubscriptionStatus.ACTIVE,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.billingTransaction.create({
    data: {
      userId: vendorUser.id,
      planId: growthPlan.id,
      subscriptionId: subscription.id,
      amount: growthPlan.price,
      status: TransactionStatus.SUCCESS,
      method: PaymentMethod.CARD,
      reference: `YUSTAM-${Date.now()}`,
      paidAt: new Date(),
    },
  });

  const productsData = [
    {
      name: 'Yustam Hoodie',
      description: 'Soft-touch premium hoodie for on-the-go comfort.',
      price: 6500,
      stock: 30,
      ownerId: admin.id,
      categoryId: categoryMap['Fashion'],
      locationState: 'Lagos',
      condition: ProductCondition.NEW,
      isFeatured: true,
    },
    {
      name: 'Vegan Snack Pack',
      description: 'Curated snack box sourced from verified vendors.',
      price: 4500,
      stock: 55,
      ownerId: admin.id,
      categoryId: categoryMap['Food & Groceries'],
      locationState: 'Abuja',
      condition: ProductCondition.NEW,
    },
    {
      name: 'Adire Maxi Dress',
      description: 'Hand-dyed Adire maxi dress from Lagos artisans.',
      price: 32000,
      stock: 15,
      ownerId: vendorUser.id,
      categoryId: categoryMap['Fashion'],
      locationState: 'Lagos',
      condition: ProductCondition.NEW,
      isFeatured: true,
      isFlashSale: true,
      flashSaleEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  ];

  const products = await Promise.all(
    productsData.map((product) =>
      prisma.product.create({
        data: {
          ...product,
          status: ProductStatus.ACTIVE,
          media: {
            create: {
              url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
              publicId: `sample-${product.name}`,
              isPrimary: true,
            },
          },
        },
        include: { media: true },
      }),
    ),
  );

  await prisma.savedItem.create({
    data: {
      userId: shopper.id,
      productId: products[2].id,
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: vendorUser.id,
        title: 'Storefront published',
        body: 'Your Lagos Fashion Collective storefront is now live for buyers.',
        type: NotificationType.LISTING,
      },
      {
        userId: shopper.id,
        title: 'New arrivals from Lagos',
        body: 'Browse freshly added Adire pieces and curated drops.',
        type: NotificationType.LISTING,
      },
    ],
  });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: vendorUser.id,
      subject: 'Need help with payouts',
      category: 'Billing',
      description: 'When will my last payout be processed?',
      priority: TicketPriority.MEDIUM,
    },
  });

  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      senderId: vendorUser.id,
      body: 'Could you confirm the payout timeline?',
    },
  });

  const verification = await prisma.verificationRequest.create({
    data: {
      userId: vendorUser.id,
      status: VerificationStatus.APPROVED,
      submittedAt: new Date(),
      reviewedAt: new Date(),
      documents: {
        create: {
          type: 'CAC Certificate',
          url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          status: VerificationStatus.APPROVED,
        },
      },
    },
  });

  await prisma.vendorProfile.update({
    where: { id: vendorProfile.id },
    data: {
      verificationNotes: 'Documents verified',
      verificationReviewedAt: verification.reviewedAt ?? new Date(),
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
