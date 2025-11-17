const buildCategory = (label, description, subcategories = [], meta) => ({
  label,
  value: label,
  description,
  subcategories,
  meta,
});

export const CATEGORY_BLUEPRINT = [
  buildCategory('Phones & Tablets', 'Smartphones, tablets, wearables and essential accessories.', [
    'Smartphones',
    'Feature Phones',
    'Tablets',
    'Smartwatches & Wearables',
    'Phone Accessories',
  ], 'Trending'),
  buildCategory('Electronics', 'Computers, entertainment systems and smart home gadgets.', [
    'Computers & Laptops',
    'TV & Audio',
    'Cameras & Drones',
    'Gaming Consoles',
    'Electronic Accessories',
  ]),
  buildCategory('Fashion', 'Men, women and kids fashion pieces plus accessories.', [
    'Menswear',
    'Womenswear',
    'Kidswear',
    'Fashion Accessories',
    'Footwear',
  ]),
  buildCategory('Property', 'Apartments, land, short lets and commercial spaces.', [
    'Apartments',
    'Houses',
    'Land',
    'Short Lets',
    'Commercial Property',
  ], 'High Demand'),
  buildCategory('Food & Groceries', 'Packaged foods, fresh produce, beverages and snacks.', [
    'Packaged Foods',
    'Fresh Produce',
    'Beverages',
    'Snacks',
    'Restaurant Deals',
  ]),
  buildCategory('Beauty', 'Skincare, haircare, makeup and beauty tools.', [
    'Skincare',
    'Haircare',
    'Makeup',
    'Fragrances',
    'Beauty Tools',
  ]),
  buildCategory('Vehicles', 'Cars, motorcycles, trucks and spare parts.', [
    'Cars',
    'Motorcycles',
    'Trucks & Buses',
    'Auto Parts',
    'Vehicle Accessories',
  ]),
  buildCategory('Home & Kitchen', 'Furniture, appliances, decor and outdoor items.', [
    'Furniture',
    'Appliances',
    'Decor',
    'Kitchenware',
    'Outdoor & Garden',
  ]),
  buildCategory('Power Solutions', 'Reliable power backup and renewable options.', [
    'Generators',
    'Solar Kits',
    'Inverters',
    'Batteries',
    'UPS & Power Accessories',
  ]),
  buildCategory('Computing', 'Workstations, peripherals and productivity tools.', [
    'Laptops',
    'Desktops',
    'Monitors',
    'Storage & Memory',
    'Computer Accessories',
  ]),
  buildCategory('Services', 'Professional services, logistics, repairs and events.', [
    'Repairs & Maintenance',
    'Logistics & Delivery',
    'Consulting',
    'Events & Entertainment',
    'Training & Coaching',
  ]),
  buildCategory('Others', 'Everything else that does not quite fit elsewhere.', []),
];

export const CATEGORY_PRESETS = CATEGORY_BLUEPRINT.reduce((acc, entry) => {
  acc[entry.value] = Array.isArray(entry.subcategories) ? entry.subcategories : [];
  return acc;
}, {});

export const CATEGORY_VALUE_LIST = CATEGORY_BLUEPRINT.map((entry) => entry.value);

export const CATEGORY_OPTION_LIST = CATEGORY_BLUEPRINT.map((entry) => ({
  label: entry.label,
  value: entry.value,
  description: entry.description,
  meta: entry.meta,
}));

export const findCategoryBlueprint = (value) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return CATEGORY_BLUEPRINT.find((entry) => entry.value.toLowerCase() === normalized) || null;
};

export const getSubcategoriesForCategory = (value) => {
  const entry = findCategoryBlueprint(value);
  if (entry && Array.isArray(entry.subcategories)) {
    return entry.subcategories;
  }
  return [];
};

export const buildOptionsFromLabels = (labels = []) => {
  return labels.map((label) => {
    const blueprint = findCategoryBlueprint(label);
    return {
      label,
      value: label,
      description: blueprint?.description,
      meta: blueprint?.meta,
    };
  });
};

export default {
  CATEGORY_BLUEPRINT,
  CATEGORY_PRESETS,
  CATEGORY_VALUE_LIST,
  CATEGORY_OPTION_LIST,
  findCategoryBlueprint,
  getSubcategoriesForCategory,
  buildOptionsFromLabels,
};
