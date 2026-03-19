"use client";
import { useState, useRef, MouseEvent } from "react";
import { Box, Chip, Group, Paper, SimpleGrid, Text } from "@mantine/core";
import { motion, useMotionValue, useSpring } from "framer-motion";

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = "all" | "upload" | "symptoms" | "medications" | "wellness";

interface Starter {
    color: string;
    label: string;
    sub: string;
    prompt: string;
    category: Exclude<Category, "all">;
}

interface StarterCardsProps {
    onSelect: (prompt: string) => void;
    onSend?: (prompt: string) => void;
}

// ── Starters ──────────────────────────────────────────────────────────────────
const STARTERS: Starter[] = [
    // Upload & Analyse
    { color: "red", label: "Analyse blood test", sub: "Upload your report for a full breakdown", prompt: "I'd like to upload my blood test report for analysis. Please help me understand the results.", category: "upload" },
    { color: "blue", label: "Read my X-ray or scan", sub: "Upload an X-ray, CT, MRI, or ultrasound", prompt: "I'd like to upload an imaging scan (X-ray, CT, MRI, or ultrasound). Please help me analyse it.", category: "upload" },
    { color: "cyan", label: "Check dental X-ray", sub: "Upload a dental OPG or periapical scan", prompt: "I'd like to upload a dental X-ray or OPG for analysis. Please help me understand what you see.", category: "upload" },
    { color: "indigo", label: "Review my prescription", sub: "Upload a prescription to extract medications", prompt: "I'd like to upload a prescription. Please extract all the medications and explain what each one is for.", category: "upload" },
    // Symptoms
    { color: "grape", label: "I have a headache", sub: "Assess your headache pattern and triggers", prompt: "I have a headache. Can you help me understand what might be causing it and what I should do?", category: "symptoms" },
    { color: "orange", label: "Fever & chills", sub: "Evaluate your temperature and symptoms", prompt: "I'm experiencing fever and chills. Can you help me figure out what's going on and what I should do?", category: "symptoms" },
    { color: "teal", label: "Skin rash or lesion", sub: "Describe or upload for visual analysis", prompt: "I have a skin rash or lesion I'm concerned about. Can you help me assess it?", category: "symptoms" },
    // Medications
    { color: "violet", label: "Check drug interactions", sub: "Review my medications for conflicts", prompt: "I'm taking multiple medications and want to check if there are any interactions between them. Can you help?", category: "medications" },
    { color: "blue", label: "Understand my medication", sub: "Side effects, dosage and interactions", prompt: "I've been prescribed a new medication and want to understand what it does, its side effects, and any interactions with my current medications.", category: "medications" },
    // Wellness
    { color: "lime", label: "Create a diet plan", sub: "Get a personalised 7-day meal plan", prompt: "Can you create a personalised diet plan for me based on my health conditions and goals?", category: "wellness" },
    { color: "red", label: "Log my vitals", sub: "Record BP, heart rate, glucose & more", prompt: "I'd like to log my vital signs. I have readings for blood pressure, heart rate, and blood glucose.", category: "wellness" },
    { color: "green", label: "Mental health check-in", sub: "PHQ-9 depression & GAD-7 anxiety screen", prompt: "I'd like to do a mental health check-in. Can you help me screen for depression and anxiety?", category: "wellness" },
];

const CATEGORIES: { value: Category; label: string }[] = [
    { value: "all", label: "All" },
    { value: "upload", label: "Upload & Analyse" },
    { value: "symptoms", label: "Symptoms" },
    { value: "medications", label: "Medications" },
    { value: "wellness", label: "Wellness" },
];

// ── Interactive Card ──────────────────────────────────────────────────────────

interface CardProps {
    color: string;
    label: string;
    sub: string;
    onClick: () => void;
}

function InteractiveCard({ color, label, sub, onClick }: Readonly<CardProps>) {
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
                aspectRatio: "3 / 1",
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
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        style={{
                            position: "absolute",
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                            pointerEvents: "none",
                            zIndex: 3,
                        }}
                    />
                )}

                <Box style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Text size="xs" fw={600} mb={4} lh={1.3}>{label}</Text>
                    <Text visibleFrom="xs" size="xs" c="dimmed" lh={1.3}>{sub}</Text>
                </Box>
            </Paper>
        </motion.div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StarterCards({ onSelect, onSend }: Readonly<StarterCardsProps>) {
    const [activeCategory, setActiveCategory] = useState<Category>("all");

    const visible = activeCategory === "all"
        ? STARTERS
        : STARTERS.filter((s) => s.category === activeCategory);

    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                position: "relative",
            }}
        >
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
            <SimpleGrid cols={{ base: 2, xs: 2, sm: 3 }} spacing="md" w="100%">
                {visible.map(({ color, label, sub, prompt, category }, index) => (
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
                            color={color}
                            label={label}
                            sub={sub}
                            onClick={() => {
                                if (category === "upload" || !onSend) {
                                    onSelect(prompt);
                                } else {
                                    onSend(prompt);
                                }
                            }}
                        />
                    </motion.div>
                ))}
            </SimpleGrid>
        </Box>
    );
}

