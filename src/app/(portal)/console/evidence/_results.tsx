import {
  Accordion,
  Badge,
  Code,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { colors } from "@/ui/tokens";
import type { EvidenceEntry } from "./_query";

function confidenceColor(label?: string): string {
  if (label === "high") return colors.success;
  if (label === "medium") return colors.warning;
  if (label === "low") return colors.danger;
  return "gray";
}

function formatIso(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function MetadataCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap={6}>
        <Text size="sm">
          <strong>Agent:</strong> {entry.evidence.agentType}
        </Text>
        <Text size="sm">
          <strong>Model:</strong> {entry.evidence.modelUsed ?? "-"}
        </Text>
        <Text size="sm">
          <strong>Thinking level:</strong> {entry.evidence.thinkingLevel ?? "-"}
        </Text>
        <Text size="sm">
          <strong>Captured at:</strong> {formatIso(entry.evidence.capturedAt)}
        </Text>
        <Text size="sm">
          <strong>Overall confidence:</strong> {entry.evidence.overallConfidence ?? "-"}
        </Text>
        <Text size="sm">
          <strong>Summary:</strong> {entry.evidence.summary ?? "-"}
        </Text>
      </Stack>
    </Paper>
  );
}

function ReasoningCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const hasReasoning = entry.evidence.reasoning.length > 0;
  if (!hasReasoning) {
    return (
      <Paper withBorder radius="md" p="md">
        <Text fw={600} mb="xs">Reasoning Steps</Text>
        <Text size="sm" c="dimmed">No reasoning steps captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Text fw={600} mb="xs">Reasoning Steps</Text>
      <Stack gap="xs">
        {entry.evidence.reasoning.map((step) => {
          const hasDataUsed = !!step.dataUsed && step.dataUsed.length > 0;
          return (
            <Paper key={`${entry.messageId}-reasoning-${step.stepNumber}`} withBorder radius="sm" p="sm">
              <Text size="sm" fw={600}>Step {step.stepNumber}: {step.description}</Text>
              <Text size="sm" c="dimmed">{step.reasoning ?? "No detailed reasoning captured."}</Text>
              {hasDataUsed ? (
                <Text size="xs" c="dimmed">Data used: {step.dataUsed?.join(", ")}</Text>
              ) : null}
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}

function CitationsCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const hasCitations = entry.evidence.citations.length > 0;
  if (!hasCitations) {
    return (
      <Paper withBorder radius="md" p="md">
        <Text fw={600} mb="xs">Citations</Text>
        <Text size="sm" c="dimmed">No citations captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Text fw={600} mb="xs">Citations</Text>
      <Stack gap="xs">
        {entry.evidence.citations.map((citation, index) => (
          <Paper key={`${entry.messageId}-citation-${index}`} withBorder radius="sm" p="sm">
            <Group justify="space-between" mb={4}>
              <Badge variant="light">{citation.sourceType}</Badge>
              <Text size="xs" c="dimmed">Relevance: {citation.relevanceScore ?? "-"}</Text>
            </Group>
            <Text size="sm" fw={500}>{citation.title ?? citation.sourceId ?? "Untitled source"}</Text>
            <Text size="sm" c="dimmed">{citation.snippet ?? citation.usageContext ?? "No snippet captured."}</Text>
            {citation.url ? <Code>{citation.url}</Code> : null}
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}

function ConfidenceCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const hasScores = entry.evidence.confidenceScores.length > 0;
  if (!hasScores) {
    return (
      <Paper withBorder radius="md" p="md">
        <Text fw={600} mb="xs">Confidence Scores</Text>
        <Text size="sm" c="dimmed">No confidence metrics captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Text fw={600} mb="xs">Confidence Scores</Text>
      <Stack gap="sm">
        {entry.evidence.confidenceScores.map((score) => (
          <Stack key={`${entry.messageId}-${score.metric}`} gap={4}>
            <Group justify="space-between">
              <Text size="sm" fw={500}>{score.metric}</Text>
              <Badge color={confidenceColor(score.label)}>{score.score}%</Badge>
            </Group>
            <Progress value={score.score} color={confidenceColor(score.label)} />
            <Text size="xs" c="dimmed">{score.rationale ?? "No rationale provided."}</Text>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function TokenUsageCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  if (!entry.evidence.tokenUsage) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-blue-0), rgba(51, 154, 240, 0.15))" }}>
        <Text fw={600} mb="xs">📊 Token Usage</Text>
        <Text size="sm" c="dimmed">No token usage captured.</Text>
      </Paper>
    );
  }

  const { promptTokens, completionTokens, totalTokens } = entry.evidence.tokenUsage;
  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-blue-0), rgba(51, 154, 240, 0.15))" }}>
      <Text fw={600} mb="xs">📊 Token Usage</Text>
      <Stack gap={6}>
        <Text size="sm">
          <strong>Prompt:</strong> {promptTokens?.toLocaleString() ?? "-"} tokens
        </Text>
        <Text size="sm">
          <strong>Completion:</strong> {completionTokens?.toLocaleString() ?? "-"} tokens
        </Text>
        <Text size="sm">
          <strong>Total:</strong> {totalTokens?.toLocaleString() ?? "-"} tokens
        </Text>
      </Stack>
    </Paper>
  );
}

function CreditsCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  if (!entry.evidence.creditsUsed) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-yellow-0), rgba(250, 176, 5, 0.15))" }}>
        <Text fw={600} mb="xs">💳 Credits</Text>
        <Text size="sm" c="dimmed">No credit usage captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-yellow-0), rgba(250, 176, 5, 0.15))" }}>
      <Text fw={600} mb="xs">💳 Credits</Text>
      <Group>
        <Badge size="xl" color="yellow" variant="light">
          {entry.evidence.creditsUsed} credit{entry.evidence.creditsUsed !== 1 ? "s" : ""}
        </Badge>
        <Text size="sm" c="dimmed">Consumed by this message</Text>
      </Group>
    </Paper>
  );
}

function GatewayCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const gw = entry.evidence.gateway;
  if (!gw) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-grape-0), rgba(174, 62, 201, 0.15))" }}>
        <Text fw={600} mb="xs">🚀 Gateway Routing</Text>
        <Text size="sm" c="dimmed">No routing decision captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-grape-0), rgba(174, 62, 201, 0.15))" }}>
      <Text fw={600} mb="xs">🚀 Gateway Routing</Text>
      <Stack gap={6}>
        <Text size="sm">
          <strong>Agent:</strong> <Badge variant="light">{gw.agentType}</Badge>
        </Text>
        <Text size="sm">
          <strong>Reason:</strong> {gw.routingReason}
        </Text>
        <Text size="sm">
          <strong>Thinking:</strong> {gw.thinkingLevel}
        </Text>
      </Stack>
    </Paper>
  );
}

function RagCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const rag = entry.evidence.rag;
  if (!rag) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-cyan-0), rgba(34, 180, 207, 0.15))" }}>
        <Text fw={600} mb="xs">🔍 RAG Retrieval</Text>
        <Text size="sm" c="dimmed">No RAG metadata captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-cyan-0), rgba(34, 180, 207, 0.15))" }}>
      <Text fw={600} mb="xs">🔍 RAG Retrieval</Text>
      <Stack gap={6}>
        <Group>
          <Text size="sm"><strong>Requested:</strong></Text>
          <Badge color={rag.requested ? "blue" : "gray"}>{rag.requested ? "Yes" : "No"}</Badge>
        </Group>
        <Group>
          <Text size="sm"><strong>Used:</strong></Text>
          <Badge color={rag.used ? "blue" : "gray"}>{rag.used ? "Yes" : "No"}</Badge>
        </Group>
        <Text size="sm">
          <strong>Reason:</strong> {rag.reason}
        </Text>
        {rag.timedOut && <Badge color="red">Timeout</Badge>}
        {rag.partialFailure && <Badge color="yellow">Partial failure</Badge>}
      </Stack>
    </Paper>
  );
}

function RerankingCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const rerank = entry.evidence.reranking;
  if (!rerank || !rerank.used) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-violet-0), rgba(177, 107, 207, 0.15))" }}>
        <Text fw={600} mb="xs">⭐ Reranking</Text>
        <Text size="sm" c="dimmed">Reranking not used.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-violet-0), rgba(177, 107, 207, 0.15))" }}>
      <Text fw={600} mb="xs">⭐ Reranking (Bedrock)</Text>
      <Stack gap={6}>
        <Text size="sm">
          <strong>Documents reranked:</strong> {rerank.documentsReranked ?? "-"}
        </Text>
        {rerank.topScores && rerank.topScores.length > 0 && (
          <Text size="sm">
            <strong>Top scores:</strong> {rerank.topScores.map((s) => s.toFixed(3)).join(", ")}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function MemoryCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const mem = entry.evidence.memory;
  if (!mem) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-orange-0), rgba(250, 128, 114, 0.15))" }}>
        <Text fw={600} mb="xs">🧠 Memory</Text>
        <Text size="sm" c="dimmed">No memory metadata captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-orange-0), rgba(250, 128, 114, 0.15))" }}>
      <Text fw={600} mb="xs">🧠 Memory</Text>
      <Stack gap={6}>
        <Group>
          <Text size="sm"><strong>Retrieved:</strong></Text>
          <Badge color={mem.retrieved ? "orange" : "gray"}>{mem.retrieved ? "Yes" : "No"}</Badge>
        </Group>
        {mem.retrieved && (
          <>
            <Text size="sm">
              <strong>Count:</strong> {mem.count ?? "-"} facts
            </Text>
            {mem.categories && mem.categories.length > 0 && (
              <Group>
                <Text size="sm"><strong>Categories:</strong></Text>
                {mem.categories.map((cat) => (
                  <Badge key={cat} variant="light" size="sm">{cat}</Badge>
                ))}
              </Group>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}

function PromptCard({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  const prompt = entry.evidence.prompt;
  if (!prompt) {
    return (
      <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-lime-0), rgba(130, 201, 30, 0.15))" }}>
        <Text fw={600} mb="xs">📝 Prompt Configuration</Text>
        <Text size="sm" c="dimmed">No prompt metadata captured.</Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" style={{ background: "light-dark(var(--mantine-color-lime-0), rgba(130, 201, 30, 0.15))" }}>
      <Text fw={600} mb="xs">📝 Prompt Configuration</Text>
      <Stack gap={6}>
        <Text size="sm">
          <strong>Model:</strong> {prompt.modelName}
        </Text>
        {prompt.systemPromptLength && (
          <Text size="sm">
            <strong>System prompt:</strong> {prompt.systemPromptLength.toLocaleString()} chars
          </Text>
        )}
        {prompt.dynamicContextLength && (
          <Text size="sm">
            <strong>Dynamic context:</strong> {prompt.dynamicContextLength.toLocaleString()} chars
          </Text>
        )}
        {prompt.contextCacheUsed && (
          <Badge color="green" variant="light">Context Cache Active</Badge>
        )}
      </Stack>
    </Paper>
  );
}

function EvidenceItem({ entry }: Readonly<{ entry: EvidenceEntry }>) {
  return (
    <Accordion.Item value={entry.messageId}>
      <Accordion.Control>
        <Group justify="space-between">
          <Text fw={600}>Message: {entry.messageId}</Text>
          <Badge color={confidenceColor(entry.evidence.confidenceLabel)}>
            {entry.evidence.confidenceLabel ?? "unknown"} confidence
          </Badge>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="md">
          {/* Core reasoning and evidence */}
          <MetadataCard entry={entry} />
          <ReasoningCard entry={entry} />
          <CitationsCard entry={entry} />
          <ConfidenceCard entry={entry} />
          
          {/* Pipeline metadata section */}
          <Text fw={700} size="lg" c="dimmed" mt="md">Pipeline Execution Details</Text>
          <TokenUsageCard entry={entry} />
          <CreditsCard entry={entry} />
          <GatewayCard entry={entry} />
          <RagCard entry={entry} />
          <RerankingCard entry={entry} />
          <MemoryCard entry={entry} />
          <PromptCard entry={entry} />
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function EvidenceResults({ entries }: Readonly<{ entries: EvidenceEntry[] }>) {
  return (
    <Accordion variant="separated" radius="lg">
      {entries.map((entry) => (
        <EvidenceItem key={entry.messageId} entry={entry} />
      ))}
    </Accordion>
  );
}
