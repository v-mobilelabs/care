/**
 * Knowledge Base Seed Data — Migrated from guidelines module
 *
 * Clinical guidelines (urological, cardiovascular, endocrine, etc.) and
 * nutrition guidelines converted to KB entry format with type: "guideline".
 *
 * Seed with: pnpm seed:kb
 */

import type { KBEntryType } from "../models/knowledge-base.model";

export interface KBSeedEntry {
  id: string;
  title: string;
  type: KBEntryType;
  category: string;
  subcategory?: string;
  content: string;
  tags: string[];
  source: string;
}

// ── Clinical Guidelines (migrated from guideline-seed-data.ts) ────────────────

const CLINICAL_GUIDELINES: KBSeedEntry[] = [
  {
    id: "urological-urethral-stricture",
    title: "Urethral Stricture",
    type: "guideline",
    category: "Urological",
    content: `**Urethral Stricture (N35.x)** — EAU/AUA Guidelines:
Ask IPSS score (0-35), post-void residual symptoms, UTI history, haematuria, prior catheterisation, trauma or STI history.
Investigations: Uroflowmetry, RUG (Retrograde Urethrogram), USS post-void residual.
Refer Urology urgently if IPSS >19 or retention.`,
    tags: [
      "N35.0",
      "N35.1",
      "N35.8",
      "N35.9",
      "urethral stricture",
      "urethral narrowing",
      "LUTS",
      "weak stream",
      "urinary retention",
      "dysuria",
      "uroflowmetry",
      "RUG",
      "retrograde urethrogram",
    ],
    source: "EAU/AUA Guidelines",
  },
  {
    id: "urological-bph",
    title: "Benign Prostatic Hyperplasia (BPH)",
    type: "guideline",
    category: "Urological",
    content: `**BPH / LUTS (N40.x)** — EAU/AUA Guidelines:
Use IPSS (International Prostate Symptom Score), quality of life score, PSA if >45 years.
Investigations: PSA, USS KUB (Kidney, Ureter, Bladder), uroflowmetry.`,
    tags: [
      "N40.0",
      "N40.1",
      "N40.2",
      "N40.3",
      "BPH",
      "benign prostatic hyperplasia",
      "LUTS",
      "prostate",
      "nocturia",
      "hesitancy",
      "weak stream",
      "IPSS",
      "PSA",
      "uroflowmetry",
    ],
    source: "EAU/AUA Guidelines",
  },
  {
    id: "urological-uti",
    title: "Urinary Tract Infection (UTI)",
    type: "guideline",
    category: "Urological",
    content: `**UTI (N39.0)** — EAU/NICE Guidelines:
Ask about dysuria, frequency, urgency, fever, flank pain, risk factors (pregnancy, diabetes, immunosuppression).
Investigations: Urinalysis + MSU (Mid-Stream Urine) culture.`,
    tags: [
      "N39.0",
      "UTI",
      "urinary tract infection",
      "dysuria",
      "frequency",
      "urgency",
      "suprapubic pain",
      "haematuria",
      "fever",
      "flank pain",
      "pyelonephritis",
    ],
    source: "EAU/NICE Guidelines",
  },
  {
    id: "cardiovascular-hypertension",
    title: "Hypertension",
    type: "guideline",
    category: "Cardiovascular",
    content: `**Hypertension (I10)** — AHA/ACC Guidelines:
Record BP readings (multiple measurements), duration, current antihypertensives, end-organ symptoms (headache, chest pain, visual changes).
Investigations: ECG, renal function (eGFR, creatinine), lipid panel.`,
    tags: [
      "I10",
      "I11",
      "I12",
      "I13",
      "I15",
      "hypertension",
      "high blood pressure",
      "BP",
      "systolic",
      "diastolic",
      "antihypertensive",
      "ACE inhibitor",
      "beta blocker",
      "diuretic",
      "end-organ damage",
    ],
    source: "AHA/ACC Guidelines",
  },
  {
    id: "cardiovascular-acs-chest-pain",
    title: "Acute Coronary Syndrome / Chest Pain",
    type: "guideline",
    category: "Cardiovascular",
    content: `**ACS / Chest Pain (I20-I25)** — AHA/ACC Guidelines:
Use HEART score (History, ECG, Age, Risk factors, Troponin). Ask about onset, radiation, diaphoresis, risk factors (smoking, diabetes, family history).
Flag as emergency if HEART score ≥4.
Investigations: ECG, troponin, CXR.`,
    tags: [
      "I20",
      "I21",
      "I22",
      "I24",
      "I25",
      "chest pain",
      "ACS",
      "acute coronary syndrome",
      "MI",
      "myocardial infarction",
      "angina",
      "troponin",
      "ECG",
      "HEART score",
      "STEMI",
      "NSTEMI",
    ],
    source: "AHA/ACC Guidelines",
  },
  {
    id: "cardiovascular-heart-failure",
    title: "Heart Failure",
    type: "guideline",
    category: "Cardiovascular",
    content: `**Heart Failure (I50)** — AHA/ACC Guidelines:
Ask NYHA class (I-IV), orthopnea (number of pillows), paroxysmal nocturnal dyspnoea, ankle oedema, current medications (ACE-i, beta blocker, diuretic).
Investigations: BNP/NT-proBNP, echocardiogram, CXR.`,
    tags: [
      "I50",
      "I50.1",
      "I50.9",
      "heart failure",
      "HF",
      "CHF",
      "congestive heart failure",
      "dyspnoea",
      "orthopnea",
      "ankle oedema",
      "NYHA",
      "BNP",
      "NT-proBNP",
      "echo",
    ],
    source: "AHA/ACC Guidelines",
  },
  {
    id: "endocrine-type-2-diabetes",
    title: "Type 2 Diabetes Mellitus",
    type: "guideline",
    category: "Endocrine",
    content: `**Type 2 Diabetes (E11)** — ADA Guidelines:
Ask about HbA1c, fasting glucose, duration, microvascular complications (retinopathy, neuropathy, nephropathy), macrovascular complications (CVD, stroke), current medications (metformin, SGLT2-i, GLP-1 RA, insulin).
Investigations: HbA1c, eGFR, urine ACR (albumin-creatinine ratio), lipid panel, annual retinal screening.`,
    tags: [
      "E11",
      "E11.9",
      "diabetes",
      "type 2 diabetes",
      "T2DM",
      "HbA1c",
      "fasting glucose",
      "metformin",
      "insulin",
      "retinopathy",
      "neuropathy",
      "nephropathy",
      "diabetic complications",
    ],
    source: "ADA Guidelines",
  },
  {
    id: "endocrine-hypothyroidism",
    title: "Hypothyroidism",
    type: "guideline",
    category: "Endocrine",
    content: `**Hypothyroidism (E03)** — ATA Guidelines:
Ask about fatigue, weight gain, cold intolerance, constipation, dry skin, hair loss, menstrual irregularities, TSH history, current levothyroxine dose.
Investigations: TSH, Free T4.`,
    tags: [
      "E03",
      "E03.9",
      "hypothyroidism",
      "underactive thyroid",
      "TSH",
      "T4",
      "T3",
      "levothyroxine",
      "fatigue",
      "weight gain",
      "cold intolerance",
      "constipation",
    ],
    source: "ATA Guidelines",
  },
  {
    id: "respiratory-copd",
    title: "Chronic Obstructive Pulmonary Disease (COPD)",
    type: "guideline",
    category: "Respiratory",
    content: `**COPD (J44)** — GOLD Guidelines:
Ask about spirometry results (FEV1/FVC ratio), pack-year history, exacerbation frequency (number per year), current inhalers (LABA, LAMA, ICS), breathlessness (MRC Dyspnoea Scale).
Investigations: Spirometry (post-bronchodilator FEV1/FVC <0.7), CXR, ABG if severe.`,
    tags: [
      "J44",
      "J44.0",
      "J44.1",
      "J44.9",
      "COPD",
      "chronic obstructive pulmonary disease",
      "emphysema",
      "chronic bronchitis",
      "smoking",
      "dyspnoea",
      "cough",
      "sputum",
      "exacerbation",
      "spirometry",
      "FEV1",
    ],
    source: "GOLD Guidelines",
  },
  {
    id: "respiratory-asthma",
    title: "Asthma",
    type: "guideline",
    category: "Respiratory",
    content: `**Asthma (J45)** — GINA Guidelines:
Ask about symptom frequency (daytime and nocturnal), triggers (allergens, cold air, exercise), SABA use per week, current controller therapy (ICS +/- LABA), step level (GINA Steps 1-5).
Investigations: Spirometry with reversibility testing, peak expiratory flow (PEF), FeNO if available.`,
    tags: [
      "J45",
      "J45.0",
      "J45.9",
      "asthma",
      "wheeze",
      "breathlessness",
      "chest tightness",
      "nocturnal cough",
      "triggers",
      "SABA",
      "ICS",
      "LABA",
      "spirometry",
      "peak flow",
    ],
    source: "GINA Guidelines",
  },
  {
    id: "neurological-migraine",
    title: "Migraine",
    type: "guideline",
    category: "Neurological",
    content: `**Migraine (G43)** — ICHD-3 / AAN Guidelines:
Ask about headache frequency (days per month), duration (4-72 hours), aura (visual, sensory, speech), associated symptoms (nausea, photophobia, phonophobia), current prophylaxis, analgesic overuse.
Investigations: MRI Brain if red flags (sudden onset, focal neurological deficit, papilloedema).`,
    tags: [
      "G43",
      "G43.0",
      "G43.1",
      "G43.9",
      "migraine",
      "headache",
      "aura",
      "photophobia",
      "phonophobia",
      "nausea",
      "vomiting",
      "ICHD-3",
      "triptan",
      "prophylaxis",
    ],
    source: "ICHD-3 / AAN Guidelines",
  },
  {
    id: "neurological-stroke-tia",
    title: "Stroke / Transient Ischaemic Attack (TIA)",
    type: "guideline",
    category: "Neurological",
    content: `**Stroke / TIA (I63/G45)** — AHA/ASA Guidelines:
Use FAST signs (Face drooping, Arm weakness, Speech difficulty, Time). Ask about onset time (critical for thrombolysis window), BP, atrial fibrillation, anticoagulation.
IMMEDIATE emergency escalation. Call bookAppointment urgency "emergency" and recommendProvider "Emergency Medicine".
Investigations: CT brain (non-contrast), CT angiography, ECG, lipid panel, HbA1c.`,
    tags: [
      "I63",
      "G45",
      "stroke",
      "TIA",
      "transient ischaemic attack",
      "FAST",
      "facial droop",
      "arm weakness",
      "speech difficulty",
      "time",
      "thrombolysis",
      "CT brain",
    ],
    source: "AHA/ASA Guidelines",
  },
  {
    id: "musculoskeletal-osteoarthritis",
    title: "Osteoarthritis",
    type: "guideline",
    category: "Musculoskeletal",
    content: `**Osteoarthritis (M17 knee / M16 hip / M15 hands)** — NICE Guidelines:
Ask about pain duration, VAS score (0-10), morning stiffness (<30 min), mobility limitations, previous imaging, physiotherapy.
Investigations: X-ray of affected joint (joint space narrowing, osteophytes, subchondral sclerosis).`,
    tags: [
      "M15",
      "M16",
      "M17",
      "M19",
      "osteoarthritis",
      "OA",
      "joint pain",
      "stiffness",
      "knee pain",
      "hip pain",
      "hand pain",
      "crepitus",
      "X-ray",
      "NSAIDs",
    ],
    source: "NICE Guidelines",
  },
  {
    id: "musculoskeletal-back-pain",
    title: "Non-Specific Lower Back Pain",
    type: "guideline",
    category: "Musculoskeletal",
    content: `**Back Pain (M54)** — NICE Guidelines:
Ask about pain duration, VAS score, radiation to legs, neurological symptoms (numbness, weakness, saddle anaesthesia, bladder/bowel dysfunction), red flags (age >50, trauma, cancer history, immunosuppression).
Red flags → MRI lumbar spine urgently. Cauda equina symptoms → emergency referral.
Investigations: X-ray lumbar spine if chronic, MRI if red flags or radiculopathy.`,
    tags: [
      "M54",
      "M54.5",
      "back pain",
      "lower back pain",
      "lumbar pain",
      "sciatica",
      "radiculopathy",
      "red flags",
      "MRI",
      "cauda equina",
    ],
    source: "NICE Guidelines",
  },
  {
    id: "mental-health-depression",
    title: "Depression",
    type: "guideline",
    category: "Mental Health",
    content: `**Depression (F32)** — DSM-5 / NICE Guidelines:
Use PHQ-9 screening (0-27). Ask about duration, core symptoms (low mood, anhedonia), sleep, appetite, energy, concentration, self-worth, suicidality (direct screening: "Have you had thoughts of harming yourself or ending your life?").
Refer psychiatry if PHQ-9 ≥15 or active suicidality.
Treatment: PHQ-9 10-14 → psychotherapy (CBT) + consider SSRI. PHQ-9 ≥15 → SSRI + psychotherapy.`,
    tags: [
      "F32",
      "F33",
      "depression",
      "low mood",
      "anhedonia",
      "PHQ-9",
      "suicidality",
      "suicidal ideation",
      "self-harm",
      "SSRI",
      "antidepressant",
      "CBT",
    ],
    source: "DSM-5 / NICE Guidelines",
  },
  {
    id: "mental-health-anxiety",
    title: "Generalised Anxiety Disorder (GAD)",
    type: "guideline",
    category: "Mental Health",
    content: `**Anxiety / GAD (F41)** — DSM-5 / NICE Guidelines:
Use GAD-7 score (0-21). Ask about excessive worry duration (>6 months), triggers, panic attacks, physical symptoms (palpitations, sweating, trembling), impact on function.
Treatment: GAD-7 10-14 → psychotherapy (CBT) + relaxation techniques. GAD-7 ≥15 → SSRI (sertraline, escitalopram) + CBT.`,
    tags: [
      "F41",
      "F41.1",
      "anxiety",
      "GAD",
      "generalised anxiety disorder",
      "worry",
      "panic attack",
      "GAD-7",
      "SSRI",
      "CBT",
      "benzodiazepine",
    ],
    source: "DSM-5 / NICE Guidelines",
  },
  {
    id: "gastroenterology-gerd",
    title: "Gastroesophageal Reflux Disease (GERD)",
    type: "guideline",
    category: "Gastroenterology",
    content: `**GERD (K21)** — ACG Guidelines:
Ask about frequency (days per week), regurgitation, nocturnal symptoms, dysphagia, odynophagia, weight loss (alarm features).
Alarm features → upper GI endoscopy. Otherwise empiric PPI trial.
Treatment: PPI (omeprazole 20mg daily) for 8 weeks + lifestyle modifications.`,
    tags: [
      "K21",
      "K21.0",
      "K21.9",
      "GERD",
      "gastroesophageal reflux",
      "heartburn",
      "acid reflux",
      "regurgitation",
      "dysphagia",
      "PPI",
      "omeprazole",
      "endoscopy",
    ],
    source: "ACG Guidelines",
  },
  {
    id: "gastroenterology-ibs",
    title: "Irritable Bowel Syndrome (IBS)",
    type: "guideline",
    category: "Gastroenterology",
    content: `**IBS (K58)** — Rome IV / ACG Guidelines:
Use Rome IV criteria: recurrent abdominal pain ≥1 day/week in past 3 months, associated with ≥2 of: related to defecation, change in stool frequency, change in stool form.
Ask about stool pattern (IBS-D diarrhoea / IBS-C constipation / IBS-M mixed), bloating, blood PR (red flag), weight loss (red flag).
Red flags (blood PR, weight loss, age >50) → colonoscopy.
Treatment: dietary modifications (low FODMAPs), antispasmodics (mebeverine), loperamide for IBS-D.`,
    tags: [
      "K58",
      "K58.0",
      "K58.9",
      "IBS",
      "irritable bowel syndrome",
      "abdominal pain",
      "bloating",
      "diarrhoea",
      "constipation",
      "Rome IV",
      "FODMAPs",
    ],
    source: "Rome IV / ACG Guidelines",
  },
  {
    id: "dermatology-eczema",
    title: "Atopic Dermatitis / Eczema",
    type: "guideline",
    category: "Dermatology",
    content: `**Eczema / Atopic Dermatitis (L20)** — AAD / BAD Guidelines:
Ask about duration, distribution (flexural areas: antecubital fossa, popliteal fossa), triggers (soaps, fabrics, food, stress), family history (atopy), previous treatments (emollients, topical steroids).
Investigations: patch testing if contact dermatitis suspected.
Treatment: emollients (liberal use), topical corticosteroids (hydrocortisone 1% for mild, betamethasone for moderate), antihistamines for itch.
Refer Dermatology if refractory to treatment.`,
    tags: [
      "L20",
      "L20.9",
      "eczema",
      "atopic dermatitis",
      "itching",
      "pruritus",
      "dry skin",
      "flexural",
      "emollients",
      "topical steroids",
    ],
    source: "AAD / BAD Guidelines",
  },
  {
    id: "dermatology-psoriasis",
    title: "Psoriasis",
    type: "guideline",
    category: "Dermatology",
    content: `**Psoriasis (L40)** — AAD / BAD Guidelines:
Ask about distribution (scalp, elbows, knees, nails), severity (BSA % affected), joint involvement (psoriatic arthritis screening: joint pain, swelling, stiffness).
Investigations: skin biopsy if atypical.
Treatment: topical steroids + vitamin D analogue (calcipotriol), phototherapy for moderate-severe, biologics (anti-TNF, IL-17 inhibitors) for severe.
Refer Dermatology urgently if erythrodermic or pustular psoriasis.`,
    tags: [
      "L40",
      "L40.0",
      "L40.5",
      "psoriasis",
      "plaque psoriasis",
      "scalp psoriasis",
      "nail psoriasis",
      "psoriatic arthritis",
      "erythrodermic",
      "pustular",
      "topical steroids",
      "biologics",
    ],
    source: "AAD / BAD Guidelines",
  },
  {
    id: "dermatology-acne",
    title: "Acne Vulgaris",
    type: "guideline",
    category: "Dermatology",
    content: `**Acne (L70)** — AAD Guidelines:
Ask about grade (comedonal / papulopustular / nodular / cystic), location (face, chest, back), hormonal triggers (menstrual cycle), previous topicals, any oral medications that could worsen acne (steroids, lithium).
Treatment: mild (topical retinoids + benzoyl peroxide), moderate (add oral antibiotics: doxycycline), severe nodular/cystic → refer Dermatology for isotretinoin.
Refer Dermatology if nodular or scarring.`,
    tags: [
      "L70",
      "L70.0",
      "acne",
      "acne vulgaris",
      "comedones",
      "papules",
      "pustules",
      "nodules",
      "cystic",
      "topical retinoids",
      "benzoyl peroxide",
      "isotretinoin",
    ],
    source: "AAD Guidelines",
  },
  {
    id: "womens-health-pcos",
    title: "Polycystic Ovary Syndrome (PCOS)",
    type: "guideline",
    category: "Women's Health",
    content: `**PCOS (E28.2)** — ESHRE 2023 Guidelines:
Ask about menstrual regularity (cycle length and variation), hirsutism (mFG score), acne, weight, previous investigations (AMH, pelvic USS), family history of PCOS or T2DM.
Diagnosis: Rotterdam criteria — 2 of 3: oligo/anovulation, clinical/biochemical hyperandrogenism, polycystic ovaries on USS.
Investigations: LH/FSH ratio, total testosterone, DHEAS, fasting insulin + glucose (HOMA-IR), pelvic USS.
Treatment: lifestyle modifications (weight loss), metformin for insulin resistance, combined oral contraceptive for cycle regulation, anti-androgens (spironolactone) for hirsutism.`,
    tags: [
      "E28.2",
      "PCOS",
      "polycystic ovary syndrome",
      "irregular periods",
      "oligomenorrhoea",
      "amenorrhoea",
      "hirsutism",
      "acne",
      "infertility",
      "insulin resistance",
      "metformin",
    ],
    source: "ESHRE 2023 Guidelines",
  },
  {
    id: "womens-health-menstrual-irregularities",
    title: "Menstrual Irregularities",
    type: "guideline",
    category: "Women's Health",
    content: `**Menstrual Irregularities (N91–N94)** — NICE / ACOG Guidelines:
Ask about cycle length variation, bleeding volume (PBAC score), dysmenorrhoea (VAS 0–10), intermenstrual or post-coital bleeding, sexual activity, contraception, LMP.
Investigations: FBC (anaemia), TSH, prolactin, βhCG (pregnancy test), pelvic USS.
Red flag: postmenopausal bleeding → expedited gynaecology referral (exclude endometrial cancer).`,
    tags: [
      "N91",
      "N92",
      "N93",
      "N94",
      "irregular periods",
      "heavy periods",
      "menorrhagia",
      "amenorrhoea",
      "dysmenorrhoea",
      "intermenstrual bleeding",
      "postcoital bleeding",
      "PBAC",
    ],
    source: "NICE / ACOG Guidelines",
  },
  {
    id: "womens-health-menopause",
    title: "Menopause / Perimenopause",
    type: "guideline",
    category: "Women's Health",
    content: `**Menopause / Perimenopause (N95)** — NICE 2023 Guidelines:
Ask about LMP, vasomotor symptoms (hot flushes, night sweats: frequency and severity), sleep disruption, mood changes, genitourinary symptoms (vaginal dryness, dyspareunia), fracture risk (FRAX score).
Diagnosis: clinical (age >45 with typical symptoms). FSH + E2 if diagnosis uncertain (age <45).
Treatment: HRT (oestrogen + progesterone if uterus intact, oestrogen alone if post-hysterectomy). Discuss benefits (symptom relief, bone protection) and risks (VTE, breast cancer if prolonged use).`,
    tags: [
      "N95",
      "N95.1",
      "menopause",
      "perimenopause",
      "hot flushes",
      "night sweats",
      "vasomotor symptoms",
      "vaginal dryness",
      "dyspareunia",
      "HRT",
      "hormone replacement therapy",
    ],
    source: "NICE 2023 Guidelines",
  },
  {
    id: "paediatrics-fever-under-3-months",
    title: "Fever in Infant <3 Months",
    type: "guideline",
    category: "Paediatrics",
    content: `**Fever in Infant <3 Months** — NICE Feverish Child Guideline:
Temperature ≥38°C in under-3 months = EMERGENCY. High risk of serious bacterial infection (bacteraemia, meningitis, UTI).
Immediate escalation: call bookAppointment urgency "within 24 hours" + recommendProvider "Emergency Room" or "Paediatrics".
Investigations: FBC, CRP, blood cultures, urine culture, lumbar puncture if sepsis suspected.`,
    tags: [
      "R50.9",
      "fever",
      "infant",
      "neonate",
      "temperature",
      "bacteraemia",
      "sepsis",
      "NICE feverish child",
    ],
    source: "NICE Feverish Child Guideline",
  },
  {
    id: "paediatrics-asthma",
    title: "Paediatric Asthma",
    type: "guideline",
    category: "Paediatrics",
    content: `**Paediatric Asthma** — GINA Paediatric Track:
Ask about symptom frequency (daytime and nocturnal), nocturnal wakening, school absenteeism, reliever use per week, current controller therapy, exercise-induced symptoms.
Diagnosis: clinical (wheeze, breathlessness, chest tightness, cough). PEFR only if ≥5 years.
Treatment: Step 1 (as-needed SABA), Step 2 (low-dose ICS), Step 3 (ICS + LABA), Step 4 (medium-dose ICS + LABA).
Language note: address communication to the parent or carer, use plain non-alarming language.`,
    tags: [
      "J45",
      "paediatric asthma",
      "childhood asthma",
      "wheeze",
      "breathlessness",
      "cough",
      "GINA paediatric",
    ],
    source: "GINA Paediatric Guidelines",
  },
  {
    id: "dental-toothache",
    title: "Toothache / Dental Pain",
    type: "guideline",
    category: "Dental",
    content: `**Toothache / Dental Pain (K08.8)** — NICE / ADA Guidelines:
Ask about affected tooth or region, onset, character (sharp / throbbing / dull aching), thermal sensitivity (cold / heat / both), worsened by biting, facial swelling, previous dental work on the tooth.
Likely aetiologies: dental caries, reversible pulpitis, irreversible pulpitis, periapical abscess, cracked tooth syndrome.
Treatment: analgesia (ibuprofen + paracetamol), urgent dental referral.`,
    tags: [
      "K08.8",
      "toothache",
      "dental pain",
      "tooth pain",
      "caries",
      "pulpitis",
      "abscess",
      "cracked tooth",
    ],
    source: "NICE / ADA Dental Guidelines",
  },
  {
    id: "dental-abscess",
    title: "Periapical / Dental Abscess",
    type: "guideline",
    category: "Dental",
    content: `**Periapical / Dental Abscess (K04.7)** — NICE / ADA Guidelines:
Ask about facial swelling, trismus (limited mouth opening), fever, difficulty swallowing.
RED FLAG: If swelling extends to the floor of the mouth or neck, or difficulty breathing/swallowing → set riskLevel "emergency" (airway risk from Ludwig's angina) and direct immediately to Emergency Medicine.
Otherwise: urgent dental referral within 24 hours + antibiotics (amoxicillin or metronidazole) + analgesia.`,
    tags: [
      "K04.7",
      "dental abscess",
      "periapical abscess",
      "facial swelling",
      "trismus",
      "Ludwig's angina",
      "airway emergency",
    ],
    source: "NICE / ADA Guidelines",
  },
  {
    id: "dental-periodontal-disease",
    title: "Periodontal Disease / Gum Disease",
    type: "guideline",
    category: "Dental",
    content: `**Periodontal Disease / Gum Disease (K05)** — NICE / ADA Guidelines:
Ask about bleeding on brushing, gum recession, tooth mobility, persistent bad breath, smoking status and pack-year history.
Treatment: urgent dental review for periodontal charting, scaling and root planing, reinforce oral hygiene (twice-daily brushing, interdental cleaning).`,
    tags: [
      "K05",
      "gum disease",
      "periodontal disease",
      "bleeding gums",
      "gum recession",
      "tooth mobility",
      "periodontitis",
    ],
    source: "NICE / ADA Guidelines",
  },
];

