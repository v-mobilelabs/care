"use client";

import SiriOrb from "@/ui/components/siri-orb";

/** CareAI-branded colors — indigo-violet palette matching the primary theme. */
const AI_COLORS = {
    bg: "oklch(98% 0.01 264.695)",
    c1: "oklch(70% 0.2 120)", // Green
    c2: "oklch(75% 0.18 60)", // Yellow
    c3: "oklch(80% 0.15 300)", // Purple
};

/**
 * Animated Siri-style orb used as the CareAI assistant avatar.
 * Drop-in replacement for static `<Avatar>` + `<IconHeartbeat />`.
 *
 * Pass `loading` to speed up the animation.
 */
export function AiAvatar({ size = 28, loading = false }: Readonly<{ size?: number; loading?: boolean }>) {
    return (
        <SiriOrb
            size={`${size}px`}
            animationDuration={loading ? 6 : 32}
        />
    );
}
