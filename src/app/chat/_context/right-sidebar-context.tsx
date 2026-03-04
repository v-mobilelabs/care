"use client";
/**
 * Right Sidebar Context
 *
 * Uses a React DOM portal pattern to let any page inject content into
 * the AppShell.Aside without prop drilling or shared state across the tree.
 *
 * Architecture:
 *   1. <RightSidebarProvider> wraps the shell — owns the container element,
 *      portal mount count, and open/closed state.
 *   2. <RightSidebar> renders the aside and registers its inner div as the
 *      portal target via setContainer.
 *   3. <RightSidebarPortal> (used by pages) renders children into the target
 *      via ReactDOM.createPortal and tracks mount/unmount to drive auto-hide.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

export interface RightSidebarContextValue {
    /** The DOM element that portals render into. Null until the aside mounts. */
    container: HTMLDivElement | null;
    /** Called by <RightSidebar> to register its inner div. */
    setContainer: (el: HTMLDivElement | null) => void;
    /** Number of <RightSidebarPortal> instances currently mounted. */
    portalCount: number;
    /** Whether at least one portal is active (i.e. the sidebar has content). */
    hasContent: boolean;
    /** Increment portal counter — called on portal mount. */
    incPortal: () => void;
    /** Decrement portal counter — called on portal unmount. */
    decPortal: () => void;
    /** Whether the sidebar panel is open (not collapsed). */
    rightOpened: boolean;
    /** Toggle open/closed. */
    toggleRight: () => void;
    /** Programmatically open the sidebar. */
    openRight: () => void;
    /** Programmatically close the sidebar. */
    closeRight: () => void;
}

const RightSidebarContext = createContext<RightSidebarContextValue | null>(null);

export function useRightSidebar(): RightSidebarContextValue {
    const ctx = useContext(RightSidebarContext);
    if (!ctx) throw new Error("useRightSidebar must be used inside <RightSidebarProvider>");
    return ctx;
}

export function RightSidebarProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const [portalCount, setPortalCount] = useState(0);
    // Start closed — auto-open only when the first portal mounts so it never
    // flashes open on pages that don't inject sidebar content.
    const [rightOpened, { open: openRight, close: closeRight, toggle: toggleRight }] = useDisclosure(false);
    const prevPortalCountRef = useRef(0);
    // lg breakpoint = 1024px — iPads (768–1024px) stay closed, only full
    // desktop/large-tablet widths auto-open the right sidebar.
    const isLargeScreen = useMediaQuery("(min-width: 1024px)", false, { getInitialValueInEffect: false });

    const incPortal = useCallback(() => setPortalCount((c) => c + 1), []);
    const decPortal = useCallback(() => setPortalCount((c) => Math.max(0, c - 1)), []);

    // Auto-open when the first portal mounts (0 → 1) — but only on large
    // screens. On small screens the sidebar starts closed so it doesn't block
    // the full-screen layout on first load.
    useEffect(() => {
        if (prevPortalCountRef.current === 0 && portalCount > 0 && isLargeScreen) {
            openRight();
        }
        prevPortalCountRef.current = portalCount;
    }, [portalCount, openRight, isLargeScreen]);

    return (
        <RightSidebarContext.Provider
            value={{
                container,
                setContainer,
                portalCount,
                hasContent: portalCount > 0,
                incPortal,
                decPortal,
                rightOpened,
                toggleRight,
                openRight,
                closeRight,
            }}
        >
            {children}
        </RightSidebarContext.Provider>
    );
}
