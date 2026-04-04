"use client";
import { Paper } from "@mantine/core";
import { motion } from "framer-motion";
import { colorRoles } from "@/ui/tokens";

type MotionCardProps = import("@mantine/core").PaperProps & import("framer-motion").HTMLMotionProps<"div"> & {
    children?: import("react").ReactNode;
    blobColor?: string;
    interactive?: boolean;
    style?: import("react").CSSProperties;
    className?: string;
};

export function MotionCard({
    children,
    style,
    className,
    blobColor = "var(--mantine-color-primary-6)",
    interactive = false,
    ...props
}: MotionCardProps) {
    return (
        <Paper
            component={motion.div}
            whileTap={interactive ? { scale: 0.98 } : undefined}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            withBorder
            radius="xl"
            p="md"
            {...props}
            style={{
                position: "relative",
                overflow: "hidden",
                background: "light-dark(rgba(242, 243, 245, 0.8), rgba(16, 17, 20, 0.8))",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: interactive ? "0 4px 20px rgba(0, 0, 0, 0.05)" : undefined,
                border: `1px solid ${colorRoles.dominant.border}`,
                ...style,
            }}
        >
            {/* Animated Blob Background */}
            <motion.div
                aria-hidden
                style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    background: `radial-gradient(circle at 50% 50%, ${blobColor} 0%, transparent 60%)`,
                    opacity: 0.06,
                    zIndex: 0,
                    pointerEvents: "none",
                }}
                animate={{
                    x: ["0%", "5%", "-5%", "0%"],
                    y: ["0%", "-5%", "5%", "0%"],
                    scale: [1, 1.1, 0.9, 1],
                }}
                transition={{
                    duration: 15,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                }}
            />
            {/* Content wrapper to stay above the blob */}
            <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
        </Paper>
    );
}
