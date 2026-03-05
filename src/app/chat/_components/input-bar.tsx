"use client";
import {
    ActionIcon,
    Alert,
    Box,
    CloseButton,
    Group,
    Image,
    Loader,
    Paper,
    Text,
    Textarea,
    Tooltip,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconCamera,
    IconFileTypePdf,
    IconFileWord,
    IconMicrophone,
    IconMicrophoneOff,
    IconPaperclip,
    IconPlayerStopFilled,
    IconSend,
    IconWaveSine,
} from "@tabler/icons-react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";

import { useMic } from "@/app/chat/_hooks/use-mic";
import { useLiveSpeech } from "@/app/chat/_hooks/use-live-speech";
import { LiveOverlay } from "@/app/chat/_components/live-overlay";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InputBarProps {
    /** Controlled input value — owned by the parent so starter cards can set it. */
    input: string;
    onInputChange: (value: string) => void;
    isLoading: boolean;
    /** Non-null when the AI asked a free-text question — routes the reply via `onAnswerFreeText`. */
    pendingFreeTextId: string | null;
    /** Passed through to `useLiveSpeech` for TTS trigger detection. */
    messages: UIMessage[];
    /** Passed through to `useLiveSpeech` to gate TTS until streaming ends. */
    status: string;
    /** Called for normal user messages. */
    onSend: (text: string, files?: FileList) => void;
    /** Called when the user answers a pending free-text tool question. */
    onAnswerFreeText: (toolCallId: string, answer: string) => void;
    /** Remaining daily credits (0 disables sending). Undefined = loading. */
    creditsRemaining?: number;
    /** Stops the current AI response stream. */
    onStop?: () => void;
    /** True while file uploads are in flight (before the AI stream starts). */
    isUploading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InputBar({
    input,
    onInputChange,
    isLoading,
    pendingFreeTextId,
    messages,
    status,
    onSend,
    onAnswerFreeText,
    creditsRemaining,
    onStop,
    isUploading = false,
}: Readonly<InputBarProps>) {
    const outOfCredits = creditsRemaining === 0;
    const isBusy = isLoading || isUploading;
    const [attachments, setAttachments] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewURLs = useRef<Map<File, string>>(new Map());

    // Re-focus the input after the AI finishes responding.
    useEffect(() => {
        if (!isBusy) textareaRef.current?.focus();
    }, [isBusy]);

    // ── Hooks ─────────────────────────────────────────────────────────────────
    const { isListening, toggleMic } = useMic({ input, setInput: onInputChange });

    const { liveMode, livePhase, liveTranscript, liveAIText, closeLive } =
        useLiveSpeech({
            messages,
            status,
            onSendMessage: (text) => onSend(text),
        });

    // ── Attachment helpers ────────────────────────────────────────────────────
    function getPreviewURL(file: File): string {
        if (!previewURLs.current.has(file)) {
            previewURLs.current.set(file, URL.createObjectURL(file));
        }
        return previewURLs.current.get(file)!;
    }

    function addFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setAttachments(prev => [...prev, ...Array.from(files)]);
    }

    function removeAttachment(file: File) {
        const url = previewURLs.current.get(file);
        if (url) URL.revokeObjectURL(url);
        previewURLs.current.delete(file);
        setAttachments(prev => prev.filter(f => f !== file));
    }

    // ── Send ──────────────────────────────────────────────────────────────────
    function handleSend() {
        const text = input.trim();
        if ((!text && attachments.length === 0) || isBusy || outOfCredits) return;
        onInputChange("");

        const filesToSend = attachments.length > 0
            ? (() => {
                const dt = new DataTransfer();
                attachments.forEach(f => dt.items.add(f));
                return dt.files;
            })()
            : undefined;

        attachments.forEach(f => {
            const u = previewURLs.current.get(f);
            if (u) URL.revokeObjectURL(u);
            previewURLs.current.delete(f);
        });
        setAttachments([]);

        if (pendingFreeTextId) {
            onAnswerFreeText(pendingFreeTextId, text);
        } else {
            onSend(text, filesToSend);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <Box
                px="md"
                style={{
                    flexShrink: 0,
                    paddingBottom: 16,
                    paddingTop: 0,
                    background: "linear-gradient(to bottom, transparent, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8)) 40%)",
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

                    {/* Floating card */}
                    <Paper
                        radius="xl"
                        style={{
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "light-dark(0 4px 24px rgba(0,0,0,0.10), 0 4px 32px rgba(0,0,0,0.40))",
                            border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                            background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                        }}
                    >
                        {/* Attachment previews — inside the card */}
                        {attachments.length > 0 && (
                            <Group gap={8} px="md" pt="md" wrap="wrap">
                                {attachments.map((file) => (
                                    <Box key={`${file.name}-${file.lastModified}`} style={{ position: "relative", display: "inline-block" }}>
                                        {(file.type === "application/pdf" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") ? (
                                            <Paper withBorder radius="md" px="sm" py={6}
                                                style={{ display: "flex", alignItems: "center", gap: 6, height: 64, maxWidth: 200, opacity: isUploading ? 0.6 : 1, transition: "opacity 0.2s" }}>
                                                {file.type === "application/pdf"
                                                    ? <IconFileTypePdf size={24} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />
                                                    : <IconFileWord size={24} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />}
                                                <Box style={{ overflow: "hidden" }}>
                                                    <Text size="xs" fw={600} truncate>{file.name}</Text>
                                                    <Text size="xs" c="dimmed">{isUploading ? "Uploading…" : `${(file.size / 1024).toFixed(0)} KB`}</Text>
                                                </Box>
                                            </Paper>
                                        ) : (
                                            <Box style={{ position: "relative" }}>
                                                <Image src={getPreviewURL(file)} w={64} h={64} radius="md"
                                                    style={{ objectFit: "cover", border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))", opacity: isUploading ? 0.5 : 1, transition: "opacity 0.2s" }}
                                                    alt={file.name}
                                                />
                                                {isUploading && (
                                                    <Box style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--mantine-radius-md)" }}>
                                                        <Loader size="xs" color="white" />
                                                    </Box>
                                                )}
                                            </Box>
                                        )}
                                        {!isUploading && (
                                            <CloseButton size="xs" radius="xl"
                                                style={{ position: "absolute", top: -6, right: -6, background: "var(--mantine-color-dark-7)", color: "white" }}
                                                onClick={() => removeAttachment(file)} aria-label="Remove attachment"
                                            />
                                        )}
                                    </Box>
                                ))}
                            </Group>
                        )}

                        {/* Textarea */}
                        <Textarea
                            ref={textareaRef}
                            placeholder={pendingFreeTextId ? "Type your answer…" : "Describe your symptoms…"}
                            minRows={1} maxRows={6} autosize
                            autoFocus
                            value={input}
                            onChange={e => onInputChange(e.currentTarget.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isBusy || outOfCredits}
                            variant="unstyled"
                            styles={{
                                input: {
                                    paddingTop: 16,
                                    paddingBottom: 8,
                                    paddingLeft: 20,
                                    paddingRight: 20,
                                    fontSize: "var(--mantine-font-size-sm)",
                                    lineHeight: 1.6,
                                    resize: "none",
                                },
                            }}
                        />

                        {/* Toolbar */}
                        <Group justify="space-between" px="sm" pb="sm" pt={4} gap={4}>
                            <Group gap={2}>
                                <Tooltip label="Upload image or document (PDF, DOCX · max 10 MB)" withArrow position="top">
                                    <ActionIcon size={36} radius="xl" color="gray" variant="subtle" disabled={isBusy}
                                        onClick={() => fileInputRef.current?.click()} aria-label="Upload image or document">
                                        <IconPaperclip size={17} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Take photo" withArrow position="top">
                                    <ActionIcon size={36} radius="xl" color="gray" variant="subtle" disabled={isBusy}
                                        onClick={() => cameraInputRef.current?.click()} aria-label="Take photo">
                                        <IconCamera size={17} />
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label={isListening ? "Stop recording" : "Use microphone"} withArrow position="top">
                                    <ActionIcon size={36} radius="xl"
                                        color={isListening ? "red" : "gray"}
                                        variant={isListening ? "light" : "subtle"}
                                        disabled={isBusy}
                                        onClick={toggleMic}
                                        aria-label={isListening ? "Stop recording" : "Use microphone"}
                                        style={isListening ? { animation: "pulse 1.2s ease-in-out infinite" } : undefined}>
                                        {isListening ? <IconMicrophoneOff size={17} /> : <IconMicrophone size={17} />}
                                    </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Live conversation — coming soon" withArrow position="top">
                                    <ActionIcon size={36} radius="xl" color="gray" variant="subtle" disabled
                                        aria-label="Live conversation — coming soon"
                                        style={{ opacity: 0.35, cursor: "not-allowed" }}>
                                        <IconWaveSine size={17} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                            {isLoading ? (
                                <Tooltip label="Stop generating" withArrow position="top">
                                    <ActionIcon size={36} radius="xl" color="red" variant="filled"
                                        onClick={onStop} aria-label="Stop generating">
                                        <IconPlayerStopFilled size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            ) : isUploading ? (
                                <ActionIcon size={36} radius="xl" color="primary" variant="filled" disabled aria-label="Uploading">
                                    <Loader size={14} color="white" />
                                </ActionIcon>
                            ) : (
                                <Tooltip label="Send (Enter)" withArrow position="top">
                                    <ActionIcon size={36} radius="xl" color="primary" variant="filled"
                                        disabled={(!input.trim() && attachments.length === 0) || outOfCredits}
                                        onClick={handleSend} aria-label="Send">
                                        <IconSend size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </Group>
                    </Paper>

                    <Text size="xs" c="dimmed" ta="center" mt={10}>
                        CareAI is not a substitute for professional medical advice. Always consult a qualified doctor.
                    </Text>
                </Box>
            </Box>

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
