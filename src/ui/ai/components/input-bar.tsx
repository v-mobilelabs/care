"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    CloseButton,
    Group,
    Image,
    Indicator,
    Loader,
    Menu,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from "@mantine/core";
import {
    IconBookmarks,
    IconCamera,
    IconDots,
    IconFile,
    IconFileTypePdf,
    IconFileWord,
    IconFolderOpen,
    IconMicrophone,
    IconMicrophoneOff,
    IconPaperclip,
    IconPlayerStopFilled,
    IconPlus,
    IconSend,
    IconStack2,
    IconWaveSine,
} from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { isTextUIPart, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { isToolPart } from "@/ui/ai/types";
import { motion as motionTokens } from "@/ui/tokens";

import { useMic } from "@/ui/ai/hooks/use-mic";
import { useLiveSessionCompletion } from "@/ui/ai/hooks/use-live-session-completion";
import { GeminiLiveStandalone } from "@/ui/ai/components/gemini-live-standalone";
import { FilePickerDrawer } from "./file-picker-drawer";
import { ContextUsageIndicator } from "./context-usage-indicator";
import type { FileRecord } from "@/ui/ai/query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InputBarProps {
    /** Controlled input value — owned by the parent so starter cards can set it. */
    input: string;
    onInputChange: (value: string) => void;
    isLoading: boolean;
    /** Current chat messages (used for indicators and context UI). */
    messages: UIMessage[];
    /** Chat status from useMessages context. */
    status: string;
    /** Called for normal user messages. New local files + selected existing FileRecords. */
    onSend: (text: string, files?: FileList, existingFiles?: FileRecord[]) => void;
    /** Remaining monthly credits (0 disables sending). Undefined = loading. */
    creditsRemaining?: number;
    /** Stops the current AI response stream. */
    onStop?: () => void;
    /** Called when the user sends a message while the AI is still streaming.
     *  Stops the current stream and starts a new session with the typed message. */
    onStopAndNewChat?: (text: string, files?: FileList, existingFiles?: FileRecord[]) => void;
    /** True while file uploads are in flight (before the AI stream starts). */
    isUploading?: boolean;
    /** True when there is a pending non-free-text tool call (e.g. yes/no, choice,
     *  or approval) that the user must resolve inline before sending a message. */
    hasPendingToolCall?: boolean;
    /** When the AI asks a free_text question, the input bar is repurposed to
     *  collect the answer. Contains the toolCallId and question text. */
    pendingFreeText?: { toolCallId: string; question: string } | null;
    /** Called when the user submits a free-text answer via the input bar. */
    onAnswerFreeText?: (toolCallId: string, answer: string) => void;
    /** Whether to show the medical disclaimer below the input bar. Defaults to true. */
    showDisclaimer?: boolean;
    /** Total context tokens used vs max context window — drives the ring indicator. */
    contextUsage?: { inputTokens: number; outputTokens: number; maxTokens: number };
    /** Called when the user clicks the session recap indicator. */
    onOpenRecap?: () => void;
    /** Called when the user clicks the continuity assessment indicator. */
    onOpenContinuity?: () => void;
    /** Current session ID for Gemini Live audio storage. */
    sessionId?: string;
    /** Optional user profile context used to enrich Gemini Live system instruction. */
    liveProfileContext?: Readonly<{
        name?: string;
        dateOfBirth?: string;
        gender?: string;
        city?: string;
        country?: string;
        heightCm?: number;
        weightKg?: number;
        activityLevel?: string;
        bloodGroup?: string;
        allergies?: readonly string[];
    }>;
    /** Called when a Gemini Live session completes with audio.
     *  Parent should add this as an assistant message with kind: "audio". 
     *  When called from real-time onMessageWithAudio, id will be present.
     *  When called from onSessionComplete, id may be absent. */
    onLiveSessionMessage?: (msg: {
        id?: string;
        content: string;
        kind: "text" | "audio" | "mixed";
        agentType?: string;
    }) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function collectToolCounts(messages: UIMessage[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const message of messages) {
        if (message.role !== "assistant") continue;
        for (const part of message.parts) {
            const type = (part as { type?: string }).type;
            if (!type?.startsWith("tool-")) continue;
            const toolName = type.replace("tool-", "");
            counts.set(toolName, (counts.get(toolName) ?? 0) + 1);
        }
    }
    return counts;
}

function calculateRecapFindings(messages: UIMessage[]): number {
    const toolCounts = collectToolCounts(messages);
    let count = 0;
    if ((toolCounts.get("startAssessment") ?? 0) > 0) count++;
    if ((toolCounts.get("submitReport") ?? 0) > 0) count++;
    if ((toolCounts.get("submitPrescription") ?? 0) > 0) count++;
    if ((toolCounts.get("submitReferralRequest") ?? 0) > 0) count++;
    if ((toolCounts.get("actionCard") ?? 0) > 0) count++;
    return count;
}

function calculateContinuitySaved(messages: UIMessage[]): number {
    const toolCounts = collectToolCounts(messages);
    let count = 0;
    if ((toolCounts.get("startAssessment") ?? 0) > 0) count++;
    if ((toolCounts.get("submitReport") ?? 0) > 0) count++;
    if ((toolCounts.get("submitPrescription") ?? 0) > 0) count++;
    if ((toolCounts.get("submitReferralRequest") ?? 0) > 0) count++;
    return count;
}

type SeedToolPart = {
    type: string;
    state?: string;
    input?: unknown;
    args?: unknown;
    output?: unknown;
};

function clampSeedText(value: string, max = 220): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max)}…`;
}

function toCompactSeedJson(value: unknown, max = 280): string {
    if (value == null) return "";

    try {
        const seen = new WeakSet<object>();
        const json = JSON.stringify(value, (_key, current) => {
            if (typeof current === "string") {
                return clampSeedText(current, 120);
            }

            if (Array.isArray(current)) {
                if (current.length <= 6) return current;
                return [...current.slice(0, 6), `…(+${current.length - 6} more)`];
            }

            if (current && typeof current === "object") {
                if (seen.has(current as object)) {
                    return "[circular]";
                }
                seen.add(current as object);
            }

            return current;
        });

        if (!json) return "";
        if (json.length <= max) return json;
        return `${json.slice(0, max)}…`;
    } catch {
        return "";
    }
}

function summarizeAssistantToolPart(part: unknown): string {
    if (!isToolPart(part)) return "";

    const toolPart = part as SeedToolPart;
    const toolName = toolPart.type.startsWith("tool-")
        ? toolPart.type.slice(5)
        : toolPart.type;
    const state = toolPart.state ?? "unknown";
    if (state === "input-streaming") return "";

    const inputJson = toCompactSeedJson(toolPart.input ?? toolPart.args);
    const outputJson = toCompactSeedJson(toolPart.output);

    let summary = `[Tool ${toolName} • ${state}]`;
    if (inputJson) {
        summary += ` input=${inputJson}`;
    }
    if (outputJson) {
        summary += ` output=${outputJson}`;
    }

    return clampSeedText(summary, 500);
}

function extractGeminiLiveSeedText(message: UIMessage): string {
    if (message.role !== "user" && message.role !== "assistant") return "";

    const textParts: string[] = [];
    const toolParts: string[] = [];

    for (const part of message.parts) {
        if (isTextUIPart(part)) {
            textParts.push(part.text);
            continue;
        }

        if (message.role !== "assistant") continue;

        const toolSummary = summarizeAssistantToolPart(part);
        if (toolSummary) toolParts.push(toolSummary);
    }

    return [...textParts, ...toolParts].join("\n").trim();
}

function buildGeminiLiveSeedTurns(
    messages: readonly UIMessage[],
): ReadonlyArray<Readonly<{ role: "user" | "assistant"; text: string }>> {
    const turns: Array<Readonly<{ role: "user" | "assistant"; text: string }>> = [];

    for (const message of messages) {
        if (message.role !== "user" && message.role !== "assistant") continue;
        const text = extractGeminiLiveSeedText(message);

        if (!text) continue;
        turns.push({ role: message.role, text });
    }

    return turns.slice(-24);
}

/**
 * Build personalized greeting using formatted context.
 * Uses new utility from format-live-user-context.
 */
function buildGeminiLiveGreeting(
    profile: InputBarProps["liveProfileContext"],
): string {
    if (!profile?.name) {
        return "Hi there! I'm CareAI. How are you feeling today?";
    }

    const firstName = profile.name.split(" ")[0] ?? "there";
    const age = profile.dateOfBirth
        ? calculateAge(profile.dateOfBirth)
        : null;
    const ageStr = age && age >= 0 ? ` (${age})` : "";

    return `Hi ${firstName}${ageStr}! I'm CareAI. How are you feeling today?`;
}

