/**
 * iOS-style design tokens — frosted glass, card styles, section headers.
 *
 * Usage:
 *   import { glass, iosCard, iosSection, iosLargeTitle, pressable } from "@/ui/ios/styles";
 *   <Paper style={{ ...iosCard }}>
 */
import type { CSSProperties } from "react";

// ── Frosted glass ──────────────────────────────────────────────────────────────
/** Frosted glass mixin — translucent bg + backdrop blur, like UIVisualEffectView */
export const glass: CSSProperties = {
  backdropFilter: "saturate(180%) blur(20px)",
  WebkitBackdropFilter: "saturate(180%) blur(20px)",
  background: "light-dark(rgba(255,255,255,0.72), rgba(30,30,30,0.72))",
};

/** Stronger glass — for nav bars / headers */
export const glassStrong: CSSProperties = {
  backdropFilter: "saturate(200%) blur(24px)",
  WebkitBackdropFilter: "saturate(200%) blur(24px)",
  background: "light-dark(rgba(255,255,255,0.85), rgba(30,30,30,0.85))",
};

/** Subtle glass — for cards within content */
export const glassTint: CSSProperties = {
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  background: "light-dark(rgba(255,255,255,0.6), rgba(40,40,40,0.5))",
};

// ── iOS card ───────────────────────────────────────────────────────────────────
/** iOS-style card — large radius, soft shadow, no visible border */
export const iosCard: CSSProperties = {
  borderRadius: 16,
  border: "0.5px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
  boxShadow:
    "light-dark(0 1px 3px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.3)), light-dark(0 8px 24px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.2))",
  background:
    "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
  overflow: "hidden",
};

/** iOS grouped-inset card — for settings-like grouped lists */
export const iosGroupedCard: CSSProperties = {
  ...iosCard,
  borderRadius: 12,
  boxShadow:
    "light-dark(0 0.5px 1px rgba(0,0,0,0.04), 0 0.5px 1px rgba(0,0,0,0.2)), light-dark(0 4px 12px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.15))",
};

/** iOS-style row inside a grouped card (like a Settings row) */
export const iosRow: CSSProperties = {
  padding: "14px 16px",
  borderBottom:
    "0.5px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
};

/** Last row — remove bottom border */
export const iosRowLast: CSSProperties = {
  ...iosRow,
  borderBottom: "none",
};

// ── iOS section header ─────────────────────────────────────────────────────────
/** iOS section header style (like Settings sections) */
export const iosSection: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "var(--mantine-color-dimmed)",
  padding: "8px 0",
};

// ── iOS large title ────────────────────────────────────────────────────────────
/** iOS-style large navigation title */
export const iosLargeTitle: CSSProperties = {
  fontSize: "clamp(1.75rem, 4vw, 2.125rem)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
};

/** iOS subtitle under large title */
export const iosSubtitle: CSSProperties = {
  fontSize: 15,
  color: "var(--mantine-color-dimmed)",
  fontWeight: 400,
  lineHeight: 1.4,
};

// ── Pressable ──────────────────────────────────────────────────────────────────
/** Press feedback for interactive cards — use with onMouseDown/onMouseUp or :active */
export const pressScale = {
  transform: "scale(0.98)",
  transition: "transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;

/** Hover lift for cards */
export const hoverLift: CSSProperties = {
  transition:
    "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
};

// ── iOS-style hairline separator ───────────────────────────────────────────────
export const hairline: CSSProperties = {
  height: 0.5,
  background: "light-dark(rgba(0,0,0,0.12), rgba(255,255,255,0.1))",
  border: "none",
};

// ── iOS tab bar ────────────────────────────────────────────────────────────────
export const iosTabBar: CSSProperties = {
  ...glassStrong,
  borderTop: "0.5px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1))",
  padding: "6px 0 env(safe-area-inset-bottom, 8px) 0",
};

// ── iOS segmented control style ────────────────────────────────────────────────
export const iosSegmented: CSSProperties = {
  borderRadius: 10,
  padding: 3,
  background:
    "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
};
