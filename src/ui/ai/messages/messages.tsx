"use client";
import { Box, ScrollArea, Stack } from "@mantine/core";
import { StatusIndicator } from "@/ui/ai/components/message";
import type { MessagesProps } from "./messages.types";
import { useAutoScroll } from "./use-auto-scroll";
import { RetryBlock } from "./retry-block";
import { MessageRow } from "./message-row";
import { LoadMoreButton } from "./load-more-button";
import { ScrollToBottomFab } from "./scroll-to-bottom-fab";

export type { MessagesProps };

// ── Inner thread renderer (keeps Messages under max-lines-per-function) ──────

function MessageThread(props: Readonly<MessagesProps & { isNewMessage: (id: string) => boolean }>) {
    const {
        messages, messageTimestamps, messageUsage, isLoading, chatStatus,
        userPhotoURL, userInitials, answeredIds, editingId, editingText,
        phraseIdx, phraseFading, loadingHints, onAnswer, onApproval,
        onEditStart, onEditChange, onEditKeyDown, onEditCancel, onEditSubmit,
        onLearnMore, error, onRetry, preparingLabel, hasNextPage,
        isFetchingNextPage, onLoadMore, isNewMessage,
    } = props;

    const lastMsg = messages.at(-1);
    const unansweredUser = lastMsg?.role === "user";

    return (
        <Stack gap="lg" maw={760} mx="auto" px="lg" pt="lg" pb={80}>
            {hasNextPage && (
                <LoadMoreButton isFetchingNextPage={isFetchingNextPage} onLoadMore={onLoadMore} />
            )}

            {messages.map((msg, idx) => (
                <MessageRow
                    key={msg.id}
                    msg={msg}
                    timestamp={messageTimestamps?.get(msg.id)}
                    prevTimestamp={idx > 0 ? messageTimestamps?.get(messages[idx - 1].id) : undefined}
                    isNew={isNewMessage(msg.id)}
                    isLoading={isLoading}
                    userPhotoURL={userPhotoURL}
                    userInitials={userInitials}
                    messageUsage={messageUsage}
                    editingId={editingId}
                    editingText={editingText}
                    answeredIds={answeredIds}
                    onAnswer={onAnswer}
                    onApproval={onApproval}
                    onEditStart={onEditStart}
                    onEditChange={onEditChange}
                    onEditKeyDown={onEditKeyDown}
                    onEditCancel={onEditCancel}
                    onEditSubmit={onEditSubmit}
                    onLearnMore={onLearnMore}
                />
            ))}

            {!isLoading && onRetry && (unansweredUser || error) && (
                <RetryBlock error={error} onRetry={onRetry} />
            )}

            {(preparingLabel != null || isLoading) && (
                <StatusIndicator
                    chatStatus={chatStatus}
                    phraseIdx={phraseIdx}
                    phraseFading={phraseFading}
                    loadingHints={loadingHints}
                    overrideLabel={preparingLabel && !isLoading ? preparingLabel : undefined}
                />
            )}
        </Stack>
    );
}

// ── Main component ───────────────────────────────────────────────────────────

/**
 * Renders the full chat message thread: starter cards, message bubbles,
 * tool cards, and the loading status indicator. Manages auto-scroll
 * to the latest message internally.
 */
export function Messages(props: Readonly<MessagesProps>) {
    const { messages, isLoading, preparingLabel } = props;
    const { bottomRef, viewportRef, showScrollBtn, scrollToBottom, isNewMessage } =
        useAutoScroll(messages, isLoading, preparingLabel);

    return (
        <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <ScrollArea
                style={{ height: "100%" }}
                viewportRef={viewportRef}
            >
                <MessageThread {...props} isNewMessage={isNewMessage} />
                <div ref={bottomRef} />
            </ScrollArea>

            <style>{`
                @keyframes msg-enter {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes tts-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
                @keyframes reasoning-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes reasoning-dot {
                    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1.2); }
                }
            `}</style>

            <ScrollToBottomFab visible={showScrollBtn} onClick={scrollToBottom} />
        </Box>
    );
}
