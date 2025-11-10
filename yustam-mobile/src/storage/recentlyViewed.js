import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recentlyViewedListings';
const MAX_RECENT = 20;

const normaliseListing = (listing = {}) => {
  const id =
    listing.id ||
    listing.listingId ||
    listing.productId ||
    listing.firestoreId ||
    listing.slug ||
    Date.now().toString();

  return {
    id: String(id),
    name: listing.title || listing.name || 'Marketplace Listing',
    price: Number(listing.price) || 0,
    image:
      listing.image ||
      (Array.isArray(listing.images) ? listing.images[0] : null) ||
      (Array.isArray(listing.gallery) ? listing.gallery[0] : null) ||
      '',
    location: listing.location || '',
    category: listing.category || '',
    viewedAt: Date.now(),
  };
};

const loadStoredListings = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load recently viewed listings', error);
    return [];
  }
};

const saveListings = async (listings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (error) {
    console.warn('Failed to save recently viewed listings', error);
  }
};

export const addRecentlyViewedListing = async (listing) => {
  if (!listing) {
    return;
  }

  const entry = normaliseListing(listing);
  const existing = await loadStoredListings();
  const filtered = existing.filter((item) => item.id !== entry.id);
  const next = [entry, ...filtered].slice(0, MAX_RECENT);
  await saveListings(next);
};

export const getRecentlyViewedListings = async () => {
  const items = await loadStoredListings();
  return items.sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
};

export const clearRecentlyViewedListings = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear recently viewed listings', error);
  }
};

export default {
  addRecentlyViewedListing,
  getRecentlyViewedListings,
  clearRecentlyViewedListings,
};
