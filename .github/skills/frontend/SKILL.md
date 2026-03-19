---
name: frontend
description: "**FRONTEND SKILL** — Mantine v8 best practices, advanced styling, responsive design, theming, forms, and UI patterns for this Next.js 16 + React 19 project. USE FOR: building new pages or components with Mantine; styling with inline styles and light-dark(); responsive layouts; form creation with useForm; modal and notification patterns; theme customization; Styles API; polymorphic components; performance optimization; dark mode support; accessibility; design tokens. DO NOT USE FOR: backend API logic; database queries; AI/chat pipeline; authentication flows."
---

# Frontend — Mantine v8 Advanced Techniques

## Golden Rules

1. **No CSS modules** — all styling via Mantine component props + inline `style={{}}`.
2. **Theme is law** — `src/ui/theme.ts` defines all defaults. Never override `radius`, `shadow`, `color`, `variant` unless intentionally diverging.
3. **Tokens over hardcodes** — import from `@/ui/tokens` (`colors`, `spacing`, `radius`, `motion`, `colorRoles`, `zIndex`).
4. **Mobile-first** — design for small screens, scale up with responsive props `{{ base, sm, md, lg }}`.
5. **React Compiler active** — no manual `useMemo`/`useCallback`. The compiler handles memoization.
6. **Props type safety** — all component props must be `Readonly<{...}>` or `Readonly<Props>`.

---

## Design System Architecture

### Theme (`src/ui/theme.ts`)

Single `createTheme()` export with:

- **5 semantic color palettes**: `primary` (indigo-violet), `secondary` (cool neutral), `success` (teal), `warning` (amber), `danger` (red)
- **Primary shade**: `{ light: 9, dark: 8 }` — AAA contrast on white (light mode)
- **Fluid headings**: h1–h6 use `clamp(min, preferred, max)` for responsive typography
- **Mobile-first spacing**: tighter base values (`xs: 6px`, `sm: 10px`) that work on small screens
- **Component defaults**: every major Mantine component has `defaultProps` preset — radius, size, variant, color

### Tokens (`src/ui/tokens.ts`)

```ts
import {
  colors,
  spacing,
  radius,
  motion,
  colorRoles,
  zIndex,
  mq,
  touchTarget,
} from "@/ui/tokens";
```

| Export        | Purpose                       | Example                                                                                   |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------------- |
| `colors`      | Semantic → Mantine color name | `<Badge color={colors.success}>`                                                          |
| `colorRoles`  | 60-30-10 CSS variable map     | `style={{ background: colorRoles.dominant.surface }}`                                     |
| `spacing`     | Spacing scale re-exports      | `style={{ gap: spacing.md }}`                                                             |
| `radius`      | Radius scale re-exports       | `style={{ borderRadius: radius.lg }}`                                                     |
| `motion`      | Duration + easing tokens      | `style={{ transition: \`opacity \${motion.duration.fast} \${motion.easing.standard}\` }}` |
| `zIndex`      | Layer scale                   | `style={{ zIndex: zIndex.sticky }}`                                                       |
| `touchTarget` | WCAG 2.5.8 minimum 44px       | `style={{ minHeight: touchTarget.min }}`                                                  |
| `mq`          | Media query strings           | `useMediaQuery(mq.md)`                                                                    |

### 60-30-10 Color Distribution

```
60% dominant  — neutral surfaces (body, cards, paper)     → colorRoles.dominant.*
30% secondary — brand-tinted chrome (nav, sidebar, fills) → colorRoles.secondary.*
10% accent    — CTAs, active states, key highlights        → colorRoles.accent.*
```

---

## Styling Hierarchy (prefer top → bottom)

| Priority | Method                             | When to Use                                                                                             |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1        | **Component props**                | `<Button variant="light" color="primary" size="sm">` — use Mantine's built-in props first               |
| 2        | **Style props**                    | `<Box mt="md" bg="primary.0" p="lg">` — shorthand margin/padding/color on any Mantine component         |
| 3        | **Responsive style props**         | `<Stack gap={{ base: "sm", md: "lg" }}>` — object syntax for breakpoint-aware values                    |
| 4        | **Inline `style={{}}`**            | Complex one-offs: gradients, glass effects, `light-dark()`, `clamp()`, transitions                      |
| 5        | **Styles API (`styles={{}}`)**     | Target inner elements: `<Button styles={{ label: { fontWeight: 600 } }}>`                               |
| 6        | **Styles API (`classNames={{}}`)** | When you need pseudo-classes or media queries on inner elements (rare — no CSS modules in this project) |
| 7        | **Theme `components`**             | Global defaults in `theme.ts` — already set for all major components                                    |

