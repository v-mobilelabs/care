"use client";
import { ActionIcon, Alert, Avatar, Box, Button, Group, ScrollArea, Stack, Text, Transition } from "@mantine/core";
import { IconAlertCircle, IconArrowDown, IconCoins, IconHeartbeat, IconRefresh } from "@tabler/icons-react";
import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

import { FileMessage, StatusIndicator, TextMessage } from "@/app/chat/_components/message";
import { StarterCards } from "@/app/chat/_components/starter-cards";
import { ToolPartRenderer } from "@/app/chat/_components/tool-cards";

// ── Types ─────────────────────────────────────────────────────────────────────

export type { ChatStatus };

export interface MessagesProps {
    messages: UIMessage[];
    isLoading: boolean;
    /** Status from `useChat` — drives the loading phrase selection. */
    chatStatus: ChatStatus;
    /** Firebase user photo URL — shown in the user avatar. */
    userPhotoURL?: string | null;
    /** Name initials shown as avatar fallback when no photo URL is available. */
    userInitials?: string;
    answeredIds: ReadonlySet<string>;
    editingId: string | null;
    editingText: string;
    phraseIdx: number;
    phraseFading: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
    onEditStart: (msgId: string, text: string) => void;
    onEditChange: (text: string) => void;
    onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, msgId: string) => void;
    onEditCancel: () => void;
    onEditSubmit: (msgId: string) => void;
    /** Called when the user clicks a starter card — sets the input text. */
    onStarterSelect: (text: string) => void;
    /** Called when the user clicks "Ask about [condition]" on a condition card — sends the message directly. */
    onLearnMore?: (text: string) => void;
    /** Error from the AI request, if any. */
    error?: Error | null;
    /** Called when the user clicks the Retry chip after an error. */
    onRetry?: () => void;
    /**
     * When set, shows the loading bubble with this fixed label before the AI
     * stream starts (e.g. "Scanning file…" or "Uploading file…").
     */
    preparingLabel?: string;
}

// ── Error parsing helper ──────────────────────────────────────────────────────

interface ParsedApiError {
    code: string | null;
    message: string;
}

function parseApiError(err: Error | null | undefined): ParsedApiError {
    if (!err) return { code: null, message: "Response didn't generate. Something went wrong." };
    try {
        const parsed = JSON.parse(err.message) as { error?: { code?: string; message?: string } };
        const code = parsed.error?.code ?? null;
        const message = parsed.error?.message ?? err.message;
        return { code, message };
    } catch {
        return { code: null, message: err.message };
    }
}

// ── RetryBlock ────────────────────────────────────────────────────────────────

