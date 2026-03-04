"use client";
import { useState } from "react";
import { Box, Chip, Group, Paper, SimpleGrid, Text, ThemeIcon, Title } from "@mantine/core";
import {
    IconActivity,
    IconAlertTriangle,
    IconBandage,
    IconBrain,
    IconDental,
    IconFileText,
    IconFlask,
    IconHeartbeat,
    IconPill,
    IconSalad,
    IconShieldCheck,
    IconShieldHalf,
    IconStethoscope,
    IconThermometer,
    IconVaccine,
} from "@tabler/icons-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "all" | "upload" | "symptoms" | "medications" | "wellness";

interface Starter {
    icon: React.ReactNode;
    color: string;
    label: string;
    sub: string;
    prompt: string;
    category: Exclude<Category, "all">;
}

interface StarterCardsProps {
    onSelect: (prompt: string) => void;
}

// ── Starters ──────────────────────────────────────────────────────────────────

const STARTERS: Starter[] = [
    // Upload & Analyse
    {
        icon: <IconFlask size={20} />,
        color: "red",
        label: "Analyse blood test",
        sub: "Upload your report for a full breakdown",
        prompt: "I'd like to upload my blood test report for analysis. Please help me understand the results.",
        category: "upload",
    },
    {
        icon: <IconStethoscope size={20} />,
        color: "blue",
        label: "Read my X-ray or scan",
        sub: "Upload an X-ray, CT, MRI, or ultrasound",
        prompt: "I'd like to upload an imaging scan (X-ray, CT, MRI, or ultrasound). Please help me analyse it.",
        category: "upload",
    },
    {
        icon: <IconDental size={20} />,
        color: "cyan",
        label: "Check dental X-ray",
        sub: "Upload a dental OPG or periapical scan",
        prompt: "I'd like to upload a dental X-ray or OPG for analysis. Please help me understand what you see.",
        category: "upload",
    },
    {
        icon: <IconFileText size={20} />,
        color: "indigo",
        label: "Review my prescription",
        sub: "Upload a prescription to extract medications",
        prompt: "I'd like to upload a prescription. Please extract all the medications and explain what each one is for.",
        category: "upload",
    },
    // Symptoms
    {
        icon: <IconBrain size={20} />,
        color: "grape",
        label: "I have a headache",
        sub: "Assess your headache pattern and triggers",
        prompt: "I have a headache. Can you help me understand what might be causing it and what I should do?",
        category: "symptoms",
    },
    {
        icon: <IconThermometer size={20} />,
        color: "orange",
        label: "Fever & chills",
        sub: "Evaluate your temperature and symptoms",
        prompt: "I'm experiencing fever and chills. Can you help me figure out what's going on and what I should do?",
        category: "symptoms",
    },
    {
        icon: <IconAlertTriangle size={20} />,
        color: "red",
        label: "Chest pain or tightness",
        sub: "Get an urgent symptom assessment",
        prompt: "I'm experiencing chest pain or tightness. Can you help assess how serious this is?",
        category: "symptoms",
    },
    {
        icon: <IconBandage size={20} />,
        color: "teal",
        label: "Skin rash or lesion",
        sub: "Describe or upload for visual analysis",
        prompt: "I have a skin rash or lesion I'm concerned about. Can you help me assess it?",
        category: "symptoms",
    },
    // Medications & Safety
    {
        icon: <IconPill size={20} />,
        color: "violet",
        label: "Check drug interactions",
        sub: "Review my medications for conflicts",
        prompt: "I'm taking multiple medications and want to check if there are any interactions between them. Can you help?",
        category: "medications",
    },
    {
        icon: <IconVaccine size={20} />,
        color: "pink",
        label: "Am I up to date on vaccines?",
        sub: "Review gaps in your immunisation schedule",
        prompt: "Can you review my vaccination status and tell me which vaccines I might be missing or overdue for based on my age and health conditions?",
        category: "medications",
    },
    {
        icon: <IconActivity size={20} />,
        color: "yellow",
        label: "Track recurring symptoms",
        sub: "Log episodes to find patterns",
        prompt: "I've been having recurring symptoms and want to track them. Can you help me log the episodes and identify any patterns?",
        category: "medications",
    },
    {
        icon: <IconShieldHalf size={20} />,
        color: "blue",
        label: "I'm taking a medication",
        sub: "Understand side effects and interactions",
        prompt: "I've been prescribed a new medication and want to understand what it does, its side effects, and any interactions with my current medications.",
        category: "medications",
    },
    // Wellness
    {
        icon: <IconSalad size={20} />,
        color: "lime",
        label: "Create a diet plan",
        sub: "Get a personalised 7-day meal plan",
        prompt: "Can you create a personalised diet plan for me based on my health conditions and goals?",
        category: "wellness",
    },
    {
        icon: <IconShieldCheck size={20} />,
        color: "teal",
        label: "General health check",
        sub: "Review your overall wellbeing",
        prompt: "I'd like to do a general health assessment. Can you ask me the relevant questions to evaluate my overall wellbeing?",
        category: "wellness",
    },
    {
        icon: <IconHeartbeat size={20} />,
        color: "red",
        label: "Log my vitals",
        sub: "Record BP, heart rate, glucose & more",
        prompt: "I'd like to log my vital signs. I have readings for blood pressure, heart rate, and blood glucose.",
        category: "wellness",
    },
    {
        icon: <IconBrain size={20} />,
        color: "green",
        label: "Mental health check-in",
        sub: "PHQ-9 depression & GAD-7 anxiety screen",
        prompt: "I'd like to do a mental health check-in. Can you help me screen for depression and anxiety?",
        category: "wellness",
    },
];

