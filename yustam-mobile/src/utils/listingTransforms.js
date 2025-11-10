const FALLBACK_IMAGE = 'https://res.cloudinary.com/df9qmg3gy/image/upload/v1707249680/phone-blue.png';

const parsePrice = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const numeric = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};

export const pickFirstString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return '';
};

const normalizeVerificationState = (value) => {
  if (value === true || value === 1 || value === '1') {
    return 'verified';
  }
  if (value === false || value === 0 || value === '0') {
    return 'unverified';
  }
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized) {
    return 'unverified';
  }
  if (['verified', 'approved', 'active', 'complete', 'completed'].includes(normalized)) {
    return 'verified';
  }
  if (['pending', 'review', 'processing', 'in_review', 'under review', 'submitted'].includes(normalized)) {
    return 'pending';
  }
  return 'unverified';
};

const formatReviewCount = (value) => {
  if (!value) {
    return '';
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric >= 1000) {
      return `${(numeric / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return String(numeric);
  }
  return String(value);
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const extractFirstImage = (value) => {
  if (Array.isArray(value)) {
    const candidate = value.find((item) => typeof item === 'string' && item.trim());
    return candidate ? candidate.trim() : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
};

const dedupeArray = (values = []) => {
  return Array.from(new Set(values.filter(Boolean)));
};

const resolveTimestamp = (value, docSnap) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (value && typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseDate(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  const snapshotTime = docSnap?.createTime ?? docSnap?.updateTime;
  if (snapshotTime && typeof snapshotTime.toDate === 'function') {
    return snapshotTime.toDate().getTime();
  }
  return null;
};

export const normalizeFirestoreListing = (docSnap, { fallbackImage = FALLBACK_IMAGE } = {}) => {
  if (!docSnap || typeof docSnap.data !== 'function') {
    return null;
  }

  const data = docSnap.data() || {};
  const status = String(data.status ?? '').trim().toLowerCase();
  if (status && !['approved', 'live', 'active', 'published'].includes(status)) {
    return null;
  }

  const price = parsePrice(data.price ?? data.amount ?? data.listingPrice ?? data.current_price);
  const oldPrice = parsePrice(
    data.oldPrice ?? data.previousPrice ?? data.old_price ?? data.compareAt ?? data.compare_at_price
  );

  const name = pickFirstString(data.title, data.productName, data.productTitle, data.name, `Listing ${docSnap.id}`);
  const category = pickFirstString(data.category, data.productCategory, data.collection) || 'Others';
  const vendor = pickFirstString(
    data.vendorName,
    data.vendor,
    data.vendorBusiness,
    data.businessName,
    data.sellerName,
    'Marketplace Vendor'
  );
  const vendorPlan = pickFirstString(data.vendorPlan, data.plan, data.planLabel, data.subscriptionPlan, data.package);
  const verification = normalizeVerificationState(
    data.vendorVerified ?? data.verification ?? data.verificationStatus ?? data.vendorVerification ?? data.verified
  );
  const ratingValue = parseFloat(
    data.rating ?? data.averageRating ?? data.reviewScore ?? data.average_rating ?? data.ratingValue
  );
  const reviewsRaw = pickFirstString(data.reviews, data.reviewCount, data.totalReviews, data.review_count);

  const city = pickFirstString(data.city, data.lga, data.localGovernment, data.vendorCity);
  const state = pickFirstString(data.state, data.region, data.vendorState, data.locationState);
  const country = pickFirstString(data.country, 'Nigeria');
  const locationParts = [city, state].filter(Boolean).join(', ');
  const location = locationParts ? `${locationParts}${country ? `, ${country}` : ''}` : country;

  const image =
    pickFirstString(
      data.image,
      data.imageUrl,
      data.image_url,
      data.primaryImage,
      data.primary_image,
      extractFirstImage(data.images),
      extractFirstImage(data.gallery)
    ) || fallbackImage;

  const badges = dedupeArray([
    ...(Array.isArray(data.badges) ? data.badges.filter(Boolean) : []),
    data.isFeatured || data.featured ? 'Featured' : null,
    vendorPlan ? `${vendorPlan} Plan` : null,
  ]);

  const tags = dedupeArray(
    Array.isArray(data.tags) && data.tags.length
      ? data.tags.filter(Boolean)
      : [pickFirstString(data.subcategory, data.subCategory, data.segment)].filter(Boolean)
  );

  const createdAt = resolveTimestamp(data.createdAt, docSnap);

  return {
    id: String(docSnap.id),
    name,
    category,
    price,
    oldPrice,
    rating: Number.isFinite(ratingValue) ? ratingValue : null,
    reviews: formatReviewCount(reviewsRaw),
    location: location || 'Nigeria',
    vendor,
    vendorPlan,
    verification,
    badges,
    tags,
    image,
    createdAt,
  };
};

export const normalizeStaticListing = (record = {}, { fallbackImage = FALLBACK_IMAGE } = {}) => ({
  id: String(record.id || record.slug || Date.now()),
  name: record.name || record.title || 'Marketplace Listing',
  category: record.category || record.segment || 'Marketplace',
  price: parsePrice(record.price),
  oldPrice: parsePrice(record.oldPrice),
  rating: Number.isFinite(record.rating) ? record.rating : null,
  reviews: record.reviews || '',
  location: record.location || 'Nigeria',
  vendor: record.vendor || record.vendorName || 'Yustam Vendor',
  vendorPlan: record.vendorPlan || record.plan || null,
  verification: record.verification || 'pending',
  badges: Array.isArray(record.badges) && record.badges.length ? record.badges : [record.badge].filter(Boolean),
  tags: Array.isArray(record.tags) && record.tags.length ? record.tags : record.sellingPoints || [],
  image: record.image || fallbackImage,
  createdAt: record.createdAt instanceof Date ? record.createdAt.getTime() : Date.now(),
});

export default {
  normalizeFirestoreListing,
  normalizeStaticListing,
  pickFirstString,
};
