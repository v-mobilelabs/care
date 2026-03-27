import { Box, Paper, Text } from "@mantine/core";
import { getServerUser } from "@/lib/api/server-prefetch";
import { isAdminUser } from "@/lib/auth/admin";

export default async function ConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getServerUser();

  if (!user) {
    return (
      <Box p="xl">
        <Paper withBorder radius="lg" p="xl">
          <Text c="danger" fw={600}>
            Access denied
          </Text>
          <Text c="dimmed" mt="xs">
            Sign in with an admin account to access the console.
          </Text>
        </Paper>
      </Box>
    );
  }

  if (!isAdminUser(user)) {
    return (
      <Box p="xl">
        <Paper withBorder radius="lg" p="xl">
          <Text c="danger" fw={600}>
            Access denied
          </Text>
          <Text c="dimmed" mt="xs">
            Only admin accounts can access the console.
          </Text>
        </Paper>
      </Box>
    );
  }

  return children;
}