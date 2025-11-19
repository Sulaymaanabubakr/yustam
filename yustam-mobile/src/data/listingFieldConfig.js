import categoryFieldConfig from './categoryConfig.json';

export const getCategoryFieldDefinitions = (category) => {
  if (!category) {
    return [];
  }
  const entry = categoryFieldConfig[category];
  if (!entry || !Array.isArray(entry.fields)) {
    return [];
  }
  return entry.fields;
};

export const getCategorySubcategories = (category) => {
  if (!category) {
    return [];
  }
  const entry = categoryFieldConfig[category];
  if (!entry || !Array.isArray(entry.subcategories)) {
    return [];
  }
  return entry.subcategories;
};

export default categoryFieldConfig;
