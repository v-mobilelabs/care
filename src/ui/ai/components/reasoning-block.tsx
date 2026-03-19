"use client";
import { Box, Collapse, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconSparkles } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function useElapsedSeconds(isStreaming: boolean) {
    const startRef = useRef(0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isStreaming) return;
        startRef.current = Date.now();
        const id = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);
        return () => clearInterval(id);
    }, [isStreaming]);

    return elapsed;
}

function formatDuration(seconds: number): string {
    if (seconds < 1) return "";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const cardBase = {
    borderRadius: "var(--mantine-radius-md)",
    border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
    overflow: "hidden",
} as const;

const streamingCardStyle = {
    ...cardBase,
    background: "light-dark(var(--mantine-color-gray-0), rgba(255,255,255,0.03))",
    borderLeft: "3px solid light-dark(var(--mantine-color-gray-5), var(--mantine-color-dark-3))",
} as const;

const doneCardStyle = {
    ...cardBase,
    background: "light-dark(rgba(0,0,0,0.01), rgba(255,255,255,0.02))",
    borderLeft: "3px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-4))",
} as const;

const headerBase = {
    cursor: "pointer",
    userSelect: "none",
    transition: "background 150ms ease",
} as const;

const streamingHeaderStyle = {
    ...headerBase,
    cursor: "default",
} as const;

const iconPulse = {
    color: "var(--mantine-color-dimmed)",
    animation: "reasoning-pulse 2s ease-in-out infinite",
    flexShrink: 0,
} as const;

const iconStatic = {
    color: "var(--mantine-color-dimmed)",
    flexShrink: 0,
} as const;

const chevronBase = {
    color: "var(--mantine-color-dimmed)",
    transition: "transform 200ms ease",
    flexShrink: 0,
} as const;

const textStyle = {
    whiteSpace: "pre-wrap",
    lineHeight: 1.7,
    fontStyle: "italic",
} as const;

// ── Sub-components ───────────────────────────────────────────────────────────

function StreamingHeader({ elapsed }: Readonly<{ elapsed: number }>) {
    const dur = formatDuration(elapsed);
    return (
        <Group gap={8} px="sm" py={8} style={streamingHeaderStyle}>
            <IconSparkles size={15} style={iconPulse} />
            <Text size="xs" fw={600} c="dimmed">
                Thinking{dur ? ` · ${dur}` : "…"}
            </Text>
            <Box style={{ flex: 1 }} />
            <ThinkingDots />
        </Group>
    );
}

function ThinkingDots() {
    return (
        <Group gap={3} align="center">
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "var(--mantine-color-dimmed)",
                        animation: `reasoning-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }}
                />
            ))}
        </Group>
    );
}

function chevronStyle(opened: boolean) {
    return { ...chevronBase, transform: opened ? "rotate(90deg)" : "rotate(0deg)" } as const;
}

function doneHeaderBg(hovered: boolean) {
    return hovered
        ? "light-dark(var(--mantine-color-gray-0), rgba(255,255,255,0.04))"
        : "transparent";
}

type DoneHeaderProps = Readonly<{ opened: boolean; toggle: () => void; elapsed: number }>;

function doneLabel(elapsed: number) {
    const dur = formatDuration(elapsed);
    return dur ? `Thought for ${dur}` : "Thought process";
}

function DoneHeader({ opened, toggle, elapsed }: DoneHeaderProps) {
    const [hovered, setHovered] = useState(false);
    return (
        <UnstyledButton
            onClick={toggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            px="sm" py={8} w="100%"
            style={{ ...headerBase, background: doneHeaderBg(hovered) }}
        >
            <Group gap={8}>
                <IconSparkles size={15} style={iconStatic} />
                <Text size="xs" fw={500} c="dimmed">{doneLabel(elapsed)}</Text>
                <Box style={{ flex: 1 }} />
                <IconChevronRight size={14} style={chevronStyle(opened)} />
            </Group>
        </UnstyledButton>
    );
}

function ReasoningContent({ text }: Readonly<{ text: string }>) {
    return (
        <Box
            px="sm" pb="sm" pt={4}
            style={{ borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))" }}
        >
            <Text size="xs" c="dimmed" style={textStyle}>{text}</Text>
        </Box>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

export interface ReasoningBlockProps {
    text: string;
    state?: "streaming" | "done";
}

function StreamingView({ text, elapsed }: Readonly<{ text: string; elapsed: number }>) {
    return (
        <Box style={streamingCardStyle}>
            <StreamingHeader elapsed={elapsed} />
            <Collapse in={text.length > 0}>
                <ReasoningContent text={text} />
            </Collapse>
        </Box>
    );
}

function DoneView({ text, elapsed }: Readonly<{ text: string; elapsed: number }>) {
    const [opened, setOpened] = useState(false);
    if (!text.trim()) return null;
    return (
        <Box style={doneCardStyle}>
            <DoneHeader opened={opened} toggle={() => setOpened((v) => !v)} elapsed={elapsed} />
            <Collapse in={opened}>
                <ReasoningContent text={text} />
            </Collapse>
        </Box>
    );
}

export function ReasoningBlock({ text, state }: Readonly<ReasoningBlockProps>) {
    const isStreaming = state === "streaming";
    const elapsed = useElapsedSeconds(isStreaming);
    if (isStreaming) return <StreamingView text={text} elapsed={elapsed} />;
    return <DoneView text={text} elapsed={elapsed} />;
}
