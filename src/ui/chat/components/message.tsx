"use client";
import {
    ActionIcon,
    Avatar,
    Box,
    Button,
    Group,
    Image,
    Loader,
    Modal,
    Paper,
    Popover,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconCoins,
    IconExternalLink,
    IconFileTypePdf,
    IconFileWord,
    IconFlag,
    IconHeartbeat,
    IconPencil,
    IconThumbDown,
    IconThumbUp,
    IconUser,
    IconX,
} from "@tabler/icons-react";
import type { UIMessagePart, UIDataTypes, UITools, ChatStatus } from "ai";
import { useOptimistic, useTransition, useState, useRef, useLayoutEffect } from "react";
import { MarkdownContent } from "@/ui/chat/components/markdown";
import { useChatContext } from "@/ui/chat/context/chat-context";

// ── Report modal content ─────────────────────────────────────────────────────

function ReportModalContent({ onSubmit }: Readonly<{ onSubmit: (text: string) => Promise<void> }>) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    return (
        <Stack gap="md">
            <Text size="sm" c="dimmed">
                Let us know what went wrong with this response. Your feedback helps us improve CareAI.
            </Text>
            <Textarea
                label="Describe the issue"
                placeholder="e.g. The response was inaccurate, didn't answer my question, or felt inappropriate…"
                minRows={3}
                maxRows={6}
                autosize
                value={text}
                onChange={(e) => setText(e.currentTarget.value)}
                autoFocus
            />
            <Button
                fullWidth
                color="primary"
                loading={loading}
                disabled={!text.trim()}
                onClick={async () => {
                    setLoading(true);
                    await onSubmit(text.trim());
                }}
            >
                Submit Report
            </Button>
        </Stack>
    );
}

// ── Feedback bar (like / dislike / report) ────────────────────────────────────

function FeedbackBar({ msgId }: Readonly<{ msgId: string }>) {
    const { sessionId } = useChatContext();
    const [committedReaction, setCommittedReaction] = useState<"like" | "dislike" | null>(null);
    const [optimisticReaction, addOptimisticReaction] = useOptimistic(
        committedReaction,
        (_current: "like" | "dislike" | null, next: "like" | "dislike" | null) => next,
    );
    const [reported, setReported] = useState(false);
    const [, startTransition] = useTransition();

    async function submitFeedback(type: "like" | "dislike" | "report", text?: string) {
        await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msgId, sessionId, type, text: text ?? null }),
        });
    }

    function handleReaction(r: "like" | "dislike") {
        const next = committedReaction === r ? null : r;
        startTransition(async () => {
            addOptimisticReaction(next);
            if (next) await submitFeedback(next);
            setCommittedReaction(next);
        });
    }

    function handleReport() {
        modals.open({
            title: "Report this response",
            children: (
                <ReportModalContent
                    onSubmit={async (text) => {
                        await submitFeedback("report", text);
                        setReported(true);
                        modals.closeAll();
                        notifications.show({
                            message: "Report submitted — thank you for your feedback.",
                            color: "teal",
                        });
                    }}
                />
            ),
        });
    }

    return (
        <>
            <ActionIcon
                size={28}
                variant={optimisticReaction === "like" ? "filled" : "subtle"}
                color={optimisticReaction === "like" ? "teal" : "gray"}
                onClick={() => handleReaction("like")}
                aria-label="Helpful"
                title="Helpful"
                style={{ opacity: optimisticReaction === null ? 0.45 : 1 }}
            >
                <IconThumbUp size={15} />
            </ActionIcon>
            <ActionIcon
                size={28}
                variant={optimisticReaction === "dislike" ? "filled" : "subtle"}
                color={optimisticReaction === "dislike" ? "red" : "gray"}
                onClick={() => handleReaction("dislike")}
                aria-label="Not helpful"
                title="Not helpful"
                style={{ opacity: optimisticReaction === null ? 0.45 : 1 }}
            >
                <IconThumbDown size={15} />
            </ActionIcon>
            <ActionIcon
                size={28}
                variant={reported ? "filled" : "subtle"}
                color={reported ? "orange" : "gray"}
                onClick={handleReport}
                disabled={reported}
                aria-label="Report an issue"
                title="Report an issue"
                style={{ opacity: reported ? 1 : 0.45 }}
            >
                <IconFlag size={15} />
            </ActionIcon>
        </>
    );
}

