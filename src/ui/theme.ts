import {
  Button,
  createTheme,
  MantineColorsTuple,
  MantineThemeOverride,
  rem,
} from "@mantine/core";

// ── Color Palettes ─────────────────────────────────────────────────────────────
// Deep indigo-violet — brand primary
const primary: MantineColorsTuple = [
  "#f0edff", // 0 — lightest tint, hover backgrounds
  "#e1dbff", // 1 — subtle fills
  "#c4b8ff", // 2 — disabled states
  "#a493ff", // 3 — light accents
  "#8a73ff", // 4 — soft brand
  "#7860ff", // 5 — mid brand
  "#6b4ff8", // 6 — interactive
  "#5a3ede", // 7 — hover / active
  "#4d35c4", // 8 — dark mode primary
  "#3d2aa0", // 9 — light mode primary (AAA on white)
];

// Cool neutral — secondary / muted text
const secondary: MantineColorsTuple = [
  "#f8f8fb",
  "#eeeef4",
  "#d8d8e6",
  "#c0c0d4",
  "#a8a8c0",
  "#9292ae",
  "#7e7ea0",
  "#686889",
  "#545474",
  "#3e3e5c",
];

// Teal — success / available
const success: MantineColorsTuple = [
  "#e6faf8",
  "#c0f1eb",
  "#92e5da",
  "#5fd6c6",
  "#36c9b5",
  "#1dbda7",
  "#11b09b",
  "#009a87",
  "#008675",
  "#006f61",
];

// Amber — warning / pending
const warning: MantineColorsTuple = [
  "#fff8e1",
  "#ffecb3",
  "#ffe082",
  "#ffd54f",
  "#ffca28",
  "#ffc107",
  "#ffb300",
  "#ffa000",
  "#ff8f00",
  "#ff6f00",
];

// Red — danger / error / busy
const danger: MantineColorsTuple = [
  "#fff1f0",
  "#ffd6d3",
  "#ffada8",
  "#ff7f78",
  "#ff5148",
  "#f53c33",
  "#e62e25",
  "#cc1f17",
  "#b0150e",
  "#8f0c06",
];

// ── Core tokens (also exported via tokens.ts) ──────────────────────────────────
// Mobile-first body font sizes — base values target small viewports;
// components scale naturally with the container/heading fluid typography.
export const FONT_SIZES = {
  xs: rem(12),
  sm: rem(14),
  md: rem(16), // ChatGPT / Gemini-style comfortable reading base
  lg: rem(18),
  xl: rem(20),
} as const;

export const LINE_HEIGHTS = {
  xs: "1.4",
  sm: "1.45",
  md: "1.55",
  lg: "1.6",
  xl: "1.65",
} as const;

export const RADIUS = {
  xs: rem(4),
  sm: rem(6),
  md: rem(8),
  lg: rem(12),
  xl: rem(16),
} as const;

// Mobile-first spacing — tighter base values that work on small screens;
// use Mantine responsive style props ({ base: 'sm', md: 'md' }) to scale up.
export const SPACING = {
  "3xs": rem(2),
  "2xs": rem(4),
  xs: rem(6), // tighter on mobile (was 8)
  sm: rem(10), // tighter on mobile (was 12)
  md: rem(16),
  lg: rem(22), // slightly tighter (was 24)
  xl: rem(30), // slightly tighter (was 32)
  "2xl": rem(44),
  "3xl": rem(60),
} as const;

export const SHADOWS = {
  xs: "0 1px 3px rgba(61,42,160,.06), 0 1px 2px rgba(0,0,0,.06)",
  sm: "0 4px 12px rgba(61,42,160,.08)",
  md: "0 8px 24px rgba(61,42,160,.10)",
  lg: "0 16px 40px rgba(61,42,160,.12)",
  xl: "0 24px 64px rgba(61,42,160,.16)",
} as const;

export const BREAKPOINTS = {
  xs: "36em",
  sm: "48em",
  md: "62em",
  lg: "75em",
  xl: "88em",
} as const;

