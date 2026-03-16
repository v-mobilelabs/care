"use client";
import { Box, Text, UnstyledButton } from "@mantine/core";
import { IconApps } from "@tabler/icons-react";
import { useState } from "react";

import { AppsModal } from "@/ui/chat/components/apps-modal";

// ── FAB height exported so layout can add a bottom spacer ─────────────────────

export const FAB_AREA_HEIGHT = 72;

// ── FAB ───────────────────────────────────────────────────────────────────────

export function AppsFab() {
    const [opened, setOpened] = useState(false);

    return (
        <>
            {/* Fixed FAB anchored to bottom-center */}
            <UnstyledButton
                onClick={() => setOpened(true)}
                aria-label="Open Apps"
                style={{
                    position: "fixed",
                    bottom: `calc(12px + env(safe-area-inset-bottom, 0px))`,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 200,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px 10px 16px",
                    borderRadius: 50,
                    background:
                        "light-dark(rgba(255,255,255,0.92), rgba(30,30,30,0.88))",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border:
                        "0.5px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.10))",
                    boxShadow:
                        "light-dark(0 4px 20px rgba(0,0,0,0.12), 0 4px 28px rgba(0,0,0,0.45))",
                    transition: "transform 150ms ease, box-shadow 150ms ease",
                    WebkitTapHighlightColor: "transparent",
                }}
            >
                <Box
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <IconApps size={19} color="white" stroke={1.6} />
                </Box>
                <Text size="sm" fw={600} style={{ userSelect: "none" }}>
                    Apps
                </Text>
            </UnstyledButton>

            <AppsModal opened={opened} onClose={() => setOpened(false)} />
        </>
    );
}