// ── File attachment message ───────────────────────────────────────────────────

interface FileMessageProps {
    part: UIMessagePart<UIDataTypes, UITools> & { type: "file"; url: string; mediaType: string };
    isUser: boolean;
}

export function FileMessage({ part, isUser }: Readonly<FileMessageProps>) {
    const isPdf = part.mediaType === "application/pdf";
    const isWord = part.mediaType.includes("word") || part.mediaType.includes("officedocument.wordprocessing");
    const isImage = part.mediaType.startsWith("image/");
    const [lightboxOpen, { open: openLightbox, close: closeLightbox }] = useDisclosure(false);

    function handleClick() {
        if (isImage) {
            openLightbox();
        } else {
            window.open(part.url, "_blank", "noopener,noreferrer");
        }
    }

    return (
        <Group justify={isUser ? "flex-end" : "flex-start"}>
            {isImage ? (
                <>
                    <Tooltip label="Click to preview" withArrow position="top">
                        <Box
                            onClick={handleClick}
                            style={{ cursor: "zoom-in", borderRadius: "var(--mantine-radius-md)", overflow: "hidden", display: "inline-block", position: "relative" }}
                        >
                            <Image
                                src={part.url}
                                maw={280}
                                mah={320}
                                radius="md"
                                fit="contain"
                                style={{ border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))", display: "block" }}
                                alt="attachment"
                            />
                        </Box>
                    </Tooltip>
                    <Modal
                        opened={lightboxOpen}
                        onClose={closeLightbox}
                        size="xl"
                        centered
                        withCloseButton={false}
                        overlayProps={{ blur: 4 }}
                        styles={{
                            content: { background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" },
                            body: { padding: "var(--mantine-spacing-sm)" },
                        }}
                    >
                        <Box style={{ position: "relative" }}>
                            <Group justify="flex-end" mb="xs" gap="xs">
                                <Tooltip label="Open in new tab" withArrow position="top">
                                    <ActionIcon
                                        size={32}
                                        radius="xl"
                                        color="gray"
                                        variant="light"
                                        component="a"
                                        href={part.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="Open in new tab"
                                    >
                                        <IconExternalLink size={16} />
                                    </ActionIcon>
                                </Tooltip>
                                <ActionIcon
                                    size={32}
                                    radius="xl"
                                    color="gray"
                                    variant="light"
                                    onClick={closeLightbox}
                                    aria-label="Close preview"
                                >
                                    <IconX size={16} />
                                </ActionIcon>
                            </Group>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={part.url}
                                alt="attachment preview"
                                style={{ display: "block", maxWidth: "100%", maxHeight: "75vh", margin: "0 auto", borderRadius: "var(--mantine-radius-md)", objectFit: "contain" }}
                            />
                        </Box>
                    </Modal>
                </>
            ) : (
                <Tooltip label="Click to open" withArrow position="top">
                    <Paper
                        withBorder
                        radius="md"
                        px="sm"
                        py={6}
                        onClick={handleClick}
                        style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 260, cursor: "pointer" }}
                    >
                        {(() => {
                            if (isPdf) return <IconFileTypePdf size={24} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />;
                            if (isWord) return <IconFileWord size={24} color="var(--mantine-color-blue-6)" style={{ flexShrink: 0 }} />;
                            return <IconExternalLink size={24} color="var(--mantine-color-gray-6)" style={{ flexShrink: 0 }} />;
                        })()}
                        <Box style={{ minWidth: 0, flex: 1 }}>
                            <Text size="sm" fw={600} truncate>
                                {(() => {
                                    if (isPdf) return "PDF Document";
                                    if (isWord) return "Word Document";
                                    return "File";
                                })()}
                            </Text>
                            <Text size="xs" c="dimmed">Click to open</Text>
                        </Box>
                        <IconExternalLink size={14} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0, opacity: 0.5 }} />
                    </Paper>
                </Tooltip>
            )}
        </Group>
    );
}

// ── Token usage badge ─────────────────────────────────────────────────────────

function formatTokenCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

