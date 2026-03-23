"use client";
import { Box, Container, Divider, Stack, Text, Title } from "@mantine/core";
import { ActionCardCard } from "@/ui/ai/tools/action-card";
import { AssessmentPrefaceCard } from "@/ui/ai/tools/assessment-preface-card";
import { DietDayCard } from "@/ui/ai/tools/diet-day-card";
import { LabReportAnalysisCard } from "@/ui/ai/tools/lab-report-analysis-card";
import { PrescriptionCard } from "@/ui/ai/tools/prescription-card";
import { QuestionCard } from "@/ui/ai/tools/question-card";
import type { SubmitLabReportAnalysisInput } from "@/data/shared/service/agents/lab-report/tools/submit-lab-report-analysis.tool";
import type { SubmitPrescriptionInput } from "@/data/shared/service/agents/prescription/tools/submit-prescription.tool";
import type { EnhancedDietDay } from "@/data/diet-plans/models/nutrition.model";
import type { AskQuestionInput, StartAssessmentInput } from "@/ui/ai/types";
import type { ActionCardInput } from "@/data/shared/service/agents/base/tools/action-card.tool";

// ── Sample Data ───────────────────────────────────────────────────────────────

const SAMPLE_ACTION_CARD: ActionCardInput = {
    title: "Steps to help you right now",
    items: [
        "Take your prescribed Ibuprofen (400mg) with a meal to help calm the pain and inflammation.",
        "Keep sticking to your dairy-free, soft food diet so you don't put any extra pressure on that tooth or jaw.",
        "Please plan to see your dentist soon so they can take a proper look at your impacted tooth and see if it needs further care.",
    ],
    disclaimer: "\u2695\uFE0F This assessment is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.",
};

const SAMPLE_ASSESSMENT: StartAssessmentInput = {
    title: "Chest Pain Assessment",
    condition: "Acute Coronary Syndrome",
    guideline: "AHA/ACC 2024 — HEART Score",
    estimatedQuestions: 8,
    estimatedMinutes: "3-5",
};

const SAMPLE_QUESTIONS: AskQuestionInput[] = [
    {
        question: "How would you describe the chest pain?",
        type: "single_choice",
        options: ["Sharp / stabbing", "Dull / aching", "Burning", "Throbbing / pulsating", "Pressure / tightness"],
    },
    {
        question: "Have you experienced this pain before?",
        type: "yes_no",
    },
    {
        question: "On a scale of 0–10, how severe is the pain right now?",
        type: "scale",
        scaleMin: 0,
        scaleMax: 10,
        scaleMinLabel: "No pain",
        scaleMaxLabel: "Worst imaginable",
    },
    {
        question: "Which of these symptoms are you also experiencing?",
        type: "multi_choice",
        options: ["Shortness of breath", "Nausea", "Dizziness", "Sweating", "Arm/jaw pain", "None of these"],
    },
];

const SAMPLE_PRESCRIPTION: SubmitPrescriptionInput = {
    title: "Hypertension Management",
    condition: "Essential Hypertension (I10)",
    medications: [
        {
            name: "Amlodipine",
            dosage: "5 mg",
            form: "Tablet",
            frequency: "Once daily (morning)",
            duration: "3 months",
            instructions: "Take with or without food. Avoid grapefruit.",
            indication: "Calcium channel blocker for blood pressure control",
            monitoring: "BP check every 2 weeks for first month",
        },
        {
            name: "Telmisartan",
            dosage: "40 mg",
            form: "Tablet",
            frequency: "Once daily (evening)",
            duration: "3 months",
            instructions: "Take at the same time each day.",
            indication: "ARB for sustained BP reduction and cardiac protection",
            monitoring: "Renal function + potassium at 4 weeks",
        },
    ],
    notes: "Start with Amlodipine alone for 2 weeks. Add Telmisartan if BP remains above 140/90.",
    urgent: false,
} as SubmitPrescriptionInput;

