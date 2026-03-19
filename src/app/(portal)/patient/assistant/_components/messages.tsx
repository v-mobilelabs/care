"use client";
import { ActionIcon, Alert, Avatar, Box, Button, Group, ScrollArea, Stack, Text, Transition } from "@mantine/core";
import { IconAlertCircle, IconArrowDown, IconCoins, IconHeartbeat, IconRefresh } from "@tabler/icons-react";
import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { ToolPartRenderer } from "@/ui/ai/tools";
import { FileMessage, StatusIndicator, TextMessage } from "./message";
import { ReasoningBlock } from "@/ui/ai/components/reasoning-block";
import { DateSeparator } from "@/ui/ai/components/date-separator";

export type { ChatStatus };

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

export interface MessagesProps {
    messages: UIMessage[];
    /** Map of message ID → ISO timestamp for date separator rendering. */
    messageTimestamps?: ReadonlyMap<string, string>;
    isLoading: boolean;
    chatStatus: ChatStatus;
    userPhotoURL?: string | null;
    userInitials?: string;
    answeredIds: ReadonlyMap<string, string>;
    editingId: string | null;
    editingText: string;
    phraseIdx: number;
    phraseFading: boolean;
    /** Dynamic loading hints from gateway for contextual loading messages. */
    loadingHints?: string[];
    onAnswer: (toolCallId: string, answer: string) => void;
    onApproval?: (opts: { id: string; approved: boolean; reason?: string }) => void;
    onEditStart: (msgId: string, text: string) => void;
    onEditChange: (text: string) => void;
    onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, msgId: string) => void;
    onEditCancel: () => void;
    onEditSubmit: (msgId: string) => void;
    onStarterSelect: (text: string) => void;
    onLearnMore?: (text: string) => void;
    error?: Error | null;
    onRetry?: () => void;
    preparingLabel?: string;
}


// Full implementation copied from original file
export function Messages({
    messages,
    messageTimestamps,
    isLoading,
    chatStatus,
    userPhotoURL,
    userInitials,
    answeredIds,
    editingId,
    editingText,
    phraseIdx,
    phraseFading,
    loadingHints,
    onAnswer,
    onApproval,
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

    // Track message IDs present on first render — only animate messages added after mount.
    const initialIdsRef = useRef<ReadonlySet<string> | null>(null);
    if (initialIdsRef.current === null) {
        initialIdsRef.current = new Set(messages.map(m => m.id));
    }

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

                    {/* Message thread */}
                    {messages.map((msg: UIMessage, idx: number) => {
                        const isUser = msg.role === "user";
                        const isNew = !initialIdsRef.current!.has(msg.id);
                        const currTs = messageTimestamps?.get(msg.id);
                        const prevTs = idx > 0 ? messageTimestamps?.get(messages[idx - 1].id) : undefined;
                        const showDate = currTs != null && (prevTs == null || new Date(currTs).toDateString() !== new Date(prevTs).toDateString());
                        return (
                            <Stack
                                key={msg.id}
                                gap="xs"
                                style={isNew ? { animation: "msg-enter 0.3s ease-out both" } : undefined}
                            >
                                {showDate && <DateSeparator date={currTs} />}
                                {msg.parts.map((part, i) => {
                                    if (part.type === "reasoning") {
                                        return (
                                            <Box key={i} pl={34}>
                                                <ReasoningBlock text={(part as { text: string }).text} state={(part as { state?: "streaming" | "done" }).state} />
                                            </Box>
                                        );
                                    }

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
                                                    onApproval={onApproval ?? (() => { })}
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
                            loadingHints={loadingHints}
                            overrideLabel={preparingLabel && !isLoading ? preparingLabel : undefined}
                        />
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </Stack>
            </ScrollArea>

            <style>{`
                @keyframes msg-enter {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes tts-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                @keyframes reasoning-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes reasoning-dot {
                    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>

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