/**
 * Calculate age from ISO date string (YYYY-MM-DD).
 */
function calculateAge(dateOfBirth: string): number | null {
    try {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < dob.getDate())
        ) {
            age--;
        }
        return age >= 0 && age < 150 ? age : null;
    } catch {
        return null;
    }
}

function pillFileIcon(mime: string, size = 16) {
    if (mime === "application/pdf") return <IconFileTypePdf size={size} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />;
    if (mime.includes("word")) return <IconFileWord size={size} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />;
    return <IconFile size={size} style={{ flexShrink: 0 }} />;
}

const TOOLBAR_ICON_SIZE = 32;

// ── Sub-components ───────────────────────────────────────────────────────────

function RecapIndicator({
    count,
    onOpen,
    size,
}: Readonly<{ count: number; onOpen?: () => void; size: number }>) {
    return (
        <Indicator inline disabled={count === 0} label={count} size={14} color="primary" offset={4}>
            <Tooltip label={count > 0 ? `${count} key findings` : "No findings yet"} withArrow position="top">
                <ActionIcon
                    size={size}
                    radius="xl"
                    color={count > 0 ? "primary" : "gray"}
                    variant={count > 0 ? "light" : "subtle"}
                    onClick={onOpen}
                    disabled={count === 0 || !onOpen}
                    aria-label="Session recap"
                >
                    <IconBookmarks size={17} />
                </ActionIcon>
            </Tooltip>
        </Indicator>
    );
}

