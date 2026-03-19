"use client";
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Card,
    CloseButton,
    Group,
    Image,
    Indicator,
    Loader,
    Menu,
    Text,
    Textarea,
    Tooltip,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconCamera,
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
} from "@tabler/icons-react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { motion as motionTokens } from "@/ui/tokens";

import { useMic } from "@/ui/ai/hooks/use-mic";
import { useLiveSpeech } from "@/ui/ai/hooks/use-live-speech";
import { LiveOverlay } from "@/ui/ai/components/live-overlay";
import { FilePickerDrawer } from "./file-picker-drawer";
import type { FileRecord } from "@/ui/ai/query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InputBarProps {
    /** Controlled input value — owned by the parent so starter cards can set it. */
    input: string;
    onInputChange: (value: string) => void;
    isLoading: boolean;
    /** Passed through to `useLiveSpeech` for TTS trigger detection. */
    messages: UIMessage[];
    /** Passed through to `useLiveSpeech` to gate TTS until streaming ends. */
    status: string;
    /** Called for normal user messages. New local files + selected existing FileRecords. */
    onSend: (text: string, files?: FileList, existingFiles?: FileRecord[]) => void;
    /** Remaining daily credits (0 disables sending). Undefined = loading. */
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pillFileIcon(mime: string, size = 16) {
    if (mime === "application/pdf") return <IconFileTypePdf size={size} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />;
    if (mime.includes("word")) return <IconFileWord size={size} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />;
    return <IconFile size={size} style={{ flexShrink: 0 }} />;
}

const TOOLBAR_ICON_SIZE = 32;
// ── Component ─────────────────────────────────────────────────────────────────

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
}: Readonly<InputBarProps>) {
    const outOfCredits = creditsRemaining === 0;
    const isBusy = isLoading || isUploading || hasPendingToolCall;
    const [attachments, setAttachments] = useState<File[]>([]);
    const [existingFileAttachments, setExistingFileAttachments] = useState<FileRecord[]>([]);
    const [filePickerOpened, setFilePickerOpened] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
    const [focused, setFocused] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function fileKey(f: File) { return `${f.name}-${f.lastModified}`; }

    // Re-focus the input after the AI finishes responding.
    useEffect(() => {
        if (!isBusy) textareaRef.current?.focus();
    }, [isBusy]);

    // Auto-focus when a free-text question appears.
    useEffect(() => {
        if (pendingFreeText) textareaRef.current?.focus();
    }, [pendingFreeText]);

    // ── Hooks ─────────────────────────────────────────────────────────────────
    const { isListening, toggleMic } = useMic({ input, setInput: onInputChange });

    const { liveMode, livePhase, liveTranscript, liveAIText, openLive, closeLive } =
        useLiveSpeech({ onSendMessage: (text) => onSend(text), messages, status });

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
        if (isUploading || hasPendingToolCall) return;

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
            color: "gray", variant: "subtle" as const,
            label: "Use microphone",
            onClick: toggleMic,
            disabled: isUploading || hasPendingToolCall || outOfCredits,
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
                    {/* Out-of-credits warning */}
                    {outOfCredits && (
                        <Alert
                            icon={<IconAlertCircle size={18} />}
                            color="orange"
                            variant="light"
                            mb={10}
                            radius="lg"
                            title="Daily credits exhausted"
                        >
                            {(() => {
                                const now = new Date();
                                const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
                                const formatted = reset.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
                                return `You've used all 10 free credits for today. They reset at ${formatted}.`;
                            })()}
                        </Alert>
                    )}

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

                                {/* Textarea */}
                                <Textarea
                                    ref={textareaRef}
                                    placeholder={(() => {
                                        if (pendingFreeText) return "Type your answer…";
                                        if (hasPendingToolCall) return "Please respond to the question above first…";
                                        return "Describe your symptoms…";
                                    })()}
                                    minRows={1} maxRows={6} autosize
                                    autoFocus
                                    value={input}
                                    onChange={e => onInputChange(e.currentTarget.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    disabled={isUploading || hasPendingToolCall || outOfCredits}
                                    variant="unstyled"
                                    styles={{
                                        input: {
                                            paddingTop: "var(--mantine-spacing-md)",
                                            paddingBottom: "var(--mantine-spacing-xs)",
                                            paddingLeft: "var(--mantine-spacing-md)",
                                            paddingRight: "var(--mantine-spacing-md)",
                                            fontSize: "var(--mantine-font-size-sm)",
                                            lineHeight: 1.6,
                                            resize: "none",
                                            backgroundColor: "transparent",
                                        },
                                    }}
                                />

                                {/* Toolbar */}
                                <Group justify="space-between" mt="md" px={0} gap={4}>
                                    {/* Unified file attach menu — Gemini-style "+" button */}
                                    <Menu shadow="md" radius="lg" position="top-start" withArrow arrowPosition="center">
                                        <Menu.Target>
                                            <Indicator inline disabled={totalAttachments === 0} label={totalAttachments} size={14} color="primary" offset={4}>
                                                <ActionIcon
                                                    size={TOOLBAR_ICON_SIZE}
                                                    radius="xl"
                                                    color={totalAttachments > 0 ? "primary" : "gray"}
                                                    variant={totalAttachments > 0 ? "light" : "subtle"}
                                                    disabled={isUploading || hasPendingToolCall || outOfCredits}
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
                                    {/* Unified action button — morphs between mic / send / stop / upload */}
                                    <Group gap={4}>
                                        <Tooltip label={actionCfg.label} withArrow position="top">
                                            <ActionIcon
                                                size={TOOLBAR_ICON_SIZE}
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
                            </Card.Section>
                        </Card>
                    </Box>
                    {showDisclaimer && (
                        <Box my="md">
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
            `}</style>

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

            {/* Live overlay — rendered outside the box so it overlays the full page */}
            {liveMode && (
                <LiveOverlay
                    livePhase={livePhase}
                    liveAIText={liveAIText}
                    liveTranscript={liveTranscript}
                    onClose={closeLive}
                />
            )}
        </>
    );
}
