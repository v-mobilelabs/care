import { Suspense } from "react";
import { Box, Paper, Text } from "@mantine/core";
import { getServerUser } from "@/lib/api/server-prefetch";
import { isAdminUser } from "@/lib/auth/admin";
import { EvidenceContent } from "./_content";
import EvidenceLoading from "./loading";

export const metadata = { title: "Evidence Inspector" };

export default async function EvidencePage() {
  const user = await getServerUser();
  if (!user) {
    return (
      <Box p="xl">
        <Paper withBorder radius="lg" p="xl">
          <Text c="danger" fw={600}>
            Access denied
          </Text>
          <Text c="dimmed" mt="xs">
            Sign in with an admin account to view evidence.
          </Text>
        </Paper>
      </Box>
    );
  }

  const isAdmin = isAdminUser(user);

  if (!isAdmin) {
    return (
      <Box p="xl">
        <Paper withBorder radius="lg" p="xl">
          <Text c="danger" fw={600}>
            Access denied
          </Text>
          <Text c="dimmed" mt="xs">
            Your account is not in the admin allowlist.
          </Text>
        </Paper>
      </Box>
    );
  }

  return (
    <Suspense fallback={<EvidenceLoading />}>
      <EvidenceContent initialProfileId={user.uid} />
    </Suspense>
  );
}
