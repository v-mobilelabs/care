"use client";
import { Button, Group, Loader } from "@mantine/core";
import { IconChevronUp } from "@tabler/icons-react";

interface LoadMoreButtonProps {
    isFetchingNextPage?: boolean;
    onLoadMore?: () => void;
}

export function LoadMoreButton({ isFetchingNextPage, onLoadMore }: Readonly<LoadMoreButtonProps>) {
    return (
        <Group justify="center">
            <Button
                variant="subtle"
                color="dimmed"
                size="compact-sm"
                leftSection={isFetchingNextPage ? <Loader size={14} /> : <IconChevronUp size={14} />}
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
            >
                {isFetchingNextPage ? "Loading…" : "Load older messages"}
            </Button>
        </Group>
    );
}