// ── Nutrition Guidelines (migrated from nutrition-guideline-seed-data.ts) ─────

const NUTRITION_GUIDELINES: KBSeedEntry[] = [
  {
    id: "nutrition-ada-mnt-diabetes",
    title: "Diabetes — Medical Nutrition Therapy",
    type: "guideline",
    category: "Nutrition",
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
    tags: [
      "E11",
      "E11.0",
      "E11.6",
      "E11.9",
      "E10",
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
    source: "ADA Standards of Medical Care 2024-2026",
  },
  {
    id: "nutrition-icmr-indian-dietary",
    title: "Indian Population — Dietary Guidelines",
    type: "guideline",
    category: "Nutrition",
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
    tags: [
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
    source: "ICMR-NIN Dietary Guidelines for Indians 2024",
  },
  {
    id: "nutrition-nice-weight-management",
    title: "Obesity & Weight Management",
    type: "guideline",
    category: "Nutrition",
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
    tags: [
      "E66",
      "E66.0",
      "E66.1",
      "E66.9",
      "Z68.3",
      "Z68.4",
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
    source: "NICE Clinical Guideline CG189 — Weight Management 2024",
  },
  {
    id: "nutrition-aha-dash-cardiovascular",
    title: "Cardiovascular Disease — DASH Diet",
    type: "guideline",
    category: "Nutrition",
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
    tags: [
      "I10",
      "I11",
      "I25",
      "I50",
      "E78",
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
    source: "AHA Dietary Guidelines 2024 / DASH Protocol",
  },
  {
    id: "nutrition-who-healthy-diet",
    title: "General Population — Healthy Diet",
    type: "guideline",
    category: "Nutrition",
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
    tags: [
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
    source: "WHO Healthy Diet Fact Sheet 2024",
  },
  {
    id: "nutrition-ckd-renal-diet",
    title: "Chronic Kidney Disease — Renal Diet",
    type: "guideline",
    category: "Nutrition",
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
    tags: [
      "N18",
      "N18.1",
      "N18.2",
      "N18.3",
      "N18.4",
      "N18.5",
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
    source: "KDOQI/KDIGO Clinical Practice Guidelines 2024",
  },
];

// ── Combined export ───────────────────────────────────────────────────────────

export const KB_SEED_ENTRIES: KBSeedEntry[] = [
  ...CLINICAL_GUIDELINES,
  ...NUTRITION_GUIDELINES,
];
