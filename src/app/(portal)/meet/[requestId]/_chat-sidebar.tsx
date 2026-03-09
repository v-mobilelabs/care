"use client";
/**
 * ChatSidebar — iOS iMessage-style in-call messaging panel.
 *
 * Design cues: frosted-glass chrome, iMessage-blue sent bubbles with
 * tail radius, gray received bubbles, bouncing typing dots, pill input
 * with circular send button. Full light-dark support.
 */
import { ActionIcon, Avatar, Box, Group, ScrollArea, Stack, Text, TextInput, Transition } from "@mantine/core";
import { IconArrowUp, IconChevronDown, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DmMessage } from "@/lib/messaging/types";
import type { Participant } from "./_room-types";
import { motion } from "@/ui/tokens";

/* ── helpers ─────────────────────────────────────────────────────────────────── */

/** Group consecutive messages from the same sender so we only show one tail. */
function groupMessages(msgs: ReadonlyArray<DmMessage>) {
    return msgs.map((msg, i) => {
        const prev = msgs[i - 1];
        const next = msgs[i + 1];
        const isFirst = !prev || prev.senderId !== msg.senderId;
        const isLast = !next || next.senderId !== msg.senderId;
        return { msg, isFirst, isLast };
    });
}

/** Format time as h:mm AM/PM (iOS style). */
function fmtTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Show a date separator if more than 15 min gap between messages. */
function shouldShowTimeSeparator(cur: DmMessage, prev: DmMessage | undefined) {
    if (!prev) return true;
    return cur.createdAt - prev.createdAt > 15 * 60 * 1000;
}

/* ── component ───────────────────────────────────────────────────────────────── */

interface ChatSidebarProps {
    messages: ReadonlyArray<DmMessage>;
    localUserId: string;
    remoteUser: Participant;
    otherTyping: boolean;
    draft: string;
    onDraftChange: (value: string) => void;
    onSend: () => void;
    onStartTyping: () => void;
    onClose: () => void;
}

