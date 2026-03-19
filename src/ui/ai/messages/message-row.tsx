"use client";
import { Box, Stack } from "@mantine/core";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import { ToolPartRenderer } from "@/ui/ai/tools";
import { FileMessage, TextMessage } from "@/ui/ai/components/message";
import { ReasoningBlock } from "@/ui/ai/components/reasoning-block";
import { DateSeparator } from "@/ui/ai/components/date-separator";

export interface MessageRowProps {
    msg: UIMessage;
    prevTimestamp?: string;
    timestamp?: string;
    isNew: boolean;
    isLoading: boolean;
    userPhotoURL?: string | null;
    userInitials?: string;
    messageUsage?: ReadonlyMap<string, { promptTokens: number; completionTokens: number; totalTokens: number }>;
    editingId: string | null;
    editingText: string;
    answeredIds: ReadonlyMap<string, string>;
    onAnswer: (toolCallId: string, answer: string) => void;
    onApproval: (opts: { id: string; approved: boolean; reason?: string }) => void;
    onEditStart: (msgId: string, text: string) => void;
    onEditChange: (text: string) => void;
    onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, msgId: string) => void;
    onEditCancel: () => void;
    onEditSubmit: (msgId: string) => void;
    onLearnMore?: (text: string) => void;
}

export function MessageRow({
    msg,
    prevTimestamp,
    timestamp,
    isNew,
    isLoading,
    userPhotoURL,
    userInitials,
    messageUsage,
    editingId,
    editingText,
    answeredIds,
    onAnswer,
    onApproval,
    onEditStart,
    onEditChange,
    onEditKeyDown,
    onEditCancel,
    onEditSubmit,
    onLearnMore,
}: Readonly<MessageRowProps>) {
    const isUser = msg.role === "user";
    const showDate = timestamp != null && (prevTimestamp == null || new Date(timestamp).toDateString() !== new Date(prevTimestamp).toDateString());

    return (
        <Stack
            gap="lg"
            style={isNew ? { animation: "msg-enter 0.3s ease-out both" } : undefined}
        >
            {showDate && <DateSeparator date={timestamp} />}
            {msg.parts.map((part, i) => {
                if (part.type === "reasoning") {
                    return (
                        <Box key={i} pl={36}>
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
                            usage={isUser ? undefined : messageUsage?.get(msg.id)}
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
                        <Box key={i}>
                            <ToolPartRenderer
                                part={part as UIMessagePart<UIDataTypes, UITools>}
                                onAnswer={onAnswer}
                                onApproval={onApproval}
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
}
