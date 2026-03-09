"use client";
import { Box } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useChatContext } from "@/app/(portal)/chat/_context/chat-context";
import { useMessages } from "@/app/(portal)/chat/_hooks/use-messages";
import { useFilePersonCheck } from "@/app/(portal)/chat/_hooks/use-file-person-check";
import { enhanceXrayImage } from "@/app/(portal)/chat/_hooks/use-opg-enhance";
import { Messages } from "@/app/(portal)/chat/_components/messages";
import { InputBar } from "@/app/(portal)/chat/_components/input-bar";
import { useUploadFileMutation, useProfileQuery } from "@/app/(portal)/chat/_query";
import { useActiveProfile } from "@/app/(portal)/chat/_context/active-profile-context";
import { getInitials } from "@/lib/get-initials";
import { useCurrentUser } from "@/lib/auth/use-current-user";

// ── Chat content (client) ─────────────────────────────────────────────────────

export function ChatContent() {
    const { sessionId, onSelectSession } = useChatContext();
    const { activeDependentId } = useActiveProfile();
    const uploadFile = useUploadFileMutation();
    const { data: profile } = useProfileQuery();
    const { data: user } = useCurrentUser();
    const userInitials = getInitials(profile?.name ?? profile?.name, user?.email);
    const searchParams = useSearchParams();
    const router = useRouter();

    // ── Messages hook ─────────────────────────────────────────────────────────
    const {
        messages, sendMessage, setPendingAttachments, status, isLoading,
        answeredIds, pendingFreeTextId,
        phraseIdx, phraseFading,
        editingId, editingText, setEditingText,
        handleEditStart, handleEditCancel, handleEditSubmit, handleEditKeyDown,
        handleAnswer,
        error, regenerate,
    } = useMessages(sessionId);

    // ── Input (lifted so Messages onStarterSelect can set it) ─────────────────
    const [input, setInput] = useState("");
    // True while file uploads are in-flight (before the AI stream starts).
    const [isUploading, setIsUploading] = useState(false);

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
            void (async () => {
                if (files && files.length > 0) {
                    setIsUploading(true);
                    const results = await Promise.all(
                        Array.from(files).map(async (f) => {
                            const enhanced = await enhanceXrayImage(f);
                            return uploadFile.mutateAsync({ sessionId, file: enhanced, dependentId: activeDependentId });
                        }),
                    ).catch(() => []);
                    setIsUploading(false);
                    setPendingAttachments(
                        results
                            .filter((r) => r.downloadUrl)
                            .map((r) => ({ url: r.downloadUrl!, mediaType: r.mimeType })),
                    );
                }
                void sendMessage({ text, files });
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, pendingSend]);

    // ── Person-check hook ─────────────────────────────────────────────────────
    const { checkAndSend, isChecking } = useFilePersonCheck({
        onProceedNormal: (text, files) => {
            void (async () => {
                if (files && files.length > 0) {
                    setIsUploading(true);
                    const results = await Promise.all(
                        Array.from(files).map(async (f) => {
                            const enhanced = await enhanceXrayImage(f);
                            return uploadFile.mutateAsync({ sessionId, file: enhanced, dependentId: activeDependentId });
                        }),
                    ).catch(() => []);
                    setIsUploading(false);
                    setPendingAttachments(
                        results
                            .filter((r) => r.downloadUrl)
                            .map((r) => ({ url: r.downloadUrl!, mediaType: r.mimeType })),
                    );
                }
                void sendMessage({ text, files });
            })();
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
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Message thread */}
            <Messages
                messages={messages}
                isLoading={isLoading}
                preparingLabel={isChecking ? "Scanning file…" : isUploading ? "Enhancing & uploading…" : undefined}
                chatStatus={status}
                userPhotoURL={profile?.photoUrl ?? user?.photoURL}
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

            {/* Input bar */}
            <InputBar
                input={input}
                onInputChange={setInput}
                isLoading={isLoading}
                isUploading={isUploading || isChecking}
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
    );
}
