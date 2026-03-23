---
name: code-review
description: "**CODE REVIEW SKILL** — Checklist-driven code review for this Next.js 16 + React 19 + Mantine v8 + Firestore healthcare project. USE FOR: reviewing PRs and diffs; architecture alignment checks; anti-pattern detection; code smells; code duplication; SonarQube-equivalent static analysis; lint and warnings; security review (OWASP, healthcare data); performance review; TypeScript strictness; ESLint rule compliance; data-layer convention enforcement; frontend convention enforcement; AI pipeline review; generating fix plans. DO NOT USE FOR: writing new features (use data-layer, frontend, or ai-sdk skills); business analysis (use business-analysis skill)."
---

# Code Review — Checklist, Anti-Patterns & Fix Plan

## Review Philosophy

1. **Convention over opinion** — every review comment MUST reference a specific rule from copilot-instructions.md, a skill file, or an ESLint/TS config.
2. **Severity levels** — tag every finding: 🔴 blocker (must fix), 🟡 warning (should fix), 🟢 nit (optional improvement).
3. **Praise good patterns** — call out exemplary code so contributors learn what "right" looks like.
4. **No bike-shedding** — if the code satisfies conventions and works, approve it. Don't request style changes already handled by theme defaults or React Compiler.
5. **Healthcare context** — this is a medical application. Security, data privacy, and correctness outweigh convenience.

---

## Review Checklist

### 1. Architecture & Layer Compliance

| Check                                                                                                | Rule                                    | Severity |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- |
| API routes call UseCases, never Services or Repositories directly                                    | data-layer § Golden Rule 6              | 🔴       |
| UseCase extends `UseCase<TInput, TOutput>` with Zod schema validation                                | data-layer § UseCase Layer              | 🔴       |
| Domain folder has `models/`, `repositories/`, `service/` (optional), `use-cases/`, `index.ts` barrel | data-layer § Domain Folder Structure    | 🟡       |
| Barrel `index.ts` exports only public API — no deep imports from consumers                           | data-layer § Golden Rule 2              | 🟡       |
| `profileId = dependentId ?? userId` threaded through every layer                                     | data-layer § Golden Rule 4              | 🔴       |
| `stripUndefined()` before every Firestore `.set()` or `.add()`                                       | data-layer § Golden Rule 5              | 🔴       |
| RAG indexing uses `@Indexable` decorator, not manual `ragService` calls from use cases               | data-layer § Golden Rule 7              | 🟡       |
| Repositories are singleton plain objects, Services are class + singleton instance                    | data-layer § Repo & Service conventions | 🟡       |

### 2. TypeScript & ESLint Strictness

| Check                                                                   | Rule                                    | Severity |
| ----------------------------------------------------------------------- | --------------------------------------- | -------- |
| Component props typed as `Readonly<{...}>` or `Readonly<Props>`         | copilot-instructions § TypeScript Rules | 🔴       |
| No nested ternaries — use IIFE or named function                        | copilot-instructions § TypeScript Rules | 🟡       |
| No negated conditions in JSX — positive condition first                 | copilot-instructions § TypeScript Rules | 🟡       |
| No unused imports (auto-fixed by `unused-imports` plugin)               | eslint.config.mjs                       | 🟢       |
| Functions ≤ 20 lines (excl. blanks/comments) — `max-lines-per-function` | eslint.config.mjs                       | 🟡       |
| `strict: true` in tsconfig — no `any` casts without justification       | tsconfig.json                           | 🔴       |
| `@/` path alias for all cross-directory imports                         | copilot-instructions § Path Alias       | 🟡       |

### 3. Frontend — Mantine & Styling

