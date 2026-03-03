# SwiftDrive — Copilot Instructions

## Stack

- **Next.js 16** App Router · **React 19** · **TypeScript** (strict) · **pnpm**
- **Mantine v8** for all UI · **@tabler/icons-react** for icons
- **TanStack Query v5** for server state · **@mantine/form** for forms
- **React Compiler** is enabled (`next.config.ts`) — avoid manual `useMemo`/`useCallback` unless necessary

## Commands

```bash
pnpm dev          # start dev server (Turbopack)
pnpm build        # production build
pnpm lint         # ESLint (next/core-web-vitals + typescript)
pnpm tsc --noEmit # type check
```

## Path Alias

`@/` resolves to `src/`. Always use `@/` for cross-directory imports (e.g. `import { theme } from "@/ui/theme"`).

## UI — Mantine Only, No CSS Modules

**Do not create `.module.css` files.** All styling uses Mantine component props and inline `style={{}}`.

| Need                 | Approach                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Card / surface       | `<Paper withBorder radius="lg" p="xl">`                                                                          |
| Sticky top bar       | `<Box pos="sticky" style={{ top: 0, zIndex: 100, backdropFilter: "blur(8px)", background: "light-dark(...)" }}>` |
| Hover effects        | `useState(hovered)` + `style={{ boxShadow: hovered ? "..." : undefined }}`                                       |
| Gradient / themed bg | `style={{ background: "light-dark(var(--mantine-color-primary-0), rgba(...))" }}`                                |
| Responsive font      | `style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}`                                                               |

## Theme & Design System

`src/ui/theme.ts` — single source of truth for the entire design system:

- **Colors**: `primary` (indigo-violet), `secondary` (cool neutral), `success` (teal), `warning` (amber), `danger` (red)
- **Scales**: spacing (`3xs`→`3xl`), radius (`xs`→`xl`), shadows (`xs`→`xl`), breakpoints, font sizes, line heights
- **Component defaults**: every major Mantine component has `defaultProps` set — never override `radius`, `shadow`, `color`, or `variant` unless intentionally diverging
- **Headings**: h1–h6 sized/weighted in `theme.headings.sizes`

`src/ui/tokens.ts` — typed re-exports for use in `style={{}}` props and logic:

```ts
import { colors, spacing, radius, shadows, zIndex, motion, statusColor } from "@/ui/tokens";
// Semantic color for driver status:
const color = statusColor("available"); // → "success"
// In Badge/Alert/Button props:
<Badge color={colors.success}>Available</Badge>
```

Live showcase of all tokens and components: **`/design-system`** (`src/app/design-system/page.tsx`)

## Provider Setup

`<Provider>` in `src/ui/providers/provider.tsx` wraps **MantineProvider + ModalsProvider + Notifications**. It is applied **once** in `src/app/layout.tsx`. Never nest a second `<Provider>`.  
`<QueryProvider>` in `src/ui/providers/query-provider.tsx` wraps TanStack Query — add it inside `<Provider>` when data fetching is needed.

## TypeScript Rules (ESLint enforced)

- All component props must be `Readonly<{...}>` or `Readonly<Props>`
- No nested ternaries — extract to an IIFE `{(() => { if ... return ... })()}` or a named function
- No negated conditions in JSX — prefer positive condition first
- Complex `validate` functions in `useForm` must be split into named per-step validators (see `src/app/register-driver/page.tsx`)

## Notifications & Modals

```ts
// Notification — always use semantic colors from tokens.ts
notifications.show({ title: "...", message: "...", color: colors.success, icon: <IconCheck size={18} /> });

// Confirm modal
modals.openConfirmModal({ title, children, labels, confirmProps: { color: "primary" }, onConfirm });
```

## TanStack Query Client

`src/lib/query/client.ts` — singleton pattern (new instance per SSR request, shared on client). Default `staleTime` is 1 year (treat server data as static until explicitly invalidated).

## Key Files

| File                               | Purpose                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/ui/theme.ts`                  | Full design system — color palettes, scale tokens (spacing/radius/shadow), all component `defaultProps` |
| `src/ui/tokens.ts`                 | Typed token exports + semantic color helpers (`colors`, `statusColor`, `zIndex`, `motion`)              |
| `src/app/design-system/page.tsx`   | Living showcase of every design token and component                                                     |
| `src/ui/providers/provider.tsx`    | Root Mantine + modal + notification provider                                                            |
| `src/ui/layouts/`                  | Reusable shell layouts (landing, portal, main)                                                          |
| `src/app/layout.tsx`               | Root layout — font (Roboto), `<Provider>` mount point                                                   |
| `src/app/find/page.tsx`            | Driver search page — reference for Search + filter patterns                                             |
| `src/app/register-driver/page.tsx` | Multi-step `useForm` reference with per-step validators                                                 |
| `src/ui/driver-card.tsx`           | Reusable `Driver` type + card component                                                                 |

- Always use usecase in api, server actions, and SSR Page. For example, in `src/app/api/conditions/[conditionId]/route.ts`:

```ts

```
