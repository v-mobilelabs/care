/**
 * Meet Your Care Team
 * Discovery page showcasing all 21 specialist agents
 * Patients can explore capabilities and start conversations
 */

import { Container, Title, Text, SimpleGrid, Paper, Group, ThemeIcon, Stack, Button, Badge, List } from "@mantine/core";
import * as Icons from "@tabler/icons-react";
import Link from "next/link";
import { getAllSpecialists, type Specialist } from "@/data/specialists/specialists.config";

export const metadata = {
  title: "Meet Your Care Team | CareAI",
  description: "Explore our 21 specialist agents and get expert guidance for any health concern",
};

interface SpecialistCardProps {
  readonly specialist: Specialist;
}

function SpecialistCard({ specialist }: Readonly<SpecialistCardProps>) {
  const IconComponent = Icons.IconStethoscope;

  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      style={{
        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
        transition: "all 200ms ease",
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <Stack gap="md" h="100%">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Group gap="xs" mb="xs" align="center">
              <ThemeIcon
                variant="light"
                size="lg"
                radius="lg"
                color="blue"
              >
                <IconComponent size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm">
                  {specialist.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {specialist.description}
                </Text>
              </div>
            </Group>
          </div>
        </Group>

        {/* Capabilities */}
        <div>
          <Text fw={600} size="xs" mb="xs" tt="uppercase" c="dimmed">
            Key Capabilities
          </Text>
          <List size="sm" spacing="xs">
            {specialist.capabilities.map((capability) => (
              <List.Item key={capability}>{capability}</List.Item>
            ))}
          </List>
        </div>

        {/* Example Questions */}
        <div style={{ flex: 1 }}>
          <Text fw={600} size="xs" mb="xs" tt="uppercase" c="dimmed">
            Common Questions
          </Text>
          <Stack gap="xs">
            {specialist.exampleQuestions.map((question, idx) => (
              <Group key={question} gap="xs" align="flex-start">
                <Badge size="sm" color="blue" variant="light">
                  {idx + 1}
                </Badge>
                <Text size="xs" style={{ flex: 1 }}>
                  {question}
                </Text>
              </Group>
            ))}
          </Stack>
        </div>

        {/* CTA Button */}
        <Link
          href={`/user/assistant?specialist=${specialist.id}`}
          style={{ textDecoration: "none" }}
        >
          <Button component="span" fullWidth variant="light" color="blue">
            Talk to {specialist.name.split(" ")[0]}
          </Button>
        </Link>
      </Stack>
    </Paper>
  );
}

export default function SpecialistsPage() {
  const specialists = getAllSpecialists();

  return (
    <Container size="xl" py={{ base: "xl", md: "3rem" }}>
      <Stack gap="lg" mb="3rem">
        <div>
          <Title order={1} mb="sm">
            Meet Your Care Team
          </Title>
          <Text c="dimmed" size="lg">
            Our specialized AI agents are trained to provide expert guidance across 21 medical specialties.
            Choose the right specialist for your health concern.
          </Text>
        </div>
      </Stack>

      <SimpleGrid
        cols={{ base: 1, xs: 1, sm: 2, md: 3 }}
        spacing={{ base: "md", md: "lg" }}
      >
        {specialists.map((specialist) => (
          <SpecialistCard key={specialist.id} specialist={specialist} />
        ))}
      </SimpleGrid>

      {/* Callout section */}
      <Paper
        withBorder
        radius="lg"
        p="lg"
        mt="3rem"
        style={{
          background: "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-7))",
          borderColor: "light-dark(var(--mantine-color-blue-2), var(--mantine-color-dark-5))",
        }}
      >
        <Group justify="space-between" align="center">
          <div>
            <Title order={4} mb="xs">
              Not sure which specialist you need?
            </Title>
            <Text size="sm" c="dimmed">
              Describe your symptoms in the chat, and our AI gateway will automatically route you to the best specialist for your concern.
            </Text>
          </div>
          <Link href="/user/assistant" style={{ textDecoration: "none" }}>
            <Button component="span" variant="filled" color="blue">
              Start Chat
            </Button>
          </Link>
        </Group>
      </Paper>
    </Container>
  );
}
