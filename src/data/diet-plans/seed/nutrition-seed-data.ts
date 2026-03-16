/**
 * Nutrition Seed Data — Regional Cuisines & USDA Foods
 *
 * Sample data for developing the professional diet planner.
 * In production, integrate with USDA FoodData Central API for real data.
 */

export const REGIONAL_CUISINES = [
  {
    id: "south-asian-diabetic",
    name: "South Asian Diabetes-Friendly Cuisine",
    region: "South Asian",
    cuisine: "Indian",
    condition: "diabetes",
    typicalIngredients: [
      "basmati rice",
      "whole wheat",
      "lentils",
      "chickpeas",
      "paneer",
      "yogurt",
      "turmeric",
      "cumin",
      "coriander",
      "spinach",
      "cauliflower",
      "tomatoes",
      "onions",
      "garlic",
      "ginger",
    ],
    cookingMethods: [
      "Tandoori (grilled)",
      "Steamed",
      "Stir-fried with minimal oil",
      "Boiled (dal)",
      "Baked",
    ],
    staples: {
      grains: [
        "Brown rice",
        "Whole wheat roti",
        "Quinoa",
        "Millets (ragi, bajra)",
      ],
      proteins: [
        "Lentils (masoor, moong, toor dal)",
        "Chickpeas",
        "Paneer (cottage cheese)",
        "Grilled chicken",
        "Fish (pomfret, salmon)",
      ],
      vegetables: [
        "Spinach (palak)",
        "Cauliflower (gobi)",
        "Broccoli",
        "Bitter gourd (karela)",
        "Okra (bhindi)",
        "Eggplant (baingan)",
      ],
      spices: [
        "Turmeric (haldi)",
        "Cumin (jeera)",
        "Coriander (dhania)",
        "Fenugreek (methi)",
        "Cinnamon (dalchini)",
        "Cardamom (elaichi)",
      ],
    },
    mealPatterns: {
      breakfast: [
        "Vegetable poha with peanuts",
        "Moong dal cheela (savory pancake)",
        "Oats upma",
        "Idli with sambar",
        "Whole wheat paratha with yogurt",
      ],
      lunch: [
        "Brown rice with dal and sabzi",
        "Roti with paneer curry and salad",
        "Quinoa pulao with raita",
        "Grilled chicken with quinoa and vegetables",
      ],
      dinner: [
        "Lentil soup with whole wheat roti",
        "Tandoori fish with roasted vegetables",
        "Palak paneer with brown rice",
        "Mixed vegetable curry with millets",
      ],
      snacks: [
        "Roasted chickpeas (chana)",
        "Fruit with nuts",
        "Cucumber raita",
        "Sprouts salad",
      ],
    },
    culturalNotes:
      "South Asian diabetic cuisine emphasizes low glycemic index foods, whole grains, and traditional spices like turmeric and fenugreek which aid glucose control. Avoid excessive ghee/oil. Use yogurt for probiotics. Traditional dal provides plant-based protein and fiber.",
  },
  {
    id: "mediterranean-weight-loss",
    name: "Mediterranean Weight Loss Cuisine",
    region: "Mediterranean",
    cuisine: "Greek/Italian",
    condition: "weight-loss",
    typicalIngredients: [
      "olive oil",
      "whole grains",
      "fish",
      "legumes",
      "tomatoes",
      "leafy greens",
      "nuts",
      "herbs",
      "feta cheese",
      "yogurt",
    ],
    cookingMethods: ["Grilled", "Baked", "Steamed", "Sautéed", "Raw (salads)"],
    staples: {
      grains: [
        "Whole wheat pasta",
        "Quinoa",
        "Bulgur",
        "Farro",
        "Whole grain bread",
      ],
      proteins: [
        "Salmon",
        "Sardines",
        "Sea bass",
        "Chicken breast",
        "Lentils",
        "Chickpeas",
        "Greek yogurt",
      ],
      vegetables: [
        "Tomatoes",
        "Spinach",
        "Kale",
        "Zucchini",
        "Eggplant",
        "Bell peppers",
        "Cucumber",
      ],
      spices: [
        "Oregano",
        "Basil",
        "Thyme",
        "Rosemary",
        "Garlic",
        "Lemon",
        "Black pepper",
      ],
    },
    mealPatterns: {
      breakfast: [
        "Greek yogurt with berries and nuts",
        "Whole grain toast with avocado",
        "Oatmeal with almonds",
        "Vegetable omelet",
      ],
      lunch: [
        "Greek salad with grilled chicken",
        "Quinoa bowl with roasted vegetables",
        "Lentil soup with whole grain bread",
        "Grilled fish with steamed greens",
      ],
      dinner: [
        "Baked salmon with zucchini",
        "Whole wheat pasta with tomato sauce",
        "Chickpea stew with spinach",
        "Grilled chicken with Greek salad",
      ],
      snacks: [
        "Hummus with cucumber slices",
        "Handful of almonds",
        "Fresh fruit",
        "Olives and feta",
      ],
    },
    culturalNotes:
      "Mediterranean diet emphasizes olive oil as primary fat, abundant vegetables, moderate fish/poultry, and minimal red meat. Rich in omega-3s and antioxidants. Associated with reduced cardiovascular risk and sustainable weight loss.",
  },
  {
    id: "east-asian-general",
    name: "East Asian Balanced Cuisine",
    region: "East Asian",
    cuisine: "Chinese/Japanese",
    condition: "general",
    typicalIngredients: [
      "rice",
      "noodles",
      "tofu",
      "soy sauce",
      "ginger",
      "garlic",
      "bok choy",
      "mushrooms",
      "sesame oil",
      "fish",
      "seaweed",
    ],
    cookingMethods: [
      "Stir-frying",
      "Steaming",
      "Braising",
      "Simmering",
      "Grilling (yakitori)",
    ],
    staples: {
      grains: ["Brown rice", "Soba noodles", "Udon", "Rice noodles", "Millet"],
      proteins: [
        "Tofu",
        "Edamame",
        "Fish (salmon, tuna, mackerel)",
        "Chicken",
        "Eggs",
        "Tempeh",
      ],
      vegetables: [
        "Bok choy",
        "Chinese cabbage",
        "Shiitake mushrooms",
        "Snow peas",
        "Bamboo shoots",
        "Seaweed (nori, wakame)",
      ],
      spices: [
        "Ginger",
        "Garlic",
        "Sesame seeds",
        "Scallions",
        "Star anise",
        "Five-spice powder",
      ],
    },
    mealPatterns: {
      breakfast: [
        "Miso soup with tofu",
        "Congee (rice porridge) with vegetables",
        "Steamed buns",
        "Green tea and rice balls",
      ],
      lunch: [
        "Stir-fried vegetables with tofu and brown rice",
        "Soba noodles with vegetables",
        "Bento box with fish and vegetables",
        "Fried rice with egg and vegetables",
      ],
      dinner: [
        "Steamed fish with bok choy",
        "Chicken teriyaki with rice",
        "Hot pot with vegetables and tofu",
        "Grilled salmon with miso glaze",
      ],
      snacks: ["Edamame", "Seaweed snacks", "Green tea", "Fresh fruit"],
    },
    culturalNotes:
      "East Asian cuisine emphasizes balance, minimal oil, fermented foods (miso, kimchi) for gut health, and green tea antioxidants. Portion control is cultural. Steaming preserves nutrients.",
  },
];

