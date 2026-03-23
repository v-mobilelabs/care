"use client";

import { Box, Group, Paper, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { AGENT_LABELS } from "@/ui/ai/types/agent-labels";
import { motion, zIndex } from "@/ui/tokens";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MentionItem {
    id: string;
    label: string;
}

interface MentionPopupProps {
    /** The text the user typed after '@' (used for filtering). */
    query: string;
    /** Called when the user selects an agent from the list. */
    onSelect: (item: MentionItem) => void;
    /** Called when the popup should close (Escape key, etc.). */
    onClose: () => void;
    /** Whether the popup is visible. */
    opened: boolean;
}

// ── Data ──────────────────────────────────────────────────────────────────────

/** Mentionable agents — excludes triageNurse (internal-only). */
const MENTIONABLE_AGENTS: MentionItem[] = Object.entries(AGENT_LABELS)
    .filter(([id]) => id !== "triageNurse")
    .map(([id, label]) => ({ id, label }));

/** Build a keydown handler for mention popup keyboard navigation. */
function buildMentionKeyHandler(
    filtered: MentionItem[], activeIndex: number,
    setActiveIndex: (fn: (i: number) => number) => void,
    onSelect: (item: MentionItem) => void, onClose: () => void,
) {
    return (e: KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % filtered.length); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length); }
        else if ((e.key === "Enter" || e.key === "Tab") && filtered.length > 0) { e.preventDefault(); e.stopPropagation(); onSelect(filtered[activeIndex]); }
        else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MentionRow({ item, active, onClick, buttonRef }: Readonly<{
    item: MentionItem; active: boolean;
    onClick: () => void; buttonRef: (el: HTMLButtonElement | null) => void;
}>) {
    return (
        <UnstyledButton ref={buttonRef} w="100%" px="sm" py={6} onClick={onClick} style={{
            borderRadius: "var(--mantine-radius-sm)",
            background: active ? "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.12))" : "transparent",
            transition: `background ${motion.duration.fast} ${motion.easing.standard}`,
        }}>
            <Group gap="xs" wrap="nowrap">
                <IconStethoscope size={16} style={{
                    color: active ? "var(--mantine-color-primary-6)" : "var(--mantine-color-dimmed)", flexShrink: 0,
                }} />
                <Text size="sm" fw={active ? 600 : 400}>{item.label}</Text>
            </Group>
        </UnstyledButton>
    );
}

const POPUP_STYLE = {
    position: "absolute" as const, bottom: "100%",
    left: "var(--mantine-spacing-sm)", right: "var(--mantine-spacing-sm)",
    marginBottom: 4, zIndex: zIndex.overlay, overflow: "hidden" as const,
    animation: `mention-slide-up ${motion.duration.fast} ${motion.easing.standard}`,
};

const SLIDE_UP_CSS = `@keyframes mention-slide-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}`;

/** Use keyboard + scroll effects for the mention popup. */
function useMentionKeyboard(
    opened: boolean, filtered: MentionItem[], activeIndex: number,
    setActiveIndex: (fn: (i: number) => number) => void,
    onSelect: (item: MentionItem) => void, onClose: () => void,
    itemRefs: React.RefObject<(HTMLButtonElement | null)[]>,
) {
    useEffect(() => { itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" }); }, [activeIndex, itemRefs]);
    useEffect(() => {
        if (!opened) return;
        const handler = buildMentionKeyHandler(filtered, activeIndex, setActiveIndex, onSelect, onClose);
        document.addEventListener("keydown", handler, true);
        return () => document.removeEventListener("keydown", handler, true);
    }, [opened, filtered, activeIndex, setActiveIndex, onSelect, onClose]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MentionPopup({ query, onSelect, onClose, opened }: Readonly<MentionPopupProps>) {
    const [rawIndex, setActiveIndex] = useState(0);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const filtered = MENTIONABLE_AGENTS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));
    const activeIndex = filtered.length > 0 ? rawIndex % filtered.length : 0;

    useMentionKeyboard(opened, filtered, activeIndex, setActiveIndex, onSelect, onClose, itemRefs);

    if (!opened || filtered.length === 0) return null;

    return (
        <Paper shadow="lg" radius="md" withBorder style={POPUP_STYLE}>
            <Box px="xs" py={6}><Text size="xs" c="dimmed" fw={600} px="xs">Specialists — type to filter</Text></Box>
            <ScrollArea.Autosize mah={240}>
                {filtered.map((item, idx) => (
                    <MentionRow key={item.id} item={item} active={idx === activeIndex}
                        onClick={() => onSelect(item)} buttonRef={(el) => { itemRefs.current[idx] = el; }} />
                ))}
            </ScrollArea.Autosize>
            <style>{SLIDE_UP_CSS}</style>
        </Paper>
    );
}
