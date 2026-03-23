"use client";

import { useRef, useState } from "react";
import {
    type MotionValue,
    motion,
    useMotionValue,
    useMotionValueEvent,
    useReducedMotion,
    useSpring,
    useTransform,
} from "framer-motion";

export interface ExposureSliderProps {
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    onChange?: (value: number) => void;
    showIndicator?: boolean;
    accentColor?: string;
    disabled?: boolean;
}

const NOTCH_WIDTH = 13;
const SPRING_CONFIG = { stiffness: 300, damping: 30, mass: 0.5 };
const DEFAULT_ACCENT = "var(--mantine-color-primary-filled)";

export function ExposureSlider({
    min = 0,
    max = 10,
    step = 1,
    defaultValue = 0,
    onChange,
    showIndicator = true,
    accentColor,
    disabled = false,
}: Readonly<ExposureSliderProps>) {
    const shouldReduceMotion = useReducedMotion();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const count = Math.floor((max - min) / step) + 1;
    const centerIndex = Math.floor((defaultValue - min) / step);

    const rawX = useMotionValue(0);
    const springX = useSpring(rawX, SPRING_CONFIG);
    const x = shouldReduceMotion ? rawX : springX;

    const currentValue = useTransform(x, (latest) => {
        const indexOffset = Math.round(-latest / NOTCH_WIDTH);
        return Math.max(min, Math.min(max, (centerIndex + indexOffset) * step + min));
    });

    const displayValue = useTransform(currentValue, (v) => Math.round(v));
    const normalizedValue = useTransform(currentValue, [min, max], [0, 1]);

    const snapToNearest = () => {
        const current = rawX.get();
        rawX.set(Math.round(current / NOTCH_WIDTH) * NOTCH_WIDTH);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return;
        setDragging(true);
        const startX = e.clientX;
        const startOffset = rawX.get();

        const handleMove = (moveEvent: PointerEvent) => {
            const delta = moveEvent.clientX - startX;
            const newOffset = startOffset + delta;
            const maxOffset = (count - 1 - centerIndex) * NOTCH_WIDTH;
            const minOffset = -centerIndex * NOTCH_WIDTH;
            rawX.set(Math.max(-maxOffset, Math.min(-minOffset, newOffset)));

            const indexOffset = Math.round(-rawX.get() / NOTCH_WIDTH);
            const val = Math.max(min, Math.min(max, (centerIndex + indexOffset) * step + min));
            onChange?.(Math.round(val));
        };

        const handleUp = () => {
            setDragging(false);
            snapToNearest();
            const indexOffset = Math.round(-rawX.get() / NOTCH_WIDTH);
            const val = Math.max(min, Math.min(max, (centerIndex + indexOffset) * step + min));
            onChange?.(Math.round(val));
            globalThis.removeEventListener("pointermove", handleMove);
            globalThis.removeEventListener("pointerup", handleUp);
        };

        globalThis.addEventListener("pointermove", handleMove);
        globalThis.addEventListener("pointerup", handleUp);
    };

    const items = Array.from({ length: count }, (_, i) => i);
    const accent = accentColor ?? DEFAULT_ACCENT;

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                maxWidth: 500,
                flexDirection: "column",
                alignItems: "center",
                gap: 24,
                opacity: disabled ? 0.5 : 1,
                "--es-accent": accent,
            } as React.CSSProperties}
        >
            {showIndicator && (
                <ProgressCircle normalizedValue={normalizedValue} displayValue={displayValue} />
            )}

            <div style={{
                position: "relative",
                display: "flex",
                height: 40,
                width: "100%",
                alignItems: "center",
                justifyContent: "center",
                maskImage: "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
            }}>
                <div
                    ref={containerRef}
                    style={{
                        position: "relative",
                        height: "100%",
                        width: "100%",
                        cursor: (() => {
                            if (disabled) return "default";
                            if (dragging) return "grabbing";
                            return "grab";
                        })(),
                        userSelect: "none",
                        touchAction: "pan-y",
                        padding: `0 calc(50% - ${NOTCH_WIDTH / 2}px)`,
                    }}
                    onPointerDown={handlePointerDown}
                >
                    <motion.ul
                        style={{
                            position: "relative",
                            display: "flex",
                            height: "100%",
                            listStyle: "none",
                            alignItems: "center",
                            padding: 0,
                            margin: 0,
                            marginLeft: -centerIndex * NOTCH_WIDTH,
                            x,
                        }}
                    >
                        {items.map((i) => (
                            <Notch key={i} index={i} centerIndex={centerIndex} x={x} />
                        ))}
                    </motion.ul>
                </div>
            </div>
        </div>
    );
}

