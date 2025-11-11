// API Base URL (point to the new Node/Express backend)
// Update this to match your deployed server (e.g. https://api.yustam.com/api)
export const API_BASE_URL = 'http://localhost:4000/api';

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