| Check                                                                                           | Rule                                   | Severity |
| ----------------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| No `.module.css` files created                                                                  | copilot-instructions § UI              | 🔴       |
| All styling via Mantine props + inline `style={{}}`                                             | copilot-instructions § UI              | 🔴       |
| No hardcoded colors — use `@/ui/tokens` (`colors`, `colorRoles`)                                | frontend § Golden Rule 3               | 🟡       |
| No override of `radius`, `shadow`, `color`, `variant` unless intentionally diverging from theme | frontend § Golden Rule 2               | 🟡       |
| No manual `useMemo`/`useCallback` — React Compiler handles memoization                          | copilot-instructions § Stack           | 🟡       |
| Dark mode: uses `light-dark()` in inline styles, not conditional classes                        | frontend § Color Scheme                | 🟡       |
| Responsive: mobile-first with `{{ base, sm, md }}` prop syntax                                  | frontend § Responsive Design           | 🟡       |
| Uses Mantine hooks (`useDisclosure`, `useDebouncedValue`, etc.) before custom hooks             | frontend § Golden Rule 7               | 🟢       |
| Loading pages use `loading.tsx` with `Skeleton` components                                      | copilot-instructions § Key conventions | 🟡       |

### 4. Data Fetching & Caching

| Check                                                                                           | Rule                                      | Severity |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| SSR pages use `'use cache'` + `cacheTag()` + `cacheLife()`                                      | copilot-instructions § SSR cache patterns | 🟡       |
| Mutations use optimistic updates via TanStack Query `setQueryData`                              | copilot-instructions § Optimistic Updates | 🟡       |
| Cache invalidation after mutations: `revalidateTag()` (server) + `invalidateQueries()` (client) | Next.js 16 cache pattern                  | 🟡       |
| `revalidateTag()` called with 2 args in Next 16 (tag, cacheLife profile)                        | Next.js 16 convention                     | 🔴       |
| Query keys use factory functions (`chatKeys.*`, domain key factories) — no hardcoded arrays     | business-analysis § Golden Rule 6         | 🟡       |
| `staleTime` default is 1 year — only override if data changes frequently                        | copilot-instructions § TanStack Query     | 🟢       |

### 5. AI Pipeline

| Check                                                                                  | Rule                         | Severity |
| -------------------------------------------------------------------------------------- | ---------------------------- | -------- |
| Agent created via `createAgent()` factory — never instantiate `ToolLoopAgent` directly | ai-sdk § Golden Rule 2       | 🔴       |
| Tools use `buildTools(options)` closures — no shared tool state across requests        | ai-sdk § Golden Rule 4       | 🔴       |
| Streaming responses consumed — `return result.toUIMessageStreamResponse()`             | ai-sdk § Golden Rule 5       | 🔴       |
| Persistence uses `after()` — no `await` on Firestore writes in streaming path          | ai-sdk § Golden Rule 7       | 🔴       |
| Tool Zod schemas use `.describe()` on every property                                   | ai-sdk § Golden Rule 6       | 🟡       |
| Credit middleware prevents double-charging via `__creditConsumed` flag                 | ai-sdk § Middleware          | 🔴       |
| New patient-data features have keywords added to `RECORD_HINTS` in gateway             | ai-sdk § RAG / gateway hints | 🟡       |
| New agents registered in AGENTS map + gateway routing + prompt options                 | ai-sdk § Register in Gateway | 🟡       |

### 6. Security & Healthcare Compliance

| Check                                                                                     | Rule                               | Severity |
| ----------------------------------------------------------------------------------------- | ---------------------------------- | -------- |
| No patient health data logged to console or exposed in error messages                     | OWASP / HIPAA                      | 🔴       |
| No secrets or API keys hardcoded — use environment variables                              | OWASP § Cryptographic Failures     | 🔴       |
| User input validated via Zod at UseCase boundary — no unvalidated data reaching Firestore | data-layer § Golden Rule 8         | 🔴       |
| Cross-user data access validates consent status (doctor ↔ patient)                        | business-analysis § Golden Rule 10 | 🔴       |
| No SQL/NoSQL injection — all Firestore queries use parameterized `.where()`               | OWASP § Injection                  | 🔴       |
| File uploads validated (type, size) before storage                                        | OWASP § Insecure Design            | 🟡       |
| Auth context verified in every API route — `userId` from session, not request body        | OWASP § Broken Access Control      | 🔴       |
| No SSRF — external URLs not fetched from user-provided input without allowlisting         | OWASP § SSRF                       | 🔴       |
| Credit/usage gating enforced — depleted users cannot bypass via direct API calls          | Credit system convention           | 🔴       |
| Monthly usage uses `usage/{profile}` collection — not legacy `credits/{userId}`           | Unified credit system convention   | 🔴       |

