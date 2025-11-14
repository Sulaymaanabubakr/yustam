import Constants from 'expo-constants';

const expoExtra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};

const expoBaseUrl =
  expoExtra?.apiBaseUrl ??
  process.env.EXPO_PUBLIC_API_BASE_URL;

const LOCAL_BASE = 'http://localhost/api';
const PROD_BASE = 'https://yustam.com.ng/api';

const inferredRuntimeBase =
  typeof window !== 'undefined' && window.location
    ? window.location.hostname === 'localhost'
      ? LOCAL_BASE
      : PROD_BASE
    : undefined;

// API Base URL (points to the unified PHP API)
// Priority: Expo extra/ENV override -> inferred runtime -> production fallback
export const API_BASE_URL = expoBaseUrl || inferredRuntimeBase || PROD_BASE;

const downloadConfig = expoExtra?.appDownload ?? {};
const androidPackageId =
  Constants?.expoConfig?.android?.package ??
  Constants?.manifest?.android?.package ??
  'com.yustam.marketplace';

const defaultAndroidStoreUrl =
  downloadConfig.android ||
  (androidPackageId ? `https://play.google.com/store/apps/details?id=${androidPackageId}` : '');
const defaultIosStoreUrl = downloadConfig.ios || '';
const defaultUniversalDownloadUrl =
  downloadConfig.landing || downloadConfig.universal || 'https://yustam.com.ng/app';

export const APP_DOWNLOAD_LINKS = {
  android: defaultAndroidStoreUrl,
  ios: defaultIosStoreUrl,
  universal: defaultUniversalDownloadUrl,
};

// Categories from web app
export const CATEGORIES = [
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
];

// Nigerian States
export const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna',
  'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// User Roles
export const USER_ROLES = {
  BUYER: 'buyer',
  VENDOR: 'vendor',
};

// Onboarding slides
export const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'Buy from Verified Vendors',
    description: 'Shop with confidence from trusted sellers across Nigeria. Every vendor is verified for your safety.',
    icon: 'shield-checkmark-outline',
  },
  {
    id: '2',
    title: 'Sell Smarter, Grow Faster',
    description: 'Reach thousands of ready buyers. List your products, manage orders, and grow your business effortlessly.',
    icon: 'storefront-outline',
  },
  {
    id: '3',
    title: 'Join Nigeria\'s Trusted Marketplace',
    description: 'A safe, vibrant community where buyers and sellers connect. Start buying or selling today!',
    icon: 'people-circle-outline',
  },
];
