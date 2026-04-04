"use client";

import { useState } from "react";
import { Box, Button, SimpleGrid, Stack, Text } from "@mantine/core";
import { MotionCard } from "@/ui/components/motion-card";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

type StarterKind = "prefill" | "send";

type Starter = Readonly<{
    title: string;
    description: string;
    prompt: string;
    kind: StarterKind;
}>;

interface StarterCardsProps {
    onSelect: (prompt: string) => void;
    onSend?: (prompt: string) => void;
}

const PRIMARY_STARTERS: readonly Starter[] = [
    {
        title: "Check symptoms",
        description: "Understand what your symptoms may mean and what to do next.",
        prompt: "I want to check my symptoms and understand what I should do next.",
        kind: "send",
    },
    {
        title: "Understand a report",
        description: "Upload a blood test, scan, or report for a clear explanation.",
        prompt: "I want help understanding a medical report I plan to upload.",
        kind: "prefill",
    },
    {
        title: "Medication question",
        description: "Review medicine purpose, side effects, and possible interactions.",
        prompt: "I have a medication question. Please help me review safety and interactions.",
        kind: "send",
    },
] as const;

const ADDITIONAL_STARTERS: readonly Starter[] = [
    {
        title: "Track vitals",
        description: "Log blood pressure, glucose, or heart rate and review trends.",
        prompt: "I want to log my latest vitals and understand what they mean.",
        kind: "send",
    },
    {
        title: "Diet planning",
        description: "Get a practical 7-day meal plan based on your goals.",
        prompt: "Please create a personalized diet plan for my health goals.",
        kind: "send",
    },
    {
        title: "Mental health check-in",
        description: "Do a quick anxiety/depression check and discuss next steps.",
        prompt: "I want a mental health check-in and support on next steps.",
        kind: "send",
    },
] as const;

function StarterCard({ starter, onSelect, onSend }: Readonly<{
    starter: Starter;
    onSelect: (prompt: string) => void;
    onSend?: (prompt: string) => void;
}>) {
    function handleClick() {
        if (starter.kind === "send" && onSend) {
            onSend(starter.prompt);
            return;
        }
        onSelect(starter.prompt);
    }

    return (
        <MotionCard
            interactive
            blobColor="var(--mantine-color-primary-6)"
            withBorder
            radius="lg"
            p="md"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleClick();
                }
            }}
            style={{
                cursor: "pointer",
                minHeight: 82,
            }}
        >
            <Stack gap={4}>
                <Text size="sm" fw={600}>
                    {starter.title}
                </Text>
                <Text size="xs" c="dimmed" lh={1.45}>
                    {starter.description}
                </Text>
            </Stack>
        </MotionCard>
    );
}

export function StarterCards({ onSelect, onSend }: Readonly<StarterCardsProps>) {
    const [showMore, setShowMore] = useState(false);

    return (
        <Stack gap="sm" mt="md" mb="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                {PRIMARY_STARTERS.map((starter) => (
                    <StarterCard
                        key={starter.title}
                        starter={starter}
                        onSelect={onSelect}
                        onSend={onSend}
                    />
                ))}
            </SimpleGrid>

            {showMore && (
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    {ADDITIONAL_STARTERS.map((starter) => (
                        <StarterCard
                            key={starter.title}
                            starter={starter}
                            onSelect={onSelect}
                            onSend={onSend}
                        />
                    ))}
                </SimpleGrid>
            )}

            <Box>
                <Button
                    variant="subtle"
                    size="xs"
                    color="gray"
                    rightSection={showMore ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    onClick={() => setShowMore((value) => !value)}
                >
                    {showMore ? "Show fewer options" : "More options"}
                </Button>
            </Box>
        </Stack>
    );
}
