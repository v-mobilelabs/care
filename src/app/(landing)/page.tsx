"use client";
import {
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { LandingLayout } from "@/ui/layouts/landing";
import {
  IconApple,
  IconBrain,
  IconCalendar,
  IconCamera,
  IconCapsule,
  IconClipboardHeart,
  IconClipboardText,
  IconDental,
  IconFileTypePdf,
  IconFlask,
  IconHeartbeat,
  IconHeartRateMonitor,
  IconListCheck,
  IconMessageChatbot,
  IconMicrophone,
  IconShieldCheck,
  IconShieldHalfFilled,
  IconStar,
  IconStethoscope,
  IconUsers,
  IconWaveSine,
  IconYoga,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const INPUT_MODES = [
  { icon: IconMessageChatbot, label: "Text Chat", description: "Describe symptoms naturally in plain language" },
  { icon: IconFileTypePdf, label: "Upload Files", description: "Share PDFs, lab reports, or medical images" },
  { icon: IconCamera, label: "Camera", description: "Capture wounds, rashes, or physical findings" },
  { icon: IconMicrophone, label: "Voice Input", description: "Dictate your symptoms hands-free" },
  { icon: IconWaveSine, label: "Live Conversation", description: "Real-time back-and-forth with the AI" },
];

const CLINICAL_OUTPUTS = [
  {
    icon: IconClipboardHeart,
    label: "Conditions",
    color: "primary",
    description: "Identifies probable diagnoses with ICD-10 codes, severity level, and diagnostic status",
  },
  {
    icon: IconCapsule,
    label: "Prescriptions",
    color: "violet",
    description: "Recommends prescription medications with dosage, frequency, duration, and usage instructions",
  },
  {
    icon: IconHeartbeat,
    label: "OTC Medicines",
    color: "grape",
    description: "Suggests over-the-counter, supplement, herbal, and probiotic options with safety notes",
  },
  {
    icon: IconFlask,
    label: "Lab & Imaging",
    color: "blue",
    description: "Orders relevant procedures — blood panels, imaging studies, and diagnostics — by urgency",
  },
  {
    icon: IconCalendar,
    label: "Appointments",
    color: "indigo",
    description: "Schedules specialist consultations with appropriate urgency and visit type",
  },
  {
    icon: IconUsers,
    label: "Providers",
    color: "cyan",
    description: "Recommends the right type of specialist and explains why they are needed",
  },
  {
    icon: IconShieldHalfFilled,
    label: "Risk Assessment",
    color: "teal",
    description: "Scores overall risk — low, moderate, high, or emergency — with immediate action items",
  },
  {
    icon: IconListCheck,
    label: "Next Steps",
    color: "green",
    description: "Lays out immediate, short-term, and long-term action plans with red flag alerts",
  },
  {
    icon: IconYoga,
    label: "Dos & Don'ts",
    color: "lime",
    description: "Delivers condition-specific lifestyle guidance — what to do and what to avoid",
  },
  {
    icon: IconApple,
    label: "Diet Plans",
    color: "yellow",
    description: "Generates nutritional recommendations with foods to favour and foods to avoid",
  },
  {
    icon: IconClipboardText,
    label: "SOAP Notes",
    color: "orange",
    description: "Produces clinical-grade Subjective, Objective, Assessment and Plan documentation",
  },
  {
    icon: IconDental,
    label: "Dental Chart",
    color: "red",
    description: "Maps tooth-by-tooth findings — caries, crowns, root canals, and more — visually",
  },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: IconMessageChatbot,
    title: "Describe Your Symptoms",
    description:
      "Talk, type, photograph, or upload. Use text, voice, photos, PDFs, or a live conversation — whatever works for you.",
  },
  {
    step: 2,
    icon: IconBrain,
    title: "AI Asks Follow-Ups",
    description:
      "CareAI asks targeted questions — yes/no, multiple choice, scales, and free text — to build a complete clinical picture.",
  },
  {
    step: 3,
    icon: IconShieldCheck,
    title: "Get a Full Clinical Report",
    description:
      "Receive up to 12 structured clinical outputs: diagnoses, medications, lab orders, specialist referrals, SOAP notes, and more.",
  },
];

const STATS = [
  { icon: IconUsers, value: "10,000+", label: "Consultations" },
  { icon: IconStethoscope, value: "50+", label: "Verified Doctors" },
  { icon: IconStar, value: "4.9★", label: "Average Rating" },
  { icon: IconShieldCheck, value: "24/7", label: "AI Available" },
];

function InputModeCard({
  icon: Icon,
  label,
  description,
}: Readonly<{ icon: React.ElementType; label: string; description: string }>) {
  const [hovered, setHovered] = useState(false);
  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transition: "box-shadow 150ms ease, transform 150ms ease",
        boxShadow: hovered ? "0 4px 16px rgba(61,42,160,0.14)" : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon size={36} radius="md" color="primary" variant="light" style={{ flexShrink: 0 }}>
          <Icon size={20} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text fw={700} size="sm">{label}</Text>
          <Text size="xs" c="dimmed" lh={1.5}>{description}</Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: Readonly<{ step: number; icon: React.ElementType; title: string; description: string }>) {
  const [hovered, setHovered] = useState(false);
  return (
    <Paper
      withBorder
      radius="lg"
      p="xl"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transition: "box-shadow 150ms ease, transform 150ms ease",
        boxShadow: hovered ? "0 6px 24px rgba(61,42,160,0.14)" : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
      }}
    >
      <Stack gap="sm">
        <Group>
          <ThemeIcon size={48} radius="md" color="primary" variant="light">
            <Icon size={26} />
          </ThemeIcon>
          <Text fw={900} c="primary" style={{ opacity: 0.2, fontSize: "2.5rem", lineHeight: 1 }}>
            {step}
          </Text>
        </Group>
        <Title order={4}>{title}</Title>
        <Text size="sm" c="dimmed" lh={1.6}>{description}</Text>
      </Stack>
    </Paper>
  );
}