### Performance Note

- **Responsive style props** (`w={{ base: 200, sm: 400 }}`) generate `<style>` tags at runtime — avoid in large lists (100+ items).
- **`classNames`** > **`styles`** for inner element styling — CSS classes are more performant than inline styles.
- Plain `style={{}}` with static objects is fine — React Compiler optimizes these.

---

## Responsive Design (Mobile-First)

### Responsive Props (preferred)

```tsx
<Container size="lg" py={{ base: 60, sm: 80 }}>
<SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 5 }} spacing="md">
<Stack gap={{ base: "sm", md: "lg" }}>
```

### Fluid Typography

```tsx
// In theme.ts headings — already configured
fontSize: "clamp(1.75rem, 5vw, 2.5rem)"

// Ad-hoc in components:
<Text style={{ fontSize: "clamp(1rem, 3vw, 1.5rem)" }}>
```

### Visibility

```tsx
// Hide/show at breakpoints — no JS, pure CSS
<Button hiddenFrom="sm" color="orange">Mobile only</Button>
<Button visibleFrom="sm" color="cyan">Desktop only</Button>

// CSS classes for custom elements
<div className="mantine-hidden-from-md">Mobile content</div>
<div className="mantine-visible-from-xl">Wide screen content</div>
```

### Size by Breakpoint

```tsx
// Render multiple with visibility — no hydration mismatch risk
<TextInput size="xs" hiddenFrom="sm" label="Name" />
<TextInput size="xl" visibleFrom="sm" label="Name" />
```

### `useMatches` (client-only, SSR-unsafe for visible elements)

```tsx
import { useMatches } from "@mantine/core";

const color = useMatches({ base: "blue.9", sm: "orange.9", lg: "red.9" });
```

Use only for props that don't affect layout/SSR (tooltip position, modal size, etc.).

### `useMediaQuery` (SSR-safe for non-rendered elements only)

```tsx
import { useMediaQuery } from "@mantine/hooks";
import { em } from "@mantine/core";

const isMobile = useMediaQuery(`(max-width: ${em(750)})`);
// Safe for: Tooltip, Modal, Drawer — elements not in initial SSR
// Unsafe for: visible layout changes — causes hydration mismatch
```

---

## Color Scheme (Dark Mode)

### `light-dark()` Function

The primary tool for color-scheme-aware styling in inline styles:

```tsx
style={{
  background: "light-dark(rgba(255,255,255,0.55), rgba(30,32,40,0.45))",
  color: "light-dark(var(--mantine-color-black), var(--mantine-color-white))",
  borderBottom: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
}}
```

### Glass Morphism Pattern (project standard)

```tsx
<Paper
  withBorder
  radius="lg"
  p="xl"
  style={{
    background: "light-dark(rgba(255,255,255,0.55), rgba(30,32,40,0.45))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  }}
>
```

Already set as default in `theme.ts` for Paper and Card — usually no need to repeat.

### Mantine CSS Variables for Colors

```tsx
// Use these in style={{}} for automatic dark mode:
"var(--mantine-color-body)"; // page background
"var(--mantine-color-text)"; // primary text
"var(--mantine-color-dimmed)"; // muted text
"var(--mantine-color-default-border)"; // standard border
"var(--mantine-color-primary-6)"; // brand color at shade 6
"var(--mantine-color-bright)"; // black in light, white in dark
```

---

## Component Patterns

### Hover Card Effect (project pattern)

```tsx
const [hovered, setHovered] = useState(false);

<Paper
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  style={{
    transition: `box-shadow ${motion.duration.fast} ${motion.easing.standard}, transform ${motion.duration.fast} ${motion.easing.standard}`,
    boxShadow: hovered ? "0 4px 16px rgba(61,42,160,0.14)" : undefined,
    transform: hovered ? "translateY(-2px)" : undefined,
    cursor: "pointer",
  }}
>
```

### Sticky Top Bar

```tsx
<Box
  pos="sticky"
  style={{
    top: 0,
    zIndex: zIndex.sticky,
    background: "light-dark(rgba(255,255,255,0.7), rgba(30,32,40,0.7))",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
  }}
>
```

