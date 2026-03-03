"use client";
import { Box, Paper, SimpleGrid, Text, ThemeIcon, Title } from "@mantine/core";
import {
    IconDental,
    IconFlask,
    IconHeartbeat,
    IconShieldCheck,
    IconStethoscope,
    IconThermometer,
} from "@tabler/icons-react";

interface StarterCardsProps {
    onSelect: (prompt: string) => void;
}

const STARTERS = [
    {
        icon: <IconFlask size={20} />,
        color: "red",
        label: "Analyse blood test",
        sub: "Upload your report for a full breakdown",
        prompt: "I'd like to upload my blood test report for analysis. Please help me understand the results.",
    },
    {
        icon: <IconStethoscope size={20} />,
        color: "blue",
        label: "Read my X-ray",
        sub: "Upload an X-ray image for analysis",
        prompt: "I'd like to upload an X-ray image. Please help me analyse it.",
    },
    {
        icon: <IconDental size={20} />,
        color: "cyan",
        label: "Check dental X-ray",
        sub: "Upload a dental or OPG scan",
        prompt: "I'd like to upload a dental X-ray or OPG for analysis. Please help me understand what you see.",
    },
    {
        icon: <IconHeartbeat size={20} />,
        color: "grape",
        label: "I have a headache",
        sub: "Get guidance on your symptoms",
        prompt: "I have a headache. Can you help me understand what might be causing it and what I should do?",
    },
    {
        icon: <IconThermometer size={20} />,
        color: "orange",
        label: "Fever & chills",
        sub: "Describe how you're feeling",
        prompt: "I'm experiencing fever and chills. Can you help me figure out what's going on and what I should do?",
    },
    {
        icon: <IconShieldCheck size={20} />,
        color: "teal",
        label: "General health check",
        sub: "Review your overall wellbeing",
        prompt: "I'd like to do a general health assessment. Can you ask me the relevant questions to evaluate my overall wellbeing?",
    },
] as const;

export function StarterCards({ onSelect }: Readonly<StarterCardsProps>) {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                minHeight: "55vh",
                paddingBottom: 8,
                gap: 24,
            }}
        >
            <Box style={{ textAlign: "center" }}>
                <ThemeIcon size={60} radius="xl" color="primary" variant="light" mx="auto" mb={14}>
                    <IconStethoscope size={32} />
                </ThemeIcon>
                <Title order={3} fw={700} mb={6}>How can I help you today?</Title>
                <Text size="md" c="dimmed">Choose a prompt below or describe your symptoms to get started.</Text>
            </Box>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" w="100%">
                {STARTERS.map(({ icon, color, label, sub, prompt }) => (
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
                            transition: "box-shadow 120ms ease, transform 120ms ease",
                            border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = "var(--mantine-shadow-sm)";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                        }}
                    >
                        <ThemeIcon size={40} radius="md" color={color} variant="light" mb={12}>
                            {icon}
                        </ThemeIcon>
                        <Text size="md" fw={600} mb={4}>{label}</Text>
                        <Text size="sm" c="dimmed" lh={1.4}>{sub}</Text>
                    </Paper>
                ))}
            </SimpleGrid>
        </Box>
    );
}
