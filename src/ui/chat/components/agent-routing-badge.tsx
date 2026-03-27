/**
 * Agent Routing Badge
 * Displays which specialist was selected for the current query
 * Shows transparency about routing decision and specialist capabilities
 */

import { Box, Group, Modal, Stack, ThemeIcon, Badge, Button, Text, List } from "@mantine/core";
import { useState } from "react";
import * as Icons from "@tabler/icons-react";
import { getSpecialist, type SpecialistId } from "@/data/specialists/specialists.config";

export interface AgentRoutingBadgeProps {
  readonly agentId: SpecialistId;
  readonly reasoning?: string;
}

export function AgentRoutingBadge({ agentId, reasoning }: Readonly<AgentRoutingBadgeProps>) {
  const [opened, setOpened] = useState(false);
  const specialist = getSpecialist(agentId);

  if (!specialist) return null;

  const IconComponent = Icons.IconStethoscope;

  return (
    <>
      <Box
        style={{
          background: "light-dark(var(--mantine-color-blue-0), var(--mantine-color-dark-7))",
          border: "1px solid light-dark(var(--mantine-color-blue-2), var(--mantine-color-dark-5))",
          borderRadius: "var(--mantine-radius-lg)",
          padding: "var(--mantine-spacing-md)",
          marginBottom: "var(--mantine-spacing-md)",
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Group gap="sm" align="center">
              <ThemeIcon variant="light" size="lg" radius="lg" color="blue">
                <IconComponent size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm">
                  {specialist.name.toUpperCase()}
                </Text>
                <Text size="xs" c="dimmed">
                  {specialist.description}
                </Text>
              </div>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => setOpened(true)}
            >
              Learn More
            </Button>
          </Group>

          {reasoning && (
            <Text size="xs" c="dimmed" style={{ fontStyle: "italic" }}>
              ✨ {reasoning}
            </Text>
          )}
        </Stack>
      </Box>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={`About ${specialist.name}`}
        size="md"
        centered
      >
        <Stack gap="md">
          <div>
            <Text fw={600} mb="xs" size="sm">
              What they can help with:
            </Text>
            <List size="sm">
              {specialist.capabilities.map((capability, idx) => (
                <List.Item key={idx}>{capability}</List.Item>
              ))}
            </List>
          </div>

          <div>
            <Text fw={600} mb="xs" size="sm">
              Example questions:
            </Text>
            <Stack gap="xs">
              {specialist.exampleQuestions.map((question, idx) => (
                <Group key={idx} gap="xs" align="flex-start">
                  <Badge size="xs" color="blue">
                    Q{idx + 1}
                  </Badge>
                  <Text size="sm">{question}</Text>
                </Group>
              ))}
            </Stack>
          </div>

          <Button
            fullWidth
            onClick={() => setOpened(false)}
          >
            Got it
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
