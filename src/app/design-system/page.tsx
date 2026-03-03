"use client";
import {
    Accordion,
    ActionIcon,
    Alert,
    Anchor,
    AppShell,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
    Code,
    Container,
    Divider,
    FileInput,
    Group,
    Loader,
    NumberInput,
    Paper,
    Pagination,
    PasswordInput,
    Progress,
    Radio,
    SegmentedControl,
    Select,
    SimpleGrid,
    Skeleton,
    Slider,
    Stack,
    Stepper,
    Switch,
    Table,
    Tabs,
    Text,
    Textarea,
    TextInput,
    ThemeIcon,
    Timeline,
    Title,
    Tooltip,
} from "@mantine/core";
import {
    IconAlertCircle,
    IconArrowLeft,
    IconBell,
    IconBolt,
    IconCar,
    IconCheck,
    IconInfoCircle,
    IconMapPin,
    IconStar,
    IconUser,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { colors } from "@/ui/tokens";

const ColorSchemeToggle = dynamic(
    () => import("@/ui/color-scheme-toggle").then((mod) => mod.default),
    { ssr: false, loading: () => <Skeleton height={30} width={30} radius="xl" /> }
);

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
    return (
        <Stack gap="md">
            <Box>
                <Title order={3} mb={4}>
                    {title}
                </Title>
                <Divider />
            </Box>
            {children}
        </Stack>
    );
}

// ── Color swatch ───────────────────────────────────────────────────────────────
const PALETTE_ENTRIES = [
    { name: "primary", label: "Primary (Indigo-Violet)" },
    { name: "secondary", label: "Secondary (Cool Neutral)" },
    { name: "success", label: "Success (Teal)" },
    { name: "warning", label: "Warning (Amber)" },
    { name: "danger", label: "Danger (Red)" },
] as const;

function Swatch({
    colorName,
    shade,
}: Readonly<{ colorName: string; shade: number }>) {
    return (
        <Stack gap={4} align="center">
            <Box
                w={48}
                h={48}
                style={{
                    borderRadius: "var(--mantine-radius-md)",
                    background: `var(--mantine-color-${colorName}-${shade})`,
                    border: "1px solid rgba(0,0,0,0.08)",
                }}
            />
            <Text size="xs" c="dimmed" ta="center">
                {shade}
            </Text>
        </Stack>
    );
}

// ── Typography row ─────────────────────────────────────────────────────────────
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

// ── Spacing visual ─────────────────────────────────────────────────────────────
const SPACING_STEPS = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;

// ── Shadow visual ──────────────────────────────────────────────────────────────
const SHADOW_LEVELS = ["xs", "sm", "md", "lg", "xl"] as const;

