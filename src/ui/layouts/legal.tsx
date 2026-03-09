import { Box, Container } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * Legal document layout wrapper for Terms & Privacy pages.
 * Provides consistent spacing and max-width for legal content.
 */
export function LegalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Box
      component="main"
      style={{
        minHeight: "100vh",
        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
      }}
    >
      <Container size="md" py={{ base: "xl", md: "3xl" }}>
        {children}
      </Container>
    </Box>
  );
}
