// =========================================
// YUSTAM | POST PAGE FUNCTIONALITY
// =========================================

import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { uploadImage } from './cloudinary.js';

const categorySelect = document.getElementById('categorySelect');
const subcategorySelect = document.getElementById('subcategorySelect');
const dynamicFields = document.getElementById('dynamicFields');
const imageInput = document.getElementById('imageInput');
const imagePreviews = document.getElementById('imagePreviews');
const submitBtn = document.getElementById('submitBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loader = document.getElementById('loader');
const toast = document.getElementById('toast');
const formError = document.getElementById('formError');

const nigeriaStates = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Federal Capital Territory',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

const popularPhoneBrands = [
  'Apple',
  'Samsung',
  'Tecno',
  'Infinix',
  'itel',
  'Xiaomi',
  'Redmi',
  'POCO',
  'Nokia',
  'Huawei',
  'Oppo',
  'Vivo',
];

const phoneBrandsAZ = [
  'Alcatel',
  'Apple',
  'Asus',
  'BlackBerry',
  'Blackview',
  'Blu',
  'Cat',
  'Cubot',
  'Doogee',
  'Gionee',
  'Google',
  'Honor',
  'HTC',
  'Huawei',
  'iQOO',
  'itel',
  'Lenovo',
  'LG',
  'Meizu',
  'Micromax',
  'Motorola',
  'Nokia',
  'Nothing',
  'OnePlus',
  'Oppo',
  'Oukitel',
  'Panasonic',
  'Philips',
  'POCO',
  'Realme',
  'Redmi',
  'Samsung',
  'Sharp',
  'Tecno',
  'Ulefone',
  'Umidigi',
  'Vivo',
  'Wiko',
  'Xiaomi',
  'ZTE',
];

const sortAlphabetically = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

const PHONE_BRAND_OTHER_VALUE = '__custom_brand__';
const PHONE_BRAND_OTHER_LABEL = 'Other / Custom Brand';
const MODEL_OTHER_LABEL = 'Other / Custom Model';

const phoneBrandOptions = Array.from(
  new Set([
    ...popularPhoneBrands,
    ...phoneBrandsAZ,
  ]),
).sort(sortAlphabetically);

const phoneModelCatalog = {
  Apple: [
    'iPhone 6',
    'iPhone 6 Plus',
    'iPhone 6s',
    'iPhone 6s Plus',
    'iPhone 7',
    'iPhone 7 Plus',
    'iPhone 8',
    'iPhone 8 Plus',
    'iPhone X',
    'iPhone XR',
    'iPhone XS',
    'iPhone XS Max',
    'iPhone 11',
    'iPhone 11 Pro',
    'iPhone 11 Pro Max',
    'iPhone 12',
    'iPhone 12 Mini',
    'iPhone 12 Pro',
    'iPhone 12 Pro Max',
    'iPhone 13',
    'iPhone 13 Mini',
    'iPhone 13 Pro',
    'iPhone 13 Pro Max',
    'iPhone 14',
    'iPhone 14 Plus',
    'iPhone 14 Pro',
    'iPhone 14 Pro Max',
    'iPhone 15',
    'iPhone 15 Plus',
    'iPhone 15 Pro',
    'iPhone 15 Pro Max',
    'iPhone SE (2020)',
    'iPhone SE (2022)',
  ],
  Samsung: [
    'Galaxy S8',
    'Galaxy S9',
    'Galaxy S10',
    'Galaxy S20',
    'Galaxy S21',
    'Galaxy S22',
    'Galaxy S23',
    'Galaxy S24',
    'Galaxy Note 10',
    'Galaxy Note 20',
    'Galaxy Z Flip 4',
    'Galaxy Z Flip 5',
    'Galaxy Z Fold 4',
    'Galaxy Z Fold 5',
    'Galaxy A10',
    'Galaxy A12',
    'Galaxy A14',
    'Galaxy A24',
    'Galaxy A34',
    'Galaxy A54',
    'Galaxy A55',
  ],
  Tecno: ['Spark Series', 'Camon Series', 'Pova Series', 'Phantom Series'],
  Infinix: ['Hot Series', 'Note Series', 'Zero Series', 'Smart Series'],
  itel: ['itel A Series', 'itel P Series', 'itel S Series'],
  Xiaomi: ['Xiaomi 12', 'Xiaomi 12 Pro', 'Xiaomi 13', 'Xiaomi 13 Pro', 'Xiaomi 14', 'Xiaomi 14 Pro'],
  Redmi: ['Redmi Note 10', 'Redmi Note 11', 'Redmi Note 12', 'Redmi Note 13 Pro', 'Redmi Note 13 Pro+'],
  POCO: ['POCO M4', 'POCO F4', 'POCO F5', 'POCO X5', 'POCO X6'],
  Nokia: ['Nokia G Series', 'Nokia X Series', 'Nokia C Series'],
  Huawei: ['Huawei P Series', 'Huawei Mate Series', 'Huawei Nova Series'],
  Oppo: ['Oppo A Series', 'Oppo Reno Series', 'Oppo F Series'],
  Vivo: ['Vivo Y Series', 'Vivo V Series', 'Vivo T Series'],
};

const PHONE_MODELS_API_BASE = 'https://phone-specs-api.vercel.app';
const DEVICE_NAME_BLACKLIST = /(tablet|ipad|watch|mac|macbook|airpod|earbud|buds|homepod|surface|laptop|notebook)/i;

const externalBrandDirectory = new Map();
const brandModelsLoading = new Map();
let brandDirectoryLoaded = false;
let brandDirectoryLoadingPromise = null;

const formatBrandName = (value = '') => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  if (trimmed === trimmed.toUpperCase()) {
    return trimmed.replace(/\s+/g, ' ');
  }
  return trimmed.replace(/[A-Za-z0-9]+/g, (segment) => {
    if (segment.length <= 2) return segment.toUpperCase();
    return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
  }).replace(/\s+/g, ' ');
};

