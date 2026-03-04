"use client";
import { ActionIcon, Box, Tooltip } from "@mantine/core";
import { IconLayoutSidebarRight } from "@tabler/icons-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useChatContext } from "@/app/chat/_context/chat-context";
import { useMessages } from "@/app/chat/_hooks/use-messages";
import { useFilePersonCheck } from "@/app/chat/_hooks/use-file-person-check";
import { useAuth } from "@/ui/providers/auth-provider";
import { Messages } from "@/app/chat/_components/messages";
import { InputBar } from "@/app/chat/_components/input-bar";
import { useUploadFileMutation } from "@/app/chat/_query";
import { RightSidebarPortal } from "@/app/chat/_components/right-sidebar-portal";
import { SessionSidebar } from "@/app/chat/_components/session-sidebar";
import { useRightSidebar } from "@/app/chat/_context/right-sidebar-context";

// ── Chat content (client) ─────────────────────────────────────────────────────

export function ChatContent() {
    const { sessionId, onSelectSession } = useChatContext();
    const { user } = useAuth();
    const uploadFile = useUploadFileMutation();

    const userInitials = user?.displayName
        ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? undefined;
    const searchParams = useSearchParams();
    const router = useRouter();

    // ── Messages hook ─────────────────────────────────────────────────────────
    const {
        messages, sendMessage, status, isLoading,
        answeredIds, pendingFreeTextId,
        phraseIdx, phraseFading,
        editingId, editingText, setEditingText,
        handleEditStart, handleEditCancel, handleEditSubmit, handleEditKeyDown,
        handleAnswer,
        error, regenerate,
    } = useMessages(sessionId);

    const { rightOpened, toggleRight, hasContent } = useRightSidebar();

    // ── Input (lifted so Messages onStarterSelect can set it) ─────────────────
    const [input, setInput] = useState("");

    // ── Pending send — used after a profile switch to auto-send in the new session ──
    const [pendingSend, setPendingSend] = useState<{
        text: string;
        files?: FileList;
    } | null>(null);
    // Tracks the new session ID we're navigating to so we only fire once
    const pendingSessionRef = useRef<string | null>(null);

    useEffect(() => {
        if (pendingSend && pendingSessionRef.current === sessionId) {
            const { text, files } = pendingSend;
            pendingSessionRef.current = null;
            setPendingSend(null);
            if (files) {
                Array.from(files).forEach((f) =>
                    uploadFile.mutate({ sessionId, file: f }),
                );
            }
            void sendMessage({ text, files });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, pendingSend]);

    // ── Person-check hook ─────────────────────────────────────────────────────
    const { checkAndSend } = useFilePersonCheck({
        onProceedNormal: (text, files) => {
            if (files) {
                Array.from(files).forEach((f) =>
                    uploadFile.mutate({ sessionId, file: f }),
                );
            }
            void sendMessage({ text, files });
        },
        onProceedAsNewProfile: (text, files, newSessionId) => {
            // Store the pending send, then navigate to the new session.
            // The effect above will fire once sessionId updates and auto-send.
            pendingSessionRef.current = newSessionId;
            setPendingSend({ text, files });
            onSelectSession(newSessionId);
        },
    });

    // Auto-submit a pre-filled message from the ?message= param (e.g. "Create diet plan" shortcut).
    const autoSentRef = useRef(false);
    useEffect(() => {
        const preset = searchParams.get("message");
        if (!preset || autoSentRef.current) return;
        autoSentRef.current = true;
        // Strip ?message= from the URL immediately so a page reload won't re-send.
        const params = new URLSearchParams(searchParams.toString());
        params.delete("message");
        router.replace(`/chat?${params.toString()}`);
        void sendMessage({ text: preset });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <RightSidebarPortal>
                <SessionSidebar sessionId={sessionId} messages={messages} />
            </RightSidebarPortal>
            <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                {/* Message thread */}
                <Messages
                    messages={messages}
                    isLoading={isLoading}
                    chatStatus={status}
                    userPhotoURL={user?.photoURL}
                    userInitials={userInitials}
                    answeredIds={answeredIds}
                    editingId={editingId}
                    editingText={editingText}
                    phraseIdx={phraseIdx}
                    phraseFading={phraseFading}
                    error={error}
                    onRetry={regenerate}
                    onAnswer={handleAnswer}
                    onEditStart={handleEditStart}
                    onEditChange={setEditingText}
                    onEditKeyDown={handleEditKeyDown}
                    onEditCancel={handleEditCancel}
                    onEditSubmit={handleEditSubmit}
                    onStarterSelect={setInput}
                    onLearnMore={(text) => { void sendMessage({ text }); }}
                />

                {/* FAB — toggle right sidebar, shown only when sidebar has content */}
                {hasContent && (
                    <Box style={{ position: "relative", flexShrink: 0 }}>
                        <Tooltip label={rightOpened ? "Close panel" : "Open panel"} withArrow position="top">
                            <ActionIcon
                                variant="filled"
                                color="primary"
                                size="lg"
                                radius="xl"
                                aria-label="Toggle session panel"
                                onClick={toggleRight}
                                style={{ position: "absolute", right: 16, top: -44, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
                            >
                                <IconLayoutSidebarRight size={18} stroke={1.5} />
                            </ActionIcon>
                        </Tooltip>
                    </Box>
                )}

                {/* Input bar */}
                <InputBar
                    input={input}
                    onInputChange={setInput}
                    isLoading={isLoading}
                    pendingFreeTextId={pendingFreeTextId}
                    messages={messages}
                    status={status}
                    onSend={(text, files) => {
                        // Gate every file send through the person-check flow.
                        // If no files (or no visual files), it proceeds immediately.
                        void checkAndSend(text, files);
                    }}
                    onAnswerFreeText={handleAnswer}
                />
            </Box>
        </>
    );
}