export function ChatSidebar({
    messages,
    localUserId,
    remoteUser,
    otherTyping,
    draft,
    onDraftChange,
    onSend,
    onStartTyping,
    onClose,
}: Readonly<ChatSidebarProps>) {
    const chatScrollRef = useRef<HTMLDivElement | null>(null);
    const [showScrollDown, setShowScrollDown] = useState(false);

    const grouped = useMemo(() => groupMessages(messages), [messages]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        const el = chatScrollRef.current;
        if (!el) return;
        // Only auto-scroll if user is near bottom (within 120px)
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (nearBottom) {
            el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        }
    }, [messages.length]);

    // Track whether user has scrolled up
    const handleScroll = () => {
        const el = chatScrollRef.current;
        if (!el) return;
        setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
    };

    const scrollToBottom = () => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    };

    const initials = remoteUser.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <Box
            style={{
                position: "absolute",
                top: 60,
                right: 12,
                bottom: 90,
                width: 340,
                zIndex: 20,
                display: "flex",
                flexDirection: "column",
                background: "light-dark(rgba(255,255,255,0.88), rgba(30,30,32,0.88))",
                backdropFilter: "blur(40px) saturate(1.8)",
                WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                borderRadius: 20,
                boxShadow:
                    "light-dark(0 12px 48px rgba(0,0,0,0.15), 0 12px 48px rgba(0,0,0,0.55)), " +
                    "light-dark(0 0 0 0.5px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(255,255,255,0.06))",
                overflow: "hidden",
                animation: "ios-chat-slide-in 0.3s cubic-bezier(0.32,0.72,0,1)",
            }}
        >
            <style>{`
                @keyframes ios-chat-slide-in {
                    from { opacity: 0; transform: translateX(20px) scale(0.96); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes ios-typing-bounce {
                    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                    30%           { transform: translateY(-4px); opacity: 1; }
                }
            `}</style>

            {/* ── Header ──────────────────────────────────────────────────── */}
            <Group
                justify="space-between"
                align="center"
                style={{
                    padding: "10px 12px 10px 14px",
                    borderBottom:
                        "0.5px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                    background:
                        "light-dark(rgba(249,249,249,0.7), rgba(44,44,46,0.6))",
                }}
            >
                <Group gap={10} align="center">
                    <Avatar
                        src={remoteUser.photoUrl}
                        size={32}
                        radius="xl"
                        color="primary"
                        style={{
                            border:
                                "2px solid light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.08))",
                        }}
                    >
                        {initials}
                    </Avatar>
                    <Box>
                        <Text
                            size="13px"
                            fw={600}
                            lh={1.2}
                            style={{
                                color:
                                    "light-dark(var(--mantine-color-black), var(--mantine-color-white))",
                            }}
                        >
                            {remoteUser.name}
                        </Text>
                        <Text size="11px" c="dimmed" lh={1.2}>
                            In-call chat
                        </Text>
                    </Box>
                </Group>
                <ActionIcon
                    size={28}
                    radius="xl"
                    variant="subtle"
                    color="gray"
                    onClick={onClose}
                    style={{
                        background:
                            "light-dark(rgba(0,0,0,0.05), rgba(255,255,255,0.08))",
                    }}
                >
                    <IconX size={14} />
                </ActionIcon>
            </Group>

            {/* ── Messages area ───────────────────────────────────────────── */}
            <ScrollArea
                viewportRef={chatScrollRef}
                style={{ flex: 1, position: "relative" }}
                styles={{
                    viewport: { padding: "12px 10px 8px" },
                }}
                onScrollPositionChange={handleScroll}
            >
                {messages.length === 0 ? (
                    <Stack align="center" justify="center" h="100%" py="xl" gap={8}>
                        <Box
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                    "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                            }}
                        >
                            <Avatar
                                src={remoteUser.photoUrl}
                                size={40}
                                radius="xl"
                                color="primary"
                            >
                                {initials}
                            </Avatar>
                        </Box>
                        <Text size="13px" fw={600}>
                            {remoteUser.name}
                        </Text>
                        <Text size="xs" c="dimmed" ta="center" maw={200} lh={1.4}>
                            Send a message during your call. Messages are only visible to participants.
                        </Text>
                    </Stack>
                ) : (
                    <Stack gap={2}>
                        {grouped.map(({ msg, isFirst, isLast }, idx) => {
                            const isLocal = msg.senderId === localUserId;
                            const prev = messages[idx - 1];
                            const showTime = shouldShowTimeSeparator(msg, prev);

                            return (
                                <Box key={msg.id}>
                                    {/* Time separator */}
                                    {showTime && (
                                        <Text
                                            size="11px"
                                            c="dimmed"
                                            ta="center"
                                            py={8}
                                            fw={500}
                                            style={{ letterSpacing: -0.1 }}
                                        >
                                            {fmtTime(msg.createdAt)}
                                        </Text>
                                    )}

                                    <Box
                                        style={{
                                            display: "flex",
                                            justifyContent: isLocal
                                                ? "flex-end"
                                                : "flex-start",
                                            paddingLeft: isLocal ? 48 : 0,
                                            paddingRight: isLocal ? 0 : 48,
                                            marginTop: isFirst ? 4 : 1,
                                            marginBottom: isLast ? 4 : 0,
                                        }}
                                    >
                                        <Box
                                            style={{
                                                maxWidth: "85%",
                                                padding: "7px 12px",
                                                /* iOS-style bubble radius: rounded on all corners,
                                                   but the tail corner is smaller on the last
                                                   message in a group */
                                                borderRadius: isLocal
                                                    ? `18px 18px ${isLast ? "4px" : "18px"} 18px`
                                                    : `18px 18px 18px ${isLast ? "4px" : "18px"}`,
                                                background: isLocal
                                                    ? "linear-gradient(180deg, #007AFF 0%, #0071EE 100%)"
                                                    : "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.1))",
                                                color: isLocal
                                                    ? "#fff"
                                                    : "light-dark(var(--mantine-color-black), var(--mantine-color-white))",
                                                transition: `border-radius ${motion.duration.fast} ${motion.easing.standard}`,
                                            }}
                                        >
                                            <Text
                                                size="14px"
                                                lh={1.35}
                                                style={{
                                                    wordBreak: "break-word",
                                                    letterSpacing: -0.15,
                                                }}
                                            >
                                                {msg.text}
                                            </Text>
                                        </Box>
                                    </Box>

                                    {/* Timestamp on last message of group */}
                                    {isLast && !showTime && (
                                        <Text
                                            size="10px"
                                            c="dimmed"
                                            ta={isLocal ? "right" : "left"}
                                            px={4}
                                            pt={2}
                                            pb={2}
                                            style={{ opacity: 0.6 }}
                                        >
                                            {fmtTime(msg.createdAt)}
                                        </Text>
                                    )}
                                </Box>
                            );
                        })}

                        {/* iOS-style typing indicator */}
                        {otherTyping && (
                            <Box
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    marginTop: 4,
                                }}
                            >
                                <Box
                                    style={{
                                        padding: "10px 14px",
                                        borderRadius: "18px 18px 18px 4px",
                                        background:
                                            "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.1))",
                                        display: "flex",
                                        gap: 4,
                                        alignItems: "center",
                                    }}
                                >
                                    {[0, 1, 2].map((i) => (
                                        <Box
                                            key={i}
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: "50%",
                                                background:
                                                    "light-dark(rgba(0,0,0,0.35), rgba(255,255,255,0.4))",
                                                animation: `ios-typing-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Stack>
                )}
            </ScrollArea>

            {/* Scroll-to-bottom pill */}
            <Transition mounted={showScrollDown} transition="fade" duration={200}>
                {(transStyles) => (
                    <Box
                        style={{
                            ...transStyles,
                            position: "absolute",
                            bottom: 60,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 5,
                        }}
                    >
                        <ActionIcon
                            size={32}
                            radius="xl"
                            variant="filled"
                            color="gray"
                            onClick={scrollToBottom}
                            style={{
                                background:
                                    "light-dark(rgba(255,255,255,0.9), rgba(58,58,60,0.9))",
                                backdropFilter: "blur(8px)",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                                border:
                                    "0.5px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.1))",
                            }}
                        >
                            <IconChevronDown
                                size={16}
                                color="light-dark(rgba(0,0,0,0.55), rgba(255,255,255,0.7))"
                            />
                        </ActionIcon>
                    </Box>
                )}
            </Transition>

            {/* ── Input bar ───────────────────────────────────────────────── */}
            <Box
                style={{
                    padding: "8px 10px 10px",
                    borderTop:
                        "0.5px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                    background:
                        "light-dark(rgba(249,249,249,0.5), rgba(44,44,46,0.4))",
                }}
            >
                <Group gap={8} wrap="nowrap" align="flex-end">
                    <TextInput
                        placeholder="iMessage"
                        size="sm"
                        radius={20}
                        value={draft}
                        onChange={(e) => {
                            onDraftChange(e.currentTarget.value);
                            onStartTyping();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        style={{ flex: 1 }}
                        styles={{
                            input: {
                                minHeight: 36,
                                background:
                                    "light-dark(rgba(255,255,255,0.8), rgba(30,30,32,0.6))",
                                border:
                                    "0.5px solid light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.12))",
                                fontSize: 14,
                                paddingLeft: 14,
                                paddingRight: 14,
                                letterSpacing: -0.2,
                                transition: `border-color ${motion.duration.fast} ${motion.easing.standard}`,
                                "&:focus": {
                                    borderColor: "#007AFF",
                                },
                            },
                        }}
                    />
                    <ActionIcon
                        size={34}
                        radius="xl"
                        variant={draft.trim() ? "filled" : "subtle"}
                        color={draft.trim() ? "blue" : "gray"}
                        onClick={onSend}
                        disabled={!draft.trim()}
                        style={{
                            background: draft.trim()
                                ? "#007AFF"
                                : "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                            color: draft.trim()
                                ? "#fff"
                                : "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.25))",
                            transition: `all ${motion.duration.fast} ${motion.easing.standard}`,
                            flexShrink: 0,
                        }}
                    >
                        <IconArrowUp size={18} stroke={2.5} />
                    </ActionIcon>
                </Group>
            </Box>
        </Box>
    );
}