function TokenUsageBadge({ usage }: Readonly<{ usage: { promptTokens: number; completionTokens: number; totalTokens: number } }>) {
    return (
        <Popover width={220} position="bottom-start" shadow="md" withArrow>
            <Popover.Target>
                <ActionIcon
                    size={28}
                    variant="subtle"
                    color="gray"
                    style={{ opacity: 0.4 }}
                    aria-label="View token usage"
                    title="Token usage"
                >
                    <IconCoins size={14} />
                </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
                <Stack gap={6}>
                    <Text size="xs" fw={600} c="dimmed">Token usage</Text>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Input</Text>
                        <Text size="xs" fw={500}>{formatTokenCount(usage.promptTokens)}</Text>
                    </Group>
                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">Output</Text>
                        <Text size="xs" fw={500}>{formatTokenCount(usage.completionTokens)}</Text>
                    </Group>
                    <Box style={{ borderTop: "1px solid var(--mantine-color-default-border)" }} pt={4}>
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed" fw={600}>Total</Text>
                            <Text size="xs" fw={600}>{formatTokenCount(usage.totalTokens)}</Text>
                        </Group>
                    </Box>
                </Stack>
            </Popover.Dropdown>
        </Popover>
    );
}

// ── Text message ──────────────────────────────────────────────────────────────

interface TextMessageProps {
    text: string;
    isUser: boolean;
    msgId: string;
    /** Firebase user photo URL — shown in the user avatar when available. */
    userPhotoURL?: string | null;
    /** Name initials shown when no photo URL is available (e.g. "JD"). */
    userInitials?: string;
    /**
     * Pass the id of the message currently being edited — the edit controls
     * are rendered only when `editingId === msgId`.
     */
    editingId: string | null;
    editingText: string;
    isLoading: boolean;
    /** Token usage for this message (assistant messages only). */
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    onEditStart: (msgId: string, text: string) => void;
    onEditChange: (text: string) => void;
    onEditKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>, msgId: string) => void;
    onEditCancel: () => void;
    onEditSubmit: (msgId: string) => void;
}

