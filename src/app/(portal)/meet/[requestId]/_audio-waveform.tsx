"use client";
/**
 * AudioWaveform — animated audio level visualiser used in header + local PIP.
 */
import { Box } from "@mantine/core";
import { useEffect, useRef } from "react";

const WAVE_BARS = 5;
const WAVE_WEIGHTS = [0.45, 0.75, 1, 0.75, 0.45] as const;

export function AudioWaveform({
    levelRef,
    barHeight = 14,
    barWidth = 2.5,
    gap = 2,
}: Readonly<{
    levelRef: React.RefObject<number>;
    barHeight?: number;
    barWidth?: number;
    gap?: number;
}>) {
    const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

    useEffect(() => {
        let rafId: number;
        const minH = 1.5;
        const loop = () => {
            const t = Date.now() / 1000;
            const lvl = levelRef.current;
            barsRef.current.forEach((bar, i) => {
                if (!bar) return;
                const w = WAVE_WEIGHTS[i] ?? 1;
                const phase = (i / WAVE_BARS) * Math.PI * 2;
                let h: number;
                if (lvl > 0.02) {
                    const mod = 0.55 + 0.45 * Math.sin(t * 10 + phase);
                    h = minH + (barHeight - minH) * lvl * w * mod;
                } else {
                    h = minH + 1.2 * w * (0.5 + 0.5 * Math.sin(t * 1.8 + phase));
                }
                bar.style.height = `${Math.max(minH, Math.min(barHeight, h)).toFixed(1)}px`;
            });
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [levelRef, barHeight]);

    return (
        <Box style={{ display: "flex", alignItems: "center", gap }}>
            {Array.from({ length: WAVE_BARS }, (_, i) => (
                <span
                    key={i}
                    ref={(el) => { barsRef.current[i] = el; }}
                    style={{
                        display: "inline-block",
                        width: barWidth,
                        height: 1.5,
                        borderRadius: 2,
                        background: "rgba(52,211,153,0.9)",
                        willChange: "height",
                        transition: "height 0.05s linear",
                    }}
                />
            ))}
        </Box>
    );
}
