"use client";
import {
    ActionIcon,
    Avatar,
    Box,
    Center,
    Divider,
    Group,
    Indicator,
    Loader,
    ScrollArea,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { IconArrowDown, IconArrowLeft, IconSend } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMessages } from "@/lib/messaging/use-messages";
import { useTyping } from "@/lib/messaging/use-typing";
import { sendMessage } from "@/lib/messaging/actions";
import { useInbox } from "@/lib/messaging/use-inbox";
import { useAuth } from "@/ui/providers/auth-provider";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { TypingIndicator } from "./typing-indicator";

interface MessageThreadProps {
    readonly conversationId: string;
    readonly onBack: () => void;
}

export function MessageThread({
    conversationId,
    onBack,
}: Readonly<MessageThreadProps>) {
    const { user } = useAuth();
    const myUid = user?.uid ?? null;

    // Derive doctor / patient UIDs from the deterministic conversation key.
    const sepIdx = conversationId.indexOf("_");
    const doctorId = conversationId.slice(0, sepIdx);
    const patientId = conversationId.slice(sepIdx + 1);
    const otherUid = myUid === doctorId ? patientId : doctorId;

    const { entries } = useInbox(myUid);
    const entry = entries.find((e) => e.conversationId === conversationId);
    const { online } = usePresenceStatus(otherUid);

    const { messages, loading } = useMessages(conversationId, 200, myUid);
    const { otherTyping, startTyping, clearTyping } = useTyping(
        conversationId,
        myUid,
        otherUid,
    );

    const [text, setText] = useState("");
    const viewportRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const scrollToBottom = useCallback((instant?: boolean) => {
        requestAnimationFrame(() => {
            if (viewportRef.current) {
                viewportRef.current.scrollTo({
                    top: viewportRef.current.scrollHeight,
                    behavior: instant ? "instant" : "smooth",
                });
            }
        });
    }, []);

    // On initial load: scroll to bottom instantly once messages are ready & focus input.
    const didInitialScroll = useRef(false);
    useEffect(() => {
        if (!loading && messages.length > 0 && !didInitialScroll.current) {
            didInitialScroll.current = true;
            scrollToBottom(true);
            inputRef.current?.focus();
        }
    }, [loading, messages.length, scrollToBottom]);

    // Auto-scroll to bottom when new messages arrive or typing starts,
    // but only if the user is already near the bottom.
    useEffect(() => {
        if (!didInitialScroll.current) return;
        const el = viewportRef.current;
        if (!el) return;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (isNearBottom) scrollToBottom();
    }, [messages.length, otherTyping, scrollToBottom]);

    // Track scroll position to show/hide "scroll to bottom" button.
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        function handleScroll() {
            if (!el) return;
            const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            setShowScrollBtn(distFromBottom > 200);
        }
        el.addEventListener("scroll", handleScroll, { passive: true });
        return () => el.removeEventListener("scroll", handleScroll);
    }, []);

    async function handleSend() {
        const trimmed = text.trim();
        if (!trimmed || !myUid) return;

        setText("");
        clearTyping();

        await sendMessage({
            conversationId,
            senderId: myUid,
            recipientId: otherUid,
            text: trimmed,
        });
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    }

    return (
        <Stack
            gap={0}
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <Group
                px="md"
                py="sm"
                gap="xs"
                style={{
                    borderBottom: "1px solid var(--mantine-color-default-border)",
                    flexShrink: 0,
                }}
                bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))"
            >
                <ActionIcon size="md" variant="subtle" color="gray" onClick={onBack} aria-label="Back">
                    <IconArrowLeft size={18} />
                </ActionIcon>
                <Indicator
                    color={online ? "teal" : "gray"}
                    size={8}
                    offset={3}
                    position="bottom-end"
                    withBorder
                >
                    <Avatar size="sm" radius="xl" color="primary" name={entry?.otherName ?? ""} />
                </Indicator>
                <Box>
                    <Text fw={600} size="sm" lh={1.3}>
                        {entry?.otherName ?? "Chat"}
                    </Text>
                    <Text size="xs" c={online ? "teal" : "dimmed"}>
                        {online ? "Online" : "Offline"}
                    </Text>
                </Box>
            </Group>

            {/* ── Messages ────────────────────────────────────────────────── */}
            <Box style={{ flex: 1, position: "relative", minHeight: 0 }}>
                <ScrollArea style={{ height: "100%" }} viewportRef={viewportRef}>
                    <Stack gap="sm" p="md">
                        {(() => {
                            if (loading) {
                                return (
                                    <Center py="xl">
                                        <Loader size="sm" />
                                    </Center>
                                );
                            }

                            if (messages.length === 0) {
                                return (
                                    <Center py="xl">
                                        <Text c="dimmed" size="sm">
                                            No messages yet — say hello!
                                        </Text>
                                    </Center>
                                );
                            }

                            return messages.map((msg, index) => {
                                const isMine = msg.senderId === myUid;
                                const prev = index > 0 ? messages[index - 1] : null;

                                // Date separator: show when the day changes between messages.
                                const msgDate = new Date(msg.createdAt);
                                const prevDate = prev ? new Date(prev.createdAt) : null;
                                const showDateSep = !prevDate || msgDate.toDateString() !== prevDate?.toDateString();

                                // Group timestamps: hide if previous message is same sender & same minute.
                                const showTimestamp = !prev
                                    || prev?.senderId !== msg.senderId
                                    || Math.floor((prev?.createdAt ?? 0) / 60000) !== Math.floor(msg.createdAt / 60000);

                                return (
                                    <div key={msg.id}>
                                        {showDateSep && (
                                            <Divider
                                                my="sm"
                                                label={formatDateLabel(msgDate)}
                                                labelPosition="center"
                                                color="dimmed"
                                            />
                                        )}
                                        <motion.div
                                            initial={{
                                                opacity: 0,
                                                y: 20,
                                                x: isMine ? 20 : -20,
                                                scale: 0.95
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                x: 0,
                                                scale: 1
                                            }}
                                            transition={{
                                                duration: 0.3,
                                                ease: "easeOut",
                                                delay: index < 5 ? index * 0.05 : 0
                                            }}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: isMine ? "flex-end" : "flex-start",
                                            }}
                                        >
                                            <Box
                                                px="md"
                                                py="xs"
                                                style={{
                                                    maxWidth: "75%",
                                                    borderRadius: "var(--mantine-radius-lg)",
                                                    background: isMine
                                                        ? "var(--mantine-color-primary-6)"
                                                        : "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                                                    color: isMine ? "white" : undefined,
                                                }}
                                            >
                                                <Text size="md" style={{ wordBreak: "break-word" }}>
                                                    {msg.text}
                                                </Text>
                                            </Box>
                                            {showTimestamp && (
                                                <Text size="xs" c="dimmed" mt="2xs">
                                                    {msg.createdAt
                                                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })
                                                        : ""}
                                                </Text>
                                            )}
                                        </motion.div>
                                    </div>
                                );
                            });
                        })()}

                        <AnimatePresence>
                            {otherTyping && (
                                <motion.div
                                    key="typing"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TypingIndicator />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Stack>
                </ScrollArea>

                {/* Scroll-to-bottom FAB */}
                <AnimatePresence>
                    {showScrollBtn && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                position: "absolute",
                                bottom: 12,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 10,
                            }}
                        >
                            <ActionIcon
                                variant="filled"
                                color="primary"
                                size="lg"
                                radius="xl"
                                onClick={() => scrollToBottom()}
                                aria-label="Scroll to bottom"
                                style={{ boxShadow: "var(--mantine-shadow-md)" }}
                            >
                                <IconArrowDown size={18} />
                            </ActionIcon>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>

            {/* ── Input bar ───────────────────────────────────────────────── */}
            <Box
                px="md"
                py="sm"
                style={{
                    borderTop: "1px solid var(--mantine-color-default-border)",
                    flexShrink: 0,
                }}
            >
                <Group gap="xs" wrap="nowrap">
                    <TextInput
                        ref={inputRef}
                        placeholder="Type a message…"
                        value={text}
                        onChange={(e) => {
                            setText(e.currentTarget.value);
                            startTyping();
                        }}
                        onKeyDown={handleKeyDown}
                        style={{ flex: 1 }}
                        radius="xl"
                        size="md"
                    />
                    <ActionIcon
                        variant="filled"
                        color="primary"
                        size="lg"
                        radius="xl"
                        onClick={() => void handleSend()}
                        disabled={!text.trim()}
                        aria-label="Send"
                    >
                        <IconSend size={18} />
                    </ActionIcon>
                </Group>
            </Box>
        </Stack>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateLabel(date: Date): string {
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
