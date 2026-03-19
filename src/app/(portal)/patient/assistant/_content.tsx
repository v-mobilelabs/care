"use client";
import { Box, Text, Title } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Messages } from "@/ui/ai/messages";
import { useUploadFileMutation, useProfileQuery } from "./_components/query";
import type { FileRecord } from "./_components/query";
import { getInitials } from "@/lib/get-initials";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useActiveProfile } from "@/ui/ai/context/active-profile-context";
import { useChatContext, useMessagesContext } from "@/ui/ai/context/chat-context";
import { InputBar } from "@/ui/ai/components/input-bar";
import { StarterCards } from "./_components/starter-cards";
import { ChatSkeleton } from "./_chat-skeleton";


// ── Chat content (client) ─────────────────────────────────────────────────────

export function ChatContent() {
    const [inputBarHeight, setInputBarHeight] = useState(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    const inputBarRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (node) {
            const observer = new ResizeObserver(([entry]) => {
                setInputBarHeight(entry.contentRect.height);
            });
            observer.observe(node);
            observerRef.current = observer;
        }
    }, []);

    const { sessionId } = useChatContext();
    const { activeDependentId } = useActiveProfile();
    const uploadFile = useUploadFileMutation();
    const { data: profile } = useProfileQuery();
    const { data: user } = useCurrentUser();
    const userInitials = getInitials(profile?.name ?? profile?.name, user?.email);
    const firstName = profile?.name?.split(" ")[0] ?? "there";

    const searchParams = useSearchParams();
    const router = useRouter();

    // ── Messages hook ─────────────────────────────────────────────────────────
    const {
        messages, messageTimestamps, messageUsage, sendMessage, stop, setPendingAttachments, status, isLoading, isMessagesLoading, isHydrated,
        answeredIds,
        phraseIdx, phraseFading, loadingHints,
        editingId, editingText, setEditingText,
        handleEditStart, handleEditCancel, handleEditSubmit, handleEditKeyDown,
        handleAnswer,
        addToolApprovalResponse,
        hasPendingToolCall,
        pendingFreeText,
        fetchNextPage, hasNextPage, isFetchingNextPage,
        error, regenerate,
    } = useMessagesContext();

    // ── Input (lifted so Messages onStarterSelect can set it) ─────────────────
    const [input, setInput] = useState("");
    // True while file uploads are in-flight (before the AI stream starts).
    const [isUploading, setIsUploading] = useState(false);
    const hasUserMessages = messages.some(m => m.role === "user");

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
                            return uploadFile.mutateAsync({ sessionId, file: f, dependentId: activeDependentId });
                        })
                    ).catch(() => []);
                    setIsUploading(false);
                    setPendingAttachments(
                        results
                            .filter((r) => r.downloadUrl)
                            .map((r) => ({ url: r.downloadUrl!, mediaType: r.mimeType })),
                    );
                }
                await sendMessage({ text, files });
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, pendingSend]);

    // ── File/message send logic (no person-check) ─────────────────────────────
    const checkAndSend = async (text: string, files?: FileList, existingFiles?: FileRecord[]): Promise<void> => {
        const attachments: { url: string; mediaType: string }[] = [];
        if (files && files.length > 0) {
            setIsUploading(true);
            const results = await Promise.all(
                Array.from(files).map(async (f) => {
                    return uploadFile.mutateAsync({ sessionId, file: f, dependentId: activeDependentId });
                })
            ).catch(() => [] as Array<{ downloadUrl?: string; mimeType: string }>);
            setIsUploading(false);
            attachments.push(
                ...results
                    .filter((r) => r.downloadUrl)
                    .map((r) => ({ url: r.downloadUrl!, mediaType: r.mimeType })),
            );
        }
        if (existingFiles && existingFiles.length > 0) {
            attachments.push(
                ...existingFiles
                    .filter((f) => f.downloadUrl)
                    .map((f) => ({ url: f.downloadUrl as string, mediaType: f.mimeType })),
            );
        }
        if (attachments.length > 0) setPendingAttachments(attachments);
        await sendMessage({ text, files });
    };
    const isChecking = false;

    // Auto-submit a pre-filled message from the ?message= param (e.g. "Create diet plan" shortcut).
    const autoSentRef = useRef(false);
    useEffect(() => {
        const preset = searchParams.get("message");
        if (!preset || autoSentRef.current) return;
        autoSentRef.current = true;
        // Strip ?message= from the URL immediately so a page reload won't re-send.
        const params = new URLSearchParams(searchParams.toString());
        params.delete("message");
        router.replace(`/patient/assistant?${params.toString()}`);
        sendMessage({ text: preset }).catch(() => undefined);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    const inputBarNode = (
        <InputBar
            input={input}
            onInputChange={setInput}
            isLoading={isLoading}
            isUploading={isUploading || isChecking}
            messages={messages}
            status={status}
            onSend={async (text: string, files?: FileList, existingFiles?: FileRecord[]) => {
                await checkAndSend(text, files, existingFiles);
            }}
            onStop={stop}
            onStopAndNewChat={(text, files) => {
                stop();
                const newId = crypto.randomUUID();
                pendingSessionRef.current = newId;
                setPendingSend({ text, files });
                router.replace(`/patient/assistant?id=${newId}`);
            }}
            hasPendingToolCall={hasPendingToolCall}
            pendingFreeText={pendingFreeText}
            onAnswerFreeText={handleAnswer}
            showDisclaimer={hasUserMessages}
        />
    );

    // Show skeleton until DB messages have been hydrated into useChat to avoid
    // the flash of empty-state (starter cards) before messages appear.
    if (isMessagesLoading || !isHydrated) return <ChatSkeleton />;

    // Gemini-style layout — input centered in empty state, fixed at bottom after first message
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
            {hasUserMessages ? (
                <>
                    {/* Messages — scrollable area */}
                    <Box mb={inputBarHeight - 64} style={{ flex: 1, overflow: "auto" }}>
                        <Messages
                            messages={messages}
                            messageTimestamps={messageTimestamps}
                            messageUsage={messageUsage}
                            isLoading={isLoading}
                            preparingLabel={(() => {
                                if (isChecking) return "Scanning file\u2026";
                                if (isUploading) return "Enhancing & uploading\u2026";
                                return undefined;
                            })()}
                            chatStatus={status}
                            userPhotoURL={profile?.photoUrl ?? user?.photoURL}
                            userInitials={userInitials}
                            answeredIds={answeredIds}
                            editingId={editingId}
                            editingText={editingText}
                            phraseIdx={phraseIdx}
                            phraseFading={phraseFading}
                            loadingHints={loadingHints}
                            error={error}
                            onRetry={regenerate}
                            onAnswer={handleAnswer}
                            onApproval={addToolApprovalResponse}
                            onEditStart={handleEditStart}
                            onEditChange={setEditingText}
                            onEditKeyDown={handleEditKeyDown}
                            onEditCancel={handleEditCancel}
                            onEditSubmit={handleEditSubmit}
                            onStarterSelect={setInput}
                            onLearnMore={async (text: string) => { await sendMessage({ text }); }}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            onLoadMore={() => fetchNextPage()}
                        />
                    </Box>

                    {/* Input bar — docked at bottom, horizontally centered within content area */}
                    <Box
                        ref={inputBarRef}
                        style={{
                            position: "fixed",
                            bottom: 0,
                            left: "var(--app-shell-navbar-offset, 0px)",
                            width: "calc(100% - var(--app-shell-navbar-offset, 0px) - var(--app-shell-aside-offset, 0px))",
                            zIndex: 100,
                            backgroundColor: "light-dark( var(--mantine-color-gray-2), var(--mantine-color-dark-9))",
                        }}
                    >
                        {/* Scroll blur — fades messages into the input bar background */}
                        <Box
                            style={{
                                position: "absolute",
                                top: -40,
                                left: 0,
                                right: 0,
                                height: 40,
                                pointerEvents: "none",
                                background: "linear-gradient(to bottom, transparent, light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-9)))",
                            }}
                        />
                        <Box maw={760} mx="auto" w="100%" px="lg" pt="xs">
                            {inputBarNode}
                        </Box>
                    </Box>
                </>
            ) : (
                /* Empty state — vertically centered like Gemini */
                <Box
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        overflow: "auto",
                    }}
                >
                    <Box maw={760} mx="auto" w="100%" px="lg" pb="md">
                        <Title
                            order={2}
                            fw={700}
                            style={{
                                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                                background: "linear-gradient(135deg, var(--mantine-color-primary-5), var(--mantine-color-violet-5))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Hi, {firstName}
                        </Title>
                        <Text size="lg" c="dimmed">Where should we start?</Text>
                    </Box>

                    {/* Input bar — centered with greeting and starters */}
                    <Box maw={760} mx="auto" w="100%" px="lg">
                        {inputBarNode}
                    </Box>

                    {/* Starter cards */}
                    <Box maw={760} mx="auto" w="100%" px="lg" pt="lg" pb="md">
                        <StarterCards onSelect={setInput} onSend={async (text) => { await sendMessage({ text }); }} />
                    </Box>
                </Box>
            )
            }
        </Box >
    );
}