### 7. Performance

| Check                                                                       | Rule                             | Severity |
| --------------------------------------------------------------------------- | -------------------------------- | -------- |
| No `useEffect` for data that could be fetched server-side                   | Next.js App Router               | 🟡       |
| Large components broken into smaller ones (≤20 lines per function)          | eslint.config.mjs                | 🟡       |
| No responsive style props (`w={{ base, sm }}`) in lists of 100+ items       | frontend § Performance Note      | 🟡       |
| `Promise.all()` for independent parallel operations — not sequential awaits | data-layer § Service conventions | 🟡       |
| RAG/external calls wrapped in `withTimeout()` to prevent hanging            | ai-sdk § Middleware              | 🟡       |
| Images use Next.js `<Image>` with explicit width/height or `fill`           | Next.js best practices           | 🟢       |

---

## Anti-Pattern Catalog

### 🔴 Blockers (must fix before merge)

| Anti-Pattern                                                              | Correct Pattern                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `router.ts` directly calls `allergyService.create()`                      | Route → `CreateAllergyUseCase.execute()`                                 |
| `const [data, setData] = useState()` + `useEffect(fetch)` for server data | SSR `'use cache'` + `cacheTag()` or TanStack `useQuery()`                |
| `<div className={styles.card}>` (CSS module)                              | `<Paper withBorder radius="lg" p="xl">`                                  |
| `props: { name: string }` (mutable props)                                 | `props: Readonly<{ name: string }>`                                      |
| `await db.collection("allergies").add(doc)` (unscoped)                    | `await scopedCol(profileId, "allergies").doc().set(stripUndefined(doc))` |
| `const model = new ToolLoopAgent(...)` from API route                     | `const agent = createAgent({...}); agent.stream(options)`                |
| `await saveMessage(...)` in streaming response path                       | `after(() => saveMessage(...))`                                          |
| `useMemo(() => expensiveCalc, [deps])`                                    | Remove — React Compiler handles it                                       |

### 🟡 Warnings (should fix)

| Anti-Pattern                                                                      | Correct Pattern                                                                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `queryClient.invalidateQueries(["sessions"])` (hardcoded key)                     | `queryClient.invalidateQueries(chatKeys.sessions(profileId))`                     |
| `style={{ color: "#6366f1" }}` (hardcoded color)                                  | `style={{ color: "var(--mantine-color-primary-6)" }}` or `color={colors.primary}` |
| `condition ? <A /> : condition2 ? <B /> : <C />` (nested ternary)                 | IIFE: `{(() => { if (condition) return <A />; ... })()}`                          |
| `import { allergyRepository } from "../repositories/allergy.repository"` in route | `import { CreateAllergyUseCase } from "@/data/allergies"` (barrel)                |
| Service without cross-cutting concerns                                            | Skip service — UseCase calls Repository directly                                  |
| Missing `loading.tsx` for SSR data-fetching page                                  | Add skeleton page matching content layout                                         |

### 🟢 Nits (optional)

| Anti-Pattern                                      | Correct Pattern                                        |
| ------------------------------------------------- | ------------------------------------------------------ |
| Custom debounce hook                              | `useDebouncedValue` from `@mantine/hooks`              |
| `console.log(data)` left in production code       | Remove or use structured logging                       |
| Generic variable names (`data`, `result`, `temp`) | Domain-specific names (`allergies`, `prescriptionDto`) |

---

## Code Smells

Detect structural weaknesses that aren't bugs but increase maintenance cost and cognitive load.

### Smell Catalog