// ── Sample USDA Foods (subset for demonstration) ──────────────────────────────

export const USDA_FOODS_SAMPLE = [
  {
    fdcId: "168874",
    description: "Chicken breast, skinless, grilled",
    category: "Poultry",
    servingSize: 100,
    calories: 165,
    macros: {
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
    },
    nutrients: [
      { name: "Vitamin B6", amount: 0.5, unit: "mg", dailyValue: 29 },
      { name: "Niacin", amount: 10.4, unit: "mg", dailyValue: 65 },
      { name: "Selenium", amount: 27.6, unit: "µg", dailyValue: 50 },
    ],
    allergens: [],
    dietaryType: "non-veg" as const,
    regions: [
      "North American",
      "European",
      "South Asian",
      "Mediterranean",
      "Global",
    ],
  },
  {
    fdcId: "173754",
    description: "Brown rice, long-grain, cooked",
    category: "Grains",
    servingSize: 100,
    calories: 112,
    macros: {
      protein: 2.6,
      carbs: 23.5,
      fat: 0.9,
      fiber: 1.8,
    },
    nutrients: [
      { name: "Magnesium", amount: 43, unit: "mg", dailyValue: 10 },
      { name: "Phosphorus", amount: 83, unit: "mg", dailyValue: 8 },
      { name: "Manganese", amount: 1.1, unit: "mg", dailyValue: 48 },
    ],
    allergens: [],
    dietaryType: "vegan" as const,
    regions: ["South Asian", "East Asian", "Global"],
  },
  {
    fdcId: "170148",
    description: "Spinach, raw",
    category: "Vegetables",
    servingSize: 100,
    calories: 23,
    macros: {
      protein: 2.9,
      carbs: 3.6,
      fat: 0.4,
      fiber: 2.2,
    },
    nutrients: [
      { name: "Vitamin K", amount: 482.9, unit: "µg", dailyValue: 402 },
      { name: "Vitamin A", amount: 469, unit: "µg", dailyValue: 52 },
      { name: "Iron", amount: 2.7, unit: "mg", dailyValue: 15 },
      { name: "Folate", amount: 194, unit: "µg", dailyValue: 49 },
    ],
    allergens: [],
    dietaryType: "vegan" as const,
    regions: ["Global"],
  },
  {
    fdcId: "175185",
    description: "Salmon, Atlantic, farmed, cooked",
    category: "Fish",
    servingSize: 100,
    calories: 206,
    macros: {
      protein: 22.1,
      carbs: 0,
      fat: 12.4,
      fiber: 0,
    },
    nutrients: [
      { name: "Omega-3", amount: 2.3, unit: "g" },
      { name: "Vitamin D", amount: 11, unit: "µg", dailyValue: 55 },
      { name: "Vitamin B12", amount: 3.2, unit: "µg", dailyValue: 133 },
    ],
    allergens: ["fish"],
    dietaryType: "non-veg" as const,
    regions: ["North American", "European", "Mediterranean", "Global"],
  },
  {
    fdcId: "172421",
    description: "Lentils, cooked, boiled",
    category: "Legumes",
    servingSize: 100,
    calories: 116,
    macros: {
      protein: 9,
      carbs: 20.1,
      fat: 0.4,
      fiber: 7.9,
    },
    nutrients: [
      { name: "Iron", amount: 3.3, unit: "mg", dailyValue: 18 },
      { name: "Folate", amount: 181, unit: "µg", dailyValue: 45 },
      { name: "Potassium", amount: 369, unit: "mg", dailyValue: 8 },
    ],
    allergens: [],
    dietaryType: "vegan" as const,
    regions: ["South Asian", "Mediterranean", "Global"],
  },
  {
    fdcId: "170379",
    description: "Greek yogurt, plain, nonfat",
    category: "Dairy",
    servingSize: 100,
    calories: 59,
    macros: {
      protein: 10.2,
      carbs: 3.6,
      fat: 0.4,
      fiber: 0,
    },
    nutrients: [
      { name: "Calcium", amount: 110, unit: "mg", dailyValue: 8 },
      { name: "Vitamin B12", amount: 0.8, unit: "µg", dailyValue: 33 },
      { name: "Probiotics", amount: 1, unit: "billion CFU" },
    ],
    allergens: ["dairy"],
    dietaryType: "veg" as const,
    regions: ["Mediterranean", "European", "Global"],
  },
  {
    fdcId: "170058",
    description: "Quinoa, cooked",
    category: "Grains",
    servingSize: 100,
    calories: 120,
    macros: {
      protein: 4.4,
      carbs: 21.3,
      fat: 1.9,
      fiber: 2.8,
    },
    nutrients: [
      { name: "Magnesium", amount: 64, unit: "mg", dailyValue: 15 },
      { name: "Iron", amount: 1.5, unit: "mg", dailyValue: 8 },
      { name: "Complete protein", amount: 1, unit: "note" },
    ],
    allergens: [],
    dietaryType: "vegan" as const,
    regions: ["South American", "Global"],
  },
  {
    fdcId: "170276",
    description: "Tofu, firm, prepared with calcium sulfate",
    category: "Protein",
    servingSize: 100,
    calories: 144,
    macros: {
      protein: 17.3,
      carbs: 2.8,
      fat: 8.7,
      fiber: 0.3,
    },
    nutrients: [
      { name: "Calcium", amount: 350, unit: "mg", dailyValue: 27 },
      { name: "Iron", amount: 2.7, unit: "mg", dailyValue: 15 },
      { name: "Magnesium", amount: 58, unit: "mg", dailyValue: 14 },
    ],
    allergens: ["soy"],
    dietaryType: "vegan" as const,
    regions: ["East Asian", "Global"],
  },
  {
    fdcId: "171705",
    description: "Paneer (Indian cottage cheese)",
    category: "Dairy",
    servingSize: 100,
    calories: 265,
    macros: {
      protein: 18,
      carbs: 1.2,
      fat: 20.8,
      fiber: 0,
    },
    nutrients: [
      { name: "Calcium", amount: 208, unit: "mg", dailyValue: 16 },
      { name: "Vitamin B12", amount: 0.3, unit: "µg", dailyValue: 13 },
    ],
    allergens: ["dairy"],
    dietaryType: "veg" as const,
    regions: ["South Asian"],
  },
  {
    fdcId: "169451",
    description: "Almonds, raw",
    category: "Nuts",
    servingSize: 28, // 1 oz
    calories: 164,
    macros: {
      protein: 6,
      carbs: 6.1,
      fat: 14.2,
      fiber: 3.5,
    },
    nutrients: [
      { name: "Vitamin E", amount: 7.3, unit: "mg", dailyValue: 49 },
      { name: "Magnesium", amount: 76, unit: "mg", dailyValue: 18 },
      { name: "Calcium", amount: 76, unit: "mg", dailyValue: 6 },
    ],
    allergens: ["tree nuts"],
    dietaryType: "vegan" as const,
    regions: ["Global"],
  },
];

/**
 * Seed script to populate Firestore with nutrition data
 * Run: npx tsx src/data/diet-plans/seed/seed-nutrition.ts
 */
export async function seedNutritionData() {
  console.log("[SeedNutrition] Starting...");

  // Note: This is a placeholder. In production:
  // 1. Import firebase-admin and db
  // 2. Generate embeddings for each item using embed() from 'ai'
  // 3. Store in Firestore with VectorValue type
  // 4. Ensure vector indexes are created (see firestore.indexes.json)

  console.log(
    `[SeedNutrition] Would seed ${REGIONAL_CUISINES.length} cuisine protocols`,
  );
  console.log(
    `[SeedNutrition] Would seed ${USDA_FOODS_SAMPLE.length} food items`,
  );
  console.log(
    "[SeedNutrition] Complete. Run actual seed script in production.",
  );
}

if (require.main === module) {
  seedNutritionData().catch(console.error);
}