const SAMPLE_LAB_ANALYSIS: SubmitLabReportAnalysisInput = {
    panels: [
        {
            panelName: "Complete Blood Count",
            findings: [
                { name: "Haemoglobin", value: "11.2 g/dL", status: "low", interpretation: "Slightly below the normal range (12–16 g/dL for women). This could indicate mild iron deficiency." },
                { name: "WBC", value: "7.5 ×10³/µL", status: "normal", interpretation: "White blood cell count is within normal limits — no signs of infection." },
                { name: "Platelets", value: "245 ×10³/µL", status: "normal", interpretation: "Platelet count is healthy — blood clotting function looks good." },
                { name: "MCV", value: "72 fL", status: "low", interpretation: "Mean corpuscular volume is below normal (80–100 fL), suggesting microcytic anaemia — commonly from iron deficiency." },
            ],
            summary: "Mild microcytic anaemia pattern — low Hb + low MCV points toward iron deficiency. Rest of the blood count is reassuringly normal.",
        },
        {
            panelName: "Lipid Profile",
            findings: [
                { name: "Total Cholesterol", value: "242 mg/dL", status: "high", interpretation: "Above the desirable limit of 200 mg/dL. Worth monitoring with diet changes." },
                { name: "LDL Cholesterol", value: "165 mg/dL", status: "high", interpretation: "Elevated 'bad' cholesterol — ideally below 130 mg/dL. Dietary changes and exercise can help bring this down." },
                { name: "HDL Cholesterol", value: "52 mg/dL", status: "normal", interpretation: "Good cholesterol is in a healthy range (above 40 mg/dL for women)." },
                { name: "Triglycerides", value: "125 mg/dL", status: "normal", interpretation: "Within normal limits (<150 mg/dL). Good." },
            ],
            summary: "LDL and total cholesterol are elevated. HDL is protective and triglycerides are fine. Lifestyle modifications recommended as first line.",
        },
        {
            panelName: "Thyroid Function",
            findings: [
                { name: "TSH", value: "8.2 mIU/L", status: "high", interpretation: "Elevated TSH (normal 0.4–4.0) suggests the thyroid is underactive. This could explain fatigue and weight changes." },
                { name: "Free T4", value: "0.7 ng/dL", status: "low", interpretation: "Below normal range (0.8–1.8). Confirms hypothyroidism along with elevated TSH." },
            ],
            summary: "TSH is elevated and Free T4 is low — this pattern confirms primary hypothyroidism. Treatment with levothyroxine is typically recommended.",
        },
    ],
    overallAssessment: "Your blood work shows three main findings: mild iron-deficiency anaemia, elevated cholesterol, and an underactive thyroid. The good news is all three are manageable with the right approach. The thyroid finding is the most important to address first, as it can also contribute to the cholesterol changes and fatigue.",
    recommendations: [
        "Start iron supplementation (ferrous sulfate 325 mg daily with vitamin C for better absorption)",
        "Follow up with thyroid function test in 6–8 weeks after starting levothyroxine",
        "Heart-healthy diet: increase fibre, reduce saturated fats, add omega-3 rich foods",
        "Repeat lipid profile in 3 months to check if thyroid treatment improves cholesterol",
        "Recheck CBC in 3 months to confirm iron levels are improving",
    ],
    criticalFindings: [
        "TSH significantly elevated at 8.2 mIU/L with low Free T4 — needs thyroid medication. Please consult your doctor within the next week.",
    ],
};