| Smell                      | Detection Signal                                                                            | Severity | Fix                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| **God Function**           | Function > 20 lines (ESLint `max-lines-per-function`) or does 3+ things                     | 🟡       | Extract into named helpers or custom hooks                                             |
| **Feature Envy**           | Component/hook reaches into 3+ unrelated domains (`@/data/X`, `@/data/Y`, `@/data/Z`)       | 🟡       | Move logic to a Service or UseCase that orchestrates                                   |
| **Primitive Obsession**    | Passing raw strings for IDs (`userId: string`) through 5+ layers without a branded type     | 🟢       | Acceptable in this codebase (Firestore IDs are strings), flag only if causing bugs     |
| **Long Parameter List**    | Function takes > 4 positional args                                                          | 🟡       | Refactor to options object `(opts: Readonly<{...}>)`                                   |
| **Shotgun Surgery**        | Adding a feature requires touching 5+ unrelated files                                       | 🟡       | Check if domain folder structure is followed — may need new barrel or colocated module |
| **Refused Bequest**        | UseCase extends `UseCase<T, R>` but overrides `execute()` incorrectly or skips `validate()` | 🔴       | Follow UseCase template from data-layer skill                                          |
| **Dead Code**              | Exported functions/types with zero import references                                        | 🟡       | Remove or mark with `// TODO: remove after X`                                          |
| **Leaky Abstraction**      | Repository returns Firestore `DocumentSnapshot` instead of DTO                              | 🔴       | Map to DTO in repository — consumers never see Firestore types                         |
| **Boolean Blindness**      | Function takes 3+ boolean params (`create(true, false, true)`)                              | 🟡       | Replace with options object with named keys                                            |
| **Magic Numbers/Strings**  | Hardcoded `500`, `"profiles"`, `30_000` without named constant                              | 🟡       | Extract to `const` or import from `@/lib/constants`                                    |
| **Temporal Coupling**      | Function A must be called before Function B but nothing enforces it                         | 🟡       | Make dependency explicit (pass output of A as input to B)                              |
| **Inappropriate Intimacy** | Component directly accesses another component's internal state or context                   | 🔴       | Use props, callbacks, or shared context provider                                       |

---

## Code Duplication

Detect duplicated logic that should be extracted into shared utilities, hooks, or components.

### Detection Rules

| Duplication Type           | Threshold                                                      | Action                                                   | Severity |
| -------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| **Exact clone**            | ≥ 6 identical lines across 2+ files                            | Extract to shared utility or hook                        | 🟡       |
| **Structural clone**       | Same logic with different variable names across 2+ files       | Extract with parameterization                            | 🟡       |
| **Semantic clone**         | Same business intent implemented differently in 2+ places      | Consolidate into single UseCase or Service               | 🔴       |
| **Copy-paste DTO**         | Same Zod schema or type defined in multiple domain models      | Move to `@/data/shared/models/` or reuse via composition | 🟡       |
| **Repeated query pattern** | Same `useQuery` setup (key, fetcher, options) in 3+ components | Extract to domain hook: `use{Domain}Query()`             | 🟡       |
| **Repeated UI pattern**    | Same card/list/form layout in 3+ pages                         | Extract to shared component in `@/ui/`                   | 🟡       |

### Common Duplication Hotspots in This Codebase

| Location                | What duplicates                                      | Shared target                                            |
| ----------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| API route handlers      | Auth extraction + error wrapping                     | Already handled by `withContext` — verify usage          |
| Domain `list` use cases | Pagination + sort + search boilerplate               | Follow cursor pagination pattern from data-layer skill   |
| Usage/KPI cards         | Card layout (header → ring → stats → footer)         | Use `UsageCardSkeleton` and `StatRow` from `_shared.tsx` |
| Tool definitions        | Zod schema `.describe()` patterns for similar inputs | Extract shared schemas to `@/data/shared/models/`        |
| Loading pages           | Skeleton layouts                                     | Verify each `loading.tsx` matches its page structure     |

---

## SonarQube / Static Analysis Issues

Map common SonarQube rules to this project's conventions and identify issues a static analyzer would flag.

### Critical Rules (equivalent to SonarQube Blocker/Critical)

