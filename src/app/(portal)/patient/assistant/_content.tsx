"use client";
import { Box, Text, Title } from "@mantine/core";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Messages } from "@/ui/ai/messages";
import { useUploadFileMutation, useProfileQuery, type FileRecord } from "@/app/(portal)/patient/_query";
import { getInitials } from "@/lib/get-initials";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useChatContext, useMessagesContext } from "@/ui/ai/context/chat-context";
import { InputBar } from "@/ui/ai/components/input-bar";
import { StarterCards } from "./_components/starter-cards";
import { ChatSkeleton } from "./_chat-skeleton";

const FIREBASE_STORAGE_BUCKET =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

function normalizeStoragePath(path: string): string {
    let current = path;
    for (let i = 0; i < 3; i++) {
        try {
            const decoded = decodeURIComponent(current);
            if (decoded === current) {
                return current;
            }
            current = decoded;
        } catch {
            // Keep original path if decoding fails (malformed escape sequence).
            return current;
        }
    }
    return current;
}

function buildGcsFilePart(
    file: Pick<FileRecord, "mimeType" | "storagePath">,
): { type: "file"; url: string; mediaType: string } | null {
    if (!FIREBASE_STORAGE_BUCKET || !file.storagePath) {
        return null;
    }

    const normalizedStoragePath = normalizeStoragePath(file.storagePath);

    return {
        type: "file",
        url: `gs://${FIREBASE_STORAGE_BUCKET}/${normalizedStoragePath}`,
        mediaType: file.mimeType,
    };
}


// ── Chat content (client) ─────────────────────────────────────────────────────

export function ChatContent() {
    const [inputBarHeight, setInputBarHeight] = useState(0);
    const observerRef = useRef<ResizeObserver | null>(null);
    // Tracks whether the user saw the empty (centered) state before messages appeared.
    const sawEmptyStateRef = useRef(false);
    const inputBarRef = (node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        if (node) {
            // Animate the fixed bar sliding in from center when transitioning from empty state.
            if (sawEmptyStateRef.current) {
                sawEmptyStateRef.current = false;
                node.animate(
                    [{ transform: "translateY(-30vh)", opacity: 0.6 }, { transform: "translateY(0)", opacity: 1 }],
                    { duration: 500, easing: "cubic-bezier(0, 0, 0.2, 1)", fill: "forwards" },
                );
            }
            const observer = new ResizeObserver(([entry]) => {
                setInputBarHeight(entry.contentRect.height);
            });
            observer.observe(node);
            observerRef.current = observer;
        }
    };

    const { sessionId } = useChatContext();
    const uploadFile = useUploadFileMutation();
    const { data: profile } = useProfileQuery();
    const { data: user } = useCurrentUser();
    const userInitials = getInitials(profile?.name, user?.email);
    const firstName = profile?.name?.split(" ")[0] ?? "there";

    const searchParams = useSearchParams();
    const router = useRouter();

    // ── Messages hook ─────────────────────────────────────────────────────────
    const {
        messages, messageTimestamps, messageUsage, messageAgentTypes, liveUsage, sendMessage, stop, setPendingAttachments, status, isLoading, isMessagesLoading, isHydrated,
        answeredIds,
        phraseIdx, phraseFading, loadingHints, agentType,
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
                const fileParts: Array<{ type: "file"; url: string; mediaType: string }> = [];
                if (files && files.length > 0) {
                    setIsUploading(true);
                    const results = await Promise.all(
                        Array.from(files).map(async (f) => {
                            return uploadFile.mutateAsync({ sessionId, file: f });
                        })
                    ).catch(() => []);
                    setIsUploading(false);
                    const resolvedParts = results.map((file) => buildGcsFilePart(file));
                    fileParts.push(...resolvedParts.filter((part) => part !== null));
                }
                await sendMessage({ text, ...(fileParts.length > 0 && { files: fileParts }) });
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, pendingSend]);

    // ── File/message send logic (no person-check) ─────────────────────────────
    const checkAndSend = async (text: string, files?: FileList, existingFiles?: FileRecord[]): Promise<void> => {
        const fileParts: Array<{ type: "file"; url: string; mediaType: string }> = [];
        if (files && files.length > 0) {
            setIsUploading(true);
            const results = await Promise.all(
                Array.from(files).map(async (f) => {
                    return uploadFile.mutateAsync({ sessionId, file: f });
                })
            ).catch(() => [] as FileRecord[]);
            setIsUploading(false);
            const resolvedParts = results.map((file) => buildGcsFilePart(file));
            fileParts.push(...resolvedParts.filter((part) => part !== null));
        }
        if (existingFiles && existingFiles.length > 0) {
            const resolvedParts = existingFiles.map((file) => buildGcsFilePart(file));
            fileParts.push(...resolvedParts.filter((part) => part !== null));
        }
        if (fileParts.length > 0) setPendingAttachments(fileParts.map(({ url, mediaType }) => ({ url, mediaType })));
        await sendMessage({ text, ...(fileParts.length > 0 && { files: fileParts }) });
    };

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

    // Compute cumulative context tokens: DB usage (previous messages) + live
    // usage (current stream, available before background persistence finishes).
    const contextUsage = (() => {
        let input = 0;
        let output = 0;
        if (messageUsage) {
            for (const u of messageUsage.values()) {
                input += u.promptTokens;
                output += u.completionTokens;
            }
        }
        if (liveUsage) {
            input += liveUsage.inputTokens;
            output += liveUsage.outputTokens;
        }
        if (input === 0 && output === 0) return undefined;
        return { inputTokens: input, outputTokens: output, maxTokens: 1_048_576 };
    })();

    const inputBarNode = (
        <InputBar
            input={input}
            onInputChange={setInput}
            isLoading={isLoading}
            isUploading={isUploading}
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
            contextUsage={contextUsage}
        />
    );

    // Show skeleton until DB messages have been hydrated into useChat to avoid
    // the flash of empty-state (starter cards) before messages appear.
    if (isMessagesLoading || !isHydrated) return <ChatSkeleton />;

    // Gemini-style layout — input centered in empty state, fixed at bottom after first message
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 6.5rem)", overflow: "hidden", position: "relative" }}>
            {hasUserMessages ? (
                <>
                    {/* Messages — scrollable area */}
                    <Box mb={inputBarHeight} style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                        <Messages
                            messages={messages}
                            messageTimestamps={messageTimestamps}
                            messageUsage={messageUsage}
                            messageAgentTypes={messageAgentTypes}
                            isLoading={isLoading}
                            preparingLabel={isUploading ? "Enhancing & uploading\u2026" : undefined}
                            chatStatus={status}
                            userPhotoURL={profile?.photoUrl ?? user?.photoURL}
                            userInitials={userInitials}
                            answeredIds={answeredIds}
                            editingId={editingId}
                            editingText={editingText}
                            phraseIdx={phraseIdx}
                            phraseFading={phraseFading}
                            loadingHints={loadingHints}
                            agentType={agentType}
                            sessionId={sessionId}
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
                            onSendReferralMessage={async (text: string) => { await sendMessage({ text }); }}
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
                            backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
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
                    ref={() => { sawEmptyStateRef.current = true; }}
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
                            Hi,{" "}
                            <span
                                style={{
                                    background: "linear-gradient(90deg, var(--mantine-color-primary-5) 0%, var(--mantine-color-violet-3) 40%, var(--mantine-color-white) 50%, var(--mantine-color-violet-3) 60%, var(--mantine-color-primary-5) 100%)",
                                    backgroundSize: "200% auto",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    animation: "shimmer 3s ease-in-out infinite",
                                }}
                            >
                                {firstName}
                            </span>
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