function OutputCard({
  icon: Icon,
  label,
  color,
  description,
}: Readonly<{ icon: React.ElementType; label: string; color: string; description: string }>) {
  const [hovered, setHovered] = useState(false);
  return (
    <Paper
      withBorder
      radius="lg"
      p="lg"
      style={{
        transition: "box-shadow 150ms ease, transform 150ms ease",
        boxShadow: hovered ? "0 4px 16px rgba(61,42,160,0.12)" : undefined,
        transform: hovered ? "translateY(-2px)" : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Stack gap="sm">
        <ThemeIcon size={40} radius="md" color={color} variant="light">
          <Icon size={22} />
        </ThemeIcon>
        <Text fw={700} size="sm">{label}</Text>
        <Text size="xs" c="dimmed" lh={1.5}>{description}</Text>
      </Stack>
    </Paper>
  );
}

export default function HomePage() {
  const router = useRouter();

  return (
    <>

      {/* ── Hero ── */}
      <Box
        py={{ base: 80, sm: 120 }}
        style={{
          background: "light-dark(linear-gradient(135deg, var(--mantine-color-primary-0) 0%, var(--mantine-color-blue-0) 100%), linear-gradient(135deg, rgba(61,42,160,0.2) 0%, rgba(13,110,253,0.1) 100%))",
        }}
      >
        <Container size="md">
          <Stack align="center" gap="xl">
            <Badge color="primary" variant="light" size="lg" radius="xl" leftSection={<IconBrain size={14} />}>
              12 Clinical Outputs · 5 Input Modes
            </Badge>
            <Title ta="center" style={{ fontSize: "clamp(2rem, 6vw, 3.2rem)", lineHeight: 1.2 }}>
              Your symptoms turned into{" "}
              <Text component="span" c="primary" inherit>a full clinical report.</Text>
            </Title>
            <Text size="lg" c="dimmed" ta="center" maw={580} style={{ lineHeight: 1.7 }}>
              Type, talk, photograph, or upload. CareAI asks the right follow-up questions
              then hands you diagnoses, medications, lab orders, SOAP notes, specialist
              referrals, and more — all from one conversation.
            </Text>
            <Group gap="md" justify="center" wrap="wrap">
              <Button color="primary" radius="xl" leftSection={<IconMessageChatbot size={20} />} onClick={() => router.push("/patient/assistant")}>
                Check My Symptoms
              </Button>
              <Button variant="subtle" color="primary" radius="xl" leftSection={<IconStethoscope size={20} />} onClick={() => router.push("/auth/login?kind=doctor")}>
                Doctor Sign In
              </Button>
            </Group>
            <Group gap="xl" wrap="wrap" justify="center">
              {[
                { icon: IconHeartRateMonitor, text: "ICD-10 diagnoses" },
                { icon: IconShieldHalfFilled, text: "Risk scoring" },
                { icon: IconClipboardText, text: "SOAP notes" },
                { icon: IconDental, text: "Dental chart" },
              ].map(({ icon: Icon, text }) => (
                <Group key={text} gap={6}>
                  <Icon size={15} color="var(--mantine-color-primary-5)" />
                  <Text size="sm" c="dimmed">{text}</Text>
                </Group>
              ))}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* ── Input modes ── */}
      <Container size="lg" py={{ base: 60, sm: 80 }}>
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Title order={2} ta="center">5 Ways to Describe Your Condition</Title>
            <Text size="md" c="dimmed" ta="center" maw={500}>
              No forms. No checkboxes. Just tell CareAI what&apos;s wrong — however is easiest.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 5 }} spacing="md">
            {INPUT_MODES.map((mode) => (
              <InputModeCard key={mode.label} {...mode} />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      <Divider />

      {/* ── Clinical outputs ── */}
      <Container size="lg" py={{ base: 60, sm: 80 }}>
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Badge color="primary" variant="dot" size="sm">12 Structured Outputs</Badge>
            <Title order={2} ta="center">What CareAI Produces</Title>
            <Text size="md" c="dimmed" ta="center" maw={520}>
              Not just a summary — a full structured clinical report covering every dimension
              of your condition.
            </Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {CLINICAL_OUTPUTS.map((output) => (
              <OutputCard key={output.label} {...output} />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      <Divider />

      {/* ── How it works ── */}
      <Container size="lg" py={{ base: 60, sm: 80 }}>
        <Stack gap="xl">
          <Stack gap={6} align="center">
            <Title order={2} ta="center">How CareAI Works</Title>
            <Text size="md" c="dimmed" ta="center" maw={500}>From first symptom to complete assessment in a single conversation.</Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {HOW_IT_WORKS.map((item) => (
              <StepCard key={item.step} {...item} />
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      <Divider />

      {/* ── CTA banner ── */}
      <Box py={{ base: 60, sm: 80 }}>
        <Container size="sm">
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" color="white" variant="white">
              <IconHeartbeat size={36} color="var(--mantine-color-primary-6)" />
            </ThemeIcon>
            <Title ta="center" c="white" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
              Not sure what&apos;s wrong?
            </Title>
            <Text c="rgba(255,255,255,0.8)" ta="center" maw={460} size="md" lh={1.7}>
              CareAI will work through your symptoms, ask the right questions, and hand you
              a full clinical report — conditions, medications, labs, referrals, SOAP notes,
              and a clear action plan.
            </Text>
            <Button color="white" c="primary" radius="xl" leftSection={<IconMessageChatbot size={20} />} onClick={() => router.push("/patient/assistant")}>
              Start Free Assessment
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* ── Stats ── */}
      <Box py="xl">
        <Container size="lg">
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            {STATS.map(({ icon: Icon, value, label }) => (
              <Stack key={label} align="center" gap={4}>
                <ThemeIcon size={36} radius="md" color="primary" variant="light">
                  <Icon size={20} />
                </ThemeIcon>
                <Text fw={800} size="xl">{value}</Text>
                <Text size="xs" c="dimmed">{label}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    </>
  );
}