| SonarQube Rule                         | Project Equivalent                                | Check                                                    |
| -------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| **S1854** — Dead stores                | Unused variable assigned then overwritten         | ESLint `unused-imports/no-unused-vars` catches most      |
| **S3776** — Cognitive complexity       | Function too complex (branches + nesting)         | `max-lines-per-function: 20` enforces this indirectly    |
| **S2068** — Hardcoded credentials      | API keys, tokens, passwords in source             | Env vars only — check for `NEXT_PUBLIC_` leaking secrets |
| **S5131** — XSS                        | `dangerouslySetInnerHTML` without sanitization    | Flag every usage — require DOMPurify or equivalent       |
| **S4423** — Weak TLS                   | Insecure HTTP calls                               | All external calls must use HTTPS                        |
| **S2245** — Insecure randomness        | `Math.random()` for security-sensitive operations | Use `crypto.randomUUID()` for IDs/tokens                 |
| **S1128** — Unused imports             | Imports never referenced                          | Auto-fixed by `unused-imports` ESLint plugin             |
| **S107** — Too many parameters         | Function > 4 params                               | Refactor to options object                               |
| **S1192** — String literal duplication | Same string literal used 3+ times                 | Extract to constant in `@/lib/constants`                 |
| **S3358** — Nested ternary             | Ternary inside ternary                            | Enforced by copilot-instructions — use IIFE              |

### Major Rules (equivalent to SonarQube Major)

| SonarQube Rule                         | Project Equivalent                       | Check                                                    |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| **S1481** — Unused local variable      | Variable declared but never read         | `unused-imports/no-unused-vars`                          |
| **S6544** — Promise in boolean context | `if (asyncFunction())` without `await`   | TypeScript strict catches most                           |
| **S4138** — `for...of` over `forEach`  | Prefer `for...of` for early returns      | Allowed — either is fine, prefer `.map()` for transforms |
| **S1116** — Empty statement            | Stray semicolons `;`                     | Visual inspection                                        |
| **S6747** — Unnecessary React fragment | `<><Child /></>` wrapping single element | Remove fragment                                          |
| **S6819** — Missing `key` in JSX list  | `.map()` without `key` prop              | React ESLint rule catches this                           |

### Info Rules (equivalent to SonarQube Info)

| SonarQube Rule                  | Project Equivalent                 | Check                                               |
| ------------------------------- | ---------------------------------- | --------------------------------------------------- |
| **S1135** — TODO/FIXME in code  | `// TODO` or `// FIXME` comments   | Flag for tracking — ensure tracked in issue tracker |
| **S125** — Commented-out code   | Blocks of code commented with `//` | Remove — use git history instead                    |
| **S1186** — Empty function body | `() => {}` as placeholder          | Add `// intentionally empty` comment or remove      |

---

## Lint & Warnings

Comprehensive check for ESLint errors, TypeScript warnings, and runtime console warnings.

### ESLint (project config: `eslint.config.mjs`)

| Rule                                | Level | What to Check                                                                    |
| ----------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `max-lines-per-function`            | error | Functions > 20 lines (excl. blanks/comments). Split into named helpers.          |
| `unused-imports/no-unused-imports`  | error | Auto-fixable — run `pnpm lint --fix`                                             |
| `unused-imports/no-unused-vars`     | warn  | Variables prefixed `_` are exempt. Remove or prefix unused args.                 |
| `@next/next/no-img-element`         | warn  | Use `<Image>` from `next/image` instead of `<img>`                               |
| `@next/next/no-html-link-for-pages` | warn  | Use `<Link>` from `next/link` instead of `<a>` for internal navigation           |
| `react/no-unescaped-entities`       | warn  | Use `&apos;`, `&quot;` in JSX text                                               |
| `react-hooks/exhaustive-deps`       | warn  | Generally satisfied by React Compiler — but verify hook dependencies are correct |

### TypeScript Strict Mode Warnings

| Issue                | Detection                                  | Fix                                                               |
| -------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Implicit `any`       | `noImplicitAny` in strict mode             | Add explicit types — especially for event handlers, API responses |
| Unsafe member access | `obj.prop` on `unknown` type               | Narrow with type guard or Zod parse                               |
| Missing return type  | Exported functions without explicit return | Add return type annotation for public APIs                        |
| Unused `@ts-ignore`  | Suppression no longer needed               | Remove — code may have been fixed                                 |
| `as` type assertions | Bypasses type checker                      | Prefer type narrowing via `if/in` guards or Zod                   |

### Runtime Warnings (browser console)