// ── Radius visual ─────────────────────────────────────────────────────────────
const RADIUS_LEVELS = ["xs", "sm", "md", "lg", "xl"] as const;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DesignSystemPage() {
    const router = useRouter();
    const [stepperStep, setStepperStep] = useState(1);
    const [tabValue, setTabValue] = useState<string | null>("overview");
    const [sliderValue, setSliderValue] = useState(40);
    const [switchOn, setSwitchOn] = useState(true);
    const [checked, setChecked] = useState(true);
    const [radioVal, setRadioVal] = useState("sedan");

    return (
        <AppShell>
            <AppShell.Main>
                {/* ── Top bar ── */}
                <Box
                    pos="sticky"
                    py="md"
                    style={{
                        top: 0,
                        zIndex: 200,
                        backdropFilter: "blur(10px)",
                        background:
                            "light-dark(var(--mantine-color-white), var(--mantine-color-dark-8))",
                        borderBottom:
                            "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    }}
                >
                    <Container size="xl">
                        <Group justify="space-between">
                            <Group gap="sm">
                                <ActionIcon
                                    variant="subtle"
                                    color="primary"
                                    size="lg"
                                    onClick={() => router.push("/")}
                                >
                                    <IconArrowLeft size={20} />
                                </ActionIcon>
                                <Stack gap={0}>
                                    <Title order={4}>Design System</Title>
                                    <Text size="xs" c="dimmed">
                                        SwiftDrive · Mantine v8
                                    </Text>
                                </Stack>
                            </Group>
                            <Group gap="xs">
                                <ColorSchemeToggle />
                                <Badge color="primary" variant="light" size="sm">
                                    Living Reference
                                </Badge>
                            </Group>
                        </Group>
                    </Container>
                </Box>

                <Container size="xl" py="xl">
                    <Stack gap={56}>
                        {/* ── 1. Colors ── */}
                        <Section title="1. Color Palette">
                            <Stack gap="lg">
                                {PALETTE_ENTRIES.map((entry) => (
                                    <Stack key={entry.name} gap="xs">
                                        <Text size="sm" fw={600}>
                                            {entry.label}
                                        </Text>
                                        <Group gap="xs">
                                            {([0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((shade) => (
                                                <Swatch
                                                    key={shade}
                                                    colorName={entry.name}
                                                    shade={shade}
                                                />
                                            ))}
                                        </Group>
                                    </Stack>
                                ))}

                                {/* Semantic mapping */}
                                <Paper withBorder radius="md" p="md">
                                    <Text size="sm" fw={600} mb="xs">
                                        Semantic Color Map
                                    </Text>
                                    <SimpleGrid cols={{ base: 2, sm: 4 }}>
                                        {(Object.entries(colors) as [string, string][]).map(([intent, colorName]) => (
                                            <Group key={intent} gap="xs">
                                                <Box
                                                    w={14}
                                                    h={14}
                                                    style={{
                                                        borderRadius: "50%",
                                                        background: `var(--mantine-color-${colorName}-6)`,
                                                    }}
                                                />
                                                <Text size="xs">
                                                    <Text component="span" fw={600}>{intent}</Text>
                                                    {" → "}{colorName}
                                                </Text>
                                            </Group>
                                        ))}
                                    </SimpleGrid>
                                </Paper>
                            </Stack>
                        </Section>

                        {/* ── 2. Typography ── */}
                        <Section title="2. Typography">
                            <Paper withBorder radius="md" p="xl">
                                <Stack gap="lg">
                                    {HEADING_LEVELS.map((level) => (
                                        <Group key={level} justify="space-between" wrap="nowrap">
                                            <Title order={level}>
                                                Heading {level} — The quick brown fox
                                            </Title>
                                            <Badge variant="outline" color="secondary" size="sm" style={{ flexShrink: 0 }}>
                                                h{level}
                                            </Badge>
                                        </Group>
                                    ))}
                                    <Divider />
                                    {(["xl", "lg", "md", "sm", "xs"] as const).map((size) => (
                                        <Group key={size} justify="space-between" wrap="nowrap">
                                            <Text size={size}>
                                                Text {size} — The quick brown fox jumps over the lazy dog
                                            </Text>
                                            <Badge variant="outline" color="secondary" size="sm" style={{ flexShrink: 0 }}>
                                                {size}
                                            </Badge>
                                        </Group>
                                    ))}
                                    <Divider />
                                    <Group gap="md" wrap="wrap">
                                        <Text fw={400}>Regular 400</Text>
                                        <Text fw={500}>Medium 500</Text>
                                        <Text fw={600}>Semibold 600</Text>
                                        <Text fw={700}>Bold 700</Text>
                                        <Text fw={800}>Extrabold 800</Text>
                                    </Group>
                                    <Group gap="md" wrap="wrap">
                                        <Text c="dimmed">Dimmed</Text>
                                        <Text c="primary">Primary</Text>
                                        <Text c="success">Success</Text>
                                        <Text c="warning">Warning</Text>
                                        <Text c="danger">Danger</Text>
                                        <Anchor href="#">Anchor</Anchor>
                                        <Code>inline code</Code>
                                    </Group>
                                </Stack>
                            </Paper>
                        </Section>

                        {/* ── 3. Spacing ── */}
                        <Section title="3. Spacing Scale">
                            <Paper withBorder radius="md" p="xl">
                                <Stack gap="sm">
                                    {SPACING_STEPS.map((step) => (
                                        <Group key={step} gap="md" align="center">
                                            <Text size="sm" fw={600} w={36} ta="right">
                                                {step}
                                            </Text>
                                            <Box
                                                h={24}
                                                style={{
                                                    width: `var(--mantine-spacing-${step})`,
                                                    background: "var(--mantine-color-primary-4)",
                                                    borderRadius: "var(--mantine-radius-xs)",
                                                    minWidth: 4,
                                                }}
                                            />
                                            <Text size="xs" c="dimmed">
                                                var(--mantine-spacing-{step})
                                            </Text>
                                        </Group>
                                    ))}
                                </Stack>
                            </Paper>
                        </Section>

                        {/* ── 4. Radius ── */}
                        <Section title="4. Border Radius">
                            <Paper withBorder radius="md" p="xl">
                                <Group gap="xl" wrap="wrap">
                                    {RADIUS_LEVELS.map((r) => (
                                        <Stack key={r} align="center" gap="xs">
                                            <Box
                                                w={64}
                                                h={64}
                                                bg="primary.1"
                                                style={{
                                                    borderRadius: `var(--mantine-radius-${r})`,
                                                    border: "2px solid var(--mantine-color-primary-5)",
                                                }}
                                            />
                                            <Text size="xs" fw={600}>
                                                {r}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                var(--mantine-radius-{r})
                                            </Text>
                                        </Stack>
                                    ))}
                                    <Stack align="center" gap="xs">
                                        <Box
                                            w={64}
                                            h={64}
                                            bg="primary.1"
                                            style={{
                                                borderRadius: "9999px",
                                                border: "2px solid var(--mantine-color-primary-5)",
                                            }}
                                        />
                                        <Text size="xs" fw={600}>
                                            full
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            9999px
                                        </Text>
                                    </Stack>
                                </Group>
                            </Paper>
                        </Section>

                        {/* ── 5. Shadows ── */}
                        <Section title="5. Shadow Scale">
                            <Group gap="xl" wrap="wrap">
                                {SHADOW_LEVELS.map((s) => (
                                    <Stack key={s} align="center" gap="sm">
                                        <Box
                                            w={96}
                                            h={96}
                                            bg="white"
                                            style={{
                                                borderRadius: "var(--mantine-radius-lg)",
                                                boxShadow: `var(--mantine-shadow-${s})`,
                                            }}
                                        />
                                        <Text size="xs" fw={600}>
                                            shadow-{s}
                                        </Text>
                                    </Stack>
                                ))}
                            </Group>
                        </Section>

                        {/* ── 6. Buttons ── */}
                        <Section title="6. Buttons">
                            <Stack gap="sm">
                                {(["filled", "light", "outline", "subtle", "transparent", "default"] as const).map(
                                    (variant) => (
                                        <Group key={variant} gap="sm" wrap="wrap" align="center">
                                            <Text size="xs" c="dimmed" w={80} ta="right">
                                                {variant}
                                            </Text>
                                            {(["primary", "success", "warning", "danger", "secondary"] as const).map(
                                                (color) => (
                                                    <Button key={color} variant={variant} color={color} size="sm">
                                                        {color}
                                                    </Button>
                                                )
                                            )}
                                        </Group>
                                    )
                                )}
                                <Divider />
                                <Group gap="sm" wrap="wrap">
                                    <Text size="xs" c="dimmed" w={80} ta="right">
                                        sizes
                                    </Text>
                                    {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                                        <Button key={size} size={size} color="primary">
                                            {size}
                                        </Button>
                                    ))}
                                </Group>
                                <Group gap="sm" wrap="wrap">
                                    <Text size="xs" c="dimmed" w={80} ta="right">
                                        states
                                    </Text>
                                    <Button leftSection={<IconCar size={16} />} color="primary">
                                        With icon
                                    </Button>
                                    <Button loading color="primary">
                                        Loading
                                    </Button>
                                    <Button disabled color="primary">
                                        Disabled
                                    </Button>
                                    <ActionIcon color="primary" size="lg">
                                        <IconBolt size={18} />
                                    </ActionIcon>
                                    <ActionIcon color="danger" size="lg" variant="light">
                                        <IconX size={18} />
                                    </ActionIcon>
                                </Group>
                            </Stack>
                        </Section>

                        {/* ── 7. Inputs ── */}
                        <Section title="7. Form Inputs">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                <TextInput
                                    label="TextInput"
                                    placeholder="Enter text"
                                    description="Helper hint"
                                    leftSection={<IconUser size={16} />}
                                />
                                <PasswordInput label="PasswordInput" placeholder="••••••••" />
                                <NumberInput label="NumberInput" placeholder="0" min={0} />
                                <Select
                                    label="Select"
                                    placeholder="Pick one"
                                    data={["Sedan", "SUV", "Hatchback"]}
                                />
                                <TextInput
                                    label="Error state"
                                    placeholder="Enter value"
                                    error="This field is required"
                                />
                                <TextInput label="Disabled" placeholder="Not editable" disabled />
                                <Textarea label="Textarea" placeholder="Write something…" />
                                <FileInput label="FileInput" placeholder="Upload document" />
                                <Slider
                                    label="Slider"
                                    value={sliderValue}
                                    onChange={setSliderValue}
                                    color="primary"
                                />
                                <Stack gap="xs">
                                    <Text size="sm" fw={500}>
                                        Toggle inputs
                                    </Text>
                                    <Switch
                                        label="Switch"
                                        checked={switchOn}
                                        onChange={(e) => setSwitchOn(e.currentTarget.checked)}
                                    />
                                    <Checkbox
                                        label="Checkbox"
                                        checked={checked}
                                        onChange={(e) => setChecked(e.currentTarget.checked)}
                                    />
                                    <Radio.Group value={radioVal} onChange={setRadioVal} label="Radio">
                                        <Group mt="xs">
                                            <Radio value="sedan" label="Sedan" />
                                            <Radio value="suv" label="SUV" />
                                        </Group>
                                    </Radio.Group>
                                </Stack>
                            </SimpleGrid>
                        </Section>

                        {/* ── 8. Badges & Indicators ── */}
                        <Section title="8. Badges">
                            <Stack gap="sm">
                                {(["filled", "light", "outline", "dot"] as const).map((variant) => (
                                    <Group key={variant} gap="sm" wrap="wrap" align="center">
                                        <Text size="xs" c="dimmed" w={60} ta="right">
                                            {variant}
                                        </Text>
                                        {(["primary", "success", "warning", "danger", "secondary"] as const).map(
                                            (color) => (
                                                <Badge key={color} variant={variant} color={color}>
                                                    {color}
                                                </Badge>
                                            )
                                        )}
                                    </Group>
                                ))}
                                <Group gap="sm" wrap="wrap" align="center">
                                    <Text size="xs" c="dimmed" w={60} ta="right">
                                        sizes
                                    </Text>
                                    {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
                                        <Badge key={size} size={size} color="primary">
                                            {size}
                                        </Badge>
                                    ))}
                                </Group>
                            </Stack>
                        </Section>

                        {/* ── 9. ThemeIcon & Avatar ── */}
                        <Section title="9. ThemeIcon & Avatar">
                            <Group gap="lg" wrap="wrap">
                                {(["filled", "light", "outline", "subtle"] as const).map((variant) => (
                                    <Stack key={variant} align="center" gap="xs">
                                        <ThemeIcon size={40} variant={variant} color="primary">
                                            <IconCar size={20} />
                                        </ThemeIcon>
                                        <Text size="xs" c="dimmed">
                                            {variant}
                                        </Text>
                                    </Stack>
                                ))}
                                <Divider orientation="vertical" />
                                {["Alex Rivera", "Priya Nair", "Mohammed K"].map((name) => (
                                    <Stack key={name} align="center" gap="xs">
                                        <Avatar name={name} color="primary" size={40} />
                                        <Text size="xs" c="dimmed">
                                            {name.split(" ")[0]}
                                        </Text>
                                    </Stack>
                                ))}
                                <Stack align="center" gap="xs">
                                    <Avatar size={40} color="primary" />
                                    <Text size="xs" c="dimmed">
                                        empty
                                    </Text>
                                </Stack>
                            </Group>
                        </Section>

                        {/* ── 10. Feedback ── */}
                        <Section title="10. Feedback">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                <Alert
                                    icon={<IconInfoCircle size={18} />}
                                    title="Info"
                                    color="primary"
                                >
                                    An informational message for the user.
                                </Alert>
                                <Alert
                                    icon={<IconCheck size={18} />}
                                    title="Success"
                                    color="success"
                                >
                                    Action completed successfully.
                                </Alert>
                                <Alert
                                    icon={<IconAlertCircle size={18} />}
                                    title="Warning"
                                    color="warning"
                                >
                                    Please review before proceeding.
                                </Alert>
                                <Alert
                                    icon={<IconX size={18} />}
                                    title="Error"
                                    color="danger"
                                >
                                    Something went wrong. Please try again.
                                </Alert>
                            </SimpleGrid>

                            <Paper withBorder radius="md" p="md">
                                <Stack gap="md">
                                    <Group gap="xl" wrap="wrap">
                                        <Stack align="center" gap="xs">
                                            <Loader type="bars" color="primary" size="sm" />
                                            <Text size="xs" c="dimmed">bars</Text>
                                        </Stack>
                                        <Stack align="center" gap="xs">
                                            <Loader type="oval" color="primary" size="sm" />
                                            <Text size="xs" c="dimmed">oval</Text>
                                        </Stack>
                                        <Stack align="center" gap="xs">
                                            <Loader type="dots" color="primary" size="sm" />
                                            <Text size="xs" c="dimmed">dots</Text>
                                        </Stack>
                                    </Group>
                                    <Skeleton height={16} radius="md" />
                                    <Skeleton height={16} radius="md" width="80%" />
                                    <Skeleton height={16} radius="md" width="60%" />
                                    <Progress value={65} color="primary" />
                                    <Progress value={40} color="success" striped animated />
                                </Stack>
                            </Paper>
                        </Section>

                        {/* ── 11. Navigation ── */}
                        <Section title="11. Navigation">
                            <Stack gap="lg">
                                <Tabs value={tabValue} onChange={setTabValue}>
                                    <Tabs.List>
                                        <Tabs.Tab value="overview" leftSection={<IconStar size={14} />}>
                                            Overview
                                        </Tabs.Tab>
                                        <Tabs.Tab value="drivers" leftSection={<IconCar size={14} />}>
                                            Drivers
                                        </Tabs.Tab>
                                        <Tabs.Tab value="map" leftSection={<IconMapPin size={14} />}>
                                            Map
                                        </Tabs.Tab>
                                        <Tabs.Tab value="alerts" leftSection={<IconBell size={14} />} disabled>
                                            Alerts
                                        </Tabs.Tab>
                                    </Tabs.List>
                                    <Tabs.Panel value="overview" pt="md">
                                        <Text size="sm" c="dimmed">Overview tab content</Text>
                                    </Tabs.Panel>
                                    <Tabs.Panel value="drivers" pt="md">
                                        <Text size="sm" c="dimmed">Drivers tab content</Text>
                                    </Tabs.Panel>
                                    <Tabs.Panel value="map" pt="md">
                                        <Text size="sm" c="dimmed">Map tab content</Text>
                                    </Tabs.Panel>
                                </Tabs>

                                <Group justify="space-between" align="center">
                                    <SegmentedControl
                                        data={["All", "Available", "Busy"]}
                                        color="primary"
                                    />
                                    <Pagination total={8} color="primary" />
                                </Group>

                                <Stepper
                                    active={stepperStep}
                                    onStepClick={setStepperStep}
                                    size="sm"
                                    color="primary"
                                >
                                    <Stepper.Step
                                        label="Personal"
                                        description="Your details"
                                        icon={<IconUser size={14} />}
                                    />
                                    <Stepper.Step
                                        label="Vehicle"
                                        description="Car info"
                                        icon={<IconCar size={14} />}
                                    />
                                    <Stepper.Step
                                        label="Documents"
                                        description="Upload files"
                                        icon={<IconStar size={14} />}
                                    />
                                    <Stepper.Completed>
                                        <Text size="sm" c="dimmed" pt="md">All steps complete</Text>
                                    </Stepper.Completed>
                                </Stepper>
                            </Stack>
                        </Section>

                        {/* ── 12. Surfaces ── */}
                        <Section title="12. Surfaces & Cards">
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                                <Paper radius="lg" shadow="xs" p="lg">
                                    <Text size="sm" fw={600} mb={4}>Paper · xs shadow</Text>
                                    <Text size="xs" c="dimmed">Used for subtle groupings</Text>
                                </Paper>
                                <Paper withBorder radius="lg" p="lg">
                                    <Text size="sm" fw={600} mb={4}>Paper · withBorder</Text>
                                    <Text size="xs" c="dimmed">Primary card surface</Text>
                                </Paper>
                                <Paper radius="lg" shadow="md" p="lg">
                                    <Text size="sm" fw={600} mb={4}>Paper · md shadow</Text>
                                    <Text size="xs" c="dimmed">Elevated surfaces</Text>
                                </Paper>
                                <Card radius="lg" shadow="xs">
                                    <Text size="sm" fw={600} mb={4}>Card (default props)</Text>
                                    <Text size="xs" c="dimmed">withBorder + xs shadow from theme</Text>
                                </Card>
                                <Card
                                    radius="lg"
                                    shadow="sm"
                                    style={{
                                        background:
                                            "light-dark(var(--mantine-color-primary-0), rgba(61,42,160,0.15))",
                                    }}
                                >
                                    <Text size="sm" fw={600} mb={4}>Card · tinted</Text>
                                    <Text size="xs" c="dimmed">Primary-tinted background</Text>
                                </Card>
                            </SimpleGrid>
                        </Section>

                        {/* ── 13. Timeline & Accordion ── */}
                        <Section title="13. Timeline & Accordion">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                                <Timeline color="primary" bulletSize={20} lineWidth={2}>
                                    <Timeline.Item
                                        bullet={<IconCheck size={12} />}
                                        title="Booking Confirmed"
                                    >
                                        <Text size="xs" c="dimmed">Driver assigned · 2 min ago</Text>
                                    </Timeline.Item>
                                    <Timeline.Item
                                        bullet={<IconCar size={12} />}
                                        title="Driver En Route"
                                    >
                                        <Text size="xs" c="dimmed">ETA 4 minutes</Text>
                                    </Timeline.Item>
                                    <Timeline.Item
                                        bullet={<IconMapPin size={12} />}
                                        title="Arrived at pickup"
                                    >
                                        <Text size="xs" c="dimmed">Waiting</Text>
                                    </Timeline.Item>
                                </Timeline>

                                <Accordion radius="md" variant="separated">
                                    <Accordion.Item value="faq1">
                                        <Accordion.Control icon={<IconInfoCircle size={16} />}>
                                            How are drivers verified?
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Text size="sm" c="dimmed">
                                                All drivers undergo a background check, license validation,
                                                and vehicle inspection before being listed.
                                            </Text>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                    <Accordion.Item value="faq2">
                                        <Accordion.Control icon={<IconStar size={16} />}>
                                            How is the rating calculated?
                                        </Accordion.Control>
                                        <Accordion.Panel>
                                            <Text size="sm" c="dimmed">
                                                Ratings are an average of all passenger reviews over the
                                                driver&apos;s lifetime on the platform.
                                            </Text>
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>
                            </SimpleGrid>
                        </Section>

                        {/* ── 14. Table ── */}
                        <Section title="14. Table">
                            <Paper withBorder radius="lg" style={{ overflow: "hidden" }}>
                                <Table highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Driver</Table.Th>
                                            <Table.Th>Vehicle</Table.Th>
                                            <Table.Th>Rating</Table.Th>
                                            <Table.Th>Status</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {[
                                            { name: "Alex Rivera", vehicle: "Toyota Camry", rating: 4.9, status: "available" },
                                            { name: "Priya Nair", vehicle: "Honda City", rating: 4.8, status: "busy" },
                                            { name: "Ravi Kumar", vehicle: "Tata Tigor", rating: 4.5, status: "available" },
                                        ].map((row) => (
                                            <Table.Tr key={row.name}>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <Avatar name={row.name} size={28} color="primary" />
                                                        <Text size="sm">{row.name}</Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="sm" c="dimmed">{row.vehicle}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Group gap={4}>
                                                        <IconStar
                                                            size={13}
                                                            color="var(--mantine-color-yellow-5)"
                                                            fill="var(--mantine-color-yellow-5)"
                                                        />
                                                        <Text size="sm">{row.rating}</Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        color={row.status === "available" ? "success" : "warning"}
                                                        variant="light"
                                                        size="sm"
                                                    >
                                                        {row.status}
                                                    </Badge>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Paper>
                        </Section>

                        {/* ── 15. Tooltip ── */}
                        <Section title="15. Tooltip">
                            <Group gap="lg" wrap="wrap">
                                {(["top", "bottom", "left", "right"] as const).map((pos) => (
                                    <Tooltip key={pos} label={`Tooltip on ${pos}`} position={pos}>
                                        <Button variant="outline" color="primary" size="sm">
                                            {pos}
                                        </Button>
                                    </Tooltip>
                                ))}
                            </Group>
                        </Section>
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
