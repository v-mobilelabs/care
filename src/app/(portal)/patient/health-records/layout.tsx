"use client";
import { Box, Group, Tabs, ThemeIcon, Title, Text } from "@mantine/core";
import { IconClipboardHeart } from "@tabler/icons-react";
import Link from "@/ui/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

const tabs = [
    { label: "Overview", value: "overview" },
    { label: "Conditions", value: "conditions" },
    { label: "SOAP Notes", value: "soap-notes" },
    { label: "Lab Reports", value: "lab-reports" },
];

export default function HealthRecordsLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    // Get the last segment of the path (e.g. 'overview', 'conditions', etc.)
    const currentSegment = pathname.split("/").pop() || tabs[0].value;

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <Box
                pos="sticky"
                style={{
                    top: 0,
                    zIndex: 100,
                    backdropFilter: "blur(8px)",
                    background: "light-dark(rgba(255,255,255,0.85), rgba(26,27,30,0.85))",
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                }}
                px="xl"
                py="md"
            >
                <Group gap={12} wrap="nowrap">
                    <ThemeIcon size={40} radius="md" color="primary" variant="light">
                        <IconClipboardHeart size={22} />
                    </ThemeIcon>
                    <Box>
                        <Title order={3} style={{ lineHeight: 1.2 }}>Health Records Overview</Title>
                        <Text size="xs" c="dimmed">
                            All your health data, organized
                        </Text>
                    </Box>
                </Group>
                <Tabs value={currentSegment} mt="md" variant="pills" radius="xl" keepMounted={false}>
                    <Tabs.List>
                        {tabs.map(tab => (
                            <Tabs.Tab key={tab.value} value={tab.value}>
                                <Link
                                    href={tab.value}
                                    passHref
                                    style={{ color: "inherit", textDecoration: "none" }}
                                >{tab.label}</Link>
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>
                </Tabs>
            </Box>
            {/* Page content */}
            <Box style={{ flex: 1, overflow: "auto" }}>
                {children}
            </Box>
        </Box >
    );
}
