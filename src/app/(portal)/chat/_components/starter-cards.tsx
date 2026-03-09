"use client";
import { useState, useRef, MouseEvent } from "react";
import { Box, Chip, Group, Paper, SimpleGrid, Text, ThemeIcon, Title } from "@mantine/core";
import { motion, useMotionValue, useSpring } from "framer-motion";
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
const ICON_SIZE = 32;
const STARTERS: Starter[] = [
    // Upload & Analyse
    {
        icon: <IconFlask size={ICON_SIZE} />,
        color: "red",
        label: "Analyse blood test",
        sub: "Upload your report for a full breakdown",
        prompt: "I'd like to upload my blood test report for analysis. Please help me understand the results.",
        category: "upload",
    },
    {
        icon: <IconStethoscope size={ICON_SIZE} />,
        color: "blue",
        label: "Read my X-ray or scan",
        sub: "Upload an X-ray, CT, MRI, or ultrasound",
        prompt: "I'd like to upload an imaging scan (X-ray, CT, MRI, or ultrasound). Please help me analyse it.",
        category: "upload",
    },
    {
        icon: <IconDental size={ICON_SIZE} />,
        color: "cyan",
        label: "Check dental X-ray",
        sub: "Upload a dental OPG or periapical scan",
        prompt: "I'd like to upload a dental X-ray or OPG for analysis. Please help me understand what you see.",
        category: "upload",
    },
    {
        icon: <IconFileText size={ICON_SIZE} />,
        color: "indigo",
        label: "Review my prescription",
        sub: "Upload a prescription to extract medications",
        prompt: "I'd like to upload a prescription. Please extract all the medications and explain what each one is for.",
        category: "upload",
    },
    // Symptoms
    {
        icon: <IconBrain size={ICON_SIZE} />,
        color: "grape",
        label: "I have a headache",
        sub: "Assess your headache pattern and triggers",
        prompt: "I have a headache. Can you help me understand what might be causing it and what I should do?",
        category: "symptoms",
    },
    {
        icon: <IconThermometer size={ICON_SIZE} />,
        color: "orange",
        label: "Fever & chills",
        sub: "Evaluate your temperature and symptoms",
        prompt: "I'm experiencing fever and chills. Can you help me figure out what's going on and what I should do?",
        category: "symptoms",
    },
    {
        icon: <IconAlertTriangle size={ICON_SIZE} />,
        color: "red",
        label: "Chest pain or tightness",
        sub: "Get an urgent symptom assessment",
        prompt: "I'm experiencing chest pain or tightness. Can you help assess how serious this is?",
        category: "symptoms",
    },
    {
        icon: <IconBandage size={ICON_SIZE} />,
        color: "teal",
        label: "Skin rash or lesion",
        sub: "Describe or upload for visual analysis",
        prompt: "I have a skin rash or lesion I'm concerned about. Can you help me assess it?",
        category: "symptoms",
    },
    // Medications & Safety
    {
        icon: <IconPill size={ICON_SIZE} />,
        color: "violet",
        label: "Check drug interactions",
        sub: "Review my medications for conflicts",
        prompt: "I'm taking multiple medications and want to check if there are any interactions between them. Can you help?",
        category: "medications",
    },
    {
        icon: <IconVaccine size={ICON_SIZE} />,
        color: "pink",
        label: "Am I up to date on vaccines?",
        sub: "Review gaps in your immunisation schedule",
        prompt: "Can you review my vaccination status and tell me which vaccines I might be missing or overdue for based on my age and health conditions?",
        category: "medications",
    },
    {
        icon: <IconActivity size={ICON_SIZE} />,
        color: "yellow",
        label: "Track recurring symptoms",
        sub: "Log episodes to find patterns",
        prompt: "I've been having recurring symptoms and want to track them. Can you help me log the episodes and identify any patterns?",
        category: "medications",
    },
    {
        icon: <IconShieldHalf size={ICON_SIZE} />,
        color: "blue",
        label: "I'm taking a medication",
        sub: "Understand side effects and interactions",
        prompt: "I've been prescribed a new medication and want to understand what it does, its side effects, and any interactions with my current medications.",
        category: "medications",
    },
    // Wellness
    {
        icon: <IconSalad size={ICON_SIZE} />,
        color: "lime",
        label: "Create a diet plan",
        sub: "Get a personalised 7-day meal plan",
        prompt: "Can you create a personalised diet plan for me based on my health conditions and goals?",
        category: "wellness",
    },
    {
        icon: <IconShieldCheck size={ICON_SIZE} />,
        color: "teal",
        label: "General health check",
        sub: "Review your overall wellbeing",
        prompt: "I'd like to do a general health assessment. Can you ask me the relevant questions to evaluate my overall wellbeing?",
        category: "wellness",
    },
    {
        icon: <IconHeartbeat size={ICON_SIZE} />,
        color: "red",
        label: "Log my vitals",
        sub: "Record BP, heart rate, glucose & more",
        prompt: "I'd like to log my vital signs. I have readings for blood pressure, heart rate, and blood glucose.",
        category: "wellness",
    },
    {
        icon: <IconBrain size={ICON_SIZE} />,
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

// ── Interactive Card ──────────────────────────────────────────────────────────

interface CardProps {
    icon: React.ReactNode;
    color: string;
    label: string;
    sub: string;
    onClick: () => void;
}

function InteractiveCard({ icon, color, label, sub, onClick }: Readonly<CardProps>) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Mouse position tracking with spring physics
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });
    const rotateY = useSpring(useMotionValue(0), { stiffness: 300, damping: 30 });

    const glowX = useSpring(mouseX, { stiffness: 200, damping: 20 });
    const glowY = useSpring(mouseY, { stiffness: 200, damping: 20 });

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseXRelative = e.clientX - centerX;
        const mouseYRelative = e.clientY - centerY;

        // Calculate rotation (3D tilt effect)
        const rotateYValue = (mouseXRelative / rect.width) * 15;
        const rotateXValue = -(mouseYRelative / rect.height) * 15;

        rotateX.set(rotateXValue);
        rotateY.set(rotateYValue);

        // Calculate position for glow effect (0-100%)
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        mouseX.set(xPercent);
        mouseY.set(yPercent);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        rotateX.set(0);
        rotateY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            whileHover={{ scale: 1.02, z: 50 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3 }}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
                perspective: 1000,
                cursor: "pointer",
                position: "relative",
                borderRadius: "var(--mantine-radius-lg)",
                overflow: "hidden",
                aspectRatio: "1 / 1",
                width: "100%",
            }}
        >
            {/* Animated gradient glow following mouse */}
            <motion.div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `radial-gradient(600px circle at ${glowX}% ${glowY}%, 
                        var(--mantine-color-${color}-3), 
                        transparent 40%)`,
                    opacity: isHovered ? 0.6 : 0,
                    transition: "opacity 0.3s ease",
                    pointerEvents: "none",
                    zIndex: 1,
                }}
            />

            {/* Frosted glass card */}
            <Paper
                withBorder
                radius="lg"
                p="sm"
                style={{
                    position: "relative",
                    textAlign: "left",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    background: isHovered
                        ? "light-dark(rgba(255, 255, 255, 0.8), rgba(30, 30, 30, 0.8))"
                        : "light-dark(rgba(255, 255, 255, 0.6), rgba(30, 30, 30, 0.6))",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: isHovered
                        ? `1px solid var(--mantine-color-${color}-4)`
                        : "1px solid light-dark(rgba(200, 200, 200, 0.3), rgba(80, 80, 80, 0.3))",
                    boxShadow: isHovered
                        ? `0 8px 32px -8px var(--mantine-color-${color}-3), 0 0 0 1px var(--mantine-color-${color}-2)`
                        : "0 4px 12px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    zIndex: 2,
                }}
            >
                {/* Shimmer effect on hover */}
                {isHovered && (
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: "200%" }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                            pointerEvents: "none",
                            zIndex: 3,
                        }}
                    />
                )}

                <motion.div
                    animate={{
                        scale: isHovered ? 1.1 : 1,
                        rotate: isHovered ? 5 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                >
                    <ThemeIcon size={36} radius="md" color={color} variant="light" mb={8}>
                        {icon}
                    </ThemeIcon>
                </motion.div>

                <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Text size="xs" fw={600} mb={2} lh={1.3}>{label}</Text>
                    <Text size="xs" c="dimmed" lh={1.3} style={{ fontSize: "0.7rem" }}>{sub}</Text>
                </Box>
            </Paper>
        </motion.div>
    );
}

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
                position: "relative",
            }}
        >
            {/* Animated background gradient */}
            <motion.div
                animate={{
                    background: [
                        "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)",
                        "radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.03) 0%, transparent 50%)",
                        "radial-gradient(circle at 50% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)",
                        "radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)",
                    ],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                }}
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                style={{ textAlign: "center", position: "relative", zIndex: 1 }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                        duration: 0.5,
                        delay: 0.2,
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                    }}
                >
                    <ThemeIcon size={60} radius="xl" color="primary" variant="light" mx="auto" mb={14}>
                        <IconStethoscope size={32} />
                    </ThemeIcon>
                </motion.div>
                <Title order={3} fw={700} mb={6}>How can I help you today?</Title>
                <Text size="sm" c="dimmed" maw={420} mx="auto">
                    Analyse reports, check symptoms, review medications, track vitals, or plan your diet — choose a prompt or type freely below.
                </Text>
            </motion.div>

            {/* Category chips */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ position: "relative", zIndex: 1 }}
            >
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
            </motion.div>

            {/* Prompt grid */}
            <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xs" w="100%">
                {visible.map(({ icon, color, label, sub, prompt }, index) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            duration: 0.4,
                            delay: index * 0.05,
                            ease: [0.4, 0, 0.2, 1],
                        }}
                    >
                        <InteractiveCard
                            icon={icon}
                            color={color}
                            label={label}
                            sub={sub}
                            onClick={() => onSelect(prompt)}
                        />
                    </motion.div>
                ))}
            </SimpleGrid>
        </Box>
    );
}