// ── Notch ─────────────────────────────────────────────────────────────────────

function Notch({ index, centerIndex, x }: Readonly<{ index: number; centerIndex: number; x: MotionValue<number> }>) {
    const distance = useTransform(x, (latest) => {
        const currentCenter = centerIndex + -latest / NOTCH_WIDTH;
        return Math.abs(index - currentCenter);
    });

    const opacity = useTransform(distance, [0, 1, 3], [1, 0.6, 0.3]);
    const clipTop = useTransform(distance, [0, 1, 2], [0, 30, 50]);
    const clipPath = useTransform(clipTop, (v: number) => `inset(${v}% 0px 0px)`);
    const isCenter = useTransform(distance, (d) => d < 0.5);
    const bg = useTransform(isCenter, (center) =>
        center ? "var(--es-accent)" : "currentColor"
    );

    return (
        <li style={{ position: "relative", flexShrink: 0, flexGrow: 0, height: "fit-content" }}>
            <div style={{ padding: "0 5px" }}>
                <motion.div
                    style={{
                        width: 3,
                        height: 40,
                        backgroundColor: bg,
                        clipPath,
                        opacity,
                        willChange: "clip-path, opacity",
                        borderRadius: 2,
                    }}
                />
            </div>
        </li>
    );
}

// ── Progress Circle ───────────────────────────────────────────────────────────

function ProgressCircle({ normalizedValue, displayValue }: Readonly<{
    normalizedValue: MotionValue<number>;
    displayValue: MotionValue<number>;
}>) {
    const arcRef = useRef<SVGCircleElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    const initialNorm = normalizedValue.get();
    const initialDisplay = displayValue.get();
    const initialDash = initialNorm > 0 ? `${initialNorm} ${1 - initialNorm}` : "0 1";
    const initialColor = initialNorm > 0.01 ? "var(--es-accent)" : "currentColor";

    useMotionValueEvent(displayValue, "change", (v) => {
        if (textRef.current) textRef.current.textContent = String(v);
    });

    useMotionValueEvent(normalizedValue, "change", (v) => {
        if (arcRef.current) {
            arcRef.current.setAttribute("stroke-dasharray", v > 0 ? `${v} ${1 - v}` : "0 1");
        }
        if (textRef.current) {
            textRef.current.style.color = v > 0.01 ? "var(--es-accent)" : "currentColor";
        }
    });

    return (
        <div style={{ position: "relative", display: "flex", height: 75, width: 75, alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}>
                <circle
                    cx="50" cy="50" r="48"
                    fill="currentColor" fillOpacity={0.067}
                    stroke="currentColor" strokeOpacity={0.3} strokeWidth="3"
                />
                <circle
                    ref={arcRef}
                    cx="50" cy="50" r="48"
                    fill="none" stroke="var(--es-accent)" strokeWidth="3"
                    pathLength={1} strokeDashoffset={0}
                    strokeDasharray={initialDash}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transformBox: "fill-box" }}
                />
            </svg>
            <span ref={textRef} style={{ position: "absolute", fontSize: "1.125rem", fontWeight: 600, color: initialColor }}>
                {initialDisplay}
            </span>
        </div>
    );
}
