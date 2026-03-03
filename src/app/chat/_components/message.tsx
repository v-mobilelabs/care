"use client";
import {
    ActionIcon,
    Avatar,
    Box,
    Button,
    Group,
    Image,
    Loader,
    Paper,
    Stack,
    Text,
    Textarea,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconFileTypePdf,
    IconFlag,
    IconPencil,
    IconRobot,
    IconThumbDown,
    IconThumbUp,
    IconUser,
    IconX,
} from "@tabler/icons-react";
import type { UIMessagePart, UIDataTypes, UITools, ChatStatus } from "ai";
import { useState } from "react";
import { MarkdownContent } from "@/app/chat/_components/markdown";
import { useChatContext } from "@/app/chat/_context/chat-context";

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
    const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);
    const [reported, setReported] = useState(false);

    async function submitFeedback(type: "like" | "dislike" | "report", text?: string) {
        await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: msgId, sessionId, type, text: text ?? null }),
        });
    }

    function handleReaction(r: "like" | "dislike") {
        const next = reaction === r ? null : r;
        setReaction(next);
        if (next) void submitFeedback(next);
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
        <Group gap={2} pl={16} mt={2}>
            <ActionIcon
                size={28}
                variant={reaction === "like" ? "filled" : "subtle"}
                color={reaction === "like" ? "teal" : "gray"}
                onClick={() => handleReaction("like")}
                aria-label="Helpful"
                title="Helpful"
                style={{ opacity: reaction === null ? 0.45 : 1 }}
            >
                <IconThumbUp size={15} />
            </ActionIcon>
            <ActionIcon
                size={28}
                variant={reaction === "dislike" ? "filled" : "subtle"}
                color={reaction === "dislike" ? "red" : "gray"}
                onClick={() => handleReaction("dislike")}
                aria-label="Not helpful"
                title="Not helpful"
                style={{ opacity: reaction === null ? 0.45 : 1 }}
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
        </Group>
    );
}

// ── File attachment message ───────────────────────────────────────────────────

interface FileMessageProps {
    part: UIMessagePart<UIDataTypes, UITools> & { type: "file"; url: string; mediaType: string };
    isUser: boolean;
}

export function FileMessage({ part, isUser }: Readonly<FileMessageProps>) {
    const isPdf = part.mediaType === "application/pdf";
    return (
        <Group justify={isUser ? "flex-end" : "flex-start"}>
            {isPdf ? (
                <Paper
                    withBorder
                    radius="md"
                    px="sm"
                    py={6}
                    style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 260 }}
                >
                    <IconFileTypePdf size={24} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />
                    <Box style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} truncate>PDF Document</Text>
                        <Text size="xs" c="dimmed">Uploaded for analysis</Text>
                    </Box>
                </Paper>
            ) : (
                <Image
                    src={part.url}
                    w={220}
                    radius="md"
                    style={{ border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))" }}
                    alt="attachment"
                />
            )}
        </Group>
    );
}

// ── Text message ──────────────────────────────────────────────────────────────

interface TextMessageProps {
    text: string;
    isUser: boolean;
    msgId: string;
    /** Firebase user photo URL — shown in the user avatar when available. */
    userPhotoURL?: string | null;
    /**
     * Pass the id of the message currently being edited — the edit controls
     * are rendered only when `editingId === msgId`.
     */
    editingId: string | null;
    editingText: string;
    isLoading: boolean;
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
    editingId,
    editingText,
    isLoading,
    onEditStart,
    onEditChange,
    onEditKeyDown,
    onEditCancel,
    onEditSubmit,
}: Readonly<TextMessageProps>) {
    if (!text.trim()) return null;
    const isEditing = isUser && editingId === msgId;

    return (
        <Stack gap={6} align={isUser ? "flex-end" : "flex-start"}>
            <Group gap={8} style={{ flexDirection: isUser ? "row-reverse" : "row" }}>
                <Avatar
                    size={30}
                    radius="xl"
                    color={isUser ? "secondary" : "primary"}
                    variant={isUser ? "filled" : "light"}
                    src={isUser ? (userPhotoURL ?? undefined) : undefined}
                >
                    {isUser ? <IconUser size={16} /> : <IconRobot size={16} />}
                </Avatar>
                <Text size="sm" c="dimmed" fw={500}>{isUser ? "You" : "CareAI"}</Text>
            </Group>

            {isEditing ? (
                <Box maw="80%" w="100%">
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
                <Group
                    gap={6}
                    align="flex-end"
                    w="fit-content"
                    maw={isUser ? "80%" : "100%"}
                    style={{ flexDirection: isUser ? "row-reverse" : "row" }}
                >
                    <Box
                        w="fit-content"
                        px="md"
                        py="sm"
                        style={isUser ? {
                            borderRadius: "16px 4px 16px 16px",
                            background: "var(--mantine-color-primary-6)",
                            color: "var(--mantine-color-white)",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                        } : { wordBreak: "break-word" }}
                    >
                        {isUser
                            ? <Text size="md">{text}</Text>
                            : <MarkdownContent text={text} />}
                    </Box>
                    {isUser && !isLoading && (
                        <ActionIcon
                            size={26}
                            variant="subtle"
                            color="gray"
                            style={{ opacity: 0.45, flexShrink: 0 }}
                            onClick={() => onEditStart(msgId, text)}
                            aria-label="Edit message"
                        >
                            <IconPencil size={15} />
                        </ActionIcon>
                    )}
                </Group>
            )}
            {!isUser && <FeedbackBar msgId={msgId} />}
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
}

export function StatusIndicator({ chatStatus, phraseIdx, phraseFading }: Readonly<StatusIndicatorProps>) {
    const phrases = chatStatus === "ready" ? THINKING_PHRASES : ANALYSING_PHRASES;
    const label = phrases[phraseIdx % phrases.length];
    return (
        <Group gap={10} align="center">
            <Avatar size={30} radius="xl" color="primary" variant="light">
                <IconRobot size={16} />
            </Avatar>
            <Paper
                px="md"
                py="xs"
                radius="lg"
                withBorder
                style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
                <Loader size={14} color="primary" type="dots" />
                <Text
                    size="sm"
                    c="dimmed"
                    style={{
                        transition: "opacity 0.3s ease",
                        opacity: phraseFading ? 0 : 1,
                        minWidth: 160,
                    }}
                >
                    {label}
                </Text>
            </Paper>
        </Group>
    );
}