function RetryBlock({ error, onRetry }: Readonly<{ error?: Error | null; onRetry: () => void }>) {
    const { code, message } = parseApiError(error);

    if (code === "CREDITS_EXHAUSTED") {
        return (
            <Group align="flex-start" gap="xs" wrap="nowrap">
                <Avatar size={28} radius="xl" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                    <IconHeartbeat size={16} />
                </Avatar>
                <Alert
                    icon={<IconCoins size={16} />}
                    color="orange"
                    radius="md"
                    variant="light"
                    title="Daily credits used up"
                    style={{ flex: 1 }}
                >
                    <Text size="sm">{message}</Text>
                </Alert>
            </Group>
        );
    }

    return (
        <Group align="flex-start" gap="xs" wrap="nowrap">
            <Avatar size={28} radius="xl" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                <IconHeartbeat size={16} />
            </Avatar>
            <Stack gap={6}>
                <Group gap={6} align="center">
                    <IconAlertCircle size={14} style={{ color: "var(--mantine-color-red-5)", flexShrink: 0 }} />
                    <Text size="sm" c="dimmed">
                        {message}
                    </Text>
                </Group>
                <Button
                    variant="default"
                    size="xs"
                    radius="xl"
                    leftSection={<IconRefresh size={13} />}
                    onClick={onRetry}
                    style={{ alignSelf: "flex-start", fontWeight: 500 }}
                >
                    Regenerate response
                </Button>
            </Stack>
        </Group>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the full chat message thread: starter cards, message bubbles,
 * tool cards, and the loading status indicator. Manages auto-scroll
 * to the latest message internally.
 */
export function Messages({
    messages,
    isLoading,
    chatStatus,
    userPhotoURL,
    userInitials,
    answeredIds,
    editingId,
    editingText,
    phraseIdx,
    phraseFading,
    onAnswer,
    onEditStart,
    onEditChange,
    onEditKeyDown,
    onEditCancel,
    onEditSubmit,
    onStarterSelect,
    onLearnMore,
    error,
    onRetry,
    preparingLabel,
}: Readonly<MessagesProps>) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const SCROLL_THRESHOLD = 120; // px from bottom before button appears

    const checkScrollPosition = useCallback(() => {
        const el = viewportRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        setShowScrollBtn(distanceFromBottom > SCROLL_THRESHOLD);
    }, []);

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Auto-scroll to bottom only when already near the bottom
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            return;
        }
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom <= SCROLL_THRESHOLD) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length, isLoading, preparingLabel]);

    const hasUserMessages = messages.some(m => m.role === "user");

    // True when the last message is from the user with no AI reply yet.
    const lastMsg = messages.at(-1);
    const unansweredUser = lastMsg?.role === "user";

    return (
        <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <ScrollArea
                style={{ height: "100%" }}
                viewportRef={viewportRef}
                onScrollPositionChange={checkScrollPosition}
            >
                <Stack gap="lg" maw={760} mx="auto" px="lg" pt="lg" pb={80}>

                    {/* Empty state — starter prompt cards */}
                    {!hasUserMessages && (
                        <StarterCards onSelect={onStarterSelect} />
                    )}

                    {/* Message thread */}
                    {messages.map((msg: UIMessage) => {
                        const isUser = msg.role === "user";
                        return (
                            <Stack key={msg.id} gap="xs">
                                {msg.parts.map((part, i) => {
                                    if (part.type === "file") {
                                        return (
                                            <FileMessage
                                                key={i}
                                                part={part as Parameters<typeof FileMessage>[0]["part"]}
                                                isUser={isUser}
                                            />
                                        );
                                    }

                                    if (part.type === "text") {
                                        return (
                                            <TextMessage
                                                key={i}
                                                text={"text" in part ? String(part.text) : ""}
                                                isUser={isUser}
                                                userPhotoURL={isUser ? userPhotoURL : undefined}
                                                userInitials={isUser ? userInitials : undefined}
                                                msgId={msg.id}
                                                editingId={editingId}
                                                editingText={editingText}
                                                isLoading={isLoading}
                                                onEditStart={onEditStart}
                                                onEditChange={onEditChange}
                                                onEditKeyDown={onEditKeyDown}
                                                onEditCancel={onEditCancel}
                                                onEditSubmit={onEditSubmit}
                                            />
                                        );
                                    }

                                    if (!isUser && part.type.startsWith("tool-")) {
                                        return (
                                            <Box key={i} pl={34}>
                                                <ToolPartRenderer
                                                    part={part as Parameters<typeof ToolPartRenderer>[0]["part"]}
                                                    onAnswer={onAnswer}
                                                    answeredIds={answeredIds}
                                                    isLoading={isLoading}
                                                    onLearnMore={onLearnMore}
                                                />
                                            </Box>
                                        );
                                    }

                                    return null;
                                })}
                            </Stack>
                        );
                    })}

                    {/* No AI reply or error — "Regenerate response" slot */}
                    {!isLoading && onRetry && (unansweredUser || error) && (
                        <RetryBlock
                            error={error}
                            onRetry={onRetry}
                        />
                    )}

                    {/* Loading indicator — shown while preparing/uploading files OR while the AI is streaming */}
                    {(preparingLabel != null || isLoading) && (
                        <StatusIndicator
                            chatStatus={chatStatus}
                            phraseIdx={phraseIdx}
                            phraseFading={phraseFading}
                            overrideLabel={preparingLabel && !isLoading ? preparingLabel : undefined}
                        />
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </Stack>
            </ScrollArea>

            {/* Scroll-to-bottom FAB */}
            {hasUserMessages && (
                <Transition mounted={showScrollBtn} transition="slide-up" duration={200}>
                    {(styles) => (
                        <ActionIcon
                            variant="filled"
                            color="primary"
                            size="lg"
                            radius="xl"
                            aria-label="Scroll to bottom"
                            onClick={scrollToBottom}
                            style={{
                                ...styles,
                                position: "absolute",
                                bottom: 16,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 20,
                                boxShadow: "0 2px 12px rgba(0,0,0,0.22)",
                            }}
                        >
                            <IconArrowDown size={18} />
                        </ActionIcon>
                    )}
                </Transition>
            )}
        </Box>
    );
}