Object.keys(phoneModelCatalog).forEach((brand) => {
  const uniqueModels = Array.from(new Set(phoneModelCatalog[brand]));
  phoneModelCatalog[brand] = uniqueModels.sort(sortAlphabetically);
});

const mergePhoneModelCatalog = (catalog = {}) => {
  if (typeof catalog !== 'object' || catalog === null) return;
  let brandListMutated = false;

  Object.entries(catalog).forEach(([rawBrand, models]) => {
    if (!Array.isArray(models)) return;
    const brand = String(rawBrand ?? '').trim();
    if (!brand) return;

    const cleanedModels = models
      .map((model) => (typeof model === 'string' ? model.trim() : ''))
      .filter(Boolean);

    if (!phoneModelCatalog[brand]) {
      phoneModelCatalog[brand] = [];
    }

    if (cleanedModels.length) {
      const existing = phoneModelCatalog[brand] ?? [];
      const combined = Array.from(new Set([...existing, ...cleanedModels])).sort(sortAlphabetically);
      phoneModelCatalog[brand] = combined;
    }

    if (!phoneBrandOptions.includes(brand)) {
      phoneBrandOptions.push(brand);
      brandListMutated = true;
    }
  });

  if (brandListMutated) {
    phoneBrandOptions.sort(sortAlphabetically);
    if (brandSelectRef) {
      const previousSelection = brandSelectRef.value;
      const labelText = getLabelText(brandSelectRef) || 'brand';
      resetSelect(brandSelectRef, `Select ${labelText.toLowerCase()}`);
      const optionsToRender = [...phoneBrandOptions, PHONE_BRAND_OTHER_LABEL];
      createOptionElements(optionsToRender).forEach((opt) => {
        if (opt.value === PHONE_BRAND_OTHER_LABEL) {
          opt.value = PHONE_BRAND_OTHER_VALUE;
        }
        brandSelectRef.appendChild(opt);
      });
      if (previousSelection === PHONE_BRAND_OTHER_VALUE) {
        brandSelectRef.value = PHONE_BRAND_OTHER_VALUE;
      } else if (previousSelection && phoneBrandOptions.includes(previousSelection)) {
        brandSelectRef.value = previousSelection;
      }
      brandSelectRef.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (brandSelectRef) {
    brandSelectRef.dispatchEvent(new Event('change', { bubbles: true }));
  }
};

const loadBrandDirectoryFromApi = async () => {
  if (brandDirectoryLoaded) return;
  if (brandDirectoryLoadingPromise) return brandDirectoryLoadingPromise;
  brandDirectoryLoadingPromise = (async () => {
    try {
      const response = await fetch(`${PHONE_MODELS_API_BASE}/brands`, { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const brands = payload?.data ?? [];
      const seed = {};
      brands.forEach((entry) => {
        const formattedName = formatBrandName(entry.brand_name);
        if (!formattedName) return;
        if (!externalBrandDirectory.has(formattedName)) {
          externalBrandDirectory.set(formattedName, {
            slug: entry.brand_slug,
            detail: entry.detail,
            deviceCount: entry.device_count,
          });
          if (!phoneModelCatalog[formattedName]) {
            phoneModelCatalog[formattedName] = [];
            seed[formattedName] = [];
          }
        }
      });
      if (Object.keys(seed).length) {
        mergePhoneModelCatalog(seed);
      }
      brandDirectoryLoaded = true;
    } catch (error) {
      console.info('Unable to load extended brand catalogue', error);
    }
  })().finally(() => {
    brandDirectoryLoadingPromise = null;
  });
  return brandDirectoryLoadingPromise;
};

const fetchBrandModelsFromApi = async (brand) => {
  if (!brand || brand === PHONE_BRAND_OTHER_VALUE) return;
  await loadBrandDirectoryFromApi();
  const entry = externalBrandDirectory.get(brand);
  if (!entry) return;

  const existing = phoneModelCatalog[brand] ?? [];
  if (entry.deviceCount && existing.length >= entry.deviceCount) return;

  if (brandModelsLoading.has(brand)) return brandModelsLoading.get(brand);

  const loadPromise = (async () => {
    try {
      const aggregated = new Set(existing);
      let currentPage = 1;
      let lastPage = 1;
      do {
        const response = await fetch(`${PHONE_MODELS_API_BASE}/brands/${entry.slug}?page=${currentPage}`, { cache: 'no-store' });
        if (!response.ok) break;
        const payload = await response.json();
        const data = payload?.data;
        if (!data) break;
        lastPage = Number(data.last_page ?? currentPage);
        const phones = data.phones ?? [];
        phones.forEach((phone) => {
          const name = typeof phone?.phone_name === 'string' ? phone.phone_name.trim() : '';
          if (!name || DEVICE_NAME_BLACKLIST.test(name)) return;
          aggregated.add(name);
        });
        currentPage += 1;
      } while (currentPage <= lastPage);

      if (aggregated.size) {
        mergePhoneModelCatalog({ [brand]: Array.from(aggregated) });
      }
    } catch (error) {
      console.info(`Unable to load models for ${brand}`, error);
    }
  })().finally(() => {
    brandModelsLoading.delete(brand);
  });

  brandModelsLoading.set(brand, loadPromise);
  return loadPromise;
};

const loadExternalPhoneModels = async () => {
  try {
    const response = await fetch('data/phone-models.json', { cache: 'no-store' });
    if (!response.ok) return;
    const externalCatalog = await response.json();
    mergePhoneModelCatalog(externalCatalog);
  } catch (error) {
    console.info('Optional phone model catalogue not loaded', error);
  }
};

loadExternalPhoneModels();
loadBrandDirectoryFromApi();

const yesNoOptions = ['Yes', 'No'];

const categoryConfig = {
  'Phones & Tablets': {
    subcategories: [
      'Smartphones',
      'Feature Phones',
      'Tablets',
      'Smartwatches & Wearables',
      'Accessories',
    ],
    fields: [
      {
        label: 'Brand',
        name: 'brand',
        type: 'select',
        options: phoneBrandOptions,
        required: true,
      },
      {
        label: 'Model',
        name: 'model',
        type: 'datalist',
        datalistId: 'phone-model-options',
        placeholder: 'Start typing model name',
        required: true,
      },
      {
        label: 'RAM',
        name: 'ram',
        type: 'select',
        options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'],
        required: true,
      },
      {
        label: 'Storage',
        name: 'storage',
        type: 'select',
        options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
        required: true,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used', 'For Parts'],
        required: true,
      },
      {
        label: 'Network',
        name: 'network',
        type: 'select',
        options: ['2G', '3G', '4G', '5G'],
        required: true,
      },
      {
        label: 'Display Size (inches)',
        name: 'displaySize',
        type: 'text',
        placeholder: 'e.g., 6.1',
        required: true,
      },
      {
        label: 'Battery Capacity (mAh)',
        name: 'batteryCapacity',
        type: 'number',
        placeholder: 'e.g., 4500',
        required: true,
      },
      {
        label: 'Camera (Megapixels)',
        name: 'camera',
        type: 'text',
        placeholder: 'e.g., 50MP + 12MP',
        required: true,
      },
      {
        label: 'Colour',
        name: 'colour',
        type: 'text',
        required: true,
      },
      {
        label: 'Dual SIM',
        name: 'dualSim',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Warranty Offered',
        name: 'warrantyOffered',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Warranty Duration',
        name: 'warrantyDuration',
        type: 'text',
        placeholder: 'e.g., 6 months',
        required: false,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'State / City',
        name: 'location',
        type: 'text',
        placeholder: 'e.g., Lekki, Lagos',
        required: true,
      },
      {
        label: 'Highlight Features / Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Electronics: {
    subcategories: [
      'Televisions',
      'Audio & Home Theatre',
      'Cameras & Lenses',
      'Drones',
      'Fridges & Freezers',
      'Air Conditioners & Fans',
      'Cookers & Microwaves',
      'Washing Machines',
      'Small Appliances',
      'Other Electronics',
    ],
    fields: [
      { label: 'Brand', name: 'brand', type: 'text', required: true },
      { label: 'Type', name: 'type', type: 'text', required: true },
      {
        label: 'Size / Capacity',
        name: 'sizeCapacity',
        type: 'text',
        placeholder: 'e.g., 55" / 450L',
        required: true,
      },
      {
        label: 'Energy Rating',
        name: 'energyRating',
        type: 'text',
        required: false,
      },
      {
        label: 'Smart Features',
        name: 'smartFeatures',
        type: 'textarea',
        required: false,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used', 'For Parts'],
        required: true,
      },
      {
        label: 'Warranty',
        name: 'warranty',
        type: 'text',
        required: false,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Location',
        name: 'location',
        type: 'text',
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Computing: {
    subcategories: [
      'Laptops',
      'Desktops',
      'Monitors',
      'Printers & Scanners',
      'Components (RAM, SSD, GPU)',
      'Networking',
      'Accessories',
    ],
    fields: [
      { label: 'Brand', name: 'brand', type: 'text', required: true },
      { label: 'Model', name: 'model', type: 'text', required: true },
      { label: 'CPU', name: 'cpu', type: 'text', required: true },
      {
        label: 'RAM',
        name: 'ram',
        type: 'text',
        placeholder: 'e.g., 16GB',
        required: true,
      },
      {
        label: 'Storage',
        name: 'storage',
        type: 'text',
        placeholder: 'e.g., 512GB SSD',
        required: true,
      },
      {
        label: 'GPU',
        name: 'gpu',
        type: 'text',
        required: false,
      },
      {
        label: 'Screen Size',
        name: 'screenSize',
        type: 'text',
        placeholder: 'e.g., 15.6"',
        required: false,
      },
      {
        label: 'Battery Health',
        name: 'batteryHealth',
        type: 'text',
        required: false,
      },
      { label: 'Operating System', name: 'os', type: 'text', required: true },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used', 'For Parts'],
        required: true,
      },
      {
        label: 'Warranty',
        name: 'warranty',
        type: 'text',
        required: false,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Fashion: {
    subcategories: [
      "Men's Clothing",
      "Women's Clothing",
      'Kids',
      'Footwear',
      'Bags & Accessories',
      'Jewellery & Watches',
      'Modestwear / Abayas',
      'Traditional Wear (Agbada, Kaftan, Ankara)',
    ],
    fields: [
      { label: 'Item Type', name: 'itemType', type: 'text', required: true },
      {
        label: 'Gender',
        name: 'gender',
        type: 'select',
        options: ['Unisex', 'Male', 'Female', 'Boys', 'Girls'],
        required: true,
      },
      { label: 'Size', name: 'size', type: 'text', required: true },
      { label: 'Colour', name: 'colour', type: 'text', required: true },
      { label: 'Material', name: 'material', type: 'text', required: false },
      { label: 'Brand', name: 'brand', type: 'text', required: false },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Used'],
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  'Beauty & Self-Care': {
    subcategories: [
      'Skincare',
      'Haircare',
      'Makeup',
      'Perfume & Fragrance',
      'Health & Wellness',
      'Tools & Appliances',
    ],
    fields: [
      { label: 'Product Type', name: 'productType', type: 'text', required: true },
      { label: 'Brand', name: 'brand', type: 'text', required: true },
      {
        label: 'Volume / Weight',
        name: 'volume',
        type: 'text',
        placeholder: 'e.g., 100ml',
        required: true,
      },
      {
        label: 'Expiry / Best-Before Date',
        name: 'expiryDate',
        type: 'date',
        required: true,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New'],
        required: true,
      },
      {
        label: 'Ingredients (optional)',
        name: 'ingredients',
        type: 'textarea',
        required: false,
      },
      {
        label: 'Authenticity / Sealed',
        name: 'authenticity',
        type: 'select',
        options: ['Sealed', 'Unsealed'],
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  'Home & Kitchen': {
    subcategories: [
      'Cookware / Utensils',
      'Bedding & Linen',
      'Cleaning Supplies',
      'Home Decor',
      'Small Appliances',
      'Storage & Organisation',
    ],
    fields: [
      { label: 'Item Type', name: 'itemType', type: 'text', required: true },
      { label: 'Brand', name: 'brand', type: 'text', required: false },
      { label: 'Material', name: 'material', type: 'text', required: false },
      {
        label: 'Dimensions / Size',
        name: 'dimensions',
        type: 'text',
        required: false,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used'],
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Furniture: {
    subcategories: ['Living Room', 'Bedroom', 'Office', 'Outdoor', 'Custom / Handmade'],
    fields: [
      { label: 'Furniture Type', name: 'type', type: 'text', required: true },
      { label: 'Material', name: 'material', type: 'text', required: true },
      {
        label: 'Dimensions',
        name: 'dimensions',
        type: 'text',
        placeholder: 'e.g., 200cm x 180cm',
        required: true,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used'],
        required: true,
      },
      {
        label: 'Assembly Needed',
        name: 'assemblyNeeded',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Vehicles: {
    subcategories: [
      'Cars',
      'Motorcycles',
      'Tricycles',
      'Trucks & Buses',
      'Parts & Accessories',
      'Boats',
    ],
    fields: [
      { label: 'Make', name: 'make', type: 'text', required: true },
      { label: 'Model', name: 'model', type: 'text', required: true },
      {
        label: 'Year',
        name: 'year',
        type: 'number',
        min: 1950,
        max: new Date().getFullYear() + 1,
        required: true,
      },
      { label: 'Trim', name: 'trim', type: 'text', required: false },
      {
        label: 'Transmission',
        name: 'transmission',
        type: 'select',
        options: ['Automatic', 'Manual', 'CVT'],
        required: true,
      },
      { label: 'Mileage (km)', name: 'mileage', type: 'number', min: 0, required: true },
      {
        label: 'Fuel Type',
        name: 'fuelType',
        type: 'select',
        options: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
        required: true,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['Brand New', 'Foreign Used', 'Nigerian Used'],
        required: true,
      },
      { label: 'Colour', name: 'colour', type: 'text', required: true },
      {
        label: 'Registered',
        name: 'registered',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Location',
        name: 'location',
        type: 'text',
        placeholder: 'e.g., Ikeja, Lagos',
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Property: {
    subcategories: [
      'Rent (Apartments)',
      'Rent (Houses)',
      'Sale (Apartments)',
      'Sale (Houses)',
      'Land',
      'Commercial Property',
      'Short Lets',
    ],
    fields: [
      { label: 'Property Type', name: 'propertyType', type: 'text', required: true },
      {
        label: 'Bedrooms',
        name: 'bedrooms',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Bathrooms',
        name: 'bathrooms',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Size (sqm)',
        name: 'size',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Furnished',
        name: 'furnished',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Serviced',
        name: 'serviced',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Parking',
        name: 'parking',
        type: 'select',
        options: yesNoOptions,
        required: true,
      },
      {
        label: 'Location (Area)',
        name: 'location',
        type: 'text',
        placeholder: 'Estate / Street / Area',
        required: true,
      },
      {
        label: 'State',
        name: 'state',
        type: 'select',
        options: nigeriaStates,
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  'Power Solutions': {
    subcategories: ['Generators', 'Inverters & Batteries', 'Solar Panels & Systems', 'Stabilizers / UPS'],
    fields: [
      { label: 'Brand', name: 'brand', type: 'text', required: true },
      {
        label: 'Capacity (kVA / W)',
        name: 'capacity',
        type: 'text',
        required: true,
      },
      { label: 'Voltage', name: 'voltage', type: 'text', required: false },
      {
        label: 'Phase',
        name: 'phase',
        type: 'select',
        options: ['Single Phase', 'Three Phase'],
        required: false,
      },
      {
        label: 'Fuel / Solar Type',
        name: 'powerType',
        type: 'text',
        required: true,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used'],
        required: true,
      },
      {
        label: 'Warranty',
        name: 'warranty',
        type: 'text',
        required: false,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  'Food & Groceries': {
    subcategories: [
      'Staples',
      'Oils & Seasonings',
      'Spices & Condiments',
      'Canned & Packaged Foods',
      'Snacks',
      'Beverages',
      'Dairy & Eggs',
      'Fresh Produce',
      'Meat & Fish',
      'Frozen Foods',
      'Bakery',
      'Baby Food',
      'Pet Food',
    ],
    fields: [
      { label: 'Product Name', name: 'productName', type: 'text', required: true },
      { label: 'Brand', name: 'brand', type: 'text', required: true },
      {
        label: 'Weight / Quantity',
        name: 'weight',
        type: 'text',
        required: true,
      },
      {
        label: 'Pack Size',
        name: 'packSize',
        type: 'text',
        required: false,
      },
      {
        label: 'Expiry / Best-Before Date',
        name: 'expiryDate',
        type: 'date',
        required: true,
      },
      {
        label: 'Storage Type',
        name: 'storageType',
        type: 'select',
        options: ['Ambient', 'Chilled', 'Frozen'],
        required: true,
      },
      {
        label: 'Certification (NAFDAC No.)',
        name: 'certification',
        type: 'text',
        required: false,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Location',
        name: 'location',
        type: 'text',
        required: true,
      },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Services: {
    subcategories: [
      'Home Services',
      'Education & Training',
      'Health & Wellness',
      'Photography & Videography',
      'Events & Catering',
      'Tailoring & Fashion Services',
      'IT & Digital',
      'Logistics & Delivery',
    ],
    fields: [
      { label: 'Service Name', name: 'serviceName', type: 'text', required: true },
      {
        label: 'Service Description',
        name: 'description',
        type: 'textarea',
        required: true,
      },
      {
        label: 'Rate Type',
        name: 'rateType',
        type: 'select',
        options: ['Hourly', 'Daily', 'Per Project', 'Retainer'],
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Coverage Area',
        name: 'coverageArea',
        type: 'text',
        placeholder: 'Cities or regions served',
        required: true,
      },
      {
        label: 'Availability',
        name: 'availability',
        type: 'text',
        placeholder: 'e.g., Weekdays 9am-5pm',
        required: true,
      },
      {
        label: 'Additional Notes',
        name: 'notes',
        type: 'textarea',
        required: false,
      },
    ],
  },
  Others: {
    subcategories: ['Miscellaneous', 'Hobbies & Art', 'Pets & Animals', 'Agriculture', 'Books & Stationery', 'Collectibles'],
    fields: [
      { label: 'Title', name: 'title', type: 'text', required: true },
      {
        label: 'Description',
        name: 'description',
        type: 'textarea',
        required: true,
      },
      {
        label: 'Condition',
        name: 'condition',
        type: 'select',
        options: ['New', 'Like New', 'Used'],
        required: true,
      },
      {
        label: 'Price (₦)',
        name: 'price',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        label: 'Location',
        name: 'location',
        type: 'text',
        required: true,
      },
    ],
  },
};

let currentUser = null;
let selectedImages = [];

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
};

const toggleLoader = (shouldShow) => {
  if (shouldShow) {
    loader.classList.add('active');
  } else {
    loader.classList.remove('active');
  }
};

const setSubmitLoading = (isLoading) => {
  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span><span>Posting…</span>';
  } else {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Post Listing</span>';
  }
};

const setError = (message = '') => {
  formError.textContent = message;
};

const resetSelect = (selectEl, placeholder) => {
  selectEl.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.disabled = true;
  option.selected = true;
  option.textContent = placeholder;
  selectEl.appendChild(option);
};

const populateCategoryOptions = () => {
  Object.keys(categoryConfig).forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
};

let modelInput = null;
let modelDatalist = null;
let brandSelectRef = null;
let brandCustomInputRef = null;

const createOptionElements = (options = []) => {
  return options.map((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    return option;
  });
};

const createFieldElement = (field) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'input-group';

  const label = document.createElement('label');
  label.setAttribute('for', field.name);
  label.textContent = field.label;
  wrapper.appendChild(label);

  let inputElement;

  switch (field.type) {
    case 'select': {
      inputElement = document.createElement('select');
      inputElement.id = field.name;
      inputElement.name = field.name;
      inputElement.dataset.required = field.required;
      if (field.required) inputElement.required = true;
      resetSelect(inputElement, `Select ${field.label.toLowerCase()}`);
      let optionsToRender = field.options ?? [];
      if (field.name === 'brand') {
        optionsToRender = Array.from(new Set(optionsToRender)).sort(sortAlphabetically);
        optionsToRender.push(PHONE_BRAND_OTHER_LABEL);
      }
      createOptionElements(optionsToRender).forEach((opt) => {
        if (field.name === 'brand' && opt.value === PHONE_BRAND_OTHER_LABEL) {
          opt.value = PHONE_BRAND_OTHER_VALUE;
        }
        inputElement.appendChild(opt);
      });
      if (field.name === 'brand') {
        inputElement.dataset.customValue = PHONE_BRAND_OTHER_VALUE;
        const customBrandInput = document.createElement('input');
        customBrandInput.type = 'text';
        customBrandInput.id = 'brandCustom';
        customBrandInput.name = 'brandCustom';
        customBrandInput.placeholder = 'Enter brand name';
        customBrandInput.className = 'custom-brand-input';
        customBrandInput.style.display = 'none';
        customBrandInput.dataset.required = 'false';
        customBrandInput.autocomplete = 'organization';
        wrapper.appendChild(customBrandInput);
      }
      break;
    }
    case 'textarea': {
      inputElement = document.createElement('textarea');
      inputElement.id = field.name;
      inputElement.name = field.name;
      inputElement.dataset.required = field.required;
      if (field.required) inputElement.required = true;
      if (field.placeholder) inputElement.placeholder = field.placeholder;
      break;
    }
    case 'number': {
      inputElement = document.createElement('input');
      inputElement.type = 'number';
      inputElement.id = field.name;
      inputElement.name = field.name;
      inputElement.dataset.required = field.required;
      if (field.required) inputElement.required = true;
      if (field.placeholder) inputElement.placeholder = field.placeholder;
      if (typeof field.min !== 'undefined') inputElement.min = field.min;
      if (typeof field.max !== 'undefined') inputElement.max = field.max;
      break;
    }
    case 'date': {
      inputElement = document.createElement('input');
      inputElement.type = 'date';
      inputElement.id = field.name;
      inputElement.name = field.name;
      inputElement.dataset.required = field.required;
      if (field.required) inputElement.required = true;
      break;
    }
    case 'datalist': {
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.id = field.name;
      inputElement.name = field.name;
      inputElement.dataset.required = field.required;
      if (field.required) inputElement.required = true;
      if (field.placeholder) inputElement.placeholder = field.placeholder;
      modelInput = inputElement;
      modelDatalist = document.createElement('datalist');
      modelDatalist.id = field.datalistId;
      inputElement.setAttribute('list', modelDatalist.id);
      wrapper.appendChild(inputElement);
      wrapper.appendChild(modelDatalist);
      if (!field.appendAfter) {
        return wrapper;
      }
      break;
    }
    default: {
      inputElement = document.createElement('input');
      inputElement.type = 'text';
      inputElement.id = field.name;
      inputElement.name = field.name;
      inputElement.dataset.required = field.required;
      if (field.required) inputElement.required = true;
      if (field.placeholder) inputElement.placeholder = field.placeholder;
      break;
    }
  }

  if (field.type !== 'datalist') {
    wrapper.appendChild(inputElement);
  }

  return wrapper;
};

const renderFields = (categoryKey) => {
  dynamicFields.innerHTML = '';
  modelInput = null;
  modelDatalist = null;
  brandSelectRef = null;
  brandCustomInputRef = null;

  if (!categoryKey) return;

  const { fields } = categoryConfig[categoryKey];

  fields.forEach((field) => {
    const element = createFieldElement(field);
    dynamicFields.appendChild(element);

    if (field.type === 'select' && field.name === 'brand') {
      brandSelectRef = element.querySelector('select');
      brandCustomInputRef = element.querySelector('.custom-brand-input');
    }
  });

  if (brandSelectRef && modelInput) {
    const toggleCustomBrandInput = (brandValue) => {
      if (!brandCustomInputRef) return;
      const isCustom = brandValue === PHONE_BRAND_OTHER_VALUE;
      brandCustomInputRef.style.display = isCustom ? 'block' : 'none';
      brandCustomInputRef.required = isCustom;
      brandCustomInputRef.dataset.required = isCustom ? 'true' : 'false';
      if (!isCustom) {
        brandCustomInputRef.value = '';
      } else {
        brandCustomInputRef.focus();
      }
    };

    const updateModels = (brand) => {
      if (!modelDatalist) return;
      modelDatalist.innerHTML = '';
      const options = phoneModelCatalog[brand] || [];
      options.forEach((model) => {
        const option = document.createElement('option');
        option.value = model;
        modelDatalist.appendChild(option);
      });
      const manualOption = document.createElement('option');
      manualOption.value = MODEL_OTHER_LABEL;
      manualOption.textContent = MODEL_OTHER_LABEL;
      modelDatalist.appendChild(manualOption);
      if (!brand) {
        modelInput.placeholder = 'Select a brand to see suggestions';
      } else if (brand === PHONE_BRAND_OTHER_VALUE) {
        modelInput.placeholder = 'Type the exact model name';
      } else if (options.length) {
        modelInput.placeholder = 'Start typing model name';
      } else {
        modelInput.placeholder = 'Type the model name';
      }
    };

    const handleBrandChange = async (brandValue) => {
      toggleCustomBrandInput(brandValue);
      if (brandValue && brandValue !== PHONE_BRAND_OTHER_VALUE) {
        await fetchBrandModelsFromApi(brandValue);
      }
      updateModels(brandValue);
      modelInput.value = '';
    };

    if (!modelInput.dataset.hasManualListener) {
      modelInput.addEventListener('change', () => {
        if (modelInput.value === MODEL_OTHER_LABEL) {
          modelInput.value = '';
        }
      });
      modelInput.dataset.hasManualListener = 'true';
    }

    brandSelectRef.addEventListener('change', (event) => {
      handleBrandChange(event.target.value).catch((error) => console.info('Brand update failed', error));
    });

    handleBrandChange(brandSelectRef.value).catch((error) => console.info('Brand initialise failed', error));
  }

  updateWarrantyRequirement();
};

const populateSubcategories = (categoryKey) => {
  resetSelect(subcategorySelect, 'Select a subcategory');
  if (!categoryKey) return;
  categoryConfig[categoryKey].subcategories.forEach((subcategory) => {
    const option = document.createElement('option');
    option.value = subcategory;
    option.textContent = subcategory;
    subcategorySelect.appendChild(option);
  });
};

const updateWarrantyRequirement = () => {
  const warrantyOfferedField = dynamicFields.querySelector('[name="warrantyOffered"]');
  const warrantyDurationField = dynamicFields.querySelector('[name="warrantyDuration"]');
  if (warrantyOfferedField && warrantyDurationField) {
    if (warrantyOfferedField.value === 'Yes') {
      warrantyDurationField.setAttribute('required', 'true');
      warrantyDurationField.dataset.required = 'true';
    } else {
      warrantyDurationField.removeAttribute('required');
      warrantyDurationField.dataset.required = 'false';
    }
  }
};

const MAX_IMAGES = 6;

const refreshImagePreviews = () => {
  imagePreviews.querySelectorAll('img').forEach((img) => {
    if (img.src.startsWith('blob:')) {
      URL.revokeObjectURL(img.src);
    }
  });

  imagePreviews.innerHTML = '';

  selectedImages.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'image-chip';

    const img = document.createElement('img');
    const previewURL = URL.createObjectURL(file);
    img.src = previewURL;
    img.alt = `Listing image ${index + 1}`;
    chip.appendChild(img);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-btn';
    removeButton.innerHTML = '<span class="ri-close-line" aria-hidden="true"></span>';
    removeButton.addEventListener('click', () => {
      selectedImages.splice(index, 1);
      URL.revokeObjectURL(previewURL);
      refreshImagePreviews();
    });

    chip.appendChild(removeButton);
    imagePreviews.appendChild(chip);
  });
};

const handleImageSelection = (event) => {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const remainingSlots = MAX_IMAGES - selectedImages.length;
  const acceptableFiles = files
    .filter((file) => file.type.startsWith('image/'))
    .slice(0, remainingSlots);

  if (acceptableFiles.length < files.length || remainingSlots === 0) {
    showToast('You can upload up to 6 images per listing.');
  }

  selectedImages = selectedImages.concat(acceptableFiles);
  refreshImagePreviews();
  imageInput.value = '';
};

const getLabelText = (element) => {
  return element.closest('.input-group')?.querySelector('label')?.textContent ?? element.name;
};

const validateForm = () => {
  if (!categorySelect.value) {
    setError('Please select a category.');
    categorySelect.focus();
    return false;
  }

  if (!subcategorySelect.value) {
    setError('Please choose a subcategory.');
    subcategorySelect.focus();
    return false;
  }

  const requiredElements = dynamicFields.querySelectorAll('[data-required="true"]');
  for (const element of requiredElements) {
    if (!element) continue;
    const isNumberField = element.type === 'number';
    const value = isNumberField ? element.value : element.value.trim();
    const isEmpty = value === '' || value === null;
    if (isEmpty) {
      const labelText = getLabelText(element);
      setError(`${labelText} is required.`);
      element.focus();
      return false;
    }
  }

  const warrantyField = dynamicFields.querySelector('[name="warrantyOffered"]');
  const warrantyDuration = dynamicFields.querySelector('[name="warrantyDuration"]');
  if (warrantyField && warrantyField.value === 'Yes' && warrantyDuration) {
    if (!warrantyDuration.value.trim()) {
      setError('Please specify the warranty duration.');
      warrantyDuration.focus();
      return false;
    }
  }

  if (brandSelectRef && brandSelectRef.value === PHONE_BRAND_OTHER_VALUE) {
    const customBrandValue = brandCustomInputRef?.value.trim();
    if (!customBrandValue) {
      setError('Please enter the custom brand name.');
      brandCustomInputRef?.focus();
      return false;
    }
  }

  if (selectedImages.length === 0) {
    setError('Please add at least one image to showcase your listing.');
    imageInput.focus();
    return false;
  }

  setError('');
  return true;
};

const collectFormValues = () => {
  const payload = {};
  const fields = dynamicFields.querySelectorAll('input, select, textarea');
  fields.forEach((field) => {
    if (!field.name) return;
    let value = field.value;
    if (field.type === 'number') {
      value = value === '' ? null : Number(value);
    } else {
      value = value.trim();
    }
    if (value === '' || value === null) {
      return;
    }
    payload[field.name] = value;
  });
  if (payload.brand === PHONE_BRAND_OTHER_VALUE) {
    const customBrand = payload.brandCustom ? payload.brandCustom.trim() : '';
    if (customBrand) {
      payload.brand = customBrand;
    } else {
      delete payload.brand;
    }
  }
  delete payload.brandCustom;

  if (payload.model === MODEL_OTHER_LABEL) {
    delete payload.model;
  }

  return payload;
};

const uploadListingImages = async (userId) => {
  const timestamp = Date.now();
  const uploads = selectedImages.map((file, index) =>
    uploadImage(file, {
      folder: `listings/${userId}`,
      tags: ['listing', userId, `image-${index}`, `ts-${timestamp}`],
    }),
  );

  return Promise.all(uploads);
};

const createListingDocument = (formValues, imageUrls) => {
  const filteredValues = { ...formValues };
  Object.keys(filteredValues).forEach((key) => {
    if (filteredValues[key] === '' || filteredValues[key] === null) {
      delete filteredValues[key];
    }
  });

    const vendorUid = getStoredYustamUid();

    return {
      ...filteredValues,
      category: categorySelect.value,
      subcategory: subcategorySelect.value,
      vendorID: currentUser.uid,
      ...(vendorUid ? { vendorUid } : {}),
      status: 'pending',
      imageUrls,
      createdAt: serverTimestamp(),
    };
  };

const handleSubmit = async () => {
  if (!currentUser) {
    showToast('Please log in again to post your listing.');
    return;
  }

  if (!validateForm()) {
    return;
  }

  try {
    setSubmitLoading(true);
    toggleLoader(true);
    const formValues = collectFormValues();
    const imageUrls = await uploadListingImages(currentUser.uid);
    const listingData = createListingDocument(formValues, imageUrls);
    await addDoc(collection(db, 'listings'), listingData);
    showToast('Listing posted successfully!');
    setTimeout(() => {
      window.location.href = 'vendor-dashboard.php';
    }, 1600);
  } catch (error) {
    console.error('Error posting listing', error);
    setError('We could not post your listing. Please try again.');
    showToast('We could not post your listing. Please try again.');
  } finally {
    setSubmitLoading(false);
    toggleLoader(false);
  }
};

const initializeForm = () => {
  populateCategoryOptions();
  resetSelect(subcategorySelect, 'Select a subcategory');
};

categorySelect.addEventListener('change', (event) => {
  const selectedCategory = event.target.value;
  populateSubcategories(selectedCategory);
  renderFields(selectedCategory);
});

subcategorySelect.addEventListener('change', () => {
  setError('');
});

dynamicFields.addEventListener('change', (event) => {
  if (event.target.name === 'warrantyOffered') {
    updateWarrantyRequirement();
  }
});

imageInput.addEventListener('change', handleImageSelection);
submitBtn.addEventListener('click', handleSubmit);

logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed', error);
    showToast('Unable to logout. Please try again.');
  }
});

toggleLoader(true);
initializeForm();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'vendor-login.html';
    return;
  }

  currentUser = user;
  toggleLoader(false);
});
const getStoredYustamUid = () => {
  try {
    const sessionUid = sessionStorage.getItem('yustam_uid');
    if (sessionUid && sessionUid.trim()) {
      return sessionUid.trim();
    }
  } catch (error) {
    console.warn('[post] unable to read session UID', error);
  }
  try {
    const localUid = localStorage.getItem('yustam_uid');
    if (localUid && localUid.trim()) {
      return localUid.trim();
    }
  } catch (error) {
    console.warn('[post] unable to read local UID', error);
  }
  return '';
};
