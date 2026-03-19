/**
 * Nutrition Guideline Seed Data — Evidence-based dietary guidelines for RAG
 *
 * These are retrieved by guidelineService.search() when a user asks for a
 * diet plan. The RAG middleware injects them alongside patient records so
 * the diet planner agent has condition-specific nutrition SOPs.
 *
 * Seed with: npx tsx scripts/seed/seed-guidelines.ts
 * (or add to the existing guideline seeding flow)
 */

export const NUTRITION_GUIDELINES = [
  {
    id: "nutrition-ada-mnt-diabetes",
    category: "Nutrition",
    condition: "Diabetes — Medical Nutrition Therapy",
    icd10: ["E11", "E11.0", "E11.6", "E11.9", "E10"],
    keywords: [
      "diabetes",
      "diet plan",
      "meal plan",
      "nutrition",
      "MNT",
      "medical nutrition therapy",
      "HbA1c",
      "glycemic",
      "carbohydrate",
      "insulin",
      "blood sugar",
      "diabetic diet",
    ],
    content: `**Diabetes — Medical Nutrition Therapy (MNT)** — ADA Standards of Care 2024-2026:
- Individualise macronutrient distribution based on eating patterns, preferences, and metabolic goals
- Carbohydrates: 45–60% of total energy; choose low-GI (≤55) sources; distribute evenly across meals
- Protein: 15–20% of energy (≥0.8 g/kg/day); higher (1.0–1.2 g/kg) if CKD stage 1-2
- Fat: 20–35% total energy; saturated fat <6%; eliminate trans fat; favour MUFA/PUFA
- Fiber: ≥14 g per 1000 kcal (minimum 25 g/day); soluble fiber aids glycemic control
- Sodium: <2300 mg/day; reduce to ≤1500 mg in hypertensive diabetics
- Meal timing: consistent carb distribution; avoid skipping meals; consider smaller frequent meals
- Monitoring: HbA1c target <7% (individualise); SMBG before and 2h after meals
- Regional note: use locally available low-GI staples (millets, legumes, whole grains)`,
    source: "ADA Standards of Medical Care 2024-2026",
  },
  {
    id: "nutrition-icmr-indian-dietary",
    category: "Nutrition",
    condition: "Indian Population — Dietary Guidelines",
    icd10: [],
    keywords: [
      "indian diet",
      "ICMR",
      "India",
      "South Asian",
      "roti",
      "dal",
      "rice",
      "millets",
      "vegetarian",
      "ragi",
      "bajra",
      "pulses",
      "Indian food",
      "desi diet",
    ],
    content: `**Indian Population — Dietary Guidelines** — ICMR-NIN 2024:
- Energy: balanced intake based on BMR × activity factor; Indians have higher body fat % at same BMI
- Cereals & millets: 45–65% of total energy; include ragi (finger millet), bajra (pearl millet), jowar (sorghum)
- Pulses & legumes: cereal:pulse ratio of 8:1 for protein complementation; include dal, rajma, chana daily
- Visible fat: ≤20 g/day for sedentary adults; use combination of oils (mustard + groundnut or sesame)
- Milk & dairy: 300 ml/day minimum; paneer, curd (yogurt) for calcium and probiotics
- Fruits & vegetables: ≥400–500 g/day; include green leafy vegetables (palak, methi) for iron
- Calcium: 600-800 mg/day; sources: ragi, sesame seeds, milk, curd
- Iron: pair vitamin C-rich foods (amla, lemon) with iron-rich meals; avoid tea/coffee with meals
- Special populations: pregnant women need extra 350 kcal/day in 2nd/3rd trimester; lactating +600 kcal
- Cooking: prefer steaming, roasting, pressure cooking; minimise deep frying
- Cultural: accommodate fasting days (Ekadashi, Navratri) with appropriate substitutions`,
    source: "ICMR-NIN Dietary Guidelines for Indians 2024",
  },
  {
    id: "nutrition-nice-weight-management",
    category: "Nutrition",
    condition: "Obesity & Weight Management",
    icd10: ["E66", "E66.0", "E66.1", "E66.9", "Z68.3", "Z68.4"],
    keywords: [
      "weight loss",
      "obesity",
      "diet",
      "calorie deficit",
      "BMI",
      "overweight",
      "weight management",
      "fat loss",
      "slimming",
      "reduce weight",
    ],
    content: `**Obesity & Weight Management** — NICE CG189 (2024):
- Caloric deficit: 600 kcal/day below estimated requirements for sustainable weight loss
- Target: 0.5–1.0 kg/week weight loss; ≥5% body weight loss in 3–6 months
- Do NOT recommend <800 kcal/day diets unless medically supervised
- Macros for weight loss: protein 25–30% (preserves lean mass); fat ≤30%; carbs remainder
- Meal pattern: regular meals (do not skip breakfast); avoid grazing; mindful eating
- Behavioral: food diary, portion-size awareness, stimulus control
- Physical activity: ≥150 min/week moderate exercise alongside diet
- Maintenance: long-term plan needed; weight regain common without sustained behavior changes
- Regional adaptation: use the patient's culturally familiar foods; restrictive foreign diets reduce adherence
- Contraindicated: uncontrolled thyroid, eating disorders — refer to specialist first`,
    source: "NICE Clinical Guideline CG189 — Weight Management 2024",
  },
  {
    id: "nutrition-aha-dash-cardiovascular",
    category: "Nutrition",
    condition: "Cardiovascular Disease — DASH Diet",
    icd10: ["I10", "I11", "I25", "I50", "E78"],
    keywords: [
      "DASH",
      "heart healthy",
      "cardiovascular",
      "hypertension diet",
      "cholesterol",
      "blood pressure diet",
      "heart disease",
      "sodium",
      "potassium",
      "dyslipidemia",
    ],
    content: `**Cardiovascular Nutrition — DASH Protocol** — AHA 2024:
- Sodium: ≤2300 mg/day (≤1500 mg if hypertensive); avoid processed foods, pickles, canned items
- Potassium: 3500–5000 mg/day from whole foods (banana, potato, spinach, beans, avocado)
- Saturated fat: ≤6% total calories; avoid red meat, full-fat dairy, coconut oil in excess
- DASH pattern: 4-5 servings vegetables, 4-5 servings fruits, 2-3 servings low-fat dairy, 6-8 servings grains (mostly whole)
- Fish: ≥2 servings/week of omega-3 rich fish (salmon, mackerel, sardines)
- Nuts & seeds: 4-5 servings/week (unsalted almonds, walnuts, flaxseed)
- Added sugars: <6% total energy; avoid sugar-sweetened beverages
- Alcohol: limit to ≤1 drink/day women, ≤2 drinks/day men, or abstain
- Mediterranean pattern: also evidence-grade A for CVD prevention
- Regional adaptation: adapt DASH principles to local cuisine — e.g. Indian DASH uses dal, brown rice, raita`,
    source: "AHA Dietary Guidelines 2024 / DASH Protocol",
  },
  {
    id: "nutrition-who-healthy-diet",
    category: "Nutrition",
    condition: "General Population — Healthy Diet",
    icd10: [],
    keywords: [
      "healthy diet",
      "balanced diet",
      "nutrition",
      "general health",
      "WHO",
      "wellness",
      "healthy eating",
      "meal plan",
      "food pyramid",
      "dietary guidelines",
    ],
    content: `**General Population — Healthy Diet** — WHO 2024:
- Fruits & vegetables: ≥400 g/day (5+ servings); variety of colours for micronutrient diversity
- Whole grains: at least 50% of grain intake should be whole grains
- Free sugars: <10% total energy intake (ideally <5% = ~25 g/day)
- Fat: 15–30% total energy; shift from saturated to unsaturated fats
- Industrially produced trans fats: <1% total energy (avoid completely)
- Salt: <5 g/day (about 1 teaspoon); use herbs and spices for flavour instead
- Water: 2–3 L/day (adjust for climate, activity, medical conditions)
- Meal frequency: 3 main meals + 1-2 snacks; avoid prolonged fasting unless medically indicated
- Food safety: wash produce, cook meats thoroughly, proper storage
- Sustainable diet: prefer locally grown, seasonal foods; this also reduces cost and improves freshness`,
    source: "WHO Healthy Diet Fact Sheet 2024",
  },
  {
    id: "nutrition-ckd-renal-diet",
    category: "Nutrition",
    condition: "Chronic Kidney Disease — Renal Diet",
    icd10: ["N18", "N18.1", "N18.2", "N18.3", "N18.4", "N18.5"],
    keywords: [
      "kidney disease",
      "CKD",
      "renal diet",
      "dialysis",
      "creatinine",
      "GFR",
      "potassium restriction",
      "phosphorus",
      "protein restriction",
      "nephrology",
    ],
    content: `**CKD — Renal Nutrition** — KDOQI/KDIGO 2024:
- Protein: 0.6–0.8 g/kg/day for CKD 3-5 (not on dialysis); ≥1.0-1.2 g/kg for dialysis patients
- Sodium: <2000 mg/day to manage fluid balance and hypertension
- Potassium: individualise based on serum levels; restrict if >5.5 mEq/L
- Phosphorus: 800–1000 mg/day; avoid processed foods with phosphate additives
- Fluid: restrict if eGFR <15 or on dialysis; typically 1–1.5 L/day + urine output
- Energy: 25–35 kcal/kg/day; adequate energy prevents protein catabolism
- Calcium: ≤800 mg/day from diet; avoid calcium supplements if phosphorus high
- Regional note: South Asian renal diet should limit high-potassium fruits (banana, coconut water), reduce dal portions
- Key: work with nephrologist for individualised targets based on labs`,
    source: "KDOQI/KDIGO Clinical Practice Guidelines 2024",
  },
];
