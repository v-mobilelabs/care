"use client";
import { useState, useRef, KeyboardEvent, MouseEvent } from "react";
import { Box, Chip, Group, Paper, SimpleGrid, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { motion, useMotionValue, useMotionTemplate, useSpring, useReducedMotion } from "framer-motion";
import { spacing, touchTarget, motion as motionTokens } from "@/ui/tokens";

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

// ── Style helpers ─────────────────────────────────────────────────────────────

const CARD_BASE = {
    flexDirection: "row" as const, minHeight: touchTarget.min, position: "relative" as const,
    textAlign: "left" as const, overflow: "hidden", zIndex: 2,
    transition: `all ${motionTokens.duration.slow} ${motionTokens.easing.decelerate}`,
} as const;

function getCardStyles(color: string, hovered: boolean) {
    const opacity = hovered ? "0.85" : "0.55";
    const darkOpacity = hovered ? "0.75" : "0.45";
    const blur = hovered ? "blur(24px) saturate(1.4)" : "blur(12px) saturate(1.1)";
    return {
        ...CARD_BASE,
        background: `light-dark(rgba(255,255,255,${opacity}), rgba(30,32,40,${darkOpacity}))`,
        backdropFilter: blur, WebkitBackdropFilter: blur,
        border: hovered
            ? `1px solid light-dark(var(--mantine-color-${color}-3), var(--mantine-color-${color}-6))`
            : "1px solid light-dark(rgba(200,200,220,0.5), rgba(255,255,255,0.08))",
        boxShadow: hovered
            ? `0 4px 16px -6px var(--mantine-color-${color}-3)`
            : "0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 light-dark(rgba(255,255,255,0.3), rgba(255,255,255,0.03))",
    };
}

// ── Interactive Card ──────────────────────────────────────────────────────────

interface CardProps {
    color: string;
    label: string;
    sub: string;
    onClick: () => void;
    reducedMotion: boolean;
    isTouchDevice: boolean;
}

function InteractiveCard({ color, label, sub, onClick, reducedMotion, isTouchDevice }: Readonly<CardProps>) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });
    const rotateY = useSpring(useMotionValue(0), { stiffness: 180, damping: 22 });

    const glowX = useSpring(mouseX, { stiffness: 220, damping: 30 });
    const glowY = useSpring(mouseY, { stiffness: 220, damping: 30 });

    // Reactive background strings that update as MotionValues change
    const glowBackground = useMotionTemplate`radial-gradient(250px circle at ${glowX}% ${glowY}%, light-dark(var(--mantine-color-${color}-4), var(--mantine-color-${color}-3)), transparent 55%)`;
    const glowRingBackground = useMotionTemplate`radial-gradient(180px circle at ${glowX}% ${glowY}%, light-dark(var(--mantine-color-${color}-5), var(--mantine-color-${color}-4)), transparent 40%)`;

    // Skip 3D tilt + mouse glow on touch devices or reduced motion
    const skipEffects = reducedMotion || isTouchDevice;

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (skipEffects || !cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        rotateX.set(-((e.clientY - centerY) / rect.height) * 15);
        rotateY.set(((e.clientX - centerX) / rect.width) * 15);

        mouseX.set(((e.clientX - rect.left) / rect.width) * 100);
        mouseY.set(((e.clientY - rect.top) / rect.height) * 100);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        rotateX.set(0);
        rotateY.set(0);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <motion.div
            ref={cardRef}
            role="button"
            tabIndex={0}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
            onClick={onClick}
            whileHover={skipEffects ? undefined : { scale: 1.02, z: 50 }}
            whileTap={skipEffects ? undefined : { scale: 0.98 }}
            transition={skipEffects ? undefined : { type: "spring", stiffness: 260, damping: 24 }}
            style={{
                rotateX: skipEffects ? undefined : rotateX,
                rotateY: skipEffects ? undefined : rotateY,
                transformStyle: skipEffects ? undefined : "preserve-3d",
                perspective: skipEffects ? undefined : 1000,
                cursor: "pointer",
                position: "relative",
                borderRadius: "var(--mantine-radius-lg)",
                overflow: "visible",
                width: "100%",
            }}
        >
            {/* Ambient glow behind card — pulses on hover (pointer devices only) */}
            {!skipEffects && (
                <motion.div
                    animate={{
                        opacity: isHovered ? 0.7 : 0,
                        scale: isHovered ? 1.12 : 0.92,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{
                        position: "absolute",
                        inset: -10,
                        borderRadius: "var(--mantine-radius-xl)",
                        background: `radial-gradient(ellipse at center, light-dark(var(--mantine-color-${color}-4), var(--mantine-color-${color}-3)), transparent 65%)`,
                        filter: "blur(20px)",
                        pointerEvents: "none",
                        zIndex: 0,
                    }}
                />
            )}

            {/* Mouse-following glow — outer soft layer (pointer devices only) */}
            {!skipEffects && (
                <motion.div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "var(--mantine-radius-lg)",
                        background: glowBackground,
                        opacity: isHovered ? 0.7 : 0,
                        transition: `opacity ${motionTokens.duration.normal} ease`,
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                />
            )}

            {/* Mouse-following glow — inner bright core (pointer devices only) */}
            {!skipEffects && (
                <motion.div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "var(--mantine-radius-lg)",
                        background: glowRingBackground,
                        opacity: isHovered ? 0.4 : 0,
                        transition: `opacity ${motionTokens.duration.normal} ease`,
                        mixBlendMode: "screen",
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                />
            )}

            {/* Frosted glass card */}
            <Paper
                withBorder
                radius="xl"
                p="sm"
                m="0"
                h="100%"
                display="flex"
                style={getCardStyles(color, isHovered)}
            >
                {/* Subtle shimmer sweep — always rendered, animated via opacity */}
                <motion.div
                    animate={!skipEffects && isHovered
                        ? { x: "200%", opacity: [0, 0.6, 0] }
                        : { x: "-100%", opacity: 0 }
                    }
                    transition={!skipEffects && isHovered
                        ? { duration: 1.2, ease: "easeInOut" }
                        : { duration: 0 }
                    }
                    style={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: "linear-gradient(90deg, transparent 0%, light-dark(rgba(255,255,255,0.3), rgba(255,255,255,0.06)) 50%, transparent 100%)",
                        pointerEvents: "none",
                        zIndex: 3,
                    }}
                />

                <Box>
                    <Text size="xs" fw={600} mb={4} lh={1.3} c={color}>{label}</Text>
                    <Text visibleFrom="xs" size="xs" c="dimmed" lh={1.3}>{sub}</Text>
                </Box>
            </Paper>
        </motion.div>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StarterCards({ onSelect, onSend }: Readonly<StarterCardsProps>) {
    const [activeCategory, setActiveCategory] = useState<Category>("all");
    const reducedMotion = useReducedMotion() ?? false;
    const isTouchDevice = !useMediaQuery("(hover: hover) and (pointer: fine)");

    const visible = activeCategory === "all"
        ? STARTERS
        : STARTERS.filter((s) => s.category === activeCategory);

    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                gap: spacing.md,
                position: "relative",
                marginBottom: spacing.xl,
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
                            variant="filled"
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
            <SimpleGrid cols={{ base: 2, xs: 2, sm: 3 }} spacing="sm" w="100%">
                {visible.map(({ color, label, sub, prompt, category }, index) => (
                    <motion.div
                        key={label}
                        initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.92, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                        transition={reducedMotion ? { duration: 0 } : {
                            duration: 0.5,
                            delay: index * 0.06,
                            ease: [0.4, 0, 0.2, 1],
                        }}
                    >
                        <InteractiveCard
                            color={color}
                            label={label}
                            sub={sub}
                            reducedMotion={reducedMotion}
                            isTouchDevice={isTouchDevice}
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

