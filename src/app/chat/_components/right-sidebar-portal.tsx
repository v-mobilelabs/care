"use client";
/**
 * RightSidebarPortal
 *
 * Render this component inside any page to inject content into the right
 * sidebar AppShell.Aside. The sidebar automatically shows when this is
 * mounted and hides when it unmounts or when no portal is active.
 *
 * Usage:
 *   <RightSidebarPortal>
 *     <MyCustomContent />
 *   </RightSidebarPortal>
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { useRightSidebar } from "@/app/chat/_context/right-sidebar-context";

interface RightSidebarPortalProps {
    children: React.ReactNode;
}

export function RightSidebarPortal({ children }: Readonly<RightSidebarPortalProps>) {
    const { container, incPortal, decPortal } = useRightSidebar();

    useEffect(() => {
        incPortal();
        return () => decPortal();
    }, [incPortal, decPortal]);

    if (!container) return null;
    return createPortal(children, container);
}
