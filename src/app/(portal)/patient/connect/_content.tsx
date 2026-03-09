"use client";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    UnstyledButton,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconChevronRight,
    IconClock,
    IconRefresh,
    IconStethoscope,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";
import { useQueueSize } from "@/lib/meet/use-queue-size";
import { colors } from "@/ui/tokens";
import {
    useOnlineDoctors,
    useInitiateCall,
} from "./_query";
import type { OnlineDoctorDto } from "@/data/meet/use-cases/list-online-doctors.use-case";

// ── iOS-style constants ───────────────────────────────────────────────────────

const CARD_RADIUS = 16;
const CARD_BG = "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))";
const CARD_BORDER = "0.5px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))";
const SECTION_BG = "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))";
const GLASS_BG = "light-dark(rgba(255,255,255,0.72), rgba(30,30,30,0.72))";
const GLASS_BORDER = "0.5px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.06))";

// ── Inline animations (keep in one <style> block) ────────────────────────────

function InlineStyles() {
    return (
        <style>{`
            @keyframes connect-fade-up {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `}</style>
    );
}

// ── iOS-style doctor row ──────────────────────────────────────────────────────

function DoctorRow({
    doctor,
    onConnect,
    connecting,
    disabled,
}: Readonly<{
    doctor: OnlineDoctorDto;
    onConnect: (doctorId: string) => void;
    connecting: boolean;
    disabled: boolean;
}>) {
    const presence = usePresenceStatus(doctor.uid);
    const queueSize = useQueueSize(doctor.uid);
    const [hovered, setHovered] = useState(false);
    const isBusy = presence.online && presence.status === "busy";

    return (
        <UnstyledButton
            onClick={() => { if (!disabled) onConnect(doctor.uid); }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            disabled={disabled || connecting}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                borderRadius: CARD_RADIUS,
                background: hovered
                    ? "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))"
                    : CARD_BG,
                border: CARD_BORDER,
                transition: "background 150ms ease, transform 150ms ease",
                transform: hovered ? "scale(0.99)" : "scale(1)",
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                width: "100%",
                animation: "connect-fade-up 0.35s ease both",
            }}
        >
            {/* Avatar + presence dot */}
            <Box pos="relative" style={{ flexShrink: 0 }}>
                <Avatar size={44} src={doctor.photoUrl} radius="xl" color="primary">
                    {doctor.name.slice(0, 2).toUpperCase()}
                </Avatar>
                {presence.online && (
                    <Box
                        pos="absolute"
                        style={{
                            bottom: 0,
                            right: 0,
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: isBusy
                                ? "var(--mantine-color-orange-5)"
                                : "var(--mantine-color-teal-5)",
                            border: "2.5px solid light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                        }}
                    />
                )}
            </Box>

            {/* Name + meta */}
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="sm" lineClamp={1}>
                    Dr. {doctor.name}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                    {doctor.specialty}
                </Text>
                {queueSize > 0 && (
                    <Group gap={4}>
                        <IconClock size={11} color={`var(--mantine-color-${colors.warning}-5)`} />
                        <Text size="xs" c={colors.warning} fw={500}>
                            {queueSize} waiting
                        </Text>
                    </Group>
                )}
            </Stack>

            {/* Right: badge + chevron / loader */}
            <Stack gap={4} align="flex-end" style={{ flexShrink: 0 }}>
                <Badge
                    color={isBusy ? colors.warning : colors.success}
                    variant="light"
                    size="xs"
                    radius="xl"
                >
                    {isBusy ? "Busy" : "Online"}
                </Badge>
                {connecting ? (
                    <Loader size={16} color="primary" />
                ) : (
                    <IconChevronRight
                        size={16}
                        color="var(--mantine-color-dimmed)"
                        style={{ opacity: 0.5 }}
                    />
                )}
            </Stack>
        </UnstyledButton>
    );
}

// ── Main content — doctor list ────────────────────────────────────────────────

export function ConnectContent() {
    const router = useRouter();
    const { data: doctors, isLoading, refetch } = useOnlineDoctors();
    const initiate = useInitiateCall();
    const [connectingDoctorId, setConnectingDoctorId] = useState<string | null>(null);

    // ── Handlers ──────────────────────────────────────────────────────────

    const availableDoctors = doctors ?? [];

    function handleConnect(doctorId: string) {
        if (connectingDoctorId) return; // already connecting
        setConnectingDoctorId(doctorId);
        initiate.mutate(
            { doctorId },
            {
                onError: (err) => {
                    notifications.show({
                        title: "Failed to connect",
                        message: err.message,
                        color: colors.danger,
                        icon: <IconAlertCircle size={18} />,
                    });
                    setConnectingDoctorId(null);
                },
                onSuccess: (data) => {
                    // Redirect to the meet page immediately — the waiting lobby
                    // there handles the pending state with camera preview.
                    router.push(`/meet/${data.id}`);
                },
            },
        );
    }

    const doctorCountLabel = (() => {
        if (isLoading) return "Searching\u2026";
        if (availableDoctors.length === 0) return "No doctors online";
        const s = availableDoctors.length === 1 ? "" : "s";
        return `${availableDoctors.length} doctor${s} online`;
    })();

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
                background: SECTION_BG,
            }}
        >
            <InlineStyles />

            {/* ── Frosted glass header ────────────────────────────────────── */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="sm"
                style={{
                    flexShrink: 0,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    background: GLASS_BG,
                    borderBottom: GLASS_BORDER,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Group justify="space-between" align="center" wrap="nowrap" maw={560} mx="auto">
                    <Stack gap={0} align="center" style={{ flex: 1 }}>
                        <Text fw={700} size="md" lh={1.3}>
                            Connect to a Doctor
                        </Text>
                        <Text size="xs" c="dimmed">
                            {doctorCountLabel}
                        </Text>
                    </Stack>
                    <UnstyledButton
                        onClick={async () => { await refetch(); }}
                        aria-label="Refresh"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                            transition: "background 150ms ease",
                        }}
                    >
                        {isLoading ? (
                            <Loader size={14} color="primary" />
                        ) : (
                            <IconRefresh size={16} color="var(--mantine-color-dimmed)" />
                        )}
                    </UnstyledButton>
                </Group>
            </Box>

            {/* ── Scrollable content ──────────────────────────────────────── */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }} scrollbarSize={4}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={560} mx="auto">
                        <Stack gap="md">
                            {/* ── Section header ──────────────────────────────── */}
                            {availableDoctors.length > 0 && (
                                <Text
                                    size="xs"
                                    fw={600}
                                    c="dimmed"
                                    tt="uppercase"
                                    style={{ letterSpacing: 0.5, paddingLeft: 4 }}
                                >
                                    Available Doctors
                                </Text>
                            )}

                            {/* ── Doctor list ─────────────────────────────────── */}
                            {isLoading && (
                                <Stack gap="sm">
                                    {[1, 2, 3].map((n) => (
                                        <Skeleton key={n} height={82} radius={CARD_RADIUS} />
                                    ))}
                                </Stack>
                            )}

                            {!isLoading && availableDoctors.length === 0 && (
                                <Box
                                    py={60}
                                    style={{
                                        textAlign: "center",
                                        borderRadius: CARD_RADIUS,
                                        background: CARD_BG,
                                        border: CARD_BORDER,
                                    }}
                                >
                                    <Box
                                        mx="auto"
                                        mb="md"
                                        style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: "50%",
                                            background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.1))",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <IconStethoscope size={28} color="var(--mantine-color-primary-5)" />
                                    </Box>
                                    <Text fw={600} size="sm" mb={4}>No doctors available</Text>
                                    <Text size="xs" c="dimmed" maw={260} mx="auto" lh={1.6}>
                                        No doctors are online right now. Pull to refresh or check back shortly.
                                    </Text>
                                    <Button
                                        variant="light"
                                        color="primary"
                                        size="xs"
                                        radius="xl"
                                        mt="md"
                                        leftSection={<IconRefresh size={14} />}
                                        onClick={async () => { await refetch(); }}
                                        loading={isLoading}
                                    >
                                        Refresh
                                    </Button>
                                </Box>
                            )}

                            {availableDoctors.length > 0 && (
                                <Stack gap="sm">
                                    {availableDoctors.map((doctor) => (
                                        <DoctorRow
                                            key={doctor.uid}
                                            doctor={doctor}
                                            onConnect={handleConnect}
                                            connecting={initiate.isPending && connectingDoctorId === doctor.uid}
                                            disabled={!!connectingDoctorId}
                                        />
                                    ))}
                                </Stack>
                            )}


                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
