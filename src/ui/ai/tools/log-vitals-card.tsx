"use client";
import { Badge, Box, Collapse, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconClock, IconDroplet, IconFlame, IconFlask, IconHeartbeat, IconLungs } from "@tabler/icons-react";
import { type ReactNode } from "react";
import type { LogVitalsInput } from "@/app/(portal)/patient/_types";

export interface LogVitalsCardProps {
    data: LogVitalsInput;
}

export function LogVitalsCard({ data }: Readonly<LogVitalsCardProps>) {
    const [opened, { toggle }] = useDisclosure(false);

    // Build flat array of recorded readings for summary + grid
    const readings: Array<{ icon: ReactNode; label: string; value: string }> = [];
    if (data.systolicBp != null && data.diastolicBp != null)
        readings.push({ icon: <IconHeartbeat size={13} />, label: "Blood Pressure", value: `${data.systolicBp}/${data.diastolicBp} mmHg` });
    if (data.restingHr != null)
        readings.push({ icon: <IconHeartbeat size={13} />, label: "Heart Rate", value: `${data.restingHr} bpm` });
    if (data.spo2 != null)
        readings.push({ icon: <IconLungs size={13} />, label: "SpO₂", value: `${data.spo2}%` });
    if (data.temperatureC != null)
        readings.push({ icon: <IconFlame size={13} />, label: "Temperature", value: `${data.temperatureC}°C` });
    if (data.respiratoryRate != null)
        readings.push({ icon: <IconLungs size={13} />, label: "Resp. Rate", value: `${data.respiratoryRate} br/min` });
    if (data.glucoseMmol != null)
        readings.push({ icon: <IconDroplet size={13} />, label: "Blood Glucose", value: `${data.glucoseMmol} mmol/L` });
    if (data.waistCm != null)
        readings.push({ icon: <IconFlask size={13} />, label: "Waist", value: `${data.waistCm} cm` });
    if (data.hipCm != null)
        readings.push({ icon: <IconFlask size={13} />, label: "Hip", value: `${data.hipCm} cm` });
    if (data.neckCm != null)
        readings.push({ icon: <IconFlask size={13} />, label: "Neck", value: `${data.neckCm} cm` });

    const summaryLabels = readings.slice(0, 3).map(r => r.label).join(" · ");

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-teal-5)" }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: "light-dark(var(--mantine-color-teal-0), rgba(0,0,0,0.2))" }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color="teal" variant="filled" style={{ flexShrink: 0 }}>
                            <IconHeartbeat size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Vitals Recorded</Text>
                            <Text size="sm" fw={600} c="teal.7" truncate>{summaryLabels || "Measurements saved"}</Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            {readings.length > 0 && (
                                <Badge size="xs" color="teal" variant="light">{readings.length} reading{readings.length === 1 ? "" : "s"}</Badge>
                            )}
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="xs">
                        <SimpleGrid cols={2} spacing="xs">
                            {readings.map((r) => (
                                <Paper key={r.label} withBorder radius="md" px="sm" py={6}
                                    style={{ background: "light-dark(var(--mantine-color-teal-0), rgba(0,0,0,0.15))" }}>
                                    <Group gap={6} wrap="nowrap">
                                        <ThemeIcon size={20} radius="sm" color="teal" variant="light" style={{ flexShrink: 0 }}>
                                            {r.icon}
                                        </ThemeIcon>
                                        <Box style={{ minWidth: 0 }}>
                                            <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>{r.label}</Text>
                                            <Text size="sm" fw={600} style={{ lineHeight: 1.3 }}>{r.value}</Text>
                                        </Box>
                                    </Group>
                                </Paper>
                            ))}
                        </SimpleGrid>
                        {data.note && (
                            <Text size="xs" c="dimmed" fs="italic">📝 {data.note}</Text>
                        )}
                        {data.measuredAt && (
                            <Group gap={4}>
                                <IconClock size={11} style={{ color: "var(--mantine-color-dimmed)" }} />
                                <Text size="xs" c="dimmed">
                                    {new Date(data.measuredAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                </Text>
                            </Group>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}