const SAMPLE_DIET_DAY: EnhancedDietDay = {
    day: "Monday",
    day_number: 1,
    meals: {
        breakfast: {
            name: "Breakfast",
            time: "7:30 AM",
            foods: [
                { item: "Ragi Dosa", portion: "2 pieces (120 g)", weight_grams: 120, calories: 180, dietaryType: "veg", ingredients: ["ragi flour", "rice flour", "onion", "green chilli"], macros: { protein_g: 5, carbs_g: 32, fats_g: 3, fiber_g: 4 }, allergens: [], substitutions: [] },
                { item: "Coconut Chutney", portion: "2 tbsp (40 g)", weight_grams: 40, calories: 65, dietaryType: "veg", ingredients: ["fresh coconut", "green chilli", "ginger"], macros: { protein_g: 1, carbs_g: 3, fats_g: 6, fiber_g: 1 }, allergens: [], substitutions: [] },
            ],
            totalCalories: 245,
            totalMacros: { protein_g: 6, carbs_g: 35, fats_g: 9, fiber_g: 5 },
        },
        lunch: {
            name: "Lunch",
            time: "12:30 PM",
            foods: [
                { item: "Brown Rice", portion: "1 cup (150 g)", weight_grams: 150, calories: 170, dietaryType: "veg", ingredients: ["brown rice"], macros: { protein_g: 4, carbs_g: 36, fats_g: 1, fiber_g: 3 }, allergens: [], substitutions: [] },
                { item: "Dal Palak", portion: "1 bowl (200 g)", weight_grams: 200, calories: 180, dietaryType: "veg", ingredients: ["moong dal", "spinach", "tomato", "cumin"], macros: { protein_g: 12, carbs_g: 22, fats_g: 4, fiber_g: 6 }, allergens: [], substitutions: [] },
                { item: "Cucumber Raita", portion: "1 small (100 g)", weight_grams: 100, calories: 60, dietaryType: "veg", ingredients: ["yoghurt", "cucumber", "cumin"], macros: { protein_g: 3, carbs_g: 5, fats_g: 3, fiber_g: 0 }, allergens: ["dairy"], substitutions: [] },
            ],
            totalCalories: 410,
            totalMacros: { protein_g: 19, carbs_g: 63, fats_g: 8, fiber_g: 9 },
        },
        snack: {
            name: "Snack",
            time: "4:00 PM",
            foods: [
                { item: "Mixed Nuts", portion: "1 handful (30 g)", weight_grams: 30, calories: 175, dietaryType: "veg", ingredients: ["almonds", "walnuts", "cashews"], macros: { protein_g: 5, carbs_g: 6, fats_g: 15, fiber_g: 2 }, allergens: ["tree nuts"], substitutions: [] },
            ],
            totalCalories: 175,
            totalMacros: { protein_g: 5, carbs_g: 6, fats_g: 15, fiber_g: 2 },
        },
        dinner: {
            name: "Dinner",
            time: "7:30 PM",
            foods: [
                { item: "Jowar Roti", portion: "2 pieces (80 g)", weight_grams: 80, calories: 120, dietaryType: "veg", ingredients: ["jowar flour"], macros: { protein_g: 4, carbs_g: 24, fats_g: 1, fiber_g: 3 }, allergens: [], substitutions: [] },
                { item: "Palak Paneer", portion: "1 bowl (180 g)", weight_grams: 180, calories: 220, dietaryType: "veg", ingredients: ["paneer", "spinach", "onion", "tomato", "cream"], macros: { protein_g: 14, carbs_g: 10, fats_g: 15, fiber_g: 3 }, allergens: ["dairy"], substitutions: [] },
            ],
            totalCalories: 340,
            totalMacros: { protein_g: 18, carbs_g: 34, fats_g: 16, fiber_g: 6 },
        },
    },
    dailyTotals: { calories: 1170, protein_g: 48, carbs_g: 138, fats_g: 48, fiber_g: 22 },
    guardrailCompliance: [],
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
    return (
        <Stack gap="md">
            <Title order={3} c="dimmed">{title}</Title>
            {children}
            <Divider />
        </Stack>
    );
}

// ── Page sections ─────────────────────────────────────────────────────────────

function PageHeader() {
    return (
        <Box>
            <Title order={1} style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>AI Chat Cards — Preview</Title>
            <Text c="dimmed" size="sm" mt="xs">Live preview of all tool cards rendered in the chat. These use the same components the patient sees.</Text>
        </Box>
    );
}

function QuestionCardsSection() {
    return (
        <Section title="Question Cards">
            <Stack gap="md">
                {SAMPLE_QUESTIONS.map((q) => (
                    <QuestionCard key={q.question} data={q} toolCallId={`test-q-${q.question}`} isAnswered={q.type === "yes_no"}
                        answeredValue={q.type === "yes_no" ? "Pressure / tightness" : undefined} isLoading={false} onAnswer={() => { }} />
                ))}
            </Stack>
        </Section>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TestAiCardsPage() {
    return (
        <Container size="sm" py="xl">
            <Stack gap="xl">
                <PageHeader />
                <Divider />
                <Section title="Assessment Preface Card"><AssessmentPrefaceCard data={SAMPLE_ASSESSMENT} /></Section>
                <Section title="Action Card (NEW)"><ActionCardCard data={SAMPLE_ACTION_CARD} /></Section>
                <QuestionCardsSection />
                <Section title="Lab Report Analysis Card (NEW)"><LabReportAnalysisCard data={SAMPLE_LAB_ANALYSIS} /></Section>
                <Section title="Prescription Card"><PrescriptionCard data={SAMPLE_PRESCRIPTION} /></Section>
                <Section title="Diet Day Card"><DietDayCard data={SAMPLE_DIET_DAY} /></Section>
            </Stack>
        </Container>
    );
}
