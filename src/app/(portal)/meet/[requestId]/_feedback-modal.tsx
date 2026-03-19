"use client";
/**
 * FeedbackModal — post-call star rating modal shown after a call ends.
 *
 * Collects a 1–5 star rating and optional comment, then fire-and-forgets
 * the result to `/api/meet/[requestId]/feedback`.
 */
import { ActionIcon, Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface FeedbackModalProps {
    opened: boolean;
    requestId: string;
    onDismiss: () => void;
}

export function FeedbackModal({ opened, requestId, onDismiss }: Readonly<FeedbackModalProps>) {
    const [rating, setRating] = useState(0);
    const [hoveredStar, setHoveredStar] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const ratingLabels: Record<number, string> = {
        1: "Poor",
        2: "Fair",
        3: "Good",
        4: "Very good",
        5: "Excellent",
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            onDismiss();
            return;
        }

        setSubmitting(true);
        try {
            await fetch(`/api/meet/${requestId}/feedback`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment: comment.trim() || null }),
                keepalive: true,
            });
        } catch {
            // Fire-and-forget — don't block the user
        }
        setSubmitting(false);
        onDismiss();
    };

    const displayRating = hoveredStar || rating;

    return (
        <Modal
            opened={opened}
            onClose={onDismiss}
            title="How was your call?"
            radius="lg"
            size="sm"
            centered
            zIndex={10001}
            closeOnClickOutside={false}
            overlayProps={{ backgroundOpacity: 0.55, blur: 8 }}
            styles={{
                header: {
                    background: "var(--mantine-color-body)",
                    borderBottom: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                },
                title: { fontWeight: 700, fontSize: 16 },
                body: { background: "var(--mantine-color-body)" },
                content: { background: "var(--mantine-color-body)" },
            }}
        >
            <Stack gap="md" style={{ padding: "8px 0" }}>
                {/* Star rating */}
                <Stack align="center" gap={8}>
                    <Group gap={4} justify="center">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <ActionIcon
                                key={star}
                                size={44}
                                radius="xl"
                                variant="transparent"
                                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                                onMouseEnter={() => setHoveredStar(star)}
                                onMouseLeave={() => setHoveredStar(0)}
                                onClick={() => setRating(star)}
                                style={{
                                    color: star <= displayRating
                                        ? "var(--mantine-color-yellow-5)"
                                        : "light-dark(rgba(0,0,0,0.15), rgba(255,255,255,0.2))",
                                    transition: "color 0.15s ease",
                                }}
                            >
                                <AnimatePresence mode="wait" initial={false}>
                                    {star <= displayRating ? (
                                        <motion.div
                                            key="filled"
                                            initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
                                            transition={{ duration: 0.18, ease: "easeInOut" }}
                                            style={{ display: "flex" }}
                                        >
                                            <IconStarFilled size={28} />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ scale: 0.5, opacity: 0, rotate: 30 }}
                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, rotate: -30 }}
                                            transition={{ duration: 0.18, ease: "easeInOut" }}
                                            style={{ display: "flex" }}
                                        >
                                            <IconStar size={28} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </ActionIcon>
                        ))}
                    </Group>
                    <Text
                        size="sm"
                        c="dimmed"
                        style={{
                            minHeight: 20,
                            transition: "opacity 0.15s ease",
                            opacity: displayRating > 0 ? 1 : 0,
                        }}
                    >
                        {ratingLabels[displayRating] ?? ""}
                    </Text>
                </Stack>

                {/* Comment */}
                {rating > 0 && (
                    <Textarea
                        placeholder="Any additional comments? (optional)"
                        value={comment}
                        onChange={(e) => setComment(e.currentTarget.value)}
                        autosize
                        minRows={2}
                        maxRows={4}
                        radius="md"
                        styles={{
                            input: {
                                background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.05))",
                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                fontSize: 13,
                            },
                        }}
                    />
                )}

                {/* Actions */}
                <Group justify="flex-end" gap="xs">
                    <Button
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={onDismiss}
                    >
                        Skip
                    </Button>
                    <Button
                        variant="filled"
                        color="primary"
                        size="sm"
                        loading={submitting}
                        disabled={rating === 0}
                        onClick={() => void handleSubmit()}
                    >
                        Submit
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
