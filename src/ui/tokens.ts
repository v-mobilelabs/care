/**
 * SwiftDrive Design Tokens
 *
 * Single source of truth for all design decisions.
 * Import from here instead of hardcoding values in components.
 *
 * Usage:
 *   import { colors, radius, spacing } from "@/ui/tokens";
 *   <Box style={{ borderRadius: radius.lg, padding: spacing.md }} />
 *
 * For Mantine CSS variables prefer:
 *   style={{ padding: "var(--mantine-spacing-md)" }}
 */

export {
  BREAKPOINTS as breakpoints,
  FONT_SIZES as fontSizes,
  LINE_HEIGHTS as lineHeights,
  RADIUS as radius,
  SHADOWS as shadows,
  SPACING as spacing,
} from "@/ui/theme";

// ── Semantic color tokens ──────────────────────────────────────────────────────
// Maps intent → Mantine color name used in `color="..."` props
export const colors = {
  /** Primary brand — deep indigo-violet */
  brand: "primary",
  /** Muted text, borders, neutral surfaces */
  muted: "secondary",
  /** Success states, available status */
  success: "success",
  /** Warnings, pending states */
  warning: "warning",
  /** Errors, busy status, destructive actions */
  danger: "danger",
  /** Informational accents */
  info: "blue",
} as const;

// ── 60-30-10 Color Distribution ───────────────────────────────────────────────
/**
 * The 60-30-10 rule divides every screen into three colour zones:
 *
 *  60 % — Dominant  (neutral backgrounds, card surfaces, body)
 *  30 % — Secondary (structural brand chrome: nav, sidebar, section fills)
 *  10 % — Accent    (CTAs, active states, key highlights)
 *
 * Use the CSS variables below in `style={{}}` props so they respond to the
 * active colour scheme automatically via Mantine's `light-dark()` helper.
 */
export const colorRoles = {
  /** 60 % — neutral surfaces that fill the majority of the viewport */
  dominant: {
    /** Page body background  */
    body: "var(--mantine-color-body)",
    /** Card / Paper surface */
    surface:
      "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
    /** Alternate / muted surface (table rows, input fills) */
    muted:
      "light-dark(var(--mantine-color-secondary-0), var(--mantine-color-dark-8))",
    /** Default border for neutral surfaces */
    border: "var(--mantine-color-default-border)",
  },
  /** 30 % — brand-tinted structural chrome (nav, sidebar, section dividers) */
  secondary: {
    /** Sidebar / navbar tinted background */
    nav: "light-dark(var(--mantine-color-primary-0), var(--mantine-color-dark-9))",
    /** Section or panel fills */
    fill: "light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.08))",
    /** Text / icon colour inside brand sections */
    text: "light-dark(var(--mantine-color-primary-8), var(--mantine-color-primary-3))",
    /** Subtle brand border */
    border:
      "light-dark(var(--mantine-color-primary-2), var(--mantine-color-primary-8))",
  },
  /** 10 % — high-contrast accent for calls-to-action and active states */
  accent: {
    /** CTA background (buttons, chips) */
    cta: "var(--mantine-color-primary-6)",
    /** CTA hover state */
    ctaHover: "var(--mantine-color-primary-7)",
    /** Active / pressed state */
    active: "var(--mantine-color-primary-8)",
    /** Accent text on light backgrounds */
    text: "var(--mantine-color-primary-9)",
  },
} as const;

// ── Touch-target constants (WCAG 2.5.8 / Apple HIG) ──────────────────────────
/** Minimum interactive area for pointer / touch targets — 44 × 44 px */
export const touchTarget = {
  min: "44px",
  minHeight: "44px",
  minWidth: "44px",
} as const;

// ── Mobile-first media query helpers ──────────────────────────────────────────
/**
 * Min-width media queries aligned with the Mantine breakpoint scale.
 * Design mobile first, then enhance at each breakpoint.
 *
 * Usage inside inline styles (CSS-in-JS is not supported here; use these
 * string values with the `sx` Mantine prop or className-based solutions):
 *   const isDesktop = useMediaQuery(mq.md.replace("@media ", ""));
 */
export const mq = {
  /** ≥ 36 em (~576 px) — large phones / small tablets */
  xs: "(min-width: 36em)",
  /** ≥ 48 em (~768 px) — tablets */
  sm: "(min-width: 48em)",
  /** ≥ 62 em (~992 px) — small laptops */
  md: "(min-width: 62em)",
  /** ≥ 75 em (~1200 px) — desktops */
  lg: "(min-width: 75em)",
  /** ≥ 88 em (~1408 px) — wide screens */
  xl: "(min-width: 88em)",
} as const;

export type ColorIntent = keyof typeof colors;
export type SemanticColor = (typeof colors)[ColorIntent];

// ── Typography ─────────────────────────────────────────────────────────────────
export const typography = {
  fontFamily: "Roboto, system-ui, sans-serif",
  fontFamilyMono: "JetBrains Mono, ui-monospace, monospace",
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
} as const;

// ── Z-index scale ──────────────────────────────────────────────────────────────
export const zIndex = {
  base: 0,
  raised: 1,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;

// ── Animation ─────────────────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant: "80ms",
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
  },
} as const;

// ── Status helpers ─────────────────────────────────────────────────────────────
/** Returns the Mantine `color` string for a doctor availability status */
export function doctorStatusColor(status: "available" | "busy" | "offline") {
  const map = {
    available: colors.success,
    busy: colors.warning,
    offline: colors.muted,
  } as const;
  return map[status] ?? colors.muted;
}

/** Returns the Mantine `color` string for a symptom severity level */
export function symptomSeverityColor(
  level: "mild" | "moderate" | "severe" | "critical",
) {
  const map = {
    mild: colors.success,
    moderate: colors.warning,
    severe: colors.danger,
    critical: "red",
  } as const;
  return map[level] ?? colors.muted;
}
