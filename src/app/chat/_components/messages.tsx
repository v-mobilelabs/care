"use client";
import { Box, ScrollArea, Stack } from "@mantine/core";
import type { ChatStatus, UIMessage } from "ai";
import { useEffect, useRef } from "react";

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
}: Readonly<MessagesProps>) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on every new message or loading state change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const hasUserMessages = messages.some(m => m.role === "user");

    return (
        <ScrollArea style={{ flex: 1 }}>
            <Stack gap="lg" maw={760} mx="auto" px="lg" py="lg">

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

                {/* Loading indicator */}
                {isLoading && (
                    <StatusIndicator
                        chatStatus={chatStatus}
                        phraseIdx={phraseIdx}
                        phraseFading={phraseFading}
                    />
                )}

                {/* Scroll anchor */}
                <div ref={bottomRef} />
            </Stack>
        </ScrollArea>
    );
}
