"use client";
import {
    ActionIcon,
    Box,
    Center,
    Group,
    Loader,
    ScrollArea,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { IconArrowLeft, IconSend } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMessages } from "@/lib/messaging/use-messages";
import { useTyping } from "@/lib/messaging/use-typing";
import { sendMessage } from "@/lib/messaging/actions";
import { useInbox } from "@/lib/messaging/use-inbox";
import { useAuth } from "@/ui/providers/auth-provider";
import { TypingIndicator } from "./typing-indicator";

interface MessageThreadProps {
    readonly conversationId: string;
    readonly onBack: () => void;
}

export function MessageThread({
    conversationId,
    onBack,
}: MessageThreadProps) {
    const { user } = useAuth();
    const myUid = user?.uid ?? null;

    // Derive doctor / patient UIDs from the deterministic conversation key.
    const sepIdx = conversationId.indexOf("_");
    const doctorId = conversationId.slice(0, sepIdx);
    const patientId = conversationId.slice(sepIdx + 1);
    const otherUid = myUid === doctorId ? patientId : doctorId;

    const { entries } = useInbox(myUid);
    const entry = entries.find((e) => e.conversationId === conversationId);

    const { messages, loading } = useMessages(conversationId, 200, myUid);
    const { otherTyping, startTyping, clearTyping } = useTyping(
        conversationId,
        myUid,
        otherUid,
    );

    const [text, setText] = useState("");
    const viewportRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive or typing starts.
    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({
                top: viewportRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages.length, otherTyping]);

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
            >
                <ActionIcon variant="subtle" color="gray" onClick={onBack} aria-label="Back">
                    <IconArrowLeft size={18} />
                </ActionIcon>
                <Text fw={600} size="sm">
                    {entry?.otherName ?? "Chat"}
                </Text>
            </Group>

            {/* ── Messages ────────────────────────────────────────────────── */}
            <ScrollArea style={{ flex: 1 }} viewportRef={viewportRef}>
                <Stack gap="xs" p="md">
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
                            return (
                                <motion.div
                                    key={msg.id}
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
                                        px="sm"
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
                                        <Text size="sm" style={{ wordBreak: "break-word" }}>
                                            {msg.text}
                                        </Text>
                                    </Box>
                                    <Text size="xs" c="dimmed" mt={2}>
                                        {msg.createdAt
                                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                            : ""}
                                    </Text>
                                </motion.div>
                            );
                        });
                    })()}

                    {otherTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <TypingIndicator />
                        </motion.div>
                    )}
                </Stack>
            </ScrollArea>

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
                        placeholder="Type a message…"
                        value={text}
                        onChange={(e) => {
                            setText(e.currentTarget.value);
                            startTyping();
                        }}
                        onKeyDown={handleKeyDown}
                        style={{ flex: 1 }}
                        radius="xl"
                        size="sm"
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