export function TextMessage({
    text,
    isUser,
    msgId,
    userPhotoURL,
    userInitials,
    editingId,
    editingText,
    isLoading,
    usage,
    onEditStart,
    onEditChange,
    onEditKeyDown,
    onEditCancel,
    onEditSubmit,
}: Readonly<TextMessageProps>) {
    const isEditing = isUser && editingId === msgId;
    const [hovered, setHovered] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [clamped, setClamped] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    // Detect whether the user message overflows 3 lines (only measure when collapsed)
    useLayoutEffect(() => {
        const el = textRef.current;
        if (!el || !isUser || expanded) return;
        setClamped(el.scrollHeight > el.clientHeight + 1);
    }, [text, isUser, expanded]);

    if (!text.trim()) return null;

    return (
        <Stack gap={4} align={isUser ? "flex-end" : "flex-start"}>
            {/* Avatar + name row */}
            <Group gap={8} style={{ flexDirection: isUser ? "row-reverse" : "row" }}>
                <Avatar
                    size={28}
                    radius="xl"
                    color={isUser ? "secondary" : "primary"}
                    variant={isUser ? "filled" : "light"}
                    src={isUser ? (userPhotoURL ?? undefined) : undefined}
                >
                    {isUser
                        ? (userInitials ?? <IconUser size={14} />)
                        : <IconHeartbeat size={14} />}
                </Avatar>
                <Text size="sm" c="dimmed" fw={600}>{isUser ? "You" : "CareAI"}</Text>
            </Group>

            {/* Message body */}
            <Box pl={isUser ? 0 : 36} pr={isUser ? 36 : 0}>
                {isEditing ? (
                    <Box maw={600} w="100%">
                        <Textarea
                            autosize
                            minRows={1}
                            maxRows={8}
                            value={editingText}
                            onChange={(e) => onEditChange(e.currentTarget.value)}
                            onKeyDown={(e) => onEditKeyDown(e, msgId)}
                            radius="md"
                            autoFocus
                            styles={{ input: { paddingTop: 10, paddingBottom: 10 } }}
                        />
                        <Group gap="xs" justify="flex-end" mt={6}>
                            <ActionIcon size={32} variant="subtle" color="gray" onClick={onEditCancel}>
                                <IconX size={16} />
                            </ActionIcon>
                            <ActionIcon
                                size={32}
                                variant="filled"
                                color="primary"
                                disabled={!editingText.trim() || isLoading}
                                onClick={() => onEditSubmit(msgId)}
                            >
                                <IconCheck size={16} />
                            </ActionIcon>
                        </Group>
                    </Box>
                ) : (
                    <Box
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        {/* Action row: edit (user) or feedback + token (assistant) */}
                        <Group gap={2} mt={4} justify={isUser ? "flex-end" : "flex-start"} style={{ minHeight: 28 }}>
                            {isUser ? (
                                <ActionIcon
                                    size={28}
                                    variant="subtle"
                                    color="gray"
                                    style={{ opacity: hovered ? 0.7 : 0, transition: "opacity 150ms", flexShrink: 0 }}
                                    onClick={() => onEditStart(msgId, text)}
                                    aria-label="Edit message"
                                    tabIndex={hovered ? 0 : -1}
                                    disabled={isLoading}
                                >
                                    <IconPencil size={15} />
                                </ActionIcon>
                            ) : (
                                <>
                                    <FeedbackBar msgId={msgId} />
                                    {usage && <TokenUsageBadge usage={usage} />}
                                </>
                            )}
                            {isUser ? (
                                <Box
                                    px="md"
                                    py="xs"
                                    style={{
                                        borderRadius: "var(--mantine-radius-lg)",
                                        background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        width: "fit-content",
                                        maxWidth: 600,
                                        marginLeft: "auto",
                                    }}
                                >
                                    <Text
                                        ref={textRef}
                                        size="sm"
                                        style={expanded ? undefined : {
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {text}
                                    </Text>
                                    {clamped && (
                                        <Text
                                            component="button"
                                            size="xs"
                                            c="dimmed"
                                            mt={4}
                                            onClick={() => setExpanded((v) => !v)}
                                            style={{
                                                background: "none",
                                                border: "none",
                                                padding: 0,
                                                cursor: "pointer",
                                                textDecoration: "none",
                                                display: "block",
                                                marginLeft: "auto",
                                            }}
                                        >
                                            {expanded ? "Show less" : "Show more"}
                                        </Text>
                                    )}
                                </Box>
                            ) : (
                                <Box style={{ wordBreak: "break-word" }}>
                                    <MarkdownContent text={text} />
                                </Box>
                            )}
                        </Group>
                    </Box>
                )}
            </Box>
        </Stack>
    );
}

// ── Typing / thinking status indicator ───────────────────────────────────────

const THINKING_PHRASES = [
    "Let me think about that…",
    "One moment…",
    "Processing what you've shared…",
];
const ANALYSING_PHRASES = [
    "Analysing your symptoms…",
    "Checking clinical guidelines…",
    "Putting this together…",
    "Looking into this for you…",
    "Reviewing the details…",
    "Almost there…",
];

interface StatusIndicatorProps {
    chatStatus: ChatStatus;
    phraseIdx: number;
    phraseFading: boolean;
    /** Fixed label to display instead of the cycling phrases (e.g. during upload). */
    overrideLabel?: string;
}

export function StatusIndicator({ chatStatus, phraseIdx, phraseFading, overrideLabel }: Readonly<StatusIndicatorProps>) {
    const phrases = chatStatus === "ready" ? THINKING_PHRASES : ANALYSING_PHRASES;
    const label = overrideLabel ?? phrases[phraseIdx % phrases.length];
    return (
        <Stack gap={4} align="flex-start" style={{ animation: "msg-enter 0.2s ease both" }}>
            {/* Avatar + name row — identical to TextMessage AI layout */}
            <Group gap={8}>
                <Avatar size={28} radius="xl" color="primary" variant="light">
                    <IconHeartbeat size={14} />
                </Avatar>
                <Text size="sm" c="dimmed" fw={600}>CareAI</Text>
            </Group>
            {/* Typing bubble */}
            <Box pl={36}>
                <Paper
                    px="md"
                    py="xs"
                    radius="lg"
                    withBorder
                    style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
                >
                    <Loader size={16} color="primary" type="dots" />
                    <Text
                        size="sm"
                        c="dimmed"
                        style={{
                            transition: "opacity 0.3s ease",
                            opacity: phraseFading && !overrideLabel ? 0 : 1,
                        }}
                    >
                        {label}
                    </Text>
                </Paper>
            </Box>
        </Stack>
    );
}
