/**
 * Specialists Page Loading State
 * Skeleton cards while specialists page is loading
 */

import { Container, SimpleGrid, Paper, Stack, Skeleton } from "@mantine/core";

export default function SpecialistsLoadingPage() {
  return (
    <Container size="xl" py={{ base: "xl", md: "3rem" }}>
      <Stack gap="lg" mb="3rem">
        <div>
          <Skeleton height={36} width="60%" mb="sm" />
          <Skeleton height={72} />
        </div>
      </Stack>

      <SimpleGrid
        cols={{ base: 1, xs: 1, sm: 2, md: 3 }}
        spacing={{ base: "md", md: "lg" }}
      >
        {Array.from({ length: 21 }).map((_, index) => (
          <Paper key={index} withBorder radius="lg" p="md">
            <Stack gap="md" h="100%">
              {/* Header skeleton */}
              <div>
                <Skeleton height={24} width="70%" mb="xs" />
                <Skeleton height={16} width="100%" />
              </div>

              {/* Capabilities skeleton */}
              <div>
                <Skeleton height={16} width="50%" mb="xs" />
                <Stack gap="xs">
                  <Skeleton height={12} />
                  <Skeleton height={12} />
                  <Skeleton height={12} width="80%" />
                </Stack>
              </div>

              {/* Questions skeleton */}
              <div>
                <Skeleton height={16} width="50%" mb="xs" />
                <Stack gap="xs">
                  <Skeleton height={12} />
                  <Skeleton height={12} />
                  <Skeleton height={12} width="70%" />
                </Stack>
              </div>

              {/* Button skeleton */}
              <Skeleton height={36} width="100%" />
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Container>
  );
}