function ContinuityIndicator({
    count,
    onOpen,
    size,
}: Readonly<{ count: number; onOpen?: () => void; size: number }>) {
    return (
        <Indicator inline disabled={count === 0} label={count} size={14} color="primary" offset={4}>
            <Tooltip label={count > 0 ? `${count} saved` : "No saved items"} withArrow position="top">
                <ActionIcon
                    size={size}
                    radius="xl"
                    color={count > 0 ? "primary" : "gray"}
                    variant={count > 0 ? "light" : "subtle"}
                    onClick={onOpen}
                    disabled={count === 0 || !onOpen}
                    aria-label="Continuity assessment"
                >
                    <IconStack2 size={17} />
                </ActionIcon>
            </Tooltip>
        </Indicator>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export function InputBar({
    input,
    onInputChange,
    isLoading,
    messages,
    status,
    onSend,
    creditsRemaining,
    onStop,
    onStopAndNewChat,
    isUploading = false,
    hasPendingToolCall = false,
    pendingFreeText,
    onAnswerFreeText,
    showDisclaimer = true,
    contextUsage,
    onOpenRecap,
    onOpenContinuity,
    liveProfileContext,
    sessionId,
    onLiveSessionMessage,
}: Readonly<InputBarProps>) {
    const isMobile = useMediaQuery("(max-width: 48em)");
    const toolbarIconSize = isMobile ? 28 : TOOLBAR_ICON_SIZE;
    const outOfCredits = creditsRemaining === 0;
    const hasBlockingToolCall = hasPendingToolCall && !pendingFreeText;
    const isBusy = isLoading || isUploading || hasBlockingToolCall;
    const [attachments, setAttachments] = useState<File[]>([]);
    const [existingFileAttachments, setExistingFileAttachments] = useState<FileRecord[]>([]);
    const [filePickerOpened, setFilePickerOpened] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
    const [focused, setFocused] = useState(false);
    const [geminiLiveOpen, setGeminiLiveOpen] = useState(false);
    const [geminiLiveConnected, setGeminiLiveConnected] = useState(false);
    const [liveMicStats, setLiveMicStats] = useState({
        micEnabled: false,
        bytesPerSecond: 0,
        totalBytes: 0,
        micLevel: 0,
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function fileKey(f: File) { return `${f.name}-${f.lastModified}`; }

    // Calculate recap and continuity indicators
    const recapCount = calculateRecapFindings(messages);
    const continuityCount = calculateContinuitySaved(messages);
    const liveSeedTurns = buildGeminiLiveSeedTurns(messages);
    const liveGreeting = buildGeminiLiveGreeting(liveProfileContext);

    // Re-focus the input after the AI finishes responding.
    useEffect(() => {
        if (!isBusy) textareaRef.current?.focus();
    }, [isBusy]);

    useEffect(() => {
        if (geminiLiveOpen) return;
        setGeminiLiveConnected(false);
        setLiveMicStats({
            micEnabled: false,
            bytesPerSecond: 0,
            totalBytes: 0,
            micLevel: 0,
        });
    }, [geminiLiveOpen]);

    const livePhaseLabel = (() => {
        if (!geminiLiveOpen) return "idle";
        if (geminiLiveConnected && liveMicStats.micEnabled) return "listening";
        if (geminiLiveConnected) return "connected";
        return "connecting";
    })();

    const livePhaseColor = (() => {
        if (livePhaseLabel === "listening") return "teal" as const;
        if (livePhaseLabel === "connected") return "blue" as const;
        return "primary" as const;
    })();

    // Auto-focus when a free-text question appears.
    useEffect(() => {
        if (pendingFreeText) textareaRef.current?.focus();
    }, [pendingFreeText]);

    // ── Hooks ─────────────────────────────────────────────────────────────────
    const { isListening, toggleMic } = useMic({ input, setInput: onInputChange });
    const { completeSession } = useLiveSessionCompletion({
        onSessionComplete: async (mergedMessage) => {
            // When live session ends, the merged message (with audio) should be added to chat
            console.log(
                "[InputBar] Live session completed:",
                {
                    kind: mergedMessage.kind,
                    contentPreview: mergedMessage.content.slice(0, 100),
                    agentType: mergedMessage.agentType,
                }
            );
            
            // Call parent callback to add the live message to the chat
            if (onLiveSessionMessage) {
                try {
                    await onLiveSessionMessage(mergedMessage);
                } catch (error) {
                    console.error("[InputBar] Failed to add live session message:", error);
                }
            }
            
            setGeminiLiveOpen(false);
            setGeminiLiveConnected(false);
        },
        onError: (error) => {
            console.error("[InputBar] Live session completion error:", error);
        },
    });

    // ── Attachment helpers ────────────────────────────────────────────────────
    function addFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        const newFiles = Array.from(files);
        setAttachments(prev => [...prev, ...newFiles]);
        setPreviewUrls(prev => {
            const next = new Map(prev);
            for (const f of newFiles) {
                if (!next.has(fileKey(f)) && f.type.startsWith("image/")) {
                    next.set(fileKey(f), URL.createObjectURL(f));
                }
            }
            return next;
        });
    }

    function removeAttachment(file: File) {
        const url = previewUrls.get(fileKey(file));
        if (url) URL.revokeObjectURL(url);
        setPreviewUrls(prev => { const n = new Map(prev); n.delete(fileKey(file)); return n; });
        setAttachments(prev => prev.filter(f => f !== file));
    }

    function removeExistingAttachment(id: string) {
        setExistingFileAttachments(prev => prev.filter(f => f.id !== id));
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    function handleSend() {
        const text = input.trim();

        // Route to free-text answer if a free_text question is pending
        if (pendingFreeText && text && onAnswerFreeText) {
            onInputChange("");
            onAnswerFreeText(pendingFreeText.toolCallId, text);
            return;
        }

        const hasFiles = attachments.length > 0 || existingFileAttachments.length > 0;
        if ((!text && !hasFiles) || outOfCredits) return;
        // Hard block: file upload in-flight or awaiting a tool-call response
        if (isUploading || hasBlockingToolCall) return;

        // If the AI is still streaming, stop and start a new session with this message
        if (isLoading) {
            onStop?.();
            onInputChange("");
            const filesToSend = attachments.length > 0
                ? (() => { const dt = new DataTransfer(); attachments.forEach(f => dt.items.add(f)); return dt.files; })()
                : undefined;
            const existingToSend = existingFileAttachments.length > 0 ? [...existingFileAttachments] : undefined;
            setPreviewUrls(prev => { prev.forEach(url => URL.revokeObjectURL(url)); return new Map(); });
            setAttachments([]);
            setExistingFileAttachments([]);
            onStopAndNewChat?.(text, filesToSend, existingToSend);
            return;
        }

        onInputChange("");

        const filesToSend = attachments.length > 0
            ? (() => {
                const dt = new DataTransfer();
                attachments.forEach(f => dt.items.add(f));
                return dt.files;
            })()
            : undefined;

        const existingToSend = existingFileAttachments.length > 0 ? [...existingFileAttachments] : undefined;

        // Revoke all preview URLs and clear attachment state
        setPreviewUrls(prev => {
            prev.forEach(url => URL.revokeObjectURL(url));
            return new Map();
        });
        setAttachments([]);
        setExistingFileAttachments([]);

        onSend(text, filesToSend, existingToSend);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }

    // ── Unified action button ─────────────────────────────────────────────────
    const hasContent = !!input.trim() || attachments.length > 0 || existingFileAttachments.length > 0;
    const totalAttachments = attachments.length + existingFileAttachments.length;
    const contextTotalTokens = (contextUsage?.inputTokens ?? 0) + (contextUsage?.outputTokens ?? 0);
    const contextMaxTokens = contextUsage?.maxTokens ?? 1_048_576;
    const contextPercent = Math.min(100, Math.round((contextTotalTokens / contextMaxTokens) * 100));
    const actionState = (() => {
        if (isUploading) return "uploading" as const;
        if (isListening) return "listening" as const;
        if (isLoading) return "streaming" as const;
        if (hasContent && !outOfCredits) return "send" as const;
        return "mic" as const;
    })();
    const actionCfg = {
        mic: {
            icon: <IconMicrophone size={17} />,
            color: "primary", variant: "light" as const,
            label: "Use microphone",
            onClick: toggleMic,
            disabled: isUploading || hasBlockingToolCall || outOfCredits,
        },
        send: {
            icon: <IconSend size={16} />,
            color: "primary", variant: "filled" as const,
            label: pendingFreeText ? "Submit answer (Enter)" : "Send (Enter)",
            onClick: handleSend,
            disabled: false,
        },
        listening: {
            icon: <IconMicrophoneOff size={17} />,
            color: "red", variant: "light" as const,
            label: "Stop recording",
            onClick: toggleMic,
            disabled: false,
        },
        streaming: {
            icon: <IconPlayerStopFilled size={16} />,
            color: "red", variant: "filled" as const,
            label: "Stop generating",
            onClick: onStop,
            disabled: false,
        },
        uploading: {
            icon: <Loader size={14} color="white" />,
            color: "primary", variant: "filled" as const,
            label: "Uploading…",
            onClick: undefined as (() => void) | undefined,
            disabled: true,
        },
    }[actionState];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Box
                style={{
                    flexShrink: 0,
                }}
            >
                <Box maw={760} mx="auto">
                    {/* Hidden file inputs */}
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" multiple style={{ display: "none" }}
                        onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                        onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />

                    {/* Floating card with shimmer border */}
                    <Box
                        style={{
                            borderRadius: 'calc(var(--mantine-radius-xl) + 1.5px)',
                            padding: '1.5px',
                            background: (focused || isLoading || !!pendingFreeText)
                                ? `conic-gradient(from var(--shimmer-angle), transparent 0%, transparent 55%, var(--mantine-color-primary-4) 70%, var(--mantine-color-violet-4) 78%, var(--mantine-color-primary-4) 86%, transparent 100%)`
                                : 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))',
                            boxShadow: 'var(--mantine-shadow-xl)',
                            animation: (focused || isLoading || !!pendingFreeText) ? 'shimmer-rotate 3s linear infinite' : 'none',
                        }}
                    >
                        <Card
                            radius="xl"
                            style={{
                                background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                                border: 'none',
                            }}
                        >
                            <Card.Section px="sm" py="sm">
                                {/* Inline attachment pills */}
                                {(attachments.length > 0 || existingFileAttachments.length > 0) && (
                                    <Group gap={6} px="sm" pt="xs" pb={0} wrap="wrap">
                                        {attachments.map((file) => {
                                            const isImg = file.type.startsWith("image/");
                                            return (
                                                <Group key={fileKey(file)} gap={6} wrap="nowrap" py={3} px={8}
                                                    style={{
                                                        borderRadius: 999,
                                                        background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))",
                                                        maxWidth: 180,
                                                        opacity: isUploading ? 0.6 : 1,
                                                        transition: `opacity ${motionTokens.duration.fast} ${motionTokens.easing.standard}`,
                                                    }}
                                                >
                                                    {(() => {
                                                        if (isUploading) return <Loader size={14} />;
                                                        if (isImg) return <Image src={previewUrls.get(fileKey(file)) ?? ""} w={24} h={24} radius="sm" fit="cover" alt="" style={{ flexShrink: 0 }} />;
                                                        return pillFileIcon(file.type);
                                                    })()}
                                                    <Text size="xs" fw={500} truncate style={{ maxWidth: 100 }}>{file.name}</Text>
                                                    {!isUploading && <CloseButton size={14} radius="xl" onClick={() => removeAttachment(file)} aria-label="Remove" />}
                                                </Group>
                                            );
                                        })}
                                        {existingFileAttachments.map((file) => {
                                            const isImg = file.mimeType.startsWith("image/");
                                            return (
                                                <Group key={file.id} gap={6} wrap="nowrap" py={3} px={8}
                                                    style={{
                                                        borderRadius: 999,
                                                        background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.08))",
                                                        border: "1px solid light-dark(var(--mantine-color-primary-2), rgba(107,79,248,0.2))",
                                                        maxWidth: 180,
                                                    }}
                                                >
                                                    {isImg && (file.thumbnailUrl ?? file.downloadUrl)
                                                        ? <Image src={file.thumbnailUrl ?? file.downloadUrl!} w={24} h={24} radius="sm" fit="cover" alt="" style={{ flexShrink: 0 }} />
                                                        : pillFileIcon(file.mimeType)}
                                                    <Text size="xs" fw={500} truncate c="primary" style={{ maxWidth: 100 }}>{file.name}</Text>
                                                    <CloseButton size={14} radius="xl" onClick={() => removeExistingAttachment(file.id)} aria-label="Remove" />
                                                </Group>
                                            );
                                        })}
                                    </Group>
                                )}

                                {/* Free-text answer indicator */}
                                {pendingFreeText && (
                                    <Group gap={6} px="md" pt="sm">
                                        <Badge size="xs" color="primary" variant="light" radius="sm">Answering</Badge>
                                        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>{pendingFreeText.question}</Text>
                                    </Group>
                                )}

                                {/* Inline Gemini Live status */}
                                {geminiLiveOpen && (
                                    <Group
                                        gap={8}
                                        px="md"
                                        pt="sm"
                                        pb={0}
                                        wrap="nowrap"
                                        style={{
                                            animation: "live-glow 1.8s ease-in-out infinite",
                                        }}
                                    >
                                        <Group gap={3} wrap="nowrap" aria-hidden>
                                            <Box className="live-wave-bar" style={{ height: 8 }} />
                                            <Box className="live-wave-bar" style={{ height: 12, animationDelay: "120ms" }} />
                                            <Box className="live-wave-bar" style={{ height: 16, animationDelay: "240ms" }} />
                                            <Box className="live-wave-bar" style={{ height: 10, animationDelay: "360ms" }} />
                                        </Group>
                                        <Badge size="xs" radius="sm" color={livePhaseColor} variant="light">
                                            Gemini Live • {livePhaseLabel}
                                        </Badge>
                                        <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
                                            Mic: {Math.round(liveMicStats.micLevel * 100)}% · Tx: {Math.round(liveMicStats.bytesPerSecond / 1024)} KB/s
                                        </Text>
                                        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                                            Sent: {Math.round(liveMicStats.totalBytes / 1024)} KB
                                        </Text>
                                    </Group>
                                )}

                                {/* Textarea */}
                                <Textarea
                                    ref={textareaRef}
                                    placeholder={(() => {
                                        if (pendingFreeText) return "Type your answer…";
                                        if (hasBlockingToolCall) return "Please respond to the question above first…";
                                        return "Describe your symptoms…";
                                    })()}
                                    minRows={1} maxRows={6} autosize
                                    autoFocus
                                    value={input}
                                    onChange={e => onInputChange(e.currentTarget.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    disabled={isUploading || hasBlockingToolCall || outOfCredits}
                                    variant="unstyled"
                                    px="sm"
                                    styles={{
                                        input: {
                                            paddingTop: "var(--mantine-spacing-sm)",
                                            paddingBottom: "var(--mantine-spacing-xs)",
                                            fontSize: isMobile ? "16px" : "var(--mantine-font-size-sm)",
                                            lineHeight: 1.6,
                                            resize: "none",
                                            backgroundColor: "transparent",
                                        },
                                    }}
                                />

                                {/* Toolbar */}
                                <Stack gap={4} mt="xs" px={0}>
                                    <Group justify="space-between" gap={6} wrap="nowrap">
                                        <Group gap={6} wrap="nowrap">
                                            {/* Unified file attach menu — Gemini-style "+" button */}
                                            <Menu shadow="md" radius="lg" position="top-start" withArrow arrowPosition="center">
                                                <Menu.Target>
                                                    <Indicator inline disabled={totalAttachments === 0} label={totalAttachments} size={14} color="primary" offset={4}>
                                                        <ActionIcon
                                                            size={toolbarIconSize}
                                                            radius="xl"
                                                            color={totalAttachments > 0 ? "primary" : "gray"}
                                                            variant={totalAttachments > 0 ? "light" : "subtle"}
                                                            disabled={isUploading || hasBlockingToolCall || outOfCredits}
                                                            aria-label="Attach files"
                                                        >
                                                            <IconPlus size={17} style={{
                                                                transition: `transform ${motionTokens.duration.fast} ${motionTokens.easing.standard}`,
                                                            }} />
                                                        </ActionIcon>
                                                    </Indicator>
                                                </Menu.Target>
                                                <Menu.Dropdown>
                                                    <Menu.Item
                                                        leftSection={<IconPaperclip size={16} />}
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        Upload from device
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<IconFolderOpen size={16} />}
                                                        onClick={() => setFilePickerOpened(true)}
                                                    >
                                                        Browse my files
                                                    </Menu.Item>
                                                    <Menu.Item
                                                        leftSection={<IconCamera size={16} />}
                                                        onClick={() => cameraInputRef.current?.click()}
                                                    >
                                                        Take a photo
                                                    </Menu.Item>
                                                </Menu.Dropdown>
                                            </Menu>
                                            <RecapIndicator count={recapCount} onOpen={onOpenRecap} size={toolbarIconSize} />
                                            <ContinuityIndicator count={continuityCount} onOpen={onOpenContinuity} size={toolbarIconSize} />
                                            <Tooltip label={geminiLiveOpen ? "Close Gemini Live" : "Start Gemini Live"} withArrow position="top">
                                                <ActionIcon
                                                    size={toolbarIconSize}
                                                    radius="xl"
                                                    color="primary"
                                                    variant={geminiLiveOpen ? "filled" : "subtle"}
                                                    onClick={() => setGeminiLiveOpen((prev) => !prev)}
                                                    aria-label={geminiLiveOpen ? "Close Gemini Live" : "Start Gemini Live"}
                                                >
                                                    <IconWaveSine size={17} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>

                                        <Group gap={6} wrap="nowrap">
                                            {!isMobile && (
                                                <ContextUsageIndicator
                                                    inputTokens={contextUsage?.inputTokens ?? 0}
                                                    outputTokens={contextUsage?.outputTokens ?? 0}
                                                    maxTokens={contextUsage?.maxTokens ?? 1_048_576}
                                                />
                                            )}
                                            {isMobile && (
                                                <Menu shadow="md" radius="lg" position="top-end" withArrow arrowPosition="center">
                                                    <Menu.Target>
                                                        <ActionIcon
                                                            size={toolbarIconSize}
                                                            radius="xl"
                                                            color="gray"
                                                            variant="subtle"
                                                            aria-label="More input bar info"
                                                        >
                                                            <IconDots size={17} />
                                                        </ActionIcon>
                                                    </Menu.Target>
                                                    <Menu.Dropdown>
                                                        <Menu.Label>Conversation status</Menu.Label>
                                                        <Menu.Item leftSection={<IconBookmarks size={16} />}>
                                                            Context: {contextPercent}% used
                                                        </Menu.Item>
                                                    </Menu.Dropdown>
                                                </Menu>
                                            )}
                                            <Tooltip label={actionCfg.label} withArrow position="top">
                                                <ActionIcon
                                                    size={toolbarIconSize}
                                                    radius="xl"
                                                    color={actionCfg.color}
                                                    variant={actionCfg.variant}
                                                    disabled={actionCfg.disabled}
                                                    onClick={actionCfg.onClick}
                                                    aria-label={actionCfg.label}
                                                    style={{
                                                        transition: `all ${motionTokens.duration.fast} ${motionTokens.easing.standard}`,
                                                        ...(actionState === "listening" ? { animation: "pulse-ring 1.2s ease-in-out infinite" } : {}),
                                                    }}
                                                >
                                                    {actionCfg.icon}
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                </Stack>
                            </Card.Section>
                        </Card>
                    </Box>
                    {showDisclaimer && (
                        <Box mt="xs" mb={0}>
                            <Text size="xs" c="dimmed" ta="center" style={{ opacity: 0.7 }}>
                                CareAI is not a substitute for professional medical advice. Always consult a qualified doctor.
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Pulse animation for mic listening state + shimmer border */}
            <style>{`
                @property --shimmer-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
                @keyframes shimmer-rotate { to { --shimmer-angle: 360deg; } }
                @keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(250,82,82,.55)}100%{box-shadow:0 0 0 7px rgba(250,82,82,0)}}
                @keyframes live-glow{0%{opacity:.85}50%{opacity:1}100%{opacity:.85}}
                @keyframes live-wave{0%{transform:scaleY(.55)}50%{transform:scaleY(1)}100%{transform:scaleY(.55)}}
                .live-wave-bar{width:3px;border-radius:99px;background:var(--mantine-color-primary-5);animation:live-wave 900ms ease-in-out infinite;transform-origin:center;}
            `}</style>

            <GeminiLiveStandalone
                title="Gemini Live"
                sessionId={sessionId}
                autoConnect={geminiLiveOpen}
                autoStartMic={geminiLiveOpen}
                renderUi={false}
                seedTurns={liveSeedTurns}
                connectGreeting={liveGreeting}
                onConnectionChange={setGeminiLiveConnected}
                onInputTranscription={(text) => {
                    if (!text.trim()) return;
                    onInputChange(text);
                }}
                onMessageWithAudio={async (message) => {
                    // When live generates an audio message, immediately add it to chat
                    if (onLiveSessionMessage) {
                        try {
                            await onLiveSessionMessage({
                                id: message.id,
                                content: JSON.stringify(message.parts),
                                kind: "audio",
                                agentType: "live",
                            });
                        } catch (error) {
                            console.error("[InputBar] Failed to add audio message:", error);
                        }
                    }
                }}
                onMicStatsChange={(stats) => {
                    setLiveMicStats((prev) => {
                        const sameEnabled = prev.micEnabled === stats.micEnabled;
                        const sameBps = prev.bytesPerSecond === stats.bytesPerSecond;
                        const sameTotal = prev.totalBytes === stats.totalBytes;
                        const sameLevel = Math.abs(prev.micLevel - stats.micLevel) < 0.02;

                        if (sameEnabled && sameBps && sameTotal && sameLevel) {
                            return prev;
                        }

                        return {
                            micEnabled: stats.micEnabled,
                            micLevel: stats.micLevel,
                            bytesPerSecond: stats.bytesPerSecond,
                            totalBytes: stats.totalBytes,
                        };
                    });
                }}
                onSessionComplete={async (liveData) => {
                    await completeSession(liveData);
                }}
            />

            {/* File picker drawer */}
            <FilePickerDrawer
                opened={filePickerOpened}
                onClose={() => setFilePickerOpened(false)}
                onConfirm={(selectedRecords, newFiles) => {
                    if (selectedRecords.length > 0) {
                        setExistingFileAttachments(prev => {
                            const existingIds = new Set(prev.map(f => f.id));
                            return [...prev, ...selectedRecords.filter(r => !existingIds.has(r.id))];
                        });
                    }
                    if (newFiles.length > 0) {
                        setAttachments(prev => [...prev, ...newFiles]);
                    }
                }}
            />

        </>
    );
}
