"use client";
import { Box, Stack } from "@mantine/core";
import type { UIMessage, UIMessagePart, UIDataTypes, UITools } from "ai";
import { ToolPartRenderer } from "@/ui/ai/tools";
import { FileMessage, TextMessage } from "@/ui/ai/components/message";
import { AudioPlayer } from "@/ui/ai/components/audio-player";
import { ReasoningBlock } from "@/ui/ai/components/reasoning-block";
import { DateSeparator } from "@/ui/ai/components/date-separator";
import { AgentRoutingBadge } from "@/ui/chat/components/agent-routing-badge";
import type { SpecialistId } from "@/data/specialists/specialists.config";

export interface MessageRowProps {
    msg: UIMessage;
    prevTimestamp?: string;
    timestamp?: string;
    isNew: boolean;
    isLoading: boolean;
    userPhotoURL?: string | null;
    userInitials?: string;
    messageUsage?: ReadonlyMap<string, { promptTokens: number; completionTokens: number; totalTokens: number }>;
    /** Per-message agent type map (DB-persisted + live overlay). */
    messageAgentTypes?: ReadonlyMap<string, string>;
    /** Per-message reasoning map (why specialist was selected). */
    messageReasonings?: ReadonlyMap<string, string>;
    agentType?: string;
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
    sessionId?: string;
    onSendReferralMessage?: (text: string) => Promise<void>;
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
    messageAgentTypes,
    messageReasonings,
    agentType,
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
    sessionId,
    onSendReferralMessage,
}: Readonly<MessageRowProps>) {
    const isUser = msg.role === "user";
    const isAssistant = !isUser;
    const showDate = timestamp != null && (prevTimestamp == null || new Date(timestamp).toDateString() !== new Date(prevTimestamp).toDateString());
    
    // Find the first text part to render the badge before it (only for assistant messages)
    const firstTextPartIndex = isAssistant 
        ? msg.parts.findIndex((p) => p.type === "text") 
        : -1;
    
    const agentId = isAssistant ? (messageAgentTypes?.get(msg.id) ?? agentType) : undefined;
    const reasoning = messageReasonings?.get(msg.id);
    const showBadge = isAssistant && firstTextPartIndex >= 0 && agentId;

    return (
        <Stack
            gap="lg"
            style={isNew ? { animation: "msg-enter 0.3s ease-out both" } : undefined}
        >
            {showDate && <DateSeparator date={timestamp} />}
            {showBadge && agentId && (
                <AgentRoutingBadge 
                    agentId={agentId as SpecialistId} 
                    reasoning={reasoning}
                />
            )}
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
                            agentType={isUser ? undefined : (messageAgentTypes?.get(msg.id) ?? agentType)}
                            onEditStart={onEditStart}
                            onEditChange={onEditChange}
                            onEditKeyDown={onEditKeyDown}
                            onEditCancel={onEditCancel}
                            onEditSubmit={onEditSubmit}
                        />
                    );
                }

                if (!isUser && (part as unknown as { type?: string }).type === "audio") {
                    const audioPart = part as unknown as { type: "audio"; duration?: number; mimeType?: string; storagePath?: string };
                    return (
                        <Box key={i}>
                            <AudioPlayer
                                storagePath={audioPart.storagePath}
                                sessionId={sessionId}
                                messageId={msg.id}
                                duration={audioPart.duration}
                                mimeType={audioPart.mimeType}
                            />
                        </Box>
                    );
                }

                if (!isUser && (part as unknown as { type?: string }).type?.startsWith("tool-")) {
                    return (
                        <Box key={i}>
                            <ToolPartRenderer
                                part={part as UIMessagePart<UIDataTypes, UITools>}
                                onAnswer={onAnswer}
                                onApproval={onApproval}
                                answeredIds={answeredIds}
                                isLoading={isLoading}
                                onLearnMore={onLearnMore}
                                sessionId={sessionId}
                                onSendReferralMessage={onSendReferralMessage}
                            />
                        </Box>
                    );
                }

                return null;
            })}
        </Stack>
    );
}