| Warning                                         | Source                                   | Fix                                                                           |
| ----------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| "Each child in a list should have a unique key" | React                                    | Add `key` prop to `.map()` items                                              |
| "Cannot update a component while rendering"     | React                                    | Move state update to `useEffect` or event handler                             |
| "Hydration mismatch"                            | Next.js SSR                              | Don't use `useMediaQuery` for visible layout — use `hiddenFrom`/`visibleFrom` |
| "Missing Suspense boundary"                     | Next.js `use()`                          | Wrap async component in `<Suspense fallback={<Skeleton />}>`                  |
| Mantine "Unknown props"                         | Passing HTML attrs to Mantine components | Use `style={{}}` or correct Mantine prop name                                 |

### Verification Commands

```bash
# Type check — must pass with zero errors
pnpm tsc --noEmit

# Lint — must pass with zero errors, warnings acceptable if tracked
pnpm lint

# Lint with auto-fix (unused imports, formatting)
pnpm lint --fix

# Check for TODO/FIXME comments
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" | head -20
```

---

## Review Output Format

When generating a code review, structure findings as:

```
## Code Review Summary

**Files reviewed**: N
**Findings**: X blocker(s), Y warning(s), Z nit(s)
**Verdict**: ✅ Approve / 🟡 Approve with suggestions / 🔴 Request changes

### Findings

#### 🔴 [filename:line] — Short description
**Rule**: [skill/convention reference]
**Current**: `code snippet`
**Suggested**: `corrected code`
**Why**: Brief explanation

#### 🟡 [filename:line] — Short description
...
```

---

## Review Scope by Change Type

| Change Type        | Focus Areas                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| New data domain    | Architecture layers, barrel exports, scoped collections, Zod schemas, `@Indexable`, `stripUndefined` |
| New page/component | Mantine-only styling, `Readonly` props, loading states, responsive design, dark mode                 |
| New API route      | UseCase entry point, auth context, error handling, cache invalidation                                |
| New AI agent/tool  | `createAgent()` factory, tool closures, gateway registration, RAG hints, credit middleware           |
| Bug fix            | Regression risk, test coverage, root cause vs. symptom fix                                           |
| Dependency update  | Breaking changes, bundle size impact, security advisories                                            |
| Refactor           | Behavior preservation, no new features snuck in, barrel exports updated                              |

---

## Fix Plan Generation

After completing the review, generate a prioritized fix plan as a numbered todo list. Group by severity and estimate relative effort.

### Fix Plan Format

```
## Fix Plan

**Total findings**: X blocker(s), Y warning(s), Z nit(s)
**Estimated effort**: [S / M / L] per finding

### 🔴 Blockers (fix immediately — PR cannot merge)

1. [ ] **[file:line]** — Description
   - **Rule**: [convention reference]
   - **Fix**: Specific code change or refactor step
   - **Effort**: S (< 5 min) / M (5-30 min) / L (30+ min)

2. [ ] **[file:line]** — Description
   ...

### 🟡 Warnings (fix before merge — or create tracked issue)

3. [ ] **[file:line]** — Description
   - **Rule**: [convention reference]
   - **Fix**: Specific code change
   - **Effort**: S / M / L

### 🟢 Nits (optional — improve if touching the file anyway)

5. [ ] **[file:line]** — Description
   - **Fix**: Suggestion
   - **Effort**: S

### 📊 Summary

| Severity | Count | Est. Total Effort |
|----------|-------|-------------------|
| 🔴 Blocker | X | ~N min |
| 🟡 Warning | Y | ~N min |
| 🟢 Nit | Z | ~N min |

### Suggested Fix Order

1. Security blockers first (auth, data access, injection)
2. Architecture blockers (UseCase violations, layer breaches)
3. Type safety (Readonly props, any casts)
4. Data integrity (stripUndefined, scoped collections)
5. Frontend compliance (Mantine-only, dark mode, responsive)
6. Performance warnings
7. Code smells and duplication
8. Nits and cleanups
```

### Auto-Fix Capabilities

After generating the plan, offer to auto-fix what's possible:

```
### Auto-Fixable Items

The following can be fixed automatically:
- [ ] Unused imports → `pnpm lint --fix`
- [ ] Missing `Readonly<>` on props → wrap existing type
- [ ] `stripUndefined()` missing → add before `.set()`/`.add()`
- [ ] Hardcoded colors → replace with token imports
- [ ] Nested ternaries → extract to IIFE

Shall I fix these automatically? (yes / select items / no)
```
