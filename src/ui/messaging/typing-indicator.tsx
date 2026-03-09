"use client";
import { Box } from "@mantine/core";
import { motion } from "framer-motion";

/**
 * Animated three-dot typing indicator with modern smooth animations.
 */
export function TypingIndicator() {
    return (
        <Box style={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
                px="sm"
                py="xs"
                style={{
                    display: "inline-flex",
                    gap: 4,
                    alignItems: "center",
                    borderRadius: "var(--mantine-radius-lg)",
                    background:
                        "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                }}
            >
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ y: 0, opacity: 0.4 }}
                        animate={{
                            y: [0, -8, 0],
                            opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.15,
                        }}
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--mantine-color-dimmed)",
                        }}
                    />
                ))}
            </Box>
        </Box>
    );
}
