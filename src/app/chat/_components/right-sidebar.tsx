"use client";
/**
 * RightSidebar — pure container
 *
 * Renders the AppShell.Aside and registers its inner div as the portal
 * target via RightSidebarContext. Pages inject their content via
 * <RightSidebarPortal>. When no portal is active the aside is collapsed
 * automatically by the layout (reads `hasContent` from context).
 */

import { AppShell } from "@mantine/core";
import { useRightSidebar } from "@/app/chat/_context/right-sidebar-context";

export function RightSidebar() {
    const { setContainer } = useRightSidebar();

    return (
        <AppShell.Aside
            style={(theme) => ({
                borderLeft: `1px solid light-dark(${theme.colors.gray[2]}, rgba(255,255,255,0.06))`,
                background: "light-dark(var(--mantine-color-white), #171717)",
            })}
        >
            <div
                ref={setContainer}
                style={{ height: "100%", overflow: "hidden" }}
            />
        </AppShell.Aside>
    );
}
