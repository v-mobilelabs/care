/**
 * Specialist Configuration
 * Maps all 21 clinical agents to discoverable specialist metadata
 */

import type { AgentType } from "@/data/shared/service/agents/gateway/agent";

export type SpecialistId = AgentType;

export interface Specialist {
  readonly id: SpecialistId;
  readonly name: string;
  readonly icon: string; // Tabler icon name
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly exampleQuestions: readonly string[];
}

export const SPECIALISTS: readonly Specialist[] = [
  {
    id: "mentalHealth",
    name: "Mental Health Specialist",
    icon: "brain",
    description: "Emotional wellbeing, stress, anxiety, and therapy support",
    capabilities: [
      "Mood & anxiety assessment (PHQ-9, GAD-7)",
      "CBT techniques & coping strategies",
      "Crisis support & safety planning",
    ],
    exampleQuestions: [
      "I'm feeling anxious and overwhelmed",
      "Can you help me with depression?",
      "I need stress management techniques",
    ],
  },
  {
    id: "cardiology",
    name: "Cardiologist",
    icon: "heart",
    description: "Heart health, blood pressure, and cardiovascular conditions",
    capabilities: [
      "Heart condition diagnosis",
      "Blood pressure & hypertension management",
      "ECG & cardiac test interpretation",
    ],
    exampleQuestions: [
      "I have chest pain and irregular heartbeat",
      "Should I be worried about my blood pressure?",
      "What does my ECG show?",
    ],
  },
  {
    id: "neurology",
    name: "Neurologist",
    icon: "nerve",
    description: "Brain, nervous system, headaches, and neurological disorders",
    capabilities: [
      "Headache & migraine assessment",
      "Neurological symptom analysis",
      "Memory & cognitive concerns",
    ],
    exampleQuestions: [
      "I have recurring migraines",
      "What causes my dizziness?",
      "I'm experiencing numbness in my hands",
    ],
  },
  {
    id: "dermatology",
    name: "Dermatologist",
    icon: "circle-half-2",
    description: "Skin health, rashes, acne, and skin conditions",
    capabilities: [
      "Skin condition identification",
      "Acne & eczema management",
      "Mole & lesion assessment",
    ],
    exampleQuestions: [
      "I have a persistent rash",
      "How do I treat my eczema?",
      "Should I be concerned about this mole?",
    ],
  },
  {
    id: "womensHealth",
    name: "Women's Health Specialist",
    icon: "woman",
    description:
      "Pregnancy, menstrual health, menopause, and reproductive care",
    capabilities: [
      "Pregnancy & prenatal guidance",
      "Menstrual & menopause support",
      "Reproductive health counseling",
    ],
    exampleQuestions: [
      "I'm pregnant and have questions",
      "My periods are irregular",
      "What should I expect during menopause?",
    ],
  },
  {
    id: "orthopedics",
    name: "Orthopedic Specialist",
    icon: "bone",
    description: "Bones, joints, muscles, and mobility issues",
    capabilities: [
      "Fracture & injury assessment",
      "Joint & arthritis care",
      "Mobility & rehabilitation guidance",
    ],
    exampleQuestions: [
      "I think I have a broken bone",
      "My knee pain won't go away",
      "What can I do for my arthritis?",
    ],
  },
  {
    id: "gastroenterology",
    name: "Gastroenterologist",
    icon: "stomach",
    description: "Digestive health, stomach, and bowel disorders",
    capabilities: [
      "Digestive symptom analysis",
      "IBS & IBD management",
      "Acid reflux & GERD treatment",
    ],
    exampleQuestions: [
      "I have chronic acid reflux",
      "What's causing my diarrhea?",
      "Do I have IBS?",
    ],
  },
  {
    id: "endocrinology",
    name: "Endocrinologist",
    icon: "pills",
    description: "Diabetes, thyroid, hormones, and metabolic disorders",
    capabilities: [
      "Diabetes management & monitoring",
      "Thyroid disease diagnosis",
      "Hormone balance assessment",
    ],
    exampleQuestions: [
      "I have thyroid problems",
      "How do I manage my diabetes?",
      "My hormones seem imbalanced",
    ],
  },
  {
    id: "nephrology",
    name: "Nephrologist",
    icon: "droplets",
    description: "Kidney health, renal function, and urinary system",
    capabilities: [
      "Kidney disease assessment",
      "Renal function monitoring",
      "Dialysis & treatment options",
    ],
    exampleQuestions: [
      "I have a kidney stone",
      "What does my kidney function mean?",
      "Do I need dialysis?",
    ],
  },
  {
    id: "urology",
    name: "Urologist",
    icon: "urinary",
    description: "Urinary system health, bladder, and prostate concerns",
    capabilities: [
      "UTI & urinary symptom relief",
      "Prostate health assessment",
      "Bladder & incontinence care",
    ],
    exampleQuestions: [
      "I have a urinary tract infection",
      "Is my prostate healthy?",
      "Why am I having incontinence?",
    ],
  },
  {
    id: "pediatrics",
    name: "Pediatrician",
    icon: "baby-carriage",
    description: "Child health, development, and pediatric care",
    capabilities: [
      "Child symptom assessment",
      "Vaccination & immunization guidance",
      "Child development milestones",
    ],
    exampleQuestions: [
      "My baby has a fever",
      "Are my child's vaccines on track?",
      "Is my toddler developing normally?",
    ],
  },
  {
    id: "ophthalmology",
    name: "Ophthalmologist",
    icon: "eye",
    description: "Eye health, vision problems, and eye conditions",
    capabilities: [
      "Vision issue diagnosis",
      "Eye disease assessment",
      "Contact lens & eyeglass guidance",
    ],
    exampleQuestions: [
      "My vision is blurry",
      "Do I have glaucoma?",
      "Should I be concerned about cataracts?",
    ],
  },
  {
    id: "ent",
    name: "ENT Specialist",
    icon: "ear",
    description: "Ear, nose, throat, and sinus health",
    capabilities: [
      "Ear infection & hearing assessment",
      "Sinus & allergy management",
      "Throat symptom diagnosis",
    ],
    exampleQuestions: [
      "I have chronic ear infections",
      "What causes my sinus problems?",
      "Why is my throat sore?",
    ],
  },
  {
    id: "immunology",
    name: "Immunologist",
    icon: "shield",
    description: "Immune system, allergies, and autoimmune diseases",
    capabilities: [
      "Allergy assessment & management",
      "Autoimmune condition diagnosis",
      "Immune system optimization",
    ],
    exampleQuestions: [
      "I think I have allergies",
      "Do I have an autoimmune disease?",
      "How can I boost my immune system?",
    ],
  },
  {
    id: "dentistry",
    name: "Dentist",
    icon: "tooth",
    description: "Dental health, teeth, and oral care",
    capabilities: [
      "Dental pain & cavity assessment",
      "Gum disease & oral health",
      "Orthodontic & cosmetic guidance",
    ],
    exampleQuestions: [
      "I have a severe toothache",
      "Do I have a cavity?",
      "How do I improve my gum health?",
    ],
  },
  {
    id: "nutrition",
    name: "Nutritionist",
    icon: "apple",
    description: "Nutrition advice, supplements, and dietary guidance",
    capabilities: [
      "Personalized nutrition plans",
      "Supplement recommendations",
      "Macronutrient & micronutrient balance",
    ],
    exampleQuestions: [
      "What supplements should I take?",
      "How do I improve my diet?",
      "What's my daily calorie need?",
    ],
  },
  {
    id: "radiology",
    name: "Radiologist",
    icon: "device-imac",
    description: "Medical imaging interpretation and diagnostic imaging",
    capabilities: [
      "X-ray & CT scan analysis",
      "MRI & ultrasound interpretation",
      "Imaging-based diagnosis support",
    ],
    exampleQuestions: [
      "Can you interpret my X-ray?",
      "What does my CT scan show?",
      "I need an ultrasound analyzed",
    ],
  },
  {
    id: "dietPlanner",
    name: "Diet Planner",
    icon: "bowl",
    description: "7-day personalized meal plans and dietary planning",
    capabilities: [
      "7-day meal plan generation",
      "Calorie & nutrient calculation",
      "Dietary preference accommodation",
    ],
    exampleQuestions: [
      "Can you create a meal plan for me?",
      "I need a diabetic-friendly diet",
      "Help me plan meals for next week",
    ],
  },
  {
    id: "prescription",
    name: "Prescription Agent",
    icon: "prescription",
    description: "Medication management and prescription handling",
    capabilities: [
      "Medication prescription generation",
      "Drug interaction checking",
      "Medication refill coordination",
    ],
    exampleQuestions: [
      "I need a prescription for my condition",
      "Can you refill my medication?",
      "Is this safe with my other drugs?",
    ],
  },
  {
    id: "labReport",
    name: "Lab Analyst",
    icon: "flask",
    description: "Lab test interpretation and blood work analysis",
    capabilities: [
      "Blood test result interpretation",
      "Reference range explanation",
      "Lab abnormality assessment",
    ],
    exampleQuestions: [
      "Can you explain my blood test?",
      "Are my lab values normal?",
      "What do these biomarkers mean?",
    ],
  },
  {
    id: "patient",
    name: "Patient Profile",
    icon: "user-circle",
    description: "Access your health profile, medications, and medical history",
    capabilities: [
      "Profile & health information retrieval",
      "Medication list access",
      "Test history & records",
    ],
    exampleQuestions: [
      "What's my current medication list?",
      "Show me my health profile",
      "What tests have I had?",
    ],
  },
] as const;

export function getSpecialist(id: SpecialistId): Specialist | undefined {
  return SPECIALISTS.find((s) => s.id === id);
}

export function getAllSpecialists(): readonly Specialist[] {
  return SPECIALISTS;
}