### Gradient Hero Section

```tsx
<Box
  py={{ base: 60, sm: 100 }}
  style={{
    background:
      "light-dark(linear-gradient(135deg, var(--mantine-color-primary-0) 0%, var(--mantine-color-white) 100%), linear-gradient(135deg, var(--mantine-color-dark-8) 0%, var(--mantine-color-dark-9) 100%))",
  }}
>
  <Container size="lg">
    <Title style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}>Hero Title</Title>
  </Container>
</Box>
```

### Polymorphic Components (Next.js Link)

```tsx
import Link from "next/link";
import { Button } from "@mantine/core";

// Standard approach (Next.js 13+)
<Button component={Link} href="/dashboard">Go to Dashboard</Button>

// Typed Next.js Links (generic — use renderRoot)
<Button renderRoot={(props) => <Link href="/dashboard" {...props} />}>
  Go to Dashboard
</Button>
```

### `useLinkStatus` for Pending Navigation

```tsx
import { useLinkStatus } from "next/link";

function NavItem({
  href,
  children,
}: Readonly<{ href: string; children: React.ReactNode }>) {
  const { pending } = useLinkStatus();
  return (
    <Box opacity={pending ? 0.6 : 1}>
      {children}
      {pending && <Loader size="xs" />}
    </Box>
  );
}
```

---

## Styles API — Advanced

### Targeting Inner Elements

