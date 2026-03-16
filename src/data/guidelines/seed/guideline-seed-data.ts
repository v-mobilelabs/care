/**
 * Guideline Seed Data
 *
 * Clinical guidelines extracted from the system prompt.
 * These will be embedded and stored in Firestore for RAG retrieval.
 */

export const GUIDELINES = [
  {
    id: "urological-urethral-stricture",
    category: "Urological",
    condition: "Urethral Stricture",
    icd10: ["N35.0", "N35.1", "N35.8", "N35.9"],
    keywords: [
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
    content: `**Urethral Stricture (N35.x)** — EAU/AUA Guidelines:
Ask IPSS score (0-35), post-void residual symptoms, UTI history, haematuria, prior catheterisation, trauma or STI history.
Investigations: Uroflowmetry, RUG (Retrograde Urethrogram), USS post-void residual.
Refer Urology urgently if IPSS >19 or retention.`,
    source: "EAU/AUA Guidelines",
  },
  {
    id: "urological-bph",
    category: "Urological",
    condition: "Benign Prostatic Hyperplasia (BPH)",
    icd10: ["N40.0", "N40.1", "N40.2", "N40.3"],
    keywords: [
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
    content: `**BPH / LUTS (N40.x)** — EAU/AUA Guidelines:
Use IPSS (International Prostate Symptom Score), quality of life score, PSA if >45 years.
Investigations: PSA, USS KUB (Kidney, Ureter, Bladder), uroflowmetry.`,
    source: "EAU/AUA Guidelines",
  },
  {
    id: "urological-uti",
    category: "Urological",
    condition: "Urinary Tract Infection (UTI)",
    icd10: ["N39.0"],
    keywords: [
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
    content: `**UTI (N39.0)** — EAU/NICE Guidelines:
Ask about dysuria, frequency, urgency, fever, flank pain, risk factors (pregnancy, diabetes, immunosuppression).
Investigations: Urinalysis + MSU (Mid-Stream Urine) culture.`,
    source: "EAU/NICE Guidelines",
  },
  {
    id: "cardiovascular-hypertension",
    category: "Cardiovascular",
    condition: "Hypertension",
    icd10: ["I10", "I11", "I12", "I13", "I15"],
    keywords: [
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
    content: `**Hypertension (I10)** — AHA/ACC Guidelines:
Record BP readings (multiple measurements), duration, current antihypertensives, end-organ symptoms (headache, chest pain, visual changes).
Investigations: ECG, renal function (eGFR, creatinine), lipid panel.`,
    source: "AHA/ACC Guidelines",
  },
  {
    id: "cardiovascular-acs-chest-pain",
    category: "Cardiovascular",
    condition: "Acute Coronary Syndrome / Chest Pain",
    icd10: ["I20", "I21", "I22", "I24", "I25"],
    keywords: [
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
    content: `**ACS / Chest Pain (I20-I25)** — AHA/ACC Guidelines:
Use HEART score (History, ECG, Age, Risk factors, Troponin). Ask about onset, radiation, diaphoresis, risk factors (smoking, diabetes, family history).
Flag as emergency if HEART score ≥4.
Investigations: ECG, troponin, CXR.`,
    source: "AHA/ACC Guidelines",
  },
  {
    id: "cardiovascular-heart-failure",
    category: "Cardiovascular",
    condition: "Heart Failure",
    icd10: ["I50", "I50.1", "I50.9"],
    keywords: [
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
    content: `**Heart Failure (I50)** — AHA/ACC Guidelines:
Ask NYHA class (I-IV), orthopnea (number of pillows), paroxysmal nocturnal dyspnoea, ankle oedema, current medications (ACE-i, beta blocker, diuretic).
Investigations: BNP/NT-proBNP, echocardiogram, CXR.`,
    source: "AHA/ACC Guidelines",
  },
  {
    id: "endocrine-type-2-diabetes",
    category: "Endocrine",
    condition: "Type 2 Diabetes Mellitus",
    icd10: ["E11", "E11.9"],
    keywords: [
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
    content: `**Type 2 Diabetes (E11)** — ADA Guidelines:
Ask about HbA1c, fasting glucose, duration, microvascular complications (retinopathy, neuropathy, nephropathy), macrovascular complications (CVD, stroke), current medications (metformin, SGLT2-i, GLP-1 RA, insulin).
Investigations: HbA1c, eGFR, urine ACR (albumin-creatinine ratio), lipid panel, annual retinal screening.`,
    source: "ADA Guidelines",
  },
  {
    id: "endocrine-hypothyroidism",
    category: "Endocrine",
    condition: "Hypothyroidism",
    icd10: ["E03", "E03.9"],
    keywords: [
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
    content: `**Hypothyroidism (E03)** — ATA Guidelines:
Ask about fatigue, weight gain, cold intolerance, constipation, dry skin, hair loss, menstrual irregularities, TSH history, current levothyroxine dose.
Investigations: TSH, Free T4.`,
    source: "ATA Guidelines",
  },
  {
    id: "respiratory-copd",
    category: "Respiratory",
    condition: "Chronic Obstructive Pulmonary Disease (COPD)",
    icd10: ["J44", "J44.0", "J44.1", "J44.9"],
    keywords: [
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
    content: `**COPD (J44)** — GOLD Guidelines:
Ask about spirometry results (FEV1/FVC ratio), pack-year history, exacerbation frequency (number per year), current inhalers (LABA, LAMA, ICS), breathlessness (MRC Dyspnoea Scale).
Investigations: Spirometry (post-bronchodilator FEV1/FVC <0.7), CXR, ABG if severe.`,
    source: "GOLD Guidelines",
  },
  {
    id: "respiratory-asthma",
    category: "Respiratory",
    condition: "Asthma",
    icd10: ["J45", "J45.0", "J45.9"],
    keywords: [
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
    content: `**Asthma (J45)** — GINA Guidelines:
Ask about symptom frequency (daytime and nocturnal), triggers (allergens, cold air, exercise), SABA use per week, current controller therapy (ICS +/- LABA), step level (GINA Steps 1-5).
Investigations: Spirometry with reversibility testing, peak expiratory flow (PEF), FeNO if available.`,
    source: "GINA Guidelines",
  },
  {
    id: "neurological-migraine",
    category: "Neurological",
    condition: "Migraine",
    icd10: ["G43", "G43.0", "G43.1", "G43.9"],
    keywords: [
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
    content: `**Migraine (G43)** — ICHD-3 / AAN Guidelines:
Ask about headache frequency (days per month), duration (4-72 hours), aura (visual, sensory, speech), associated symptoms (nausea, photophobia, phonophobia), current prophylaxis, analgesic overuse.
Investigations: MRI Brain if red flags (sudden onset, focal neurological deficit, papilloedema).`,
    source: "ICHD-3 / AAN Guidelines",
  },
  {
    id: "neurological-stroke-tia",
    category: "Neurological",
    condition: "Stroke / Transient Ischaemic Attack (TIA)",
    icd10: ["I63", "G45"],
    keywords: [
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
    content: `**Stroke / TIA (I63/G45)** — AHA/ASA Guidelines:
Use FAST signs (Face drooping, Arm weakness, Speech difficulty, Time). Ask about onset time (critical for thrombolysis window), BP, atrial fibrillation, anticoagulation.
IMMEDIATE emergency escalation. Call bookAppointment urgency "emergency" and recommendProvider "Emergency Medicine".
Investigations: CT brain (non-contrast), CT angiography, ECG, lipid panel, HbA1c.`,
    source: "AHA/ASA Guidelines",
  },
  {
    id: "musculoskeletal-osteoarthritis",
    category: "Musculoskeletal",
    condition: "Osteoarthritis",
    icd10: ["M15", "M16", "M17", "M19"],
    keywords: [
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
    content: `**Osteoarthritis (M17 knee / M16 hip / M15 hands)** — NICE Guidelines:
Ask about pain duration, VAS score (0-10), morning stiffness (<30 min), mobility limitations, previous imaging, physiotherapy.
Investigations: X-ray of affected joint (joint space narrowing, osteophytes, subchondral sclerosis).`,
    source: "NICE Guidelines",
  },
  {
    id: "musculoskeletal-back-pain",
    category: "Musculoskeletal",
    condition: "Non-Specific Lower Back Pain",
    icd10: ["M54", "M54.5"],
    keywords: [
      "back pain",
      "lower back pain",
      "lumbar pain",
      "sciatica",
      "radiculopathy",
      "red flags",
      "MRI",
      "cauda equina",
    ],
    content: `**Back Pain (M54)** — NICE Guidelines:
Ask about pain duration, VAS score, radiation to legs, neurological symptoms (numbness, weakness, saddle anaesthesia, bladder/bowel dysfunction), red flags (age >50, trauma, cancer history, immunosuppression).
Red flags → MRI lumbar spine urgently. Cauda equina symptoms → emergency referral.
Investigations: X-ray lumbar spine if chronic, MRI if red flags or radiculopathy.`,
    source: "NICE Guidelines",
  },
  {
    id: "mental-health-depression",
    category: "Mental Health",
    condition: "Depression",
    icd10: ["F32", "F33"],
    keywords: [
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
    content: `**Depression (F32)** — DSM-5 / NICE Guidelines:
Use PHQ-9 screening (0-27). Ask about duration, core symptoms (low mood, anhedonia), sleep, appetite, energy, concentration, self-worth, suicidality (direct screening: "Have you had thoughts of harming yourself or ending your life?").
Refer psychiatry if PHQ-9 ≥15 or active suicidality.
Treatment: PHQ-9 10-14 → psychotherapy (CBT) + consider SSRI. PHQ-9 ≥15 → SSRI + psychotherapy.`,
    source: "DSM-5 / NICE Guidelines",
  },
  {
    id: "mental-health-anxiety",
    category: "Mental Health",
    condition: "Generalised Anxiety Disorder (GAD)",
    icd10: ["F41", "F41.1"],
    keywords: [
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
    content: `**Anxiety / GAD (F41)** — DSM-5 / NICE Guidelines:
Use GAD-7 score (0-21). Ask about excessive worry duration (>6 months), triggers, panic attacks, physical symptoms (palpitations, sweating, trembling), impact on function.
Treatment: GAD-7 10-14 → psychotherapy (CBT) + relaxation techniques. GAD-7 ≥15 → SSRI (sertraline, escitalopram) + CBT.`,
    source: "DSM-5 / NICE Guidelines",
  },
  {
    id: "gastroenterology-gerd",
    category: "Gastroenterology",
    condition: "Gastroesophageal Reflux Disease (GERD)",
    icd10: ["K21", "K21.0", "K21.9"],
    keywords: [
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
    content: `**GERD (K21)** — ACG Guidelines:
Ask about frequency (days per week), regurgitation, nocturnal symptoms, dysphagia, odynophagia, weight loss (alarm features).
Alarm features → upper GI endoscopy. Otherwise empiric PPI trial.
Treatment: PPI (omeprazole 20mg daily) for 8 weeks + lifestyle modifications.`,
    source: "ACG Guidelines",
  },
  {
    id: "gastroenterology-ibs",
    category: "Gastroenterology",
    condition: "Irritable Bowel Syndrome (IBS)",
    icd10: ["K58", "K58.0", "K58.9"],
    keywords: [
      "IBS",
      "irritable bowel syndrome",
      "abdominal pain",
      "bloating",
      "diarrhoea",
      "constipation",
      "Rome IV",
      "FODMAPs",
    ],
    content: `**IBS (K58)** — Rome IV / ACG Guidelines:
Use Rome IV criteria: recurrent abdominal pain ≥1 day/week in past 3 months, associated with ≥2 of: related to defecation, change in stool frequency, change in stool form.
Ask about stool pattern (IBS-D diarrhoea / IBS-C constipation / IBS-M mixed), bloating, blood PR (red flag), weight loss (red flag).
Red flags (blood PR, weight loss, age >50) → colonoscopy.
Treatment: dietary modifications (low FODMAPs), antispasmodics (mebeverine), loperamide for IBS-D.`,
    source: "Rome IV / ACG Guidelines",
  },
  {
    id: "dermatology-eczema",
    category: "Dermatology",
    condition: "Atopic Dermatitis / Eczema",
    icd10: ["L20", "L20.9"],
    keywords: [
      "eczema",
      "atopic dermatitis",
      "itching",
      "pruritus",
      "dry skin",
      "flexural",
      "emollients",
      "topical steroids",
    ],
    content: `**Eczema / Atopic Dermatitis (L20)** — AAD / BAD Guidelines:
Ask about duration, distribution (flexural areas: antecubital fossa, popliteal fossa), triggers (soaps, fabrics, food, stress), family history (atopy), previous treatments (emollients, topical steroids).
Investigations: patch testing if contact dermatitis suspected.
Treatment: emollients (liberal use), topical corticosteroids (hydrocortisone 1% for mild, betamethasone for moderate), antihistamines for itch.
Refer Dermatology if refractory to treatment.`,
    source: "AAD / BAD Guidelines",
  },
  {
    id: "dermatology-psoriasis",
    category: "Dermatology",
    condition: "Psoriasis",
    icd10: ["L40", "L40.0", "L40.5"],
    keywords: [
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
    content: `**Psoriasis (L40)** — AAD / BAD Guidelines:
Ask about distribution (scalp, elbows, knees, nails), severity (BSA % affected), joint involvement (psoriatic arthritis screening: joint pain, swelling, stiffness).
Investigations: skin biopsy if atypical.
Treatment: topical steroids + vitamin D analogue (calcipotriol), phototherapy for moderate-severe, biologics (anti-TNF, IL-17 inhibitors) for severe.
Refer Dermatology urgently if erythrodermic or pustular psoriasis.`,
    source: "AAD / BAD Guidelines",
  },
  {
    id: "dermatology-acne",
    category: "Dermatology",
    condition: "Acne Vulgaris",
    icd10: ["L70", "L70.0"],
    keywords: [
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
    content: `**Acne (L70)** — AAD Guidelines:
Ask about grade (comedonal / papulopustular / nodular / cystic), location (face, chest, back), hormonal triggers (menstrual cycle), previous topicals, any oral medications that could worsen acne (steroids, lithium).
Treatment: mild (topical retinoids + benzoyl peroxide), moderate (add oral antibiotics: doxycycline), severe nodular/cystic → refer Dermatology for isotretinoin.
Refer Dermatology if nodular or scarring.`,
    source: "AAD Guidelines",
  },
  {
    id: "womens-health-pcos",
    category: "Women's Health",
    condition: "Polycystic Ovary Syndrome (PCOS)",
    icd10: ["E28.2"],
    keywords: [
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
    content: `**PCOS (E28.2)** — ESHRE 2023 Guidelines:
Ask about menstrual regularity (cycle length and variation), hirsutism (mFG score), acne, weight, previous investigations (AMH, pelvic USS), family history of PCOS or T2DM.
Diagnosis: Rotterdam criteria — 2 of 3: oligo/anovulation, clinical/biochemical hyperandrogenism, polycystic ovaries on USS.
Investigations: LH/FSH ratio, total testosterone, DHEAS, fasting insulin + glucose (HOMA-IR), pelvic USS.
Treatment: lifestyle modifications (weight loss), metformin for insulin resistance, combined oral contraceptive for cycle regulation, anti-androgens (spironolactone) for hirsutism.`,
    source: "ESHRE 2023 Guidelines",
  },
  {
    id: "womens-health-menstrual-irregularities",
    category: "Women's Health",
    condition: "Menstrual Irregularities",
    icd10: ["N91", "N92", "N93", "N94"],
    keywords: [
      "irregular periods",
      "heavy periods",
      "menorrhagia",
      "amenorrhoea",
      "dysmenorrhoea",
      "intermenstrual bleeding",
      "postcoital bleeding",
      "PBAC",
    ],
    content: `**Menstrual Irregularities (N91–N94)** — NICE / ACOG Guidelines:
Ask about cycle length variation, bleeding volume (PBAC score), dysmenorrhoea (VAS 0–10), intermenstrual or post-coital bleeding, sexual activity, contraception, LMP.
Investigations: FBC (anaemia), TSH, prolactin, βhCG (pregnancy test), pelvic USS.
Red flag: postmenopausal bleeding → expedited gynaecology referral (exclude endometrial cancer).`,
    source: "NICE / ACOG Guidelines",
  },
  {
    id: "womens-health-menopause",
    category: "Women's Health",
    condition: "Menopause / Perimenopause",
    icd10: ["N95", "N95.1"],
    keywords: [
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
    content: `**Menopause / Perimenopause (N95)** — NICE 2023 Guidelines:
Ask about LMP, vasomotor symptoms (hot flushes, night sweats: frequency and severity), sleep disruption, mood changes, genitourinary symptoms (vaginal dryness, dyspareunia), fracture risk (FRAX score).
Diagnosis: clinical (age >45 with typical symptoms). FSH + E2 if diagnosis uncertain (age <45).
Treatment: HRT (oestrogen + progesterone if uterus intact, oestrogen alone if post-hysterectomy). Discuss benefits (symptom relief, bone protection) and risks (VTE, breast cancer if prolonged use).`,
    source: "NICE 2023 Guidelines",
  },
  {
    id: "paediatrics-fever-under-3-months",
    category: "Paediatrics",
    condition: "Fever in Infant <3 Months",
    icd10: ["R50.9"],
    keywords: [
      "fever",
      "infant",
      "neonate",
      "temperature",
      "bacteraemia",
      "sepsis",
      "NICE feverish child",
    ],
    content: `**Fever in Infant <3 Months** — NICE Feverish Child Guideline:
Temperature ≥38°C in under-3 months = EMERGENCY. High risk of serious bacterial infection (bacteraemia, meningitis, UTI).
Immediate escalation: call bookAppointment urgency "within 24 hours" + recommendProvider "Emergency Room" or "Paediatrics".
Investigations: FBC, CRP, blood cultures, urine culture, lumbar puncture if sepsis suspected.`,
    source: "NICE Feverish Child Guideline",
  },
  {
    id: "paediatrics-asthma",
    category: "Paediatrics",
    condition: "Paediatric Asthma",
    icd10: ["J45"],
    keywords: [
      "paediatric asthma",
      "childhood asthma",
      "wheeze",
      "breathlessness",
      "cough",
      "GINA paediatric",
    ],
    content: `**Paediatric Asthma** — GINA Paediatric Track:
Ask about symptom frequency (daytime and nocturnal), nocturnal wakening, school absenteeism, reliever use per week, current controller therapy, exercise-induced symptoms.
Diagnosis: clinical (wheeze, breathlessness, chest tightness, cough). PEFR only if ≥5 years.
Treatment: Step 1 (as-needed SABA), Step 2 (low-dose ICS), Step 3 (ICS + LABA), Step 4 (medium-dose ICS + LABA).
Language note: address communication to the parent or carer, use plain non-alarming language.`,
    source: "GINA Paediatric Guidelines",
  },
  {
    id: "dental-toothache",
    category: "Dental",
    condition: "Toothache / Dental Pain",
    icd10: ["K08.8"],
    keywords: [
      "toothache",
      "dental pain",
      "tooth pain",
      "caries",
      "pulpitis",
      "abscess",
      "cracked tooth",
    ],
    content: `**Toothache / Dental Pain (K08.8)** — NICE / ADA Guidelines:
Ask about affected tooth or region, onset, character (sharp / throbbing / dull aching), thermal sensitivity (cold / heat / both), worsened by biting, facial swelling, previous dental work on the tooth.
Likely aetiologies: dental caries, reversible pulpitis, irreversible pulpitis, periapical abscess, cracked tooth syndrome.
Treatment: analgesia (ibuprofen + paracetamol), urgent dental referral.`,
    source: "NICE / ADA Dental Guidelines",
  },
  {
    id: "dental-abscess",
    category: "Dental",
    condition: "Periapical / Dental Abscess",
    icd10: ["K04.7"],
    keywords: [
      "dental abscess",
      "periapical abscess",
      "facial swelling",
      "trismus",
      "Ludwig's angina",
      "airway emergency",
    ],
    content: `**Periapical / Dental Abscess (K04.7)** — NICE / ADA Guidelines:
Ask about facial swelling, trismus (limited mouth opening), fever, difficulty swallowing.
RED FLAG: If swelling extends to the floor of the mouth or neck, or difficulty breathing/swallowing → set riskLevel "emergency" (airway risk from Ludwig's angina) and direct immediately to Emergency Medicine.
Otherwise: urgent dental referral within 24 hours + antibiotics (amoxicillin or metronidazole) + analgesia.`,
    source: "NICE / ADA Guidelines",
  },
  {
    id: "dental-periodontal-disease",
    category: "Dental",
    condition: "Periodontal Disease / Gum Disease",
    icd10: ["K05"],
    keywords: [
      "gum disease",
      "periodontal disease",
      "bleeding gums",
      "gum recession",
      "tooth mobility",
      "periodontitis",
    ],
    content: `**Periodontal Disease / Gum Disease (K05)** — NICE / ADA Guidelines:
Ask about bleeding on brushing, gum recession, tooth mobility, persistent bad breath, smoking status and pack-year history.
Treatment: urgent dental review for periodontal charting, scaling and root planing, reinforce oral hygiene (twice-daily brushing, interdental cleaning).`,
    source: "NICE / ADA Guidelines",
  },
] as const;