const CATEGORIES: { value: Category; label: string }[] = [
    { value: "all", label: "All" },
    { value: "upload", label: "Upload & Analyse" },
    { value: "symptoms", label: "Symptoms" },
    { value: "medications", label: "Medications & Safety" },
    { value: "wellness", label: "Wellness" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function StarterCards({ onSelect }: Readonly<StarterCardsProps>) {
    const [activeCategory, setActiveCategory] = useState<Category>("all");

    const visible = activeCategory === "all"
        ? STARTERS
        : STARTERS.filter((s) => s.category === activeCategory);

    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                minHeight: "55vh",
                paddingBottom: 8,
                gap: 20,
            }}
        >
            {/* Header */}
            <Box style={{ textAlign: "center" }}>
                <ThemeIcon size={60} radius="xl" color="primary" variant="light" mx="auto" mb={14}>
                    <IconStethoscope size={32} />
                </ThemeIcon>
                <Title order={3} fw={700} mb={6}>How can I help you today?</Title>
                <Text size="sm" c="dimmed" maw={420} mx="auto">
                    Analyse reports, check symptoms, review medications, track vitals, or plan your diet — choose a prompt or type freely below.
                </Text>
            </Box>

            {/* Category chips */}
            <Chip.Group value={activeCategory} onChange={(v) => setActiveCategory(v as Category)}>
                <Group gap="xs" justify="center" wrap="wrap">
                    {CATEGORIES.map(({ value, label }) => (
                        <Chip
                            key={value}
                            value={value}
                            color="primary"
                            variant="outline"
                            size="sm"
                            radius="xl"
                            styles={{ label: { fontWeight: 500 } }}
                        >
                            {label}
                        </Chip>
                    ))}
                </Group>
            </Chip.Group>

            {/* Prompt grid */}
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="sm" w="100%">
                {visible.map(({ icon, color, label, sub, prompt }) => (
                    <Paper
                        key={label}
                        withBorder
                        radius="lg"
                        p="md"
                        component="button"
                        onClick={() => onSelect(prompt)}
                        style={{
                            cursor: "pointer",
                            textAlign: "left",
                            background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                            transition: "box-shadow 120ms ease, transform 120ms ease, border-color 120ms ease",
                            border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--mantine-shadow-sm)";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = `var(--mantine-color-${color}-4)`;
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "";
                        }}
                    >
                        <ThemeIcon size={36} radius="md" color={color} variant="light" mb={10}>
                            {icon}
                        </ThemeIcon>
                        <Text size="sm" fw={600} mb={3} lh={1.3}>{label}</Text>
                        <Text size="xs" c="dimmed" lh={1.4}>{sub}</Text>
                    </Paper>
                ))}
            </SimpleGrid>
        </Box>
    );
}