Every Mantine component exposes named selectors. Find them in [Mantine docs](https://mantine.dev) under "Styles API" tab.

```tsx
// Inline styles on inner elements
<Button
  styles={{
    root: { padding: 2, border: 0, backgroundImage: gradient },
    inner: { background: "var(--mantine-color-body)", borderRadius: "calc(var(--button-radius) - 2px)" },
    label: { backgroundImage: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  }}
>
```

### CSS Variables Resolver (custom sizes)

```tsx
// In theme.ts — add custom sizes to any component
Button: Button.extend({
  vars: (theme, props) => {
    if (props.size === "xxl") {
      return {
        root: {
          "--button-height": "60px",
          "--button-padding-x": "30px",
          "--button-fz": "24px",
        },
      };
    }
    return { root: {} };
  },
}),
```

### Conditional classNames/styles from Props

```tsx
// In theme.ts — dynamic styles based on component props
TextInput: TextInput.extend({
  classNames: (_theme, props) => ({
    label: cx({ [classes.labelRequired]: props.required }),
    input: cx({ [classes.inputError]: props.error }),
  }),
}),
```

### `withProps` for Preconfigured Variants

```tsx
const LinkButton = Button.withProps({
  component: "a",
  target: "_blank",
  rel: "noreferrer",
  variant: "subtle",
});

<LinkButton href="https://example.com">External Link</LinkButton>;
```

### `attributes` for Testing

```tsx
<Button
  attributes={{
    root: { "data-testid": "submit-btn" },
    label: { "data-testid": "submit-label" },
  }}
>
```

---

## Forms (`@mantine/form`)

### Basic Pattern

```tsx
import { useForm } from "@mantine/form";

const form = useForm({
  mode: "uncontrolled", // recommended — avoids controlled re-renders
  initialValues: { email: "", age: 0 },
  validate: {
    email: (v) => (/^\S+@\S+$/.test(v) ? null : "Invalid email"),
    age: (v) => (v >= 18 ? null : "Must be 18+"),
  },
});

<form onSubmit={form.onSubmit(handleSubmit)}>
  <TextInput
    label="Email"
    key={form.key("email")} // required for uncontrolled mode
    {...form.getInputProps("email")}
  />
</form>;
```

### Multi-Step Form with Per-Step Validators

```tsx
// Split validators into named functions per step (ESLint enforced)
function validatePersonalStep(values: FormValues) {
  return {
    firstName: values.firstName ? null : "Required",
    lastName: values.lastName ? null : "Required",
  };
}

function validateContactStep(values: FormValues) {
  return {
    email: /^\S+@\S+$/.test(values.email) ? null : "Invalid email",
    phone: values.phone.length >= 10 ? null : "Too short",
  };
}

const form = useForm({
  mode: "uncontrolled",
  initialValues: { firstName: "", lastName: "", email: "", phone: "" },
  validate: (values) => {
    if (activeStep === 0) return validatePersonalStep(values);
    if (activeStep === 1) return validateContactStep(values);
    return {};
  },
});
```

### Auto-Save Pattern (no useForm)

For edit screens where each field saves independently:

```tsx
const [value, setValue] = useState(initialValue);
const { mutate } = useMutation({
  mutationFn: (newValue: string) => updateField(id, "fieldName", newValue),
  onMutate: async (newValue) => {
    await queryClient.cancelQueries({ queryKey });
    const prev = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old) => ({
      ...old,
      fieldName: newValue,
    }));
    return { prev };
  },
  onError: (_err, _vars, ctx) => queryClient.setQueryData(queryKey, ctx?.prev),
  onSettled: () => queryClient.invalidateQueries({ queryKey }),
});
```

---

## Notifications

```tsx
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { colors } from "@/ui/tokens";

// Success
notifications.show({
  title: "Saved successfully",
  message: "Your changes have been saved.",
  color: colors.success,
  icon: <IconCheck size={18} />,
});

// Error
notifications.show({
  title: "Something went wrong",
  message: error.message,
  color: colors.danger,
  icon: <IconX size={18} />,
});

// Warning
notifications.show({
  title: "Unsaved changes",
  message: "You have unsaved changes.",
  color: colors.warning,
});
```

---

## Modals

```tsx
import { modals } from "@mantine/modals";

// Confirm (destructive action)
modals.openConfirmModal({
  title: "Delete prescription?",
  children: <Text size="sm">This action cannot be undone.</Text>,
  labels: { confirm: "Delete", cancel: "Cancel" },
  confirmProps: { color: "red" },
  onConfirm: () => deleteMutation.mutate(id),
});

// Content modal (form inside)
modals.open({
  title: "Add family member",
  children: (
    <DependentForm
      onSubmit={(data) => {
        addMutation.mutate(data);
        modals.closeAll();
      }}
    />
  ),
});

// Confirm (non-destructive)
modals.openConfirmModal({
  title: "Confirm submission",
  children: <Text size="sm">Are you sure you want to submit?</Text>,
  labels: { confirm: "Submit", cancel: "Go back" },
  confirmProps: { color: "primary" },
  onConfirm: handleSubmit,
});
```

---

## Key Mantine Hooks

| Hook                | Use Case                                                          |
| ------------------- | ----------------------------------------------------------------- |
| `useDisclosure`     | Boolean toggle (modal open/close, accordion, etc.)                |
| `useMediaQuery`     | Responsive logic (SSR-safe only for non-rendered elements)        |
| `useMatches`        | Multi-breakpoint value matching                                   |
| `useDebouncedValue` | Debounce search input                                             |
| `useClickOutside`   | Close dropdown/popover on outside click                           |
| `useHover`          | Hover state (simpler than manual `useState`)                      |
| `useIntersection`   | Infinite scroll / lazy rendering triggers                         |
| `useScrollIntoView` | Programmatic smooth scroll to element                             |
| `useClipboard`      | Copy to clipboard with timeout feedback                           |
| `useForm`           | Form state, validation, submission                                |
| `useInputState`     | Single controlled input (simpler than `useState` + event handler) |
| `useLocalStorage`   | Persist state to localStorage with SSR safety                     |
| `useNetwork`        | Online/offline detection                                          |
| `useOs`             | Detect OS for platform-specific UI                                |
| `useViewportSize`   | Viewport dimensions (re-renders on resize)                        |
| `useElementSize`    | Element dimensions via ResizeObserver                             |
| `useMove`           | Custom slider/drag interaction                                    |
| `usePagination`     | Pagination state management                                       |

---

## Loading & Skeleton Patterns

### Page-Level Loading (`loading.tsx`)

Every page that fetches server data needs a sibling `loading.tsx`:

```tsx
import { Container, Skeleton, Stack } from "@mantine/core";

export default function Loading() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="md">
        <Skeleton h={32} w={200} radius="md" />
        <Skeleton h={200} radius="lg" />
        <Skeleton h={200} radius="lg" />
      </Stack>
    </Container>
  );
}
```

### Client Component Loading

```tsx
function PatientList() {
  const { data, isLoading } = useQuery(/* ... */);

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h={60} radius="md" />
        ))}
      </Stack>
    );
  }

  return /* ... */;
}
```

---

## Mantine Extensions Reference

| Package                   | Purpose                                                          |
| ------------------------- | ---------------------------------------------------------------- |
| `@mantine/dates`          | DatePicker, Calendar, DateInput, DatePickerInput, TimeInput      |
| `@mantine/charts`         | AreaChart, BarChart, LineChart, PieChart (recharts-based)        |
| `@mantine/notifications`  | Toast notification system (already configured in providers)      |
| `@mantine/modals`         | Modal manager with confirm/content patterns (already configured) |
| `@mantine/spotlight`      | Command palette / search bar (`Ctrl+K`)                          |
| `@mantine/carousel`       | Carousel/slider (embla-carousel-based)                           |
| `@mantine/dropzone`       | File upload with drag-and-drop                                   |
| `@mantine/tiptap`         | Rich text editor                                                 |
| `@mantine/nprogress`      | Page navigation progress bar                                     |
| `@mantine/code-highlight` | Syntax-highlighted code blocks                                   |

---

## CSS Variables Quick Reference

### Spacing / Sizing

```
var(--mantine-spacing-xs)   → 0.375rem (6px)
var(--mantine-spacing-sm)   → 0.625rem (10px)
var(--mantine-spacing-md)   → 1rem     (16px)
var(--mantine-spacing-lg)   → 1.375rem (22px)
var(--mantine-spacing-xl)   → 1.875rem (30px)
```

### Radius

```
var(--mantine-radius-xs)  → 0.25rem  (4px)
var(--mantine-radius-sm)  → 0.375rem (6px)
var(--mantine-radius-md)  → 0.5rem   (8px)
var(--mantine-radius-lg)  → 0.75rem  (12px)
var(--mantine-radius-xl)  → 1rem     (16px)
```

### Colors (auto dark-mode)

```
var(--mantine-color-body)           — page background
var(--mantine-color-text)           — primary text
var(--mantine-color-dimmed)         — muted text
var(--mantine-color-bright)         — black↔white
var(--mantine-color-default-border) — standard border
var(--mantine-color-primary-N)      — brand at shade N (0–9)
var(--mantine-color-{name}-filled)  — filled variant color
var(--mantine-color-{name}-light)   — light variant background
```

### Z-Index (Mantine built-in)

```
var(--mantine-z-index-app)     → 100
var(--mantine-z-index-modal)   → 200
var(--mantine-z-index-popover) → 300
var(--mantine-z-index-overlay) → 400
var(--mantine-z-index-max)     → 9999
```

---

## Accessibility Checklist

- [ ] Touch targets ≥ 44px (`touchTarget.min` from tokens) — buttons, links, controls
- [ ] Color contrast AAA — `primaryShade: { light: 9 }` ensures AAA on white
- [ ] `autoContrast` — set globally in theme if using light shades as `color` prop
- [ ] Focus ring — `focusRing: "auto"` (keyboard-only, default in theme)
- [ ] `respectReducedMotion: true` — set in theme, disables animations for users who prefer reduced motion
- [ ] Landmark elements — use `<main>`, `<nav>`, `<header>` in AppShell
- [ ] ARIA labels — interactive elements without visible text need `aria-label`
- [ ] Announce notifications — Mantine notifications auto-announce via `role="alert"`
- [ ] `VisuallyHidden` — use for screen-reader-only text: `<VisuallyHidden>Close dialog</VisuallyHidden>`

---

## Anti-Patterns (Do NOT)

| Anti-Pattern                                 | Instead                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| Create `.module.css` files                   | Use Mantine props + inline `style={{}}`                  |
| Hardcode colors `"#6b4ff8"`                  | Use `colors.brand` or `"var(--mantine-color-primary-6)"` |
| Hardcode spacing `16`                        | Use `"md"` prop or `spacing.md` token                    |
| Nest `<MantineProvider>` or `<Provider>`     | Already mounted once in root layout                      |
| Use `useCallback`/`useMemo` manually         | React Compiler handles this                              |
| Use `useMediaQuery` for layout affecting SSR | Use `hiddenFrom`/`visibleFrom` or responsive props       |
| Use nested ternaries in JSX                  | Extract to IIFE or named function                        |
| Use negated conditions in JSX                | Prefer positive condition first                          |
| Override theme defaults without reason       | Trust `theme.ts` component defaults                      |
| Use responsive style props in large lists    | Use static values or CSS variables                       |
