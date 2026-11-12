/**
 * ScanWise Global Enums & Constants
 * Aligned with db/schema.sql and DOCS/TRDv2.md
 */

export const AGE_GROUPS = [
  { code: 'child', label: 'Child (0–12 yrs)', minAge: 0, maxAge: 12 },
  { code: 'teen', label: 'Teen (13–19 yrs)', minAge: 13, maxAge: 19 },
  { code: 'adult', label: 'Adult (20–59 yrs)', minAge: 20, maxAge: 59 },
  { code: 'old_age', label: 'Senior (60+ yrs)', minAge: 60, maxAge: null },
];

export const HEALTH_CONDITIONS = [
  { code: 'diabetes', label: 'Diabetes / Blood Sugar', note: 'Flags added sugars, maltodextrin, high GI starches' },
  { code: 'hypertension', label: 'High Blood Pressure', note: 'Flags sodium, MSG, sodium benzoates' },
  { code: 'high_cholesterol', label: 'High Cholesterol', note: 'Flags trans fats, palm oil, hydrogenated oils' },
  { code: 'heart_disease', label: 'Heart Disease', note: 'Flags saturated fats, excessive sodium' },
  { code: 'kidney_disease', label: 'Kidney Disease', note: 'Flags potassium, phosphorus, sodium' },
];

export const ALLERGENS = [
  { code: 'peanut', label: 'Peanuts' },
  { code: 'tree_nut', label: 'Tree Nuts (Almonds, Cashews, etc.)' },
  { code: 'milk', label: 'Dairy / Milk' },
  { code: 'egg', label: 'Eggs' },
  { code: 'soy', label: 'Soy' },
  { code: 'wheat_gluten', label: 'Wheat / Gluten' },
  { code: 'fish', label: 'Fish' },
  { code: 'shellfish', label: 'Shellfish / Crustaceans' },
  { code: 'sesame', label: 'Sesame' },
  { code: 'mustard', label: 'Mustard' },
  { code: 'sulphites', label: 'Sulphites' },
  { code: 'fragrance', label: 'Fragrance / Essential Oils' },
];

export const SKIN_TYPES = [
  { code: 'normal', label: 'Normal' },
  { code: 'dry', label: 'Dry' },
  { code: 'oily', label: 'Oily / Acne-Prone' },
  { code: 'combination', label: 'Combination' },
  { code: 'sensitive', label: 'Sensitive' },
];

export const DIETARY_PREFERENCES = [
  { code: 'vegetarian', label: 'Vegetarian' },
  { code: 'vegan', label: 'Vegan' },
  { code: 'eggetarian', label: 'Eggetarian' },
  { code: 'non_vegetarian', label: 'Non-Vegetarian' },
  { code: 'jain', label: 'Jain' },
];

export const PRODUCT_TYPES = [
  { code: 'food', label: 'Packaged Food' },
  { code: 'drink', label: 'Beverage / Drink' },
  { code: 'skincare', label: 'Skincare / Cosmetics' },
  { code: 'other', label: 'Other Product' },
];

export const RATINGS = {
  safe: {
    code: 'safe',
    severity: 1,
    label: 'Safe',
    description: 'Generally recognized as safe for regular consumption or topical use.',
  },
  adjustable: {
    code: 'adjustable',
    severity: 2,
    label: 'Adjustable',
    description: 'Consume in moderation. May require caution for specific age groups or conditions.',
  },
  risk: {
    code: 'risk',
    severity: 3,
    label: 'Risk Flag',
    description: 'Contains health alert flags for allergens, contraindications, or severe limits.',
  },
};

export const VERDICTS = {
  good: {
    code: 'good',
    label: 'Good For You',
    scoreRange: [75, 100],
    subtext: 'Clean formulation with predominantly safe and beneficial ingredients.',
  },
  okay: {
    code: 'okay',
    label: 'Okay In Limits',
    scoreRange: [50, 74],
    subtext: 'Generally acceptable, but observe serving caps and moderation.',
  },
  avoid: {
    code: 'avoid',
    label: 'Better Avoided',
    scoreRange: [0, 49],
    subtext: 'Contains ingredients with heightened risk or conflict with your health profile.',
  },
};