// ── Theme ──────────────────────────────────────────────────────────────────────
export const theme: MantineThemeOverride = createTheme({
  // ── Typography ───────────────────────────────────────────
  fontFamily: "Roboto, system-ui, sans-serif",
  fontFamilyMonospace: "JetBrains Mono, ui-monospace, monospace",
  fontSizes: FONT_SIZES,
  lineHeights: LINE_HEIGHTS,
  headings: {
    fontFamily: "Roboto, system-ui, sans-serif",
    fontWeight: "700",
    // Mobile-first fluid typography — start small (mobile), grow via vw clamp.
    // clamp(min, preferred, max)  min = mobile, max = desktop.
    sizes: {
      h1: {
        fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
        lineHeight: "1.15",
        fontWeight: "800",
      },
      h2: {
        fontSize: "clamp(1.4rem, 4vw, 2rem)",
        lineHeight: "1.2",
        fontWeight: "700",
      },
      h3: {
        fontSize: "clamp(1.2rem, 3vw, 1.5rem)",
        lineHeight: "1.3",
        fontWeight: "700",
      },
      h4: {
        fontSize: "clamp(1.05rem, 2.5vw, 1.25rem)",
        lineHeight: "1.4",
        fontWeight: "600",
      },
      h5: { fontSize: rem(17), lineHeight: "1.45", fontWeight: "600" },
      h6: { fontSize: rem(15), lineHeight: "1.5", fontWeight: "600" },
    },
  },

  // ── Colors ───────────────────────────────────────────────
  colors: { primary, secondary, success, warning, danger },
  primaryColor: "primary",
  primaryShade: { light: 9, dark: 8 },

  // ── Scale tokens ─────────────────────────────────────────
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  breakpoints: BREAKPOINTS,

  // ── Misc ─────────────────────────────────────────────────
  cursorType: "pointer",
  focusRing: "auto",
  respectReducedMotion: true,

  // ── Component defaults ────────────────────────────────────
  components: {
    // Layout
    Container: {
      // Mobile: comfortable side padding; ≥md: let content breathe (px 0)
      defaultProps: { size: "xl", px: { base: "md", md: "0" } },
    },
    AppShell: {
      // Mobile: tight padding; desktop: standard md
      defaultProps: { padding: { base: "sm", md: "md" } },
    },

    // Surfaces
    Paper: {
      defaultProps: { radius: "lg", shadow: "xs" },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "xs",
        padding: "lg",
        withBorder: true,
      },
    },

    // Overlays
    Modal: {
      defaultProps: {
        radius: "lg",
        // Mobile: tighter padding; ≥sm: full xl
        padding: { base: "md", sm: "xl" },
        overlayProps: { blur: 3, backgroundOpacity: 0.35 },
        transitionProps: { transition: "fade", duration: 150 },
        centered: true,
      },
    },
    Drawer: {
      defaultProps: {
        padding: "xl",
        overlayProps: { blur: 3, backgroundOpacity: 0.35 },
      },
    },
    Tooltip: {
      defaultProps: {
        radius: "md",
        withArrow: true,
        transitionProps: { duration: 120 },
      },
    },
    Popover: {
      defaultProps: { radius: "md", shadow: "md" },
    },

    // Actions
    // size "lg" → ~42px min-height; comfortable with the 16px base font and
    // meets WCAG 2.5.8 44px touch target guideline.
    Button: {
      defaultProps: { radius: "md", size: "sm", variant: "light" },
      classNames: Button.extend({}).classNames,
    },
    ActionIcon: {
      // xl = 48px — generous touch target; icons inside use size 20–22
      defaultProps: { radius: "md", variant: "subtle", size: "xl" },
    },
    CloseButton: {
      defaultProps: { radius: "md", size: "lg" },
    },

    // Inputs — size "lg" gives ~42px input height, visually aligned with the
    // new lg button default and the 16px body text.
    TextInput: {
      defaultProps: { radius: "md", size: "lg" },
    },
    PasswordInput: {
      defaultProps: { radius: "md", size: "lg" },
    },
    Textarea: {
      defaultProps: { radius: "md", size: "lg", minRows: 3 },
    },
    NumberInput: {
      defaultProps: { radius: "md", size: "lg" },
    },
    Select: {
      defaultProps: { radius: "md", size: "lg", checkIconPosition: "right" },
    },
    MultiSelect: {
      defaultProps: { radius: "md", size: "lg" },
    },
    Autocomplete: {
      defaultProps: { radius: "md", size: "lg" },
    },
    FileInput: {
      defaultProps: { radius: "md", size: "lg" },
    },
    DateInput: {
      defaultProps: { radius: "md", size: "lg" },
    },
    DatePickerInput: {
      defaultProps: { radius: "md", size: "lg" },
    },
    PinInput: {
      defaultProps: { radius: "md", size: "xl" },
    },
    Checkbox: {
      defaultProps: { radius: "sm", size: "lg" },
    },
    Switch: {
      defaultProps: { radius: "xl", size: "lg" },
    },
    Radio: {
      defaultProps: { size: "lg" },
    },
    Slider: {
      defaultProps: { radius: "xl", size: "lg" },
    },

    // Display
    Badge: {
      defaultProps: { radius: "md", size: "lg", variant: "light" },
    },
    Avatar: {
      defaultProps: { radius: "xl", size: "lg", color: "primary" },
    },
    ThemeIcon: {
      defaultProps: { radius: "md", variant: "light", color: "primary" },
    },
    Indicator: {
      defaultProps: { color: "danger" },
    },

    // Navigation
    Tabs: {
      defaultProps: { radius: "md", size: "lg" },
    },
    Stepper: {
      defaultProps: { color: "primary", size: "md", radius: "md" },
    },
    Pagination: {
      defaultProps: { radius: "md", color: "primary" },
    },
    SegmentedControl: {
      defaultProps: { radius: "md", color: "primary" },
    },
    NavLink: {
      defaultProps: { color: "primary" },
    },

    // Feedback
    Alert: {
      defaultProps: { radius: "md" },
    },
    Notification: {
      defaultProps: { radius: "md", withBorder: true },
    },
    Progress: {
      defaultProps: { radius: "xl", color: "primary" },
    },
    RingProgress: {
      defaultProps: {},
    },
    Skeleton: {
      defaultProps: { radius: "md" },
    },
    LoadingOverlay: {
      defaultProps: {
        loaderProps: { size: "sm", type: "bars", color: "primary" },
        overlayProps: { blur: 2, backgroundOpacity: 0.4 },
      },
    },
    Loader: {
      defaultProps: { type: "bars", color: "primary", size: "sm" },
    },

    // Data
    Table: {
      defaultProps: {
        striped: false,
        highlightOnHover: true,
        verticalSpacing: "md",
        horizontalSpacing: "md",
        fz: "md",
      },
    },

    // Typography
    Title: {
      defaultProps: {},
    },
    Text: {
      defaultProps: {},
    },
    Anchor: {
      defaultProps: { c: "primary" },
    },
    Code: {
      defaultProps: { color: "primary" },
    },
    Blockquote: {
      defaultProps: { radius: "md", color: "primary" },
    },

    // Misc
    Divider: {
      defaultProps: {},
    },
    Accordion: {
      defaultProps: { radius: "md" },
    },
    Spoiler: {
      defaultProps: {},
    },
    Timeline: {
      defaultProps: { color: "primary", bulletSize: 24 },
    },
  },
});